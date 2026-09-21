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
  connectionId?: string;
  distanceM?: number;              // NEW: only set for walking edges
  fromLatitude?: number;
  fromLongitude?: number;
  toLatitude?: number;
  toLongitude?: number;
}

export interface RouteGraph {
  edges: Map<string, GraphEdge[]>;
  nodeNames: Map<string, string>;
}

// ─── CONFIGURATION ────────────────────────────────────────────────────────

const WALKING_SPEED_M_PER_MIN = 83;     // ~5 km/h
const MAX_WALKING_DISTANCE_M = 1000;    // was 2000 — reduced per Thread C

// SOTRA buses are excluded per advisor (problem is about informal transit).
// They remain in the DB but never enter the graph.
const ALLOWED_TRANSPORT_TYPES: TransportType[] = [
  TransportType.communal_taxi,
  TransportType.gbaka,
  TransportType.walking,
];

// ─── WALKING EDGE GENERATION ──────────────────────────────────────────────

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
    throw new Error(`Failed to fetch walking connections from PostGIS: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function generateWalkingInstructions(
  fromName: string,
  toName: string,
  distance: number,
  duration: number
): string {
  const distanceKm = (distance / 1000).toFixed(1);
  return `Walk from ${fromName} to ${toName} (${distanceKm} km, ~${duration} min)`;
}

function generateInstructions(
  type: TransportType,
  toName: string,
  price: number,
  duration: number
): string {
  const verb = type === 'walking' ? 'Walk to' : `Take ${type.replace('_', ' ')} to`;
  return `${verb} ${toName} (${price} CFA, ~${duration} min)`;
}

// ─── MAIN BUILDER ─────────────────────────────────────────────────────────

export async function buildGraph(): Promise<RouteGraph> {
  console.log('🏗️ Building route graph...');
  const startTime = Date.now();

  const graph = new Map<string, GraphEdge[]>();
  const nodeNames = new Map<string, string>();

  try {
    // Fetch all stops
    const allStops = await prisma.stop.findMany({
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
      },
      orderBy: { name: 'asc' },
    });

    if (allStops.length === 0) {
      console.warn('⚠️ No stops found in database');
      return { edges: graph, nodeNames };
    }

    for (const stop of allStops) {
      nodeNames.set(stop.id, stop.name);
    }

    console.log(`📍 Found ${allStops.length} stops`);

    // ─── Walking edges via PostGIS ───────────────────────────────────
    console.log('🚶 Finding walking connections via PostGIS...');
    const walkingEdges = await getWalkingEdgesFromPostGIS(MAX_WALKING_DISTANCE_M);
    let walkingConnectionsAdded = 0;

    for (const edge of walkingEdges) {
      const distanceM = Number(edge.distance);
      const durationMinutes = Math.max(1, Math.round(distanceM / WALKING_SPEED_M_PER_MIN));

      const forwardEdge: GraphEdge = {
        to: edge.toId,
        price: 0,
        duration: durationMinutes,
        transportType: TransportType.walking,
        fromName: edge.fromName,
        toName: edge.toName,
        instructions: generateWalkingInstructions(edge.fromName, edge.toName, edge.distance, durationMinutes),
        distanceM: distanceM,
        fromLatitude: edge.fromLat,
        fromLongitude: edge.fromLng,
        toLatitude: edge.toLat,
        toLongitude: edge.toLng,
      };

      const reverseEdge: GraphEdge = {
        to: edge.fromId,
        price: 0,
        duration: durationMinutes,
        transportType: TransportType.walking,
        fromName: edge.toName,
        toName: edge.fromName,
        instructions: generateWalkingInstructions(edge.toName, edge.fromName, edge.distance, durationMinutes),
        distanceM: edge.distance,                                   // NEW
        fromLatitude: edge.toLat,
        fromLongitude: edge.toLng,
        toLatitude: edge.fromLat,
        toLongitude: edge.fromLng,
      };

      if (!graph.has(edge.fromId)) graph.set(edge.fromId, []);
      if (!graph.has(edge.toId)) graph.set(edge.toId, []);
      graph.get(edge.fromId)!.push(forwardEdge);
      graph.get(edge.toId)!.push(reverseEdge);
      walkingConnectionsAdded++;
    }

    console.log(`✅ Added ${walkingConnectionsAdded} walking connections via PostGIS`);

    // ─── Database connections (with SOTRA filter) ────────────────────
    console.log('🚌 Adding database connections...');
    const connections = await prisma.connection.findMany({
      include: {
        fromStop: true,
        toStop: true,
      },
    });

    console.log(`📊 Found ${connections.length} database connections`);

    let dbConnectionsAdded = 0;
    let dbConnectionsSkipped = 0;

    for (const conn of connections) {
      // NEW: filter by allowed transport types
      if (!ALLOWED_TRANSPORT_TYPES.includes(conn.transportType)) {
        dbConnectionsSkipped++;
        continue;
      }

      if (!conn.fromStop || !conn.toStop) {
        console.warn(`⚠️ Skipping connection ${conn.id}: Missing stop data`);
        continue;
      }

      if (conn.fromStopId === conn.toStopId) {
        continue;
      }

      if (!graph.has(conn.fromStopId)) {
        graph.set(conn.fromStopId, []);
      }

      const edge: GraphEdge = {
        to: conn.toStopId,
        price: conn.basePrice,
        duration: conn.durationMinutes,
        transportType: conn.transportType,
        fromName: conn.fromStop.name,
        toName: conn.toStop.name,
        instructions: conn.routeDescription ?? generateInstructions(
          conn.transportType,
          conn.toStop.name,
          conn.basePrice,
          conn.durationMinutes
        ),
        connectionId: conn.id,
        fromLatitude: conn.fromStop.latitude,
        fromLongitude: conn.fromStop.longitude,
        toLatitude: conn.toStop.latitude,
        toLongitude: conn.toStop.longitude,
      };

      graph.get(conn.fromStopId)!.push(edge);
      dbConnectionsAdded++;
    }

    console.log(`✅ Added ${dbConnectionsAdded} database edges (skipped ${dbConnectionsSkipped} SOTRA)`);

    // ─── Stats ────────────────────────────────────────────────────────
    const totalNodes = graph.size;
    let totalEdges = 0;
    for (const edges of graph.values()) totalEdges += edges.length;

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
