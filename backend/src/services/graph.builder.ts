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
  connectionId?: string;
  fromLatitude?: number;
  fromLongitude?: number;
  toLatitude?: number;
  toLongitude?: number;
}

export interface RouteGraph {
  edges: Map<string, GraphEdge[]>;
  nodeNames: Map<string, string>;
}

// Walking speed: ~5 km/h = ~83 m/min
// Walking threshold: 2km (2000m) maximum walking distance
const WALKING_SPEED_M_PER_MIN = 83;
const MAX_WALKING_DISTANCE_M = 2000;

// Haversine formula to calculate distance between two coordinates in meters
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function generateWalkingInstructions(fromName: string, toName: string, distance: number, duration: number): string {
  const distanceKm = (distance / 1000).toFixed(1);
  return `Walk from ${fromName} to ${toName} (${distanceKm} km, ~${duration} min)`;
}

/**
 * Build the route graph from database connections
 * Expands zone-based connections to all stop-to-stop combinations
 * Auto-adds walking connections for nearby stops
 */
export async function buildGraph(): Promise<RouteGraph> {
  const graph = new Map<string, GraphEdge[]>();
  const nodeNames = new Map<string, string>();

  // Get all stops with their coordinates
  const allStops = await prisma.stop.findMany({
    select: {
      id: true,
      name: true,
      latitude: true,
      longitude: true,
    },
  });

  // Build node names map
  for (const stop of allStops) {
    nodeNames.set(stop.id, stop.name);
  }

  // ─── Add walking connections between nearby stops ──────────────────────

  console.log(`🚶 Adding walking connections between ${allStops.length} stops...`);
  let walkingConnectionsAdded = 0;

  // For each pair of stops, check if they're within walking distance
  for (let i = 0; i < allStops.length; i++) {
    const from = allStops[i];
    
    for (let j = i + 1; j < allStops.length; j++) {
      const to = allStops[j];
      
      const distance = calculateDistance(
        from.latitude,
        from.longitude,
        to.latitude,
        to.longitude
      );

      // If within walking distance, add bidirectional walking connections
      if (distance <= MAX_WALKING_DISTANCE_M) {
        const durationMinutes = Math.max(1, Math.round(distance / WALKING_SPEED_M_PER_MIN));
        const price = 0; // Walking is free

        // From → To
        const forwardEdge: GraphEdge = {
          to: to.id,
          price: price,
          duration: durationMinutes,
          transportType: TransportType.walking,
          fromName: from.name,
          toName: to.name,
          instructions: generateWalkingInstructions(from.name, to.name, distance, durationMinutes),
          fromLatitude: from.latitude,
          fromLongitude: from.longitude,
          toLatitude: to.latitude,
          toLongitude: to.longitude,
        };

        // To → From (bidirectional)
        const reverseEdge: GraphEdge = {
          to: from.id,
          price: price,
          duration: durationMinutes,
          transportType: TransportType.walking,
          fromName: to.name,
          toName: from.name,
          instructions: generateWalkingInstructions(to.name, from.name, distance, durationMinutes),
          fromLatitude: to.latitude,
          fromLongitude: to.longitude,
          toLatitude: from.latitude,
          toLongitude: from.longitude,
        };

        // Add to graph
        if (!graph.has(from.id)) graph.set(from.id, []);
        if (!graph.has(to.id)) graph.set(to.id, []);
        
        graph.get(from.id)!.push(forwardEdge);
        graph.get(to.id)!.push(reverseEdge);
        
        walkingConnectionsAdded++;
      }
    }
  }

  console.log(`✅ Added ${walkingConnectionsAdded} walking connections`);

  // ─── Add database connections ──────────────────────────────────────────

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
      fromNodeIds = [conn.fromStopId];
      fromNodeNames = [conn.fromStop.name];
    } else if (conn.fromZoneId && conn.fromZone) {
      fromNodeIds = conn.fromZone.stops.map(s => s.id);
      fromNodeNames = conn.fromZone.stops.map(s => s.name);
    } else {
      continue;
    }

    // Get all "to" nodes
    let toNodeIds: string[] = [];
    let toNodeNames: string[] = [];
    
    if (conn.toStopId && conn.toStop) {
      toNodeIds = [conn.toStopId];
      toNodeNames = [conn.toStop.name];
    } else if (conn.toZoneId && conn.toZone) {
      toNodeIds = conn.toZone.stops.map(s => s.id);
      toNodeNames = conn.toZone.stops.map(s => s.name);
    } else {
      continue;
    }

    // Add edges for every combination
    for (let i = 0; i < fromNodeIds.length; i++) {
      const fromId = fromNodeIds[i];
      const fromName = fromNodeNames[i];

      if (!graph.has(fromId)) {
        graph.set(fromId, []);
      }

      for (let j = 0; j < toNodeIds.length; j++) {
        const toId = toNodeIds[j];
        const toName = toNodeNames[j];

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
          toZoneId: conn.toZoneId,
          connectionId: conn.id,
          fromLatitude: conn.fromStop?.latitude,
          fromLongitude: conn.fromStop?.longitude,
          toLatitude: conn.toStop?.latitude,
          toLongitude: conn.toStop?.longitude,
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
