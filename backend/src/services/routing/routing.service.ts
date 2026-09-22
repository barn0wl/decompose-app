// src/services/routing/routing.service.ts
//
// State-augmented Dijkstra: a single-route search that folds both PRICE and
// the WALKING POLICY into the search itself, instead of approximating price
// as zero and checking walking limits only after a path is already chosen.
//
// ─── PRICE ──────────────────────────────────────────────────────────────
//
// computeBoardingPrice(rule, n) returns the price of a WHOLE boarding leg
// given its total segment count — it isn't naturally a per-edge cost. But
// marginal pricing telescopes correctly: if we charge each segment
//   marginal(i) = price(i) - price(i - 1)
// then summing marginal(1..N) over a boarding leg equals price(N) exactly
// (price(0) := 0). For flat fares, marginal is the full price on segment 1
// and 0 after (you already paid for the vehicle). For banded fares, marginal
// is 0 except when a segment crosses into the next band. This means Dijkstra
// needs to know, at each node, how many segments have already been ridden on
// the *current, uninterrupted* boarding — so that becomes part of the
// search state (routeId, direction, last sequence, streak length).
//
// ─── WALKING POLICY ─────────────────────────────────────────────────────
//
// Each of the five WalkingPolicy rules is now checked as a transition
// admissibility test *during* the search:
//   - max single-step distance  → reject the edge outright
//   - max consecutive walking edges → reject if it would exceed the cap
//   - max walking legs           → reject if starting a new leg would exceed it
//   - max total walking distance → reject if cumulative distance would exceed it
//   - no all-walking route       → enforced by only accepting an end state
//                                   that has boarded at least once
// A path returned by dijkstra() is therefore walking-policy-compliant by
// construction; filterWalkingHeavy() is no longer needed to accept/reject
// the winning path (kept below only as a diagnostic + a defensive sanity
// check — see calculateRoute()).
//
// ─── KNOWN LIMITATION ───────────────────────────────────────────────────
//
// This is a SINGLE-LABEL search: for each distinct state
//   (node, boardingRouteId, boardingDirection, boardingLastSequence,
//    boardingStreak, walkStepsUsed, walkConsecutive, hasBoarded)
// only the lowest-weight path found so far is kept. Every one of those
// fields is part of the state key EXCEPT cumulative walking distance, which
// is tracked as a plain number carried alongside the weight. That means in
// rare cases, the lowest-weight path that reaches a given state could have
// used more walking distance than a slightly costlier alternative path to
// that same state — and the cheaper-but-longer-walk path could get
// discarded first, even though the alternative would ultimately fit the
// total-distance budget while the "best" one wouldn't. A fully correct
// version would keep a small Pareto front of (weight, walkDistanceUsed)
// labels per state (bicriteria label-setting search) instead of one. That's
// real extra complexity; this version is deliberately the practical middle
// ground: exact on the discrete constraints (steps, consecutive, all-
// walking) and only approximate on the one continuous constraint.

import { buildGraph, GraphEdge, RouteGraph } from './graph.builder';
import { coalescePath } from './coalescer';
import { validatePricing, computeBoardingPrice } from './pricing.service';
import { CalculatedRoute, Leg, PricingRule, DurationContext } from './types';
import { TransportType } from '../../../generated/prisma';
import { DEFAULT_WALKING_POLICY, WalkingPolicy } from '../walking-policy';
import { filterWalkingHeavy } from '../walking-filter';
import { getCompositeDurationMultiplier } from '../../duration-patterns';
import prisma from '../../lib/prisma';

// ─── WEIGHTS ──────────────────────────────────────────────────────────────
// Balanced. Weight = normalizedPrice * 0.3 + effectiveDuration * 0.7.
// Walking edges are penalized (in duration) so they're used only as
// connectors, and are free in the price dimension.

const BALANCED_PRICE_WEIGHT = 0.3;
const BALANCED_DURATION_WEIGHT = 0.7;

// Price scaling: convert CFA to a comparable unit for the balanced formula.
// 100 CFA ≈ 1 minute of "cost" in balanced terms.
const PRICE_TO_TIME_SCALE = 1 / 100;

// ─── ERRORS ───────────────────────────────────────────────────────────────

export class NoValidRouteError extends Error {
  code = 'NO_VALID_ROUTE';
  hint = 'Try different stops. Walking distance limits may make this trip unreachable.';
  constructor(message: string) {
    super(message);
    this.name = 'NoValidRouteError';
  }
}

// ─── SEARCH STATE ───────────────────────────────────────────────────────

interface DijkstraState {
  nodeId: string;

  // Boarding context — used to detect "am I continuing the same,
  // uninterrupted boarding" for marginal-price purposes. Mirrors
  // coalescer.ts's isContiguous() so the price Dijkstra charges matches
  // what the leg the response will actually show once coalesced.
  boardingRouteId: string | null;
  boardingDirection: 'forward' | 'backward' | null;
  boardingLastSequence: number | null;
  boardingStreak: number; // segments ridden so far on the current boarding

  // Walking context
  walkStepsUsed: number;     // number of walking LEGS used so far (not raw edges)
  walkConsecutive: number;   // consecutive raw walking edges right now (0 if last edge wasn't walking)
  walkDistanceUsed: number;  // cumulative walking distance in meters (see limitation note above)

  hasBoarded: boolean; // true once at least one non-walking edge has been taken
}

function initialState(nodeId: string): DijkstraState {
  return {
    nodeId,
    boardingRouteId: null,
    boardingDirection: null,
    boardingLastSequence: null,
    boardingStreak: 0,
    walkStepsUsed: 0,
    walkConsecutive: 0,
    walkDistanceUsed: 0,
    hasBoarded: false,
  };
}

function stateKey(s: DijkstraState): string {
  return [
    s.nodeId,
    s.boardingRouteId ?? '_',
    s.boardingDirection ?? '_',
    s.boardingLastSequence ?? '_',
    s.boardingStreak,
    s.walkStepsUsed,
    s.walkConsecutive,
    s.hasBoarded ? 1 : 0,
  ].join('|');
}

// Mirrors coalescer.ts's isContiguous(prev, curr) — kept in sync manually
// since it operates on raw sequence numbers here instead of GraphEdge pairs.
function isContiguousSequence(
  direction: 'forward' | 'backward',
  prevSequence: number,
  currSequence: number
): boolean {
  return direction === 'forward'
    ? currSequence === prevSequence + 1
    : currSequence === prevSequence - 1;
}

// ─── MIN-HEAP ───────────────────────────────────────────────────────────
// The search space is now (node × boarding/walking state), which can be
// meaningfully larger than the plain node count, so a linear extract-min
// (as the previous single-label-per-node Dijkstra used) would scale poorly.
// Small binary heap with lazy deletion — standard and dependency-free.

class MinHeap<T> {
  private items: { priority: number; value: T }[] = [];

  get size(): number {
    return this.items.length;
  }

  push(priority: number, value: T): void {
    this.items.push({ priority, value });
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.items[parent].priority <= this.items[i].priority) break;
      [this.items[parent], this.items[i]] = [this.items[i], this.items[parent]];
      i = parent;
    }
  }

  pop(): T | undefined {
    if (this.items.length === 0) return undefined;
    const top = this.items[0];
    const last = this.items.pop()!;
    if (this.items.length > 0) {
      this.items[0] = last;
      let i = 0;
      const n = this.items.length;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        let smallest = i;
        const l = 2 * i + 1;
        const r = 2 * i + 2;
        if (l < n && this.items[l].priority < this.items[smallest].priority) smallest = l;
        if (r < n && this.items[r].priority < this.items[smallest].priority) smallest = r;
        if (smallest === i) break;
        [this.items[smallest], this.items[i]] = [this.items[i], this.items[smallest]];
        i = smallest;
      }
    }
    return top.value;
  }
}

// ─── SERVICE ──────────────────────────────────────────────────────────────

class RoutingService {
  private graphCache: RouteGraph | null = null;
  private lastBuildTime = 0;
  private readonly cacheTTL = 300_000; // 5 min

  // Cache pricing rules per route (loaded from DB, kept until cache clears)
  private pricingCache: Map<string, PricingRule> = new Map();

  async calculateRoute(
    originStopId: string,
    destinationStopId: string,
    context?: { at?: Date; useEffectiveDuration?: boolean }
  ): Promise<CalculatedRoute> {

    if (!originStopId || !destinationStopId) {
      throw new Error('Origin and destination stop IDs are required');
    }
    if (originStopId === destinationStopId) {
      throw new Error('Origin and destination cannot be the same stop');
    }

    const at = context?.at ?? new Date();
    const useEffectiveDuration = context?.useEffectiveDuration ?? true;
    const durationContext: DurationContext = {
      at,
      timeOfDayLabel: '',
      durationMultiplier: 1,
    };
    const composite = getCompositeDurationMultiplier(at);
    durationContext.timeOfDayLabel = composite.timeOfDayLabel;
    durationContext.durationMultiplier = useEffectiveDuration ? composite.multiplier : 1;

    const graph = await this.getGraph();
    await this.ensureStopInGraph(originStopId, graph);
    await this.ensureStopInGraph(destinationStopId, graph);

    await this.ensurePricingCache();

    const trafficMultiplier = useEffectiveDuration ? composite.multiplier : 1;

    // Dijkstra — price-weighted, walking-policy-constrained by construction.
    const path = await this.dijkstra(
      graph,
      originStopId,
      destinationStopId,
      DEFAULT_WALKING_POLICY,
      durationContext,
      useEffectiveDuration
    );

    if (!path) {
      // The constrained search found nothing. Before giving up with a
      // generic message, run an unconstrained (duration-only, no walking
      // limits) search purely for diagnostics: if a path DOES exist but
      // only fails the walking policy, we can tell the caller why, the same
      // way the old post-hoc filter used to.
      const diagnosticPath = await this.dijkstraUnconstrainedForDiagnostics(
        graph,
        originStopId,
        destinationStopId,
        durationContext,
        useEffectiveDuration
      );
      if (diagnosticPath) {
        const diagnosis = filterWalkingHeavy(diagnosticPath, DEFAULT_WALKING_POLICY);
        if (!diagnosis.passes) {
          throw new NoValidRouteError(`No viable route: ${diagnosis.reason ?? 'walking constraints'}.`);
        }
      }
      throw new NoValidRouteError('No route found between these stops.');
    }

    // Defensive sanity check. The constrained search should already
    // guarantee walking-policy compliance by construction — if this ever
    // fails, it means there's a bug in the state-augmented Dijkstra above,
    // not a genuinely unreachable trip. Fail loudly rather than silently
    // handing back (or silently rejecting) a route based on faulty state.
    const sanity = filterWalkingHeavy(path, DEFAULT_WALKING_POLICY);
    if (!sanity.passes) {
      console.error(
        `⚠️ Dijkstra returned a path violating the walking policy (${sanity.reason}). ` +
        `This indicates a bug in the state-augmented search, not a legitimately unreachable trip.`
      );
      throw new NoValidRouteError('No route found between these stops.');
    }

    // Coalesce into legs
    const legs = coalescePath(path, {
      getPricing: (routeId) => {
        const p = this.pricingCache.get(routeId);
        if (!p) throw new Error(`No pricing cached for route ${routeId}`);
        return p;
      },
      trafficMultiplier,
      walkingTimePenalty: DEFAULT_WALKING_POLICY.timePenalty,
    });

    // Compute totals
    let totalPrice = 0;
    let totalBaseDuration = 0;
    let totalEffectiveDuration = 0;
    let totalWalkingDistanceM = 0;
    let boardingCount = 0;
    let walkingCount = 0;

    for (const leg of legs) {
      if (leg.type === 'boarding') {
        totalPrice += leg.price;
        totalBaseDuration += leg.baseDuration;
        totalEffectiveDuration += leg.effectiveDuration;
        boardingCount++;
      } else {
        totalBaseDuration += leg.baseDuration;
        totalEffectiveDuration += leg.effectiveDuration;
        totalWalkingDistanceM += leg.distanceM;
        walkingCount++;
      }
    }

    return {
      id: `route_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      legs,
      totalPrice,
      totalBaseDuration,
      totalEffectiveDuration,
      totalWalkingDistanceM,
      boardingCount,
      walkingCount,
      durationContext,
    };
  }

  // ─── Pricing cache ──────────────────────────────────────────────────
  private async ensurePricingCache(): Promise<void> {
    if (this.pricingCache.size > 0) return;

    const routes = await prisma.route.findMany({
      select: { id: true, pricing: true },
    });
    for (const r of routes) {
      const pricing = r.pricing as unknown as PricingRule;
      validatePricing(pricing);
      this.pricingCache.set(r.id, pricing);
    }
    console.log(`💰 Cached pricing for ${this.pricingCache.size} routes`);
  }

  // ─── Graph helpers ──────────────────────────────────────────────────
  private async ensureStopInGraph(stopId: string, graph: RouteGraph): Promise<void> {
    if (!graph.edges.has(stopId)) graph.edges.set(stopId, []);
    if (!graph.nodeNames.has(stopId)) {
      const stop = await prisma.stop.findUnique({
        where: { id: stopId },
        select: { name: true },
      });
      if (!stop) throw new Error(`Stop not found: ${stopId}`);
      graph.nodeNames.set(stopId, stop.name);
    }
  }

  private async getGraph(): Promise<RouteGraph> {
    const now = Date.now();
    if (!this.graphCache || now - this.lastBuildTime > this.cacheTTL) {
      console.log('🔄 Building fresh graph...');
      this.graphCache = await buildGraph();
      this.lastBuildTime = now;
      this.pricingCache.clear(); // routes/pricing can change between rebuilds too
    } else {
      console.log(`📦 Using cached graph (age ${Math.round((now - this.lastBuildTime) / 1000)}s)`);
    }
    return this.graphCache;
  }

  // ─── Marginal pricing ─────────────────────────────────────────────
  // The cost of taking `edge` given the boarding context in `state`. Free
  // for walking. For a boarding edge, this is the marginal price of
  // extending the current uninterrupted boarding by one more segment
  // (0 if `edge` starts a fresh boarding instead of continuing one).
  private computeMarginalPrice(edge: GraphEdge, state: DijkstraState): number {
    const pricingRule = this.pricingCache.get(edge.routeId);
    if (!pricingRule) return 0; // shouldn't happen — pricing cache is pre-filled

    const continuing =
      state.boardingRouteId === edge.routeId &&
      state.boardingDirection === edge.direction &&
      state.boardingLastSequence !== null &&
      isContiguousSequence(edge.direction, state.boardingLastSequence, edge.sequence);

    const priorStops = continuing ? state.boardingStreak : 0;
    const newStops = priorStops + 1;

    // computeBoardingPrice(rule, 0) is NOT a safe stand-in for "0 CFA so
    // far" — flat pricing ignores its distance argument entirely and would
    // return the full fare even at distance 0. Treat priorStops === 0 as an
    // explicit zero baseline instead.
    const priorPrice = priorStops === 0 ? 0 : computeBoardingPrice(pricingRule, priorStops);
    const newPrice = computeBoardingPrice(pricingRule, newStops);

    return Math.max(0, newPrice - priorPrice);
  }

  // ─── Weight function ────────────────────────────────────────────────
  private computeEdgeWeight(
    edge: GraphEdge,
    state: DijkstraState,
    durationContext: DurationContext,
    useEffectiveDuration: boolean
  ): number {
    const isWalking = edge.transportType === TransportType.walking;

    let effectiveDuration: number;
    if (isWalking) {
      effectiveDuration = edge.duration * DEFAULT_WALKING_POLICY.timePenalty;
    } else if (useEffectiveDuration) {
      effectiveDuration = edge.duration * durationContext.durationMultiplier;
    } else {
      effectiveDuration = edge.duration;
    }

    const priceDelta = isWalking ? 0 : this.computeMarginalPrice(edge, state);
    const normalizedPrice = priceDelta * PRICE_TO_TIME_SCALE;

    return (normalizedPrice * BALANCED_PRICE_WEIGHT) + (effectiveDuration * BALANCED_DURATION_WEIGHT);
  }

  // ─── State transition ───────────────────────────────────────────────
  // Returns the resulting state after taking `edge` from `state`, or null
  // if the transition is inadmissible under `policy` (this IS the walking
  // filter now — folded into the search instead of applied after it).
  private transition(state: DijkstraState, edge: GraphEdge, policy: WalkingPolicy): DijkstraState | null {
    const isWalking = edge.transportType === TransportType.walking;

    if (isWalking) {
      // Rule 1 — single step too long (defensive; graph builder already
      // only generates walking edges within maxStepDistanceM).
      if ((edge.distanceM ?? 0) > policy.maxStepDistanceM) return null;

      // Rule 4 — consecutive walking edges
      const newConsecutive = state.walkConsecutive + 1;
      if (newConsecutive > policy.maxConsecutiveSteps) return null;

      // Rule 3 — total walking legs. Only counts as a NEW leg if the
      // previous edge wasn't already walking (i.e. this isn't a merge into
      // an ongoing walking leg).
      const startingNewLeg = state.walkConsecutive === 0;
      const newStepsUsed = state.walkStepsUsed + (startingNewLeg ? 1 : 0);
      if (startingNewLeg && newStepsUsed > policy.maxSteps) return null;

      // Rule 2 — total walking distance
      const newDistanceUsed = state.walkDistanceUsed + (edge.distanceM ?? 0);
      if (newDistanceUsed > policy.maxRouteDistanceM) return null;

      return {
        nodeId: edge.to,
        boardingRouteId: null,
        boardingDirection: null,
        boardingLastSequence: null,
        boardingStreak: 0,
        walkStepsUsed: newStepsUsed,
        walkConsecutive: newConsecutive,
        walkDistanceUsed: newDistanceUsed,
        hasBoarded: state.hasBoarded,
      };
    }

    // Boarding edge — no walking-policy checks apply; it resets the
    // consecutive-walk counter and (Rule 5) marks the route as no longer
    // "all walking."
    const continuing =
      state.boardingRouteId === edge.routeId &&
      state.boardingDirection === edge.direction &&
      state.boardingLastSequence !== null &&
      isContiguousSequence(edge.direction, state.boardingLastSequence, edge.sequence);

    const newStreak = continuing ? state.boardingStreak + 1 : 1;

    return {
      nodeId: edge.to,
      boardingRouteId: edge.routeId,
      boardingDirection: edge.direction,
      boardingLastSequence: edge.sequence,
      boardingStreak: newStreak,
      walkStepsUsed: state.walkStepsUsed,
      walkConsecutive: 0,
      walkDistanceUsed: state.walkDistanceUsed,
      hasBoarded: true,
    };
  }

  // ─── Dijkstra (state-augmented) ─────────────────────────────────────
  private async dijkstra(
    graph: RouteGraph,
    start: string,
    end: string,
    walkingPolicy: WalkingPolicy,
    durationContext: DurationContext,
    useEffectiveDuration: boolean
  ): Promise<GraphEdge[] | null> {
    const start0 = initialState(start);
    const startKey = stateKey(start0);

    const best = new Map<string, number>(); // stateKey -> lowest weight found
    const cameFrom = new Map<string, { prevKey: string | null; edge: GraphEdge | null }>();

    best.set(startKey, 0);
    cameFrom.set(startKey, { prevKey: null, edge: null });

    const heap = new MinHeap<{ weight: number; state: DijkstraState; key: string }>();
    heap.push(0, { weight: 0, state: start0, key: startKey });

    // Safety cap — the state space is larger than plain node count, so this
    // is generous relative to the old per-node cap. If this is ever hit in
    // practice for a real query, it's worth logging (see below) since it
    // may mean the graph has grown enough to need the cap raised.
    const maxExpansions = Math.max(graph.edges.size * 50, 20_000);
    let expansions = 0;
    let bestEndKey: string | null = null;

    while (heap.size > 0 && expansions < maxExpansions) {
      const item = heap.pop();
      if (!item) break;
      const { weight, state, key } = item;

      // Stale heap entry — a better path to this exact state was already
      // processed since this entry was pushed.
      if (weight > (best.get(key) ?? Infinity)) continue;
      expansions++;

      if (state.nodeId === end && state.hasBoarded) {
        // First hasBoarded=true state popped at the destination is, by
        // standard Dijkstra correctness (non-negative weights + lazy
        // deletion), the minimum-weight valid route. Safe to stop here.
        bestEndKey = key;
        break;
      }

      const edges = graph.edges.get(state.nodeId) ?? [];
      for (const edge of edges) {
        const nextState = this.transition(state, edge, walkingPolicy);
        if (!nextState) continue; // inadmissible under the walking policy

        const edgeWeight = this.computeEdgeWeight(edge, state, durationContext, useEffectiveDuration);
        const newWeight = weight + edgeWeight;
        const nextKey = stateKey(nextState);

        if (newWeight < (best.get(nextKey) ?? Infinity)) {
          best.set(nextKey, newWeight);
          cameFrom.set(nextKey, { prevKey: key, edge });
          heap.push(newWeight, { weight: newWeight, state: nextState, key: nextKey });
        }
      }
    }

    if (expansions >= maxExpansions) {
      console.warn(`⚠️ Dijkstra hit its expansion cap (${maxExpansions}) searching ${start} → ${end}.`);
    }

    if (!bestEndKey) return null;

    // Reconstruct path
    const path: GraphEdge[] = [];
    let cursor: string | null = bestEndKey;
    while (cursor) {
      const entry = cameFrom.get(cursor);
      if (!entry || !entry.edge) break;
      path.unshift(entry.edge);
      cursor = entry.prevKey;
    }

    return path.length > 0 ? path : null;
  }

  // ─── Unconstrained Dijkstra (diagnostics only) ──────────────────────
  // Plain node-keyed, duration-only shortest path with no walking-policy
  // awareness at all. Used ONLY when the real search finds nothing, to
  // produce a more specific error message (via filterWalkingHeavy) instead
  // of a generic "no route found." Never used to actually serve a route.
  private async dijkstraUnconstrainedForDiagnostics(
    graph: RouteGraph,
    start: string,
    end: string,
    durationContext: DurationContext,
    useEffectiveDuration: boolean
  ): Promise<GraphEdge[] | null> {
    const distances = new Map<string, number>();
    const pathMap = new Map<string, { prevNode: string | null; edge: GraphEdge | null }>();
    const unvisited = new Set<string>();

    for (const node of graph.edges.keys()) {
      distances.set(node, Infinity);
      pathMap.set(node, { prevNode: null, edge: null });
      unvisited.add(node);
    }
    if (!distances.has(start)) { distances.set(start, Infinity); unvisited.add(start); }
    if (!distances.has(end)) { distances.set(end, Infinity); unvisited.add(end); }
    distances.set(start, 0);

    let iterations = 0;
    const maxIterations = graph.edges.size * 2;

    while (unvisited.size > 0 && iterations < maxIterations) {
      iterations++;
      let current: string | null = null;
      let smallest = Infinity;
      for (const node of unvisited) {
        const d = distances.get(node) ?? Infinity;
        if (d < smallest) { smallest = d; current = node; }
      }
      if (!current || current === end) break;
      if (smallest === Infinity) break;

      unvisited.delete(current);
      const edges = graph.edges.get(current) ?? [];
      for (const edge of edges) {
        if (!unvisited.has(edge.to)) continue;
        const isWalking = edge.transportType === TransportType.walking;
        const duration = isWalking
          ? edge.duration * DEFAULT_WALKING_POLICY.timePenalty
          : (useEffectiveDuration ? edge.duration * durationContext.durationMultiplier : edge.duration);
        const alt = (distances.get(current) ?? Infinity) + duration;
        if (alt < (distances.get(edge.to) ?? Infinity)) {
          distances.set(edge.to, alt);
          pathMap.set(edge.to, { prevNode: current, edge });
        }
      }
    }

    if ((distances.get(end) ?? Infinity) === Infinity) return null;

    const path: GraphEdge[] = [];
    let cursor: string | null = end;
    while (cursor && cursor !== start) {
      const entry = pathMap.get(cursor);
      if (!entry?.edge) return null;
      path.unshift(entry.edge);
      cursor = entry.prevNode;
    }

    return path.length > 0 ? path : null;
  }

  clearCache(): void {
    this.graphCache = null;
    this.lastBuildTime = 0;
    this.pricingCache.clear();
    console.log('🗑️ Graph + pricing cache cleared');
  }
}

export const routingService = new RoutingService();
