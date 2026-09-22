// prisma/seed.ts
// Rewritten seeder: anchors → GTFS stops → routes + route segments.
// Connections are NOT created; the routing layer uses RouteSegments now.

import 'dotenv/config';

import { PrismaClient, StopType, TransportType } from '../generated/prisma/index';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  ANCHOR_STOPS,
  GTFS_STOPS,
  CURATED_ROUTES,
  CANONICAL_MAP,
  MAX_ANCHOR_MERGE_DISTANCE_M,
  type PricingRule,
} from './data';

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

// ─── HELPERS ──────────────────────────────────────────────────────────────

const EARTH_RADIUS_M = 6_371_000;

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

function nearestAnchor(
  lat: number,
  lon: number,
  anchors: { commune: string; latitude: number; longitude: number }[]
): { commune: string; distanceM: number } {
  let best = { commune: 'Unknown', distanceM: Infinity };
  for (const a of anchors) {
    const d = haversineMeters(lat, lon, a.latitude, a.longitude);
    if (d < best.distanceM) best = { commune: a.commune, distanceM: d };
  }
  return best;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding database...\n');

  // Clean (order: dependents first)
  await prisma.vote.deleteMany();
  await prisma.suggestedConnection.deleteMany();
  await prisma.connection.deleteMany();
  await prisma.routeSegment.deleteMany();
  await prisma.route.deleteMany();
  await prisma.stop.deleteMany();

  // ── STEP 1: Insert anchors ──────────────────────────────────────────
  console.log('📍 Inserting anchor stops...');
  const anchorRows = await prisma.stop.createManyAndReturn({
    data: ANCHOR_STOPS.map(a => ({
      name: a.name,
      commune: a.commune,
      latitude: a.latitude,
      longitude: a.longitude,
      type: a.type,
    })),
  });
  console.log(`✅ ${anchorRows.length} anchors inserted\n`);

  const anchorList = anchorRows.map(a => ({
    name: a.name,
    commune: a.commune,
    latitude: a.latitude,
    longitude: a.longitude,
  }));

  // ── STEP 2: Insert GTFS stops with commune inference ────────────────
  console.log('📍 Inserting GTFS stops (commune inferred)...');
  let mergedIntoAnchor = 0;
  let insertedFresh = 0;

  const gtfsStopByName = new Map<string, {
    id: string; name: string; commune: string; latitude: number; longitude: number;
  }>();

  for (const gtfsStop of GTFS_STOPS) {
    let mergedInto: typeof anchorRows[0] | null = null;
    for (const a of anchorRows) {
      const d = haversineMeters(gtfsStop.latitude, gtfsStop.longitude, a.latitude, a.longitude);
      if (d <= MAX_ANCHOR_MERGE_DISTANCE_M) {
        mergedInto = a;
        break;
      }
    }

    if (mergedInto) {
      gtfsStopByName.set(gtfsStop.canonicalName, {
        id: mergedInto.id,
        name: mergedInto.name,
        commune: mergedInto.commune,
        latitude: mergedInto.latitude,
        longitude: mergedInto.longitude,
      });
      mergedIntoAnchor++;
      continue;
    }

    const { commune, distanceM } = nearestAnchor(gtfsStop.latitude, gtfsStop.longitude, anchorList);
    const inferredCommune = distanceM > 5000 ? 'Unknown' : commune;

    const inserted = await prisma.stop.create({
      data: {
        name: gtfsStop.canonicalName,
        commune: inferredCommune,
        latitude: gtfsStop.latitude,
        longitude: gtfsStop.longitude,
        type: StopType.taxi_stop,
      },
    });

    gtfsStopByName.set(gtfsStop.canonicalName, {
      id: inserted.id,
      name: inserted.name,
      commune: inserted.commune,
      latitude: inserted.latitude,
      longitude: inserted.longitude,
    });
    insertedFresh++;
  }

  console.log(`✅ ${insertedFresh} new stops inserted, ${mergedIntoAnchor} merged into anchors\n`);

  // Unified stop lookup
  const stopByName = new Map<string, {
    id: string; name: string; commune: string; latitude: number; longitude: number;
  }>();
  for (const a of anchorRows) {
    stopByName.set(a.name, {
      id: a.id, name: a.name, commune: a.commune,
      latitude: a.latitude, longitude: a.longitude,
    });
  }
  for (const [name, s] of gtfsStopByName) {
    stopByName.set(name, s);
  }

  // ── STEP 3: Resolve canonical names ─────────────────────────────────
  function resolveStopName(rawName: string): string {
    return CANONICAL_MAP[rawName] ?? rawName;
  }

  // ── STEP 4: Insert routes + segments ────────────────────────────────
  console.log('📍 Creating routes and segments...');

  const missingStops: string[] = [];
  let routesCreated = 0;
  let segmentsCreated = 0;
  let skippedRoutes = 0;

  for (const route of CURATED_ROUTES) {
    // Resolve all stop names
    const resolvedNames = route.stops.map(resolveStopName);
    const resolved = resolvedNames.map(n => {
      const s = stopByName.get(n);
      if (!s) missingStops.push(`${route.name}: "${n}"`);
      return s;
    });

    if (resolved.some(s => !s)) {
      skippedRoutes++;
      continue;
    }

    // Deduplicate consecutive identical stops (e.g., "Abobo Gare" → "Abobo Gare")
    // Keep the durations aligned by collapsing them too.
    const cleanStops: typeof resolved = [];
    const cleanDurations: number[] = [];
    for (let i = 0; i < resolved.length; i++) {
      const s = resolved[i]!;
      if (cleanStops.length > 0 && cleanStops[cleanStops.length - 1]!.id === s.id) {
        // Same stop repeated — merge durations
        if (i < route.durations.length) {
          cleanDurations[cleanDurations.length - 1] += route.durations[i];
        }
        continue;
      }
      cleanStops.push(s);
      if (i < route.durations.length) {
        cleanDurations.push(route.durations[i]);
      }
    }

    if (cleanStops.length < 2) {
      console.warn(`⚠️ Route "${route.name}" has fewer than 2 unique stops, skipping`);
      skippedRoutes++;
      continue;
    }

    // Insert the Route
    const createdRoute = await prisma.route.create({
      data: {
        name: route.name,
        transportType: route.transportType,
        pricing: route.pricing as any,   // Prisma Json type
        totalStops: cleanStops.length,
      },
    });

    // Insert the segments
    const segmentData = [];
    for (let i = 0; i < cleanStops.length - 1; i++) {
      const from = cleanStops[i]!;
      const to = cleanStops[i + 1]!;
      const duration = Math.max(1, Math.round(cleanDurations[i] ?? 1));

      segmentData.push({
        routeId: createdRoute.id,
        fromStopId: from.id,
        toStopId: to.id,
        sequence: i,
        durationMinutes: duration,
      });
    }

    await prisma.routeSegment.createMany({ data: segmentData });
    routesCreated++;
    segmentsCreated += segmentData.length;
  }

  if (missingStops.length > 0) {
    console.warn(`⚠️  Missing stops (${missingStops.length}):`);
    for (const m of missingStops.slice(0, 20)) console.warn(`   - ${m}`);
    if (missingStops.length > 20) console.warn(`   ... and ${missingStops.length - 20} more`);
  }
  if (skippedRoutes > 0) {
    console.warn(`⚠️  Skipped ${skippedRoutes} routes due to missing stops\n`);
  }

  console.log(`✅ ${routesCreated} routes created, ${segmentsCreated} segments inserted\n`);

  // ── SUMMARY ─────────────────────────────────────────────────────────
  const totalStops = await prisma.stop.count();
  const totalRoutes = await prisma.route.count();
  const totalSegments = await prisma.routeSegment.count();

  console.log('📊 SEED SUMMARY');
  console.log('═'.repeat(40));
  console.log(`✅ Anchors:      ${anchorRows.length}`);
  console.log(`✅ GTFS stops:   ${insertedFresh} new + ${mergedIntoAnchor} merged`);
  console.log(`✅ Total stops:  ${totalStops}`);
  console.log(`✅ Routes:       ${totalRoutes}`);
  console.log(`✅ Segments:     ${totalSegments}`);
  console.log('═'.repeat(40));

  console.log('\n📋 Routes by transport type:');
  const byType = await prisma.route.groupBy({
    by: ['transportType'],
    _count: true,
  });
  for (const g of byType) {
    console.log(`  - ${g.transportType.padEnd(15)} ${g._count}`);
  }

  console.log('\n🎉 Done!');
}

main()
  .catch(e => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
