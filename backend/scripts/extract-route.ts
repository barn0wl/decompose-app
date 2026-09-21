// scripts/extract-route.ts
// Usage: npx ts-node scripts/extract-route.ts <route_id> [output_format]
// Formats: 'table' (default, human readable), 'ts' (TypeScript array), 'stops' (stops only)

import * as fs from 'fs';
import * as path from 'path';

const GTFS_DIR = path.join(__dirname, '..', 'prisma', 'data', 'gtfs');

interface Stop {
  stop_id: string;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
}

interface Trip {
  route_id: string;
  trip_id: string;
  direction_id?: string;
}

interface StopTime {
  trip_id: string;
  stop_id: string;
  stop_sequence: number;
  arrival_time: string;
  departure_time: string;
}

// ─── CSV Parser ───────────────────────────────────────────────────
// Handles quoted fields and commas inside quotes.
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
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
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = values[j] ?? '';
    }
    rows.push(obj as T);
  }
  return rows;
}

// ─── Main ─────────────────────────────────────────────────────────
function main() {
  const routeId = process.argv[2];
  const format = (process.argv[3] ?? 'table') as 'table' | 'ts' | 'stops';

  if (!routeId) {
    console.error('Usage: npx ts-node scripts/extract-route.ts <route_id> [table|ts|stops]');
    process.exit(1);
  }

  console.log(`\n🔍 Extracting route ${routeId}...\n`);

  // Load only what we need
  const trips = loadCsv<Trip>('trips.txt').filter(t => t.route_id === routeId);
  if (trips.length === 0) {
    console.error(`❌ No trips found for route_id ${routeId}`);
    process.exit(1);
  }

  // Pick the first trip as canonical representative
  const trip = trips[0];
  console.log(`📋 Found ${trips.length} trips for this route. Using first: ${trip.trip_id}`);

  const allStopTimes = loadCsv<StopTime>('stop_times.txt')
    .filter(st => st.trip_id === trip.trip_id)
    .sort((a, b) => Number(a.stop_sequence) - Number(b.stop_sequence));

  if (allStopTimes.length === 0) {
    console.error(`❌ No stop_times found for trip ${trip.trip_id}`);
    process.exit(1);
  }

  const stopsMap = new Map<string, Stop>();
  for (const s of loadCsv<Stop>('stops.txt')) {
    stopsMap.set(s.stop_id, s);
  }

  console.log(`📍 ${allStopTimes.length} stops in this trip\n`);

  // ─── Output ─────────────────────────────────────────────────────
  if (format === 'table') {
    console.log('seq | stop_id      | time     | name');
    console.log('----|--------------|----------|--------------------------------');
    for (const st of allStopTimes) {
      const stop = stopsMap.get(st.stop_id);
      const name = stop?.stop_name ?? '(unknown)';
      console.log(
        `${String(st.stop_sequence).padEnd(3)} | ${st.stop_id.padEnd(12)} | ${st.arrival_time.padEnd(8)} | ${name}`
      );
    }
  } else if (format === 'ts') {
    console.log('// Paste into curated.ts');
    console.log('stops: [');
    for (const st of allStopTimes) {
      const stop = stopsMap.get(st.stop_id);
      console.log(`  '${stop?.stop_name ?? 'UNKNOWN'}',`);
    }
    console.log('],');
  } else if (format === 'stops') {
    // Just the names, comma-separated on one line
    const names = allStopTimes.map(st => stopsMap.get(st.stop_id)?.stop_name ?? 'UNKNOWN');
    console.log(names.join(' → '));
  }

  console.log('\n✅ Done.\n');
}

main();
