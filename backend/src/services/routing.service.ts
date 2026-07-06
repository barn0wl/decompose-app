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
    
    // Compute trust score for the route
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

      const edges = graph.get(current) ?? [];
      for (const edge of edges) {
        if (!unvisited.has(edge.to)) continue;
        const weight = await this.getWeight(edge, weightKey);
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

  private async getVoteAdjustedWeight(edge: GraphEdge, baseWeight: number): Promise<number> {
    if (!edge.connectionId) {
      return baseWeight;
    }

    const connection = await prisma.connection.findUnique({
      where: { id: edge.connectionId },
      select: {
        upvotes: true,
        downvotes: true,
        voteScore: true,
      }
    });

    if (!connection) {
      return baseWeight;
    }

    const totalVotes = connection.upvotes + connection.downvotes;
    if (totalVotes === 0) {
      return baseWeight;
    }

    const confidence = (connection.upvotes - connection.downvotes) / totalVotes;
    const modifier = 1 - (confidence * 0.5);
    return baseWeight * modifier;
  }

  private async getWeight(edge: GraphEdge, weightKey: WeightKey): Promise<number> {
    let baseWeight: number;
    if (weightKey === 'price') {
      baseWeight = edge.price;
    } else if (weightKey === 'duration') {
      baseWeight = edge.duration;
    } else {
      baseWeight = (edge.price / 10) + edge.duration;
    }
    return await this.getVoteAdjustedWeight(edge, baseWeight);
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
   */
  async computeRouteTrustScore(route: CalculatedRoute): Promise<{
    score: number;
    totalVotes: number;
    stepCount: number;
    averageScore: number;
  }> {
    const connectionIds = route.steps
      .map(s => s.connectionId)
      .filter((id): id is string => !!id);

    if (connectionIds.length === 0) {
      return {
        score: 0,
        totalVotes: 0,
        stepCount: 0,
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
        stepCount: connectionIds.length,
        averageScore: 0,
      };
    }

    const totalUpvotes = connections.reduce((sum, c) => sum + c.upvotes, 0);
    const totalDownvotes = connections.reduce((sum, c) => sum + c.downvotes, 0);
    const totalVoteScore = connections.reduce((sum, c) => sum + c.voteScore, 0);
    const totalVotes = totalUpvotes + totalDownvotes;
    const averageScore = connections.length > 0 ? totalVoteScore / connections.length : 0;

    // Normalize score to 0-100
    // Max possible score per connection is roughly 100 (if 100 upvotes, 0 downvotes)
    const normalizedScore = Math.min(Math.max((averageScore / 100) * 100, 0), 100);

    return {
      score: Math.round(normalizedScore),
      totalVotes,
      stepCount: connectionIds.length,
      averageScore,
    };
  }
}

export const routingService = new RoutingService();
