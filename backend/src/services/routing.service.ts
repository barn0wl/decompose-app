import { TransportType } from '@prisma/client';
import prisma from '../lib/prisma.js';

export interface RouteStep {
  type: TransportType;
  from: string;
  to: string;
  price: number;
  duration: number;
  instructions: string;
}

export interface CalculatedRoute {
  id: string;
  totalPrice: number;
  totalDuration: number;
  steps: RouteStep[];
}

interface GraphEdge {
  to: string;
  price: number;
  duration: number;
  transportType: TransportType;
  fromName: string;
  toName: string;
  instructions: string;
}

// Tracks both the previous node and the edge used to get there
interface PathEntry {
  prevNode: string | null;
  edge: GraphEdge | null;
}

type WeightKey = 'price' | 'duration' | 'balanced';

class RoutingService {
  async calculateRoute(
    originStopId: string,
    destinationStopId: string,
    optimizeBy: 'price' | 'time' | 'balanced' = 'price'
  ): Promise<CalculatedRoute[]> {
    const graph = await this.buildGraph();

    const weightKey: WeightKey =
      optimizeBy === 'price' ? 'price' :
      optimizeBy === 'time'  ? 'duration' : 'balanced';

    const result = this.dijkstra(graph, originStopId, destinationStopId, weightKey);

    if (!result) {
      throw new Error('No route found between these stops');
    }

    const route = this.formatRoute(result.steps);
    return [route];
  }

  private async buildGraph(): Promise<Map<string, GraphEdge[]>> {
    const graph = new Map<string, GraphEdge[]>();

    const connections = await prisma.connection.findMany({
      include: { fromStop: true, toStop: true }
    });

    for (const conn of connections) {
      // For MVP: only handle stop-to-stop connections
      // Zone-based connections will be expanded post-MVP
      if (!conn.fromStopId || !conn.toStopId || !conn.fromStop || !conn.toStop) continue;

      const edge: GraphEdge = {
        to: conn.toStopId,
        price: conn.basePrice,
        duration: conn.durationMinutes,
        transportType: conn.transportType,
        fromName: conn.fromStop.name,
        toName: conn.toStop.name,
        instructions: conn.routeDescription ?? this.generateInstructions(
          conn.transportType,
          conn.toStop.name,
          conn.basePrice,
          conn.durationMinutes
        )
      };

      if (!graph.has(conn.fromStopId)) graph.set(conn.fromStopId, []);
      graph.get(conn.fromStopId)!.push(edge);
    }

    return graph;
  }

  private generateInstructions(
    type: TransportType,
    toName: string,
    price: number,
    duration: number
  ): string {
    const verb = type === 'walking' ? 'Walk to' : `Take ${type.replace('_', ' ')} to`;
    return `${verb} ${toName} (${price} CFA, ~${duration} min)`;
  }

  private dijkstra(
    graph: Map<string, GraphEdge[]>,
    start: string,
    end: string,
    weightKey: WeightKey
  ): { steps: GraphEdge[] } | null {
    const distances = new Map<string, number>();
    const pathMap = new Map<string, PathEntry>(); // node -> { prevNode, edge used }
    const unvisited = new Set<string>();

    for (const node of graph.keys()) {
      distances.set(node, Infinity);
      pathMap.set(node, { prevNode: null, edge: null });
      unvisited.add(node);
    }

    // Ensure start and end are in the maps even if they have no outgoing edges
    if (!distances.has(start)) distances.set(start, Infinity);
    if (!distances.has(end)) distances.set(end, Infinity);
    unvisited.add(start);

    distances.set(start, 0);

    while (unvisited.size > 0) {
      // Find unvisited node with smallest distance
      let current: string | null = null;
      let smallest = Infinity;
      for (const node of unvisited) {
        const d = distances.get(node) ?? Infinity;
        if (d < smallest) { smallest = d; current = node; }
      }

      if (!current || current === end) break;
      if (smallest === Infinity) break; // remaining nodes are unreachable

      unvisited.delete(current);

      for (const edge of graph.get(current) ?? []) {
        if (!unvisited.has(edge.to)) continue;
        const alt = (distances.get(current) ?? Infinity) + this.getWeight(edge, weightKey);
        if (alt < (distances.get(edge.to) ?? Infinity)) {
          distances.set(edge.to, alt);
          pathMap.set(edge.to, { prevNode: current, edge });
        }
      }
    }

    if ((distances.get(end) ?? Infinity) === Infinity) return null;

    // Reconstruct steps by walking back through pathMap
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

  private getWeight(edge: GraphEdge, weightKey: WeightKey): number {
    if (weightKey === 'price') return edge.price;
    if (weightKey === 'duration') return edge.duration;
    return (edge.price / 10) + edge.duration; // balanced
  }

  private formatRoute(steps: GraphEdge[]): CalculatedRoute {
    const totalPrice = steps.reduce((sum, s) => sum + s.price, 0);
    const totalDuration = steps.reduce((sum, s) => sum + s.duration, 0);

    return {
      id: `route_${Date.now()}`,
      totalPrice,
      totalDuration,
      steps: steps.map(s => ({
        type: s.transportType,
        from: s.fromName,
        to: s.toName,
        price: s.price,
        duration: s.duration,
        instructions: s.instructions
      }))
    };
  }
}

export const routingService = new RoutingService();