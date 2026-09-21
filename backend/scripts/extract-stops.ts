// scripts/extract-stops.ts
// Usage: npx ts-node scripts/extract-stops.ts <route_ids_file>
// route_ids_file: a text file with one route_id per line

import * as fs from 'fs';
import * as path from 'path';

const GTFS_DIR = path.join(__dirname, '..', 'prisma', 'data', 'gtfs');

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(current); current = '';
    } else current += ch;
  }
  fields.push(current);
  return fields;
}

function loadCsv<T>(filename: string): T[] {
  const filepath = path.join(GTFS_DIR, filename);
  const content = fs.readFileSync(filepath, 'utf-8');
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
  const headers = parseCsvLine(lines[0]);
  const rows: T[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const obj: any = {};
    for (let j = 0; j < headers.length; j++) obj[headers[j]] = values[j] ?? '';
    rows.push(obj as T);
  }
  return rows;
}

function main() {
  const routeIdsFile = process.argv[2];
  if (!routeIdsFile) {
    console.error('Usage: npx ts-node scripts/extract-stops.ts <route_ids_file>');
    process.exit(1);
  }

  const routeIds = new Set(
    fs.readFileSync(routeIdsFile, 'utf-8')
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean)
  );

  console.log(`📋 Loaded ${routeIds.size} route IDs`);

  // Load everything
  const trips = loadCsv<any>('trips.txt').filter(t => routeIds.has(t.route_id));
  const tripIds = new Set(trips.map(t => t.trip_id));

  // Pick ONE trip per route (first occurrence)
  const firstTripPerRoute = new Map<string, string>();
  for (const t of trips) {
    if (!firstTripPerRoute.has(t.route_id)) firstTripPerRoute.set(t.route_id, t.trip_id);
  }
  const canonicalTripIds = new Set(firstTripPerRoute.values());

  console.log(`📋 Using ${canonicalTripIds.size} canonical trips`);

  const stopTimes = loadCsv<any>('stop_times.txt')
    .filter(st => canonicalTripIds.has(st.trip_id));

  const referencedStopIds = new Set(stopTimes.map(st => st.stop_id));
  console.log(`📍 ${referencedStopIds.size} unique stop_ids referenced`);

  const stops = loadCsv<any>('stops.txt')
    .filter(s => referencedStopIds.has(s.stop_id));

  console.log(`📍 ${stops.length} stops found in stops.txt`);

  // Output: TSV that's easy to paste
  const out: string[] = [];
  out.push('stop_id\tname\tlatitude\tlongitude');
  for (const s of stops) {
    out.push(`${s.stop_id}\t${s.stop_name}\t${s.stop_lat}\t${s.stop_lon}`);
  }
  fs.writeFileSync('scratch/stops-export.tsv', out.join('\n'));
  console.log('\n✅ Wrote scratch/stops-export.tsv');
  console.log('   Copy that file back and I\'ll build curated.ts from it.');
}

main();