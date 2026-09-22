// src/services/routing/routing.service.ts
// Single-route Dijkstra with balanced-only weighting and leg coalescing.

import { buildGraph, GraphEdge, RouteGraph } from './graph.builder';
import { coalescePath } from './coalescer';
import { validatePricing } from './pricing.service';
import { CalculatedRoute, Leg, PricingRule, DurationContext } from './types';
import { TransportType } from '../../../generated/prisma';
import { DEFAULT_WALKING_POLICY, WalkingPolicy } from '../walking-policy';
import { filterWalkingHeavy } from '../walking-filter';
import { getCompositeDurationMultiplier } from '../../duration-patterns';
import prisma from '../../lib/prisma';

// ─── WEIGHTS ──────────────────────────────────────────────────────────────
// Balanced-only. Weight = normalizedPrice * 0.3 + effectiveDuration * 0.7.
// Walking edges are penalized so they're used only as connectors.

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

    // Dijkstra
    const path = await this.dijkstra(
      graph,
      originStopId,
      destinationStopId,
      DEFAULT_WALKING_POLICY,
      durationContext,
      useEffectiveDuration
    );

    if (!path) {
      throw new NoValidRouteError('No route found between these stops.');
    }

    // Filter walking-heavy
    const filterResult = filterWalkingHeavy(path, DEFAULT_WALKING_POLICY);
    if (!filterResult.passes) {
      throw new NoValidRouteError(
        `No viable route: ${filterResult.reason ?? 'walking constraints'}.`
      );
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
    } else {
      console.log(`📦 Using cached graph (age ${Math.round((now - this.lastBuildTime) / 1000)}s)`);
    }
    return this.graphCache;
  }

  // ─── Weight function (balanced only) ────────────────────────────────
  private computeEdgeWeight(
    edge: GraphEdge,
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

    // Segment price approximation:
    //   walking → 0
    //   motorized → we use 0 here and let the boarding-level pricing handle it.
    //   This means Dijkstra treats all motorized segments as "free" in the price
    //   dimension, but the duration term still differentiates them.
    //
    // This is the Option B approximation. It produces reasonable routes because
    // the number of segments dominates the price in practice, and coalescing +
    // boarding pricing happen afterwards.
    const approximatePrice = 0;

    const normalizedPrice = approximatePrice * PRICE_TO_TIME_SCALE;
    return (normalizedPrice * BALANCED_PRICE_WEIGHT) +
           (effectiveDuration * BALANCED_DURATION_WEIGHT);
  }

  // ─── Dijkstra ───────────────────────────────────────────────────────
  private async dijkstra(
    graph: RouteGraph,
    start: string,
    end: string,
    walkingPolicy: WalkingPolicy,
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
        const w = this.computeEdgeWeight(edge, durationContext, useEffectiveDuration);
        const alt = (distances.get(current) ?? Infinity) + w;
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

    if (path.length === 0) return null;
    return path;
  }

  clearCache(): void {
    this.graphCache = null;
    this.lastBuildTime = 0;
    this.pricingCache.clear();
    console.log('🗑️ Graph + pricing cache cleared');
  }
}

export const routingService = new RoutingService();
