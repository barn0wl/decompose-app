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

// Configuration constants
const WALKING_SPEED_M_PER_MIN = 83; // ~5 km/h
const MAX_WALKING_DISTANCE_M = 2000; // 2km
const CACHE_TTL_MS = 300000; // 5 minutes

/**
 * Get all walking connections using PostGIS spatial query
 * Returns all stop pairs within walking distance with their metadata
 */
async function getWalkingEdgesFromPostGIS(
  maxDistanceMeters: number = MAX_WALKING_DISTANCE_M
): Promise<Array<{
  fromId: string;
  toId: string;
  fromName: string;
  toName: string;
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  distance: number;
}>> {
  try {
    // Use PostGIS to efficiently find all stop pairs within walking distance
    const result = await prisma.$queryRaw`
      SELECT 
        s1.id as "fromId",
        s1.name as "fromName",
        s1.latitude as "fromLat",
        s1.longitude as "fromLng",
        s2.id as "toId",
        s2.name as "toName",
        s2.latitude as "toLat",
        s2.longitude as "toLng",
        ST_Distance(s1.geom, s2.geom) as distance
      FROM "Stop" s1, "Stop" s2
      WHERE s1.id < s2.id 
        AND ST_DWithin(s1.geom, s2.geom, ${maxDistanceMeters})
      ORDER BY s1.id, s2.id
    `;

    return result as any[];
  } catch (error) {
    console.error('❌ PostGIS query failed:', error);
    // Re-throw with a clear message
    throw new Error(`Failed to fetch walking connections from PostGIS: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Generate walking instructions for the UI
 */
function generateWalkingInstructions(
  fromName: string, 
  toName: string, 
  distance: number, 
  duration: number
): string {
  const distanceKm = (distance / 1000).toFixed(1);
  return `Walk from ${fromName} to ${toName} (${distanceKm} km, ~${duration} min)`;
}

/**
 * Generate default transport instructions if none provided in database
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

/**
 * Build the route graph from database connections
 * - Expands zone-based connections to all stop-to-stop combinations
 * - Uses PostGIS for efficient walking edge detection
 * - Returns a graph with all edges and node names
 */
export async function buildGraph(): Promise<RouteGraph> {
  console.log('🏗️ Building route graph...');
  const startTime = Date.now();

  const graph = new Map<string, GraphEdge[]>();
  const nodeNames = new Map<string, string>();

  try {
    // ─── Fetch all stops ──────────────────────────────────────────────
    const allStops = await prisma.stop.findMany({
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
      },
      orderBy: {
        name: 'asc', // Consistent ordering
      },
    });

    if (allStops.length === 0) {
      console.warn('⚠️ No stops found in database');
      return { edges: graph, nodeNames };
    }

    // Build node names map
    for (const stop of allStops) {
      nodeNames.set(stop.id, stop.name);
    }

    console.log(`📍 Found ${allStops.length} stops`);

    // ─── Add walking connections using PostGIS ──────────────────────
    console.log('🚶 Finding walking connections via PostGIS...');
    const walkingEdges = await getWalkingEdgesFromPostGIS(MAX_WALKING_DISTANCE_M);
    
    let walkingConnectionsAdded = 0;

    for (const edge of walkingEdges) {
      const durationMinutes = Math.max(1, Math.round(edge.distance / WALKING_SPEED_M_PER_MIN));
      
      // Forward edge: from → to
      const forwardEdge: GraphEdge = {
        to: edge.toId,
        price: 0,
        duration: durationMinutes,
        transportType: TransportType.walking,
        fromName: edge.fromName,
        toName: edge.toName,
        instructions: generateWalkingInstructions(edge.fromName, edge.toName, edge.distance, durationMinutes),
        fromLatitude: edge.fromLat,
        fromLongitude: edge.fromLng,
        toLatitude: edge.toLat,
        toLongitude: edge.toLng,
      };

      // Reverse edge: to → from (bidirectional)
      const reverseEdge: GraphEdge = {
        to: edge.fromId,
        price: 0,
        duration: durationMinutes,
        transportType: TransportType.walking,
        fromName: edge.toName,
        toName: edge.fromName,
        instructions: generateWalkingInstructions(edge.toName, edge.fromName, edge.distance, durationMinutes),
        fromLatitude: edge.toLat,
        fromLongitude: edge.toLng,
        toLatitude: edge.fromLat,
        toLongitude: edge.fromLng,
      };

      // Add to graph
      if (!graph.has(edge.fromId)) graph.set(edge.fromId, []);
      if (!graph.has(edge.toId)) graph.set(edge.toId, []);
      
      graph.get(edge.fromId)!.push(forwardEdge);
      graph.get(edge.toId)!.push(reverseEdge);
      walkingConnectionsAdded++;
    }

    console.log(`✅ Added ${walkingConnectionsAdded} walking connections via PostGIS`);

    // ─── Add database connections ────────────────────────────────────
    console.log('🚌 Adding database connections...');
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

    console.log(`📊 Found ${connections.length} database connections`);

    let dbConnectionsAdded = 0;
    let zoneConnectionsExpanded = 0;

    for (const conn of connections) {
      // Get all "from" nodes
      let fromNodeIds: string[] = [];
      let fromNodeNames: string[] = [];
      
      if (conn.fromStopId && conn.fromStop) {
        // Single stop
        fromNodeIds = [conn.fromStopId];
        fromNodeNames = [conn.fromStop.name];
      } else if (conn.fromZoneId && conn.fromZone) {
        // Zone expansion: all stops in the zone
        fromNodeIds = conn.fromZone.stops.map(s => s.id);
        fromNodeNames = conn.fromZone.stops.map(s => s.name);
        zoneConnectionsExpanded++;
      } else {
        console.warn(`⚠️ Skipping connection ${conn.id}: No valid origin`);
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
        // Zone expansion: all stops in the zone
        toNodeIds = conn.toZone.stops.map(s => s.id);
        toNodeNames = conn.toZone.stops.map(s => s.name);
        zoneConnectionsExpanded++;
      } else {
        console.warn(`⚠️ Skipping connection ${conn.id}: No valid destination`);
        continue;
      }

      // Validate we have nodes
      if (fromNodeIds.length === 0 || toNodeIds.length === 0) {
        console.warn(`⚠️ Skipping connection ${conn.id}: Empty node list`);
        continue;
      }

      // Add edges for every combination (Cartesian product)
      for (let i = 0; i < fromNodeIds.length; i++) {
        const fromId = fromNodeIds[i];
        const fromName = fromNodeNames[i];

        // Initialize node entry if needed
        if (!graph.has(fromId)) {
          graph.set(fromId, []);
        }

        for (let j = 0; j < toNodeIds.length; j++) {
          const toId = toNodeIds[j];
          const toName = toNodeNames[j];

          // Skip self-loops (shouldn't happen but just in case)
          if (fromId === toId) {
            console.warn(`⚠️ Skipping self-loop: ${fromName} → ${toName}`);
            continue;
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
            toZoneId: conn.toZoneId,
            connectionId: conn.id,
            fromLatitude: conn.fromStop?.latitude ?? fromNodeLatitudes[i] ?? undefined,
            fromLongitude: conn.fromStop?.longitude ?? fromNodeLongitudes[i] ?? undefined,
            toLatitude: conn.toStop?.latitude ?? toNodeLatitudes[j] ?? undefined,
            toLongitude: conn.toStop?.longitude ?? toNodeLongitudes[j] ?? undefined,
          };

          graph.get(fromId)!.push(edge);
          dbConnectionsAdded++;
        }
      }
    }

    console.log(`✅ Added ${dbConnectionsAdded} database edges (${zoneConnectionsExpanded} zones expanded)`);

    // ─── Log graph statistics ────────────────────────────────────────
    const totalNodes = graph.size;
    let totalEdges = 0;
    for (const edges of graph.values()) {
      totalEdges += edges.length;
    }
    
    const buildTime = Date.now() - startTime;
    console.log(`✅ Graph built in ${buildTime}ms`);
    console.log(`📊 Graph stats: ${totalNodes} nodes, ${totalEdges} edges`);
    console.log(`   - Walking edges: ${walkingConnectionsAdded * 2} (bidirectional)`);
    console.log(`   - Transport edges: ${dbConnectionsAdded}`);

    return { edges: graph, nodeNames };

  } catch (error) {
    console.error('❌ Failed to build graph:', error);
    throw new Error(`Graph building failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Helper: store node coordinates for zone expansion
// We'll need to store these separately since Zone expansion doesn't include stop data
let fromNodeLatitudes: Record<string, number> = {};
let fromNodeLongitudes: Record<string, number> = {};
let toNodeLatitudes: Record<string, number> = {};
let toNodeLongitudes: Record<string, number> = {};

/**
 * Prefetch node coordinates for zone expansion
 * This helps maintain backward compatibility for coordinates
 */
async function prefetchNodeCoordinates(): Promise<void> {
  const stops = await prisma.stop.findMany({
    select: {
      id: true,
      latitude: true,
      longitude: true,
    },
  });

  const coords: Record<string, { lat: number; lng: number }> = {};
  for (const stop of stops) {
    coords[stop.id] = { lat: stop.latitude, lng: stop.longitude };
  }

  // Update the helper objects
  // We'll use this in the graph building loop
  // But for now, we'll handle coordinates differently below
}

// Override the graph building to include coordinate lookup
// We'll modify the connection loop above to use a coordinate cache
// This is a cleaner implementation that separates concerns

/**
 * Builds the graph with proper coordinate handling
 */
export async function buildGraphWithCoords(): Promise<RouteGraph> {
  // First, get all stop coordinates
  const stopCoords = new Map<string, { lat: number; lng: number }>();
  const stops = await prisma.stop.findMany({
    select: {
      id: true,
      latitude: true,
      longitude: true,
    },
  });
  
  for (const stop of stops) {
    stopCoords.set(stop.id, { lat: stop.latitude, lng: stop.longitude });
  }

  // Build the graph using the standard function
  const graph = await buildGraph();
  
  // Enrich edges with coordinate data from the cache
  // This ensures all edges have coordinate information
  for (const [nodeId, edges] of graph.edges) {
    const fromCoords = stopCoords.get(nodeId);
    for (const edge of edges) {
      if (!edge.fromLatitude && fromCoords) {
        edge.fromLatitude = fromCoords.lat;
        edge.fromLongitude = fromCoords.lng;
      }
      if (!edge.toLatitude) {
        const toCoords = stopCoords.get(edge.to);
        if (toCoords) {
          edge.toLatitude = toCoords.lat;
          edge.toLongitude = toCoords.lng;
        }
      }
    }
  }

  return graph;
}
