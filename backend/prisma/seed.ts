// prisma/seed.ts
// Rewritten seeder: anchors first, then GTFS stops (commune-inferred), then routes.

import 'dotenv/config';
import { PrismaClient, StopType, TransportType, SuggestionStatus } from '../generated/prisma/index';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  ANCHOR_STOPS,
  GTFS_STOPS,
  CURATED_ROUTES,
  CANONICAL_MAP,
  PRICE_BANDS,
  TRANSPORT_MULTIPLIERS,
  MAX_ANCHOR_MERGE_DISTANCE_M,
  type PriceBand,
} from './data/curated';

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('Neither DIRECT_URL nor DATABASE_URL is set');
}
const adapter = new PrismaPg({ connectionString });
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

function inferPrice(distanceM: number, transportType: TransportType): number {
  const km = distanceM / 1000;
  const band = PRICE_BANDS.find((b: PriceBand) => km <= b.maxKm) ?? PRICE_BANDS[PRICE_BANDS.length - 1];
  const mult = TRANSPORT_MULTIPLIERS[transportType] ?? 1.0;
  const raw = band.price * mult;
  return Math.round(raw / 25) * 25;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding database...\n');

  // Clean
  await prisma.vote.deleteMany();
  await prisma.suggestedConnection.deleteMany();
  await prisma.connection.deleteMany();
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

  // Build lookup maps
  const anchorByName = new Map(anchorRows.map(a => [a.name, a]));
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
  const gtfsStopByName = new Map<string, { id: string; name: string; commune: string; latitude: number; longitude: number }>();

  for (const gtfsStop of GTFS_STOPS) {
    // Check if this GTFS stop is close enough to an anchor to be considered the same
    let mergedInto: typeof anchorRows[0] | null = null;
    for (const a of anchorRows) {
      const d = haversineMeters(gtfsStop.latitude, gtfsStop.longitude, a.latitude, a.longitude);
      if (d <= MAX_ANCHOR_MERGE_DISTANCE_M) {
        mergedInto = a;
        break;
      }
    }

    if (mergedInto) {
      // Anchor wins; record GTFS name as alias so routes can resolve to it
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

    // Otherwise infer commune from nearest anchor
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

  // Unified lookup: anchor names + GTFS canonical names
  const stopByName = new Map<string, { id: string; name: string; commune: string; latitude: number; longitude: number }>();
  for (const a of anchorRows) {
    stopByName.set(a.name, {
      id: a.id, name: a.name, commune: a.commune,
      latitude: a.latitude, longitude: a.longitude,
    });
  }
  for (const [name, s] of gtfsStopByName) {
    stopByName.set(name, s);
  }

  // ── STEP 3: Resolve canonical stop names ────────────────────────────
  function resolveStopName(rawName: string): string {
    // Apply canonical mapping first
    const mapped = CANONICAL_MAP[rawName] ?? rawName;
    return mapped;
  }

  // ── STEP 4: Build connections from routes ───────────────────────────
  console.log('📍 Creating connections from curated routes...');

  const connectionRows: any[] = [];
  let skippedRoutes = 0;
  let missingStops: string[] = [];

  for (const route of CURATED_ROUTES) {
    // Resolve all stop names
    const resolvedNames = route.stops.map(resolveStopName);

    // Verify all stops exist
    const resolved = resolvedNames.map(n => {
      const s = stopByName.get(n);
      if (!s) missingStops.push(`${route.name}: "${n}"`);
      return s;
    });

    if (resolved.some(s => !s)) {
      skippedRoutes++;
      continue;
    }

    // Walk consecutive pairs
    for (let i = 0; i < resolved.length - 1; i++) {
      const from = resolved[i]!;
      const to = resolved[i + 1]!;
      const duration = route.durations[i] ?? 1;

      // Skip self-loops (e.g., "Abobo Gare" → "Abobo Gare")
      if (from.id === to.id) continue;

      const distanceM = haversineMeters(from.latitude, from.longitude, to.latitude, to.longitude);
      const price = inferPrice(distanceM, route.transportType);

      // Forward
      connectionRows.push({
        fromStopId: from.id,
        toStopId: to.id,
        transportType: route.transportType,
        basePrice: price,
        durationMinutes: Math.max(1, Math.round(duration)),
        routeDescription: `${route.name}: ${from.name} → ${to.name}`,
      });
      // Reverse
      connectionRows.push({
        fromStopId: to.id,
        toStopId: from.id,
        transportType: route.transportType,
        basePrice: price,
        durationMinutes: Math.max(1, Math.round(duration)),
        routeDescription: `${route.name}: ${to.name} → ${from.name}`,
      });
    }
  }

  if (missingStops.length > 0) {
    console.warn(`⚠️  Missing stops (${missingStops.length}):`);
    for (const m of missingStops.slice(0, 20)) console.warn(`   - ${m}`);
    if (missingStops.length > 20) console.warn(`   ... and ${missingStops.length - 20} more`);
  }
  if (skippedRoutes > 0) {
    console.warn(`⚠️  Skipped ${skippedRoutes} routes due to missing stops\n`);
  }

  // ── STEP 5: Deduplicate connections ─────────────────────────────────
  // Same (fromStopId, toStopId, transportType) from multiple routes should be one connection.
  const seen = new Set<string>();
  const deduped: typeof connectionRows = [];
  for (const c of connectionRows) {
    const key = `${c.fromStopId}|${c.toStopId}|${c.transportType}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(c);
  }
  console.log(`✅ ${deduped.length} unique connections (${connectionRows.length} before dedup)\n`);

  // ── STEP 6: Batch insert connections ────────────────────────────────
  console.log('📍 Inserting connections...');
  // createMany in chunks to avoid parameter limits
  const CHUNK = 500;
  for (let i = 0; i < deduped.length; i += CHUNK) {
    await prisma.connection.createMany({
      data: deduped.slice(i, i + CHUNK),
    });
  }
  console.log(`✅ ${deduped.length} connections inserted\n`);

  // ── STEP 7: No sample suggestions (dropped intentionally) ───────────

  // ── SUMMARY ─────────────────────────────────────────────────────────
  const totalStops = await prisma.stop.count();
  const totalConnections = await prisma.connection.count();

  console.log('📊 SEED SUMMARY');
  console.log('═'.repeat(40));
  console.log(`✅ Anchors:      ${anchorRows.length}`);
  console.log(`✅ GTFS stops:   ${insertedFresh} new + ${mergedIntoAnchor} merged`);
  console.log(`✅ Total stops:  ${totalStops}`);
  console.log(`✅ Connections:  ${totalConnections}`);
  console.log('═'.repeat(40));

  console.log('\n📋 Stops by commune:');
  const byCommune = await prisma.stop.groupBy({ by: ['commune'], _count: true, orderBy: { _count: { commune: 'desc' } } });
  for (const g of byCommune) {
    console.log(`  - ${g.commune.padEnd(15)} ${g._count}`);
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
