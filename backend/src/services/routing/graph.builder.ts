// src/services/routing/graph.builder.ts
// Builds a route graph from RouteSegment rows + synthetic walking edges.

import prisma from '../../lib/prisma';
import { TransportType } from '../../../generated/prisma';
import { DEFAULT_WALKING_POLICY } from '../walking-policy';

// ─── TYPES ────────────────────────────────────────────────────────────────

export interface GraphEdge {
  fromId: string;
  to: string;
  transportType: TransportType;

  // Route/segment identity (unused for walking; set to sentinel values)
  routeId: string;         // '__walking__' for walking edges
  routeName: string;
  segmentId: string;
  sequence: number;        // position within route (0-indexed)
  direction: 'forward' | 'backward';

  // Segment properties
  duration: number;        // base minutes
  distanceM?: number;      // only for walking edges

  // Display
  fromName: string;
  toName: string;
  instructions: string;

  fromLatitude: number;
  fromLongitude: number;
  toLatitude: number;
  toLongitude: number;
}

export interface RouteGraph {
  edges: Map<string, GraphEdge[]>;
  nodeNames: Map<string, string>;
}

// ─── CONFIG ───────────────────────────────────────────────────────────────

const WALKING_SPEED_M_PER_MIN = 83; // ~5 km/h

const ALLOWED_TRANSPORT_TYPES: TransportType[] = [
  TransportType.communal_taxi,
  TransportType.gbaka,
  TransportType.walking,
];

// ─── WALKING EDGE GENERATION ──────────────────────────────────────────────

interface PostgisWalkingEdge {
  fromId: string;
  toId: string;
  fromName: string;
  toName: string;
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  distance: number;
}

async function getWalkingEdgesFromPostGIS(
  maxDistanceMeters: number
): Promise<PostgisWalkingEdge[]> {
  try {
    const result = await prisma.$queryRaw<PostgisWalkingEdge[]>`
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
    return result;
  } catch (error) {
    console.error('❌ PostGIS query failed:', error);
    throw new Error(`Failed to fetch walking connections: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function generateWalkingInstructions(
  fromName: string,
  toName: string,
  distance: number,
  duration: number
): string {
  const distanceKm = (distance / 1000).toFixed(2);
  return `Walk from ${fromName} to ${toName} (${distanceKm} km, ~${duration} min)`;
}

// ─── MAIN BUILDER ─────────────────────────────────────────────────────────

export async function buildGraph(): Promise<RouteGraph> {
  console.log('🏗️ Building route graph...');
  const startTime = Date.now();

  const graph = new Map<string, GraphEdge[]>();
  const nodeNames = new Map<string, string>();

  try {
    // ─── Load all stops for name lookups ──────────────────────────────
    const allStops = await prisma.stop.findMany({
      select: { id: true, name: true, latitude: true, longitude: true },
    });

    if (allStops.length === 0) {
      console.warn('⚠️ No stops found in database');
      return { edges: graph, nodeNames };
    }

    const stopById = new Map(allStops.map(s => [s.id, s]));
    for (const s of allStops) {
      nodeNames.set(s.id, s.name);
    }
    console.log(`📍 Found ${allStops.length} stops`);

    // ─── Load all routes with segments ────────────────────────────────
    const routes = await prisma.route.findMany({
      include: {
        segments: {
          orderBy: { sequence: 'asc' },
        },
      },
    });

    console.log(`🛣️  Found ${routes.length} routes`);

    let segmentsAdded = 0;
    let segmentsSkipped = 0;

    for (const route of routes) {
      if (!ALLOWED_TRANSPORT_TYPES.includes(route.transportType)) {
        segmentsSkipped += route.segments.length * 2;
        continue;
      }

      const totalStops = route.totalStops;

      // Forward direction: segment i connects stop[i] → stop[i+1]
      for (const seg of route.segments) {
        const from = stopById.get(seg.fromStopId);
        const to = stopById.get(seg.toStopId);
        if (!from || !to) continue;

        if (!graph.has(seg.fromStopId)) graph.set(seg.fromStopId, []);
        if (!graph.has(seg.toStopId)) graph.set(seg.toStopId, []);

        const forward: GraphEdge = {
          fromId: seg.fromStopId,
          to: seg.toStopId,
          transportType: route.transportType,
          routeId: route.id,
          routeName: route.name,
          segmentId: seg.id,
          sequence: seg.sequence,
          direction: 'forward',
          duration: seg.durationMinutes,
          fromName: from.name,
          toName: to.name,
          instructions: `${route.name}: ${from.name} → ${to.name}`,
          fromLatitude: from.latitude,
          fromLongitude: from.longitude,
          toLatitude: to.latitude,
          toLongitude: to.longitude,
        };
        graph.get(seg.fromStopId)!.push(forward);
        segmentsAdded++;
      }

      // Backward direction: segment i connects stop[i+1] → stop[i]
      // Sequence is inverted: the last segment becomes sequence 0 in reverse.
      for (const seg of route.segments) {
        const from = stopById.get(seg.toStopId);
        const to = stopById.get(seg.fromStopId);
        if (!from || !to) continue;

        if (!graph.has(seg.toStopId)) graph.set(seg.toStopId, []);

        const backward: GraphEdge = {
          fromId: seg.toStopId,
          to: seg.fromStopId,
          transportType: route.transportType,
          routeId: route.id,
          routeName: route.name,
          segmentId: seg.id,
          sequence: totalStops - 2 - seg.sequence,   // reverse ordering
          direction: 'backward',
          duration: seg.durationMinutes,
          fromName: from.name,
          toName: to.name,
          instructions: `${route.name}: ${from.name} → ${to.name}`,
          fromLatitude: from.latitude,
          fromLongitude: from.longitude,
          toLatitude: to.latitude,
          toLongitude: to.longitude,
        };
        graph.get(seg.toStopId)!.push(backward);
        segmentsAdded++;
      }
    }

    console.log(`✅ Added ${segmentsAdded} route segment edges (skipped ${segmentsSkipped} from disallowed types)`);

    // ─── Walking edges via PostGIS ────────────────────────────────────
    console.log('🚶 Finding walking connections via PostGIS...');
    const walkingEdges = await getWalkingEdgesFromPostGIS(DEFAULT_WALKING_POLICY.maxStepDistanceM);
    let walkingAdded = 0;

    for (const edge of walkingEdges) {
      const distanceM = Number(edge.distance);
      const durationMinutes = Math.max(1, Math.round(distanceM / WALKING_SPEED_M_PER_MIN));

      const forward: GraphEdge = {
        fromId: edge.fromId,
        to: edge.toId,
        transportType: TransportType.walking,
        routeId: '__walking__',
        routeName: 'Walk',
        segmentId: '__walking__',
        sequence: -1,
        direction: 'forward',
        duration: durationMinutes,
        distanceM,
        fromName: edge.fromName,
        toName: edge.toName,
        instructions: generateWalkingInstructions(edge.fromName, edge.toName, distanceM, durationMinutes),
        fromLatitude: edge.fromLat,
        fromLongitude: edge.fromLng,
        toLatitude: edge.toLat,
        toLongitude: edge.toLng,
      };
      const backward: GraphEdge = {
        fromId: edge.toId,
        to: edge.fromId,
        transportType: TransportType.walking,
        routeId: '__walking__',
        routeName: 'Walk',
        segmentId: '__walking__',
        sequence: -1,
        direction: 'forward',
        duration: durationMinutes,
        distanceM,
        fromName: edge.toName,
        toName: edge.fromName,
        instructions: generateWalkingInstructions(edge.toName, edge.fromName, distanceM, durationMinutes),
        fromLatitude: edge.toLat,
        fromLongitude: edge.toLng,
        toLatitude: edge.fromLat,
        toLongitude: edge.fromLng,
      };

      if (!graph.has(edge.fromId)) graph.set(edge.fromId, []);
      if (!graph.has(edge.toId)) graph.set(edge.toId, []);

      graph.get(edge.fromId)!.push(forward);
      graph.get(edge.toId)!.push(backward);
      walkingAdded++;
    }

    console.log(`✅ Added ${walkingAdded} walking connections (bidirectional)`);

    // ─── Stats ────────────────────────────────────────────────────────
    let totalEdges = 0;
    for (const edges of graph.values()) totalEdges += edges.length;

    const buildTime = Date.now() - startTime;
    console.log(`✅ Graph built in ${buildTime}ms`);
    console.log(`📊 Graph: ${graph.size} nodes, ${totalEdges} edges`);

    return { edges: graph, nodeNames };

  } catch (error) {
    console.error('❌ Failed to build graph:', error);
    throw new Error(`Graph building failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
