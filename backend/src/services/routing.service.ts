import { TransportType } from '../../generated/prisma';
import { buildGraph, GraphEdge, RouteGraph } from './graph.builder';
import prisma from '../lib/prisma';

export interface RouteStep {
  type: TransportType;
  from: string;
  to: string;
  price: number;
  duration: number;
  instructions: string;
  fromZone?: string | null;
  toZone?: string | null;
  connectionId?: string;
  stepIndex?: number;
  fromLatitude?: number;
  fromLongitude?: number;
  toLatitude?: number;
  toLongitude?: number;
}

export interface CalculatedRoute {
  id: string;
  totalPrice: number;
  totalDuration: number;
  steps: RouteStep[];
  trustScore?: {
    score: number;
    totalVotes: number;
    stepCount: number;
    averageScore: number;
  };
}

interface PathEntry {
  prevNode: string | null;
  edge: GraphEdge | null;
}

type WeightKey = 'price' | 'duration' | 'balanced';

class RoutingService {
  private graphCache: RouteGraph | null = null;
  private lastBuildTime: number = 0;

  async calculateRoute(
    originStopId: string,
    destinationStopId: string,
    optimizeBy: 'price' | 'time' | 'balanced' = 'price'
  ): Promise<CalculatedRoute[]> {
    const graph = await this.getGraph();

    if (!graph.edges.has(originStopId)) {
      graph.edges.set(originStopId, []);
    }
    if (!graph.nodeNames.has(originStopId)) {
      const stop = await prisma.stop.findUnique({
        where: { id: originStopId },
        select: { name: true }
      });
      if (stop) graph.nodeNames.set(originStopId, stop.name);
    }

    const weightKey: WeightKey =
      optimizeBy === 'price' ? 'price' :
      optimizeBy === 'time' ? 'duration' : 'balanced';

    const result = await this.dijkstra(
      graph.edges,
      originStopId,
      destinationStopId,
      weightKey
    );

    if (!result) {
      throw new Error('No route found between these stops');
    }

    const route = this.formatRoute(result.steps);
    const trustScore = await this.computeRouteTrustScore(route);
    
    return [{
      ...route,
      trustScore,
    }];
  }

  private async getGraph(): Promise<RouteGraph> {
    const now = Date.now();
    if (!this.graphCache || (now - this.lastBuildTime) > 300000) {
      this.graphCache = await buildGraph();
      this.lastBuildTime = now;
    }
    return this.graphCache;
  }

  private async dijkstra(
    graph: Map<string, GraphEdge[]>,
    start: string,
    end: string,
    weightKey: WeightKey
  ): Promise<{ steps: GraphEdge[] } | null> {
    const distances = new Map<string, number>();
    const pathMap = new Map<string, PathEntry>();
    const unvisited = new Set<string>();

    for (const node of graph.keys()) {
      distances.set(node, Infinity);
      pathMap.set(node, { prevNode: null, edge: null });
      unvisited.add(node);
    }

    if (!distances.has(start)) distances.set(start, Infinity);
    if (!distances.has(end)) distances.set(end, Infinity);
    unvisited.add(start);
    distances.set(start, 0);

    while (unvisited.size > 0) {
      let current: string | null = null;
      let smallest = Infinity;
      for (const node of unvisited) {
        const d = distances.get(node) ?? Infinity;
        if (d < smallest) {
          smallest = d;
          current = node;
        }
      }

      if (!current || current === end) break;
      if (smallest === Infinity) break;

      unvisited.delete(current);

      // Collect all connection IDs from the graph (excluding walking edges)
      const allConnectionIds = new Set<string>();
      for (const edges of graph.values()) {
        for (const e of edges) {
          if (e.connectionId) allConnectionIds.add(e.connectionId);
        }
      }

      // Fetch all vote stats in one query
      const voteStats = await prisma.connection.findMany({
        where: { id: { in: [...allConnectionIds] } },
        select: { id: true, upvotes: true, downvotes: true }
      });
      const voteStatsMap = new Map(voteStats.map(v => [v.id, { upvotes: v.upvotes, downvotes: v.downvotes }]));

      const edges = graph.get(current) ?? [];
      for (const edge of edges) {
        if (!unvisited.has(edge.to)) continue;
        const weight = await this.getWeight(edge, weightKey, voteStatsMap);
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

    return { steps };
  }

  /**
   * Get vote-adjusted weight for an edge
   * Walking connections (no connectionId) skip vote adjustment
   */
  private async getVoteAdjustedWeight(
    edge: GraphEdge,
    baseWeight: number,
    voteStatsMap: Map<string, { upvotes: number; downvotes: number }>
  ): Promise<number> {
    if (!edge.connectionId || edge.transportType === TransportType.walking) return baseWeight;
    const stats = voteStatsMap.get(edge.connectionId);
    if (!stats) return baseWeight;
    const total = stats.upvotes + stats.downvotes;
    if (total === 0) return baseWeight;
    const confidence = (stats.upvotes - stats.downvotes) / total;
    return baseWeight * (1 - confidence * 0.5);
  }

  private async getWeight(
    edge: GraphEdge,
    weightKey: WeightKey,
    voteStatsMap: Map<string, { upvotes: number; downvotes: number }>
  ): Promise<number> {
    let baseWeight: number;
    if (weightKey === 'price') {
      baseWeight = edge.price;
    } else if (weightKey === 'duration') {
      baseWeight = edge.duration;
    } else {
      baseWeight = (edge.price / 10) + edge.duration;
    }
    return this.getVoteAdjustedWeight(edge, baseWeight, voteStatsMap);
  }

  private formatRoute(steps: GraphEdge[]): CalculatedRoute {
    const totalPrice = steps.reduce((sum, s) => sum + s.price, 0);
    const totalDuration = steps.reduce((sum, s) => sum + s.duration, 0);

    return {
      id: `route_${Date.now()}`,
      totalPrice,
      totalDuration,
      steps: steps.map((s, index) => ({
        type: s.transportType,
        from: s.fromName,
        to: s.toName,
        price: s.price,
        duration: s.duration,
        instructions: s.instructions,
        fromZone: s.fromZoneId || null,
        toZone: s.toZoneId || null,
        connectionId: s.connectionId,
        stepIndex: index,
        fromLatitude: s.fromLatitude,
        fromLongitude: s.fromLongitude,
        toLatitude: s.toLatitude,
        toLongitude: s.toLongitude,
      }))
    };
  }

  /**
   * Compute a trust score for a route based on vote stats of its connections
   * Returns a score from 0-100 where:
   * - 0: No votes or all negative
   * - 50: Neutral
   * - 100: All positive
   * 
   * Walking connections are excluded from trust score calculation
   * since they don't have votes.
   */
  async computeRouteTrustScore(route: CalculatedRoute): Promise<{
    score: number;
    totalVotes: number;
    stepCount: number;
    averageScore: number;
  }> {
    // Filter out walking connections - they don't have votes
    const nonWalkingSteps = route.steps.filter(step => step.type !== 'walking');
    const connectionIds = nonWalkingSteps
      .map(s => s.connectionId)
      .filter((id): id is string => !!id);

    const totalSteps = route.steps.length;
    const nonWalkingCount = nonWalkingSteps.length;

    if (connectionIds.length === 0) {
      return {
        score: 0,
        totalVotes: 0,
        stepCount: totalSteps,
        averageScore: 0,
      };
    }

    const connections = await prisma.connection.findMany({
      where: {
        id: { in: connectionIds },
      },
      select: {
        upvotes: true,
        downvotes: true,
        voteScore: true,
      },
    });

    if (connections.length === 0) {
      return {
        score: 0,
        totalVotes: 0,
        stepCount: totalSteps,
        averageScore: 0,
      };
    }

    const totalUpvotes = connections.reduce((sum, c) => sum + c.upvotes, 0);
    const totalDownvotes = connections.reduce((sum, c) => sum + c.downvotes, 0);
    const totalVoteScore = connections.reduce((sum, c) => sum + c.voteScore, 0);
    const totalVotes = totalUpvotes + totalDownvotes;
    const averageScore = connections.length > 0 ? totalVoteScore / connections.length : 0;

    // Normalize score to 0-100
    const normalizedScore = Math.min(Math.max((averageScore / 100) * 100, 0), 100);

    return {
      score: Math.round(normalizedScore),
      totalVotes,
      stepCount: totalSteps, // Include walking steps in count
      averageScore,
    };
  }
}

export const routingService = new RoutingService();
