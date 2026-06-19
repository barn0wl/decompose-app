import prisma from '../lib/prisma';
import { TransportType } from '../../generated/prisma';

export interface GraphEdge {
  to: string;
  price: number;
  duration: number;
  transportType: TransportType;
  fromName: string;
  toName: string;
  instructions: string;
  fromZoneId?: string | null;
  toZoneId?: string | null;
}

export interface RouteGraph {
  edges: Map<string, GraphEdge[]>;
  nodeNames: Map<string, string>; // id -> name
}

/**
 * Build the route graph from database connections
 * Expands zone-based connections to all stop-to-stop combinations
 */
export async function buildGraph(): Promise<RouteGraph> {
  const graph = new Map<string, GraphEdge[]>();
  const nodeNames = new Map<string, string>();

  // Get all connections with their related stops and zones
  const connections = await prisma.connection.findMany({
    include: {
      fromStop: true,
      toStop: true,
      fromZone: {
        include: { stops: true }
      },
      toZone: {
        include: { stops: true }
      }
    }
  });

  for (const conn of connections) {
    // Get all "from" nodes
    let fromNodeIds: string[] = [];
    let fromNodeNames: string[] = [];
    
    if (conn.fromStopId && conn.fromStop) {
      // Single stop
      fromNodeIds = [conn.fromStopId];
      fromNodeNames = [conn.fromStop.name];
    } else if (conn.fromZoneId && conn.fromZone) {
      // All stops in the zone
      fromNodeIds = conn.fromZone.stops.map(s => s.id);
      fromNodeNames = conn.fromZone.stops.map(s => s.name);
    } else {
      // Invalid connection - skip
      continue;
    }

    // Get all "to" nodes
    let toNodeIds: string[] = [];
    let toNodeNames: string[] = [];
    
    if (conn.toStopId && conn.toStop) {
      // Single stop
      toNodeIds = [conn.toStopId];
      toNodeNames = [conn.toStop.name];
    } else if (conn.toZoneId && conn.toZone) {
      // All stops in the zone
      toNodeIds = conn.toZone.stops.map(s => s.id);
      toNodeNames = conn.toZone.stops.map(s => s.name);
    } else {
      // Invalid connection - skip
      continue;
    }

    // Add edges for every combination
    for (let i = 0; i < fromNodeIds.length; i++) {
      const fromId = fromNodeIds[i];
      const fromName = fromNodeNames[i];

      // Store node name for later reference
      if (!nodeNames.has(fromId)) {
        nodeNames.set(fromId, fromName);
      }

      if (!graph.has(fromId)) {
        graph.set(fromId, []);
      }

      for (let j = 0; j < toNodeIds.length; j++) {
        const toId = toNodeIds[j];
        const toName = toNodeNames[j];

        // Store node name for later reference
        if (!nodeNames.has(toId)) {
          nodeNames.set(toId, toName);
        }

        const edge: GraphEdge = {
          to: toId,
          price: conn.basePrice,
          duration: conn.durationMinutes,
          transportType: conn.transportType,
          fromName: fromName,
          toName: toName,
          instructions: conn.routeDescription ?? generateInstructions(
            conn.transportType,
            toName,
            conn.basePrice,
            conn.durationMinutes
          ),
          fromZoneId: conn.fromZoneId,
          toZoneId: conn.toZoneId
        };

        graph.get(fromId)!.push(edge);
      }
    }
  }

  return { edges: graph, nodeNames };
}

/**
 * Generate default instructions if none provided
 */
function generateInstructions(
  type: TransportType,
  toName: string,
  price: number,
  duration: number
): string {
  const verb = type === 'walking' ? 'Walk to' : `Take ${type.replace('_', ' ')} to`;
  return `${verb} ${toName} (${price} CFA, ~${duration} min)`;
}
