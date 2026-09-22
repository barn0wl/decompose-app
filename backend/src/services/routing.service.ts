import { TransportType } from '../../generated/prisma';
import { buildGraph, GraphEdge, RouteGraph } from './graph.builder';
import { WalkingPolicy, DEFAULT_WALKING_POLICY } from './walking-policy';
import { filterWalkingHeavy } from './walking-filter';
import {getCompositeDurationMultiplier } from '../duration-patterns';
import prisma from '../lib/prisma';

// ─── INTERFACES ───────────────────────────────────────────────────────────

export interface RouteStep {
  type: TransportType;
  from: string;
  to: string;
  price: number;
  duration: number;
  baseDuration: number;
  effectiveDuration: number;
  instructions: string;
  connectionId?: string;
  stepIndex?: number;
  fromLatitude?: number;
  fromLongitude?: number;
  toLatitude?: number;
  toLongitude?: number;
}

export interface DurationContext {
  at: Date;
  timeOfDayLabel: string;
  durationMultiplier: number;
}

export interface CalculatedRoute {
  id: string;
  totalPrice: number;
  totalDuration: number;
  totalBaseDuration: number;
  totalEffectiveDuration: number;
  durationContext: DurationContext;
  steps: RouteStep[];
  trustScore?: {
    score: number;
    totalVotes: number;
    stepCount: number;
    averageScore: number;
  };
  rank?: number;
  isFastest?: boolean;
  isCheapest?: boolean;
  isBestBalanced?: boolean;
}

interface PathEntry {
  prevNode: string | null;
  edge: GraphEdge | null;
}

type WeightKey = 'price' | 'duration' | 'balanced';

// ─── CONFIGURATION ────────────────────────────────────────────────────────

const MAX_ROUTES_TO_RETURN = 5;
const BALANCED_PRICE_WEIGHT = 0.3;
const BALANCED_DURATION_WEIGHT = 0.7;

// ─── ERROR ────────────────────────────────────────────────────────────────

export class NoValidRouteError extends Error {
  code = 'NO_VALID_ROUTE';
  hint = 'Try optimizing by time or balanced instead of price.';
  constructor(message: string) {
    super(message);
    this.name = 'NoValidRouteError';
  }
}

// ─── SERVICE ──────────────────────────────────────────────────────────────

class RoutingService {
  private graphCache: RouteGraph | null = null;
  private lastBuildTime: number = 0;
  private readonly cacheTTL: number = 300000; // 5 min

  async calculateRoute(
    originStopId: string,
    destinationStopId: string,
    optimizeBy: 'price' | 'time' | 'balanced' = 'price',
    limit: number = 1,
    walkingPolicy: WalkingPolicy = DEFAULT_WALKING_POLICY,
    context?: { at?: Date; useEffectiveDuration?: boolean }
  ): Promise<CalculatedRoute[]> {

    if (!originStopId || !destinationStopId) {
      throw new Error('Origin and destination stop IDs are required');
    }
    if (originStopId === destinationStopId) {
      throw new Error('Origin and destination cannot be the same stop');
    }

    const at = context?.at ?? new Date();
    const useEffectiveDuration = context?.useEffectiveDuration ?? true;
    const durationContext = getCompositeDurationMultiplier(at);

    const routeLimit = Math.min(Math.max(1, limit), MAX_ROUTES_TO_RETURN);
    const graph = await this.getGraph();

    await this.ensureStopInGraph(originStopId, graph);
    await this.ensureStopInGraph(destinationStopId, graph);

    const weightKey: WeightKey =
      optimizeBy === 'price' ? 'price' :
      optimizeBy === 'time' ? 'duration' : 'balanced';

    const voteStatsMap = await this.fetchAllVoteStats(graph);

    // ── Attempt 1: single shortest path ──────────────────────────────
    if (routeLimit === 1) {
      const single = await this.dijkstra(
        graph.edges, originStopId, destinationStopId,
        weightKey, voteStatsMap, walkingPolicy,
        durationContext, useEffectiveDuration
      );

      if (single) {
        const filterResult = filterWalkingHeavy(single.steps, walkingPolicy);
        if (filterResult.passes) {
          const formatted = await this.formatRoutes([single.steps], optimizeBy, durationContext);
          return this.addRouteComparison(formatted, optimizeBy);
        }
      }
    }

    // ── Attempt 2: k-shortest fallback ───────────────────────────────
    const K = Math.max(routeLimit, 5);
    const candidates = await this.yenAlgorithm(
      graph.edges, originStopId, destinationStopId,
      weightKey, K, voteStatsMap, walkingPolicy,
      durationContext, useEffectiveDuration
    );

    const passing = candidates.filter(p =>
      filterWalkingHeavy(p, walkingPolicy).passes
    );

    if (passing.length === 0) {
      throw new NoValidRouteError(
        'No viable route found under current walking constraints.'
      );
    }

    const formatted = await this.formatRoutes(
      passing.slice(0, routeLimit), optimizeBy, durationContext
    );
    return this.addRouteComparison(formatted, optimizeBy);
  }

  // ─── Vote stats (unchanged) ─────────────────────────────────────────
  private async fetchAllVoteStats(
    graph: RouteGraph
  ): Promise<Map<string, { upvotes: number; downvotes: number }>> {
    const allConnectionIds = new Set<string>();
    for (const edges of graph.edges.values()) {
      for (const e of edges) {
        if (e.connectionId && e.transportType !== TransportType.walking) {
          allConnectionIds.add(e.connectionId);
        }
      }
    }
    if (allConnectionIds.size === 0) return new Map();

    const voteStats = await prisma.connection.findMany({
      where: { id: { in: [...allConnectionIds] } },
      select: { id: true, upvotes: true, downvotes: true },
    });

    return new Map(voteStats.map(v => [v.id, { upvotes: v.upvotes, downvotes: v.downvotes }]));
  }

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
    if (!this.graphCache || (now - this.lastBuildTime) > this.cacheTTL) {
      console.log('🔄 Building fresh graph...');
      this.graphCache = await buildGraph();
      this.lastBuildTime = now;
    } else {
      console.log(`📦 Using cached graph (age ${Math.round((now - this.lastBuildTime) / 1000)}s)`);
    }
    return this.graphCache;
  }

  // ─── Weight function ────────────────────────────────────────────────
  private async getWeight(
    edge: GraphEdge,
    weightKey: WeightKey,
    voteStatsMap: Map<string, { upvotes: number; downvotes: number }>,
    walkingPolicy: WalkingPolicy,
    durationContext: { multiplier: number; timeOfDayLabel: string },
    useEffectiveDuration: boolean
  ): Promise<number> {
    const isWalking = edge.transportType === TransportType.walking;

    let effectivePrice = edge.price;
    let effectiveDuration = edge.duration;

    if (isWalking) {
      // Phase 1: walking has no monetary penalty; hard limits do the work.
      // Phase 3 will remove this branch entirely (new router).
      effectivePrice = edge.price;   // = 0 for walking
      effectiveDuration = edge.duration * walkingPolicy.timePenalty;
    }

    let baseWeight: number;
    if (weightKey === 'price') {
      baseWeight = effectivePrice;
    } else if (weightKey === 'duration') {
      baseWeight = effectiveDuration;
    } else {
      const normalizedPrice = effectivePrice / 10;
      baseWeight = (normalizedPrice * BALANCED_PRICE_WEIGHT) +
                   (effectiveDuration * BALANCED_DURATION_WEIGHT);
    }

    return this.getVoteAdjustedWeight(edge, baseWeight, voteStatsMap);
  }

  private async getVoteAdjustedWeight(
    edge: GraphEdge,
    baseWeight: number,
    voteStatsMap: Map<string, { upvotes: number; downvotes: number }>
  ): Promise<number> {
    if (!edge.connectionId || edge.transportType === TransportType.walking) {
      return baseWeight;
    }
    const stats = voteStatsMap.get(edge.connectionId);
    if (!stats) return baseWeight;
    const totalVotes = stats.upvotes + stats.downvotes;
    if (totalVotes === 0) return baseWeight;
    const confidence = (stats.upvotes - stats.downvotes) / totalVotes;
    const modifier = 1 - (confidence * 0.5);
    return baseWeight * modifier;
  }

  // ─── Dijkstra ───────────────────────────────────────────────────────
  private async dijkstra(
    graph: Map<string, GraphEdge[]>,
    start: string,
    end: string,
    weightKey: WeightKey,
    voteStatsMap: Map<string, { upvotes: number; downvotes: number }>,
    walkingPolicy: WalkingPolicy,
    durationContext: { multiplier: number; timeOfDayLabel: string },
    useEffectiveDuration: boolean
  ): Promise<{ steps: GraphEdge[] } | null> {
    const distances = new Map<string, number>();
    const pathMap = new Map<string, PathEntry>();
    const unvisited = new Set<string>();

    for (const node of graph.keys()) {
      distances.set(node, Infinity);
      pathMap.set(node, { prevNode: null, edge: null });
      unvisited.add(node);
    }
    if (!distances.has(start)) { distances.set(start, Infinity); unvisited.add(start); }
    if (!distances.has(end)) { distances.set(end, Infinity); unvisited.add(end); }
    distances.set(start, 0);

    let iterations = 0;
    const maxIterations = graph.size * 2;

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
      const edges = graph.get(current) ?? [];
      for (const edge of edges) {
        if (!unvisited.has(edge.to)) continue;
        const weight = await this.getWeight(
          edge, weightKey, voteStatsMap, walkingPolicy,
          durationContext, useEffectiveDuration
        );
        const alt = (distances.get(current) ?? Infinity) + weight;
        if (alt < (distances.get(edge.to) ?? Infinity)) {
          distances.set(edge.to, alt);
          pathMap.set(edge.to, { prevNode: current, edge });
        }
      }
    }

    if ((distances.get(end) ?? Infinity) === Infinity) return null;

    const steps: GraphEdge[] = [];
    let cursor: string | null = end;
    while (cursor && cursor !== start) {
      const entry = pathMap.get(cursor);
      if (!entry?.edge) break;
      steps.unshift(entry.edge);
      cursor = entry.prevNode;
    }
    if (steps.length === 0) return null;
    return { steps };
  }

  // ─── Yen's algorithm ───────────────────────────────────────────────
  private async yenAlgorithm(
    graph: Map<string, GraphEdge[]>,
    start: string,
    end: string,
    weightKey: WeightKey,
    K: number,
    voteStatsMap: Map<string, { upvotes: number; downvotes: number }>,
    walkingPolicy: WalkingPolicy,
    durationContext: { multiplier: number; timeOfDayLabel: string },
    useEffectiveDuration: boolean
  ): Promise<GraphEdge[][]> {
    const workingGraph = this.cloneGraph(graph);
    const A: GraphEdge[][] = [];
    const B: { path: GraphEdge[]; cost: number; key: string }[] = [];

    const firstPath = await this.dijkstra(
      workingGraph, start, end, weightKey, voteStatsMap, walkingPolicy,
      durationContext, useEffectiveDuration
    );
    if (!firstPath) return A;
    A.push(firstPath.steps);

    for (let k = 1; k < K; k++) {
      const prevPath = A[k - 1];
      for (let i = 0; i < prevPath.length; i++) {
        const spurNode = i === 0 ? start : prevPath[i - 1].to;
        const rootPath = prevPath.slice(0, i);
        const removedEdges: { from: string; to: string }[] = [];
        const removedNodes: Set<string> = new Set();

        for (const path of A) {
          if (this.pathsShareRoot(path, rootPath, i)) {
            const nextEdge = path[i];
            if (nextEdge) {
              const fromNode = i === 0 ? start : path[i - 1].to;
              const edges = workingGraph.get(fromNode) || [];
              const edgeIndex = edges.findIndex(e =>
                e.to === nextEdge.to &&
                e.transportType === nextEdge.transportType &&
                e.fromName === nextEdge.fromName &&
                e.toName === nextEdge.toName
              );
              if (edgeIndex !== -1) {
                removedEdges.push({ from: fromNode, to: nextEdge.to });
                edges.splice(edgeIndex, 1);
              }
            }
          }
        }

        const spurNodeId = i === 0 ? start : prevPath[i - 1].to;
        const rootPathNodes = new Set<string>();
        for (const edge of rootPath) rootPathNodes.add(edge.to);
        for (const node of rootPathNodes) {
          if (node !== spurNodeId && node !== start) {
            removedNodes.add(node);
            workingGraph.set(node, []);
          }
        }

        const spurPath = await this.dijkstra(
          workingGraph, spurNode, end, weightKey, voteStatsMap, walkingPolicy,
          durationContext, useEffectiveDuration
        );

        for (const node of removedNodes) workingGraph.set(node, []);

        for (const { from, to } of removedEdges) {
          const originalEdges = graph.get(from) || [];
          const edgeToRestore = originalEdges.find(e => e.to === to);
          if (edgeToRestore) {
            const edges = workingGraph.get(from) || [];
            const exists = edges.some(e => e.to === to);
            if (!exists) edges.push(edgeToRestore);
          }
        }

        if (spurPath) {
          const totalPath = [...rootPath, ...spurPath.steps];
          const pathKey = this.getPathKey(totalPath);
          const isDuplicate = A.some(p => this.getPathKey(p) === pathKey) ||
                              B.some(p => p.key === pathKey);
          if (!isDuplicate) {
            const totalCost = await this.calculatePathCost(
              totalPath, weightKey, voteStatsMap, walkingPolicy,
              durationContext, useEffectiveDuration
            );
            B.push({ path: totalPath, cost: totalCost, key: pathKey });
          }
        }
      }

      if (B.length === 0) break;
      B.sort((a, b) => a.cost - b.cost);
      let foundPath = false;
      while (B.length > 0 && !foundPath) {
        const candidate = B.shift();
        if (candidate) {
          const isDuplicate = A.some(path => this.getPathKey(path) === candidate.key);
          if (!isDuplicate) {
            A.push(candidate.path);
            foundPath = true;
          }
        }
      }
      if (!foundPath) break;
    }

    return A;
  }

  private cloneGraph(graph: Map<string, GraphEdge[]>): Map<string, GraphEdge[]> {
    const clone = new Map<string, GraphEdge[]>();
    for (const [node, edges] of graph) clone.set(node, [...edges]);
    return clone;
  }

  private pathsShareRoot(path: GraphEdge[], rootPath: GraphEdge[], index: number): boolean {
    if (path.length <= index) return false;
    if (rootPath.length !== index) return false;
    return path.slice(0, index).every((e, idx) =>
      e.to === rootPath[idx]?.to &&
      e.fromName === rootPath[idx]?.fromName
    );
  }

  private getPathKey(path: GraphEdge[]): string {
    return path.map(e => e.to).join('->');
  }

  private async calculatePathCost(
    path: GraphEdge[],
    weightKey: WeightKey,
    voteStatsMap: Map<string, { upvotes: number; downvotes: number }>,
    walkingPolicy: WalkingPolicy,
    durationContext: { multiplier: number; timeOfDayLabel: string },
    useEffectiveDuration: boolean
  ): Promise<number> {
    let totalCost = 0;
    for (const edge of path) {
      totalCost += await this.getWeight(
        edge, weightKey, voteStatsMap, walkingPolicy,
        durationContext, useEffectiveDuration
      );
    }
    return totalCost;
  }

  // ─── Formatting (Thread B: base vs effective durations) ────────────
  private formatRoute(
    steps: GraphEdge[],
    durationContext: { multiplier: number; timeOfDayLabel: string },
    at: Date,
    id?: string
  ): CalculatedRoute {
    const totalPrice = steps.reduce((sum, s) => sum + s.price, 0);

    // Compute both base and effective durations
    let totalBaseDuration = 0;
    let totalEffectiveDuration = 0;

    const formattedSteps: RouteStep[] = steps.map((s, index) => {
      const isWalking = s.transportType === TransportType.walking;

      // ← CHANGED: walking isn't traffic-affected, motorized is
      const baseDuration = s.duration;
      const effectiveDuration = isWalking
        ? s.duration
        : Math.max(1, Math.round(s.duration * durationContext.multiplier));

      totalBaseDuration += baseDuration;
      totalEffectiveDuration += effectiveDuration;

      return {
        type: s.transportType,
        from: s.fromName,
        to: s.toName,
        price: s.price,
        duration: effectiveDuration,          // backwards compat
        baseDuration,
        effectiveDuration,
        instructions: s.instructions,
        connectionId: s.connectionId,
        stepIndex: index,
        fromLatitude: s.fromLatitude,
        fromLongitude: s.fromLongitude,
        toLatitude: s.toLatitude,
        toLongitude: s.toLongitude,
      };
    });

    return {
      id: id || `route_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      totalPrice,
      totalDuration: totalEffectiveDuration,     // backwards compat
      totalBaseDuration,
      totalEffectiveDuration,
      durationContext: {
        at,
        timeOfDayLabel: durationContext.timeOfDayLabel,
        durationMultiplier: durationContext.multiplier,
      },
      steps: formattedSteps,
    };
  }

  private async formatRoutes(
    routes: GraphEdge[][],
    optimizeBy: 'price' | 'time' | 'balanced',
    durationContext: { multiplier: number; timeOfDayLabel: string }
  ): Promise<CalculatedRoute[]> {
    const at = new Date();
    return routes.map((route, index) =>
      this.formatRoute(route, durationContext, at, `route_${index + 1}_${Date.now()}`)
    );
  }

  private addRouteComparison(
    routes: CalculatedRoute[],
    optimizeBy: 'price' | 'time' | 'balanced'
  ): CalculatedRoute[] {
    if (routes.length <= 1) {
      return routes.map(route => ({
        ...route,
        isFastest: true,
        isCheapest: true,
        isBestBalanced: optimizeBy === 'balanced',
      }));
    }

    const minPrice = Math.min(...routes.map(r => r.totalPrice));
    const minDuration = Math.min(...routes.map(r => r.totalEffectiveDuration));
    let bestBalanced = routes[0];
    if (optimizeBy === 'balanced') {
      let bestScore = Infinity;
      for (const route of routes) {
        const normalizedPrice = route.totalPrice / 10;
        const score = (normalizedPrice * BALANCED_PRICE_WEIGHT) +
                      (route.totalEffectiveDuration * BALANCED_DURATION_WEIGHT);
        if (score < bestScore) { bestScore = score; bestBalanced = route; }
      }
    }

    return routes.map(route => ({
      ...route,
      isFastest: route.totalEffectiveDuration === minDuration,
      isCheapest: route.totalPrice === minPrice,
      isBestBalanced: optimizeBy === 'balanced' && route === bestBalanced,
    }));
  }

  async computeRouteTrustScore(route: CalculatedRoute): Promise<{
    score: number;
    totalVotes: number;
    stepCount: number;
    averageScore: number;
  }> {
    const nonWalkingSteps = route.steps.filter(step => step.type !== 'walking');
    const connectionIds = nonWalkingSteps.map(s => s.connectionId).filter((id): id is string => !!id);
    const totalSteps = route.steps.length;

    if (connectionIds.length === 0) {
      return { score: 0, totalVotes: 0, stepCount: totalSteps, averageScore: 0 };
    }

    const connections = await prisma.connection.findMany({
      where: { id: { in: connectionIds } },
      select: { upvotes: true, downvotes: true, voteScore: true },
    });

    if (connections.length === 0) {
      return { score: 0, totalVotes: 0, stepCount: totalSteps, averageScore: 0 };
    }

    const totalUpvotes = connections.reduce((s, c) => s + c.upvotes, 0);
    const totalDownvotes = connections.reduce((s, c) => s + c.downvotes, 0);
    const totalVoteScore = connections.reduce((s, c) => s + c.voteScore, 0);
    const totalVotes = totalUpvotes + totalDownvotes;
    const averageScore = totalVoteScore / connections.length;

    const normalizedScore = ((averageScore - (-100)) / (100 - (-100))) * 100;

    return {
      score: Math.round(Math.min(Math.max(normalizedScore, 0), 100)),
      totalVotes,
      stepCount: totalSteps,
      averageScore,
    };
  }

  clearCache(): void {
    this.graphCache = null;
    this.lastBuildTime = 0;
    console.log('🗑️ Graph cache cleared');
  }

  async getGraphStats(): Promise<{
    nodes: number;
    edges: number;
    walkingEdges: number;
    transportEdges: number;
    lastBuildTime: number;
    cacheAge: number;
  }> {
    const graph = await this.getGraph();
    let totalEdges = 0;
    let walkingEdges = 0;
    let transportEdges = 0;
    for (const edges of graph.edges.values()) {
      for (const edge of edges) {
        totalEdges++;
        if (edge.transportType === TransportType.walking) walkingEdges++;
        else transportEdges++;
      }
    }
    return {
      nodes: graph.edges.size,
      edges: totalEdges,
      walkingEdges,
      transportEdges,
      lastBuildTime: this.lastBuildTime,
      cacheAge: Date.now() - this.lastBuildTime,
    };
  }
}

export const routingService = new RoutingService();
