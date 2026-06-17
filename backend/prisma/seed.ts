import { PrismaClient, StopType, TransportType } from '../generated/prisma/index';
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data (order matters due to foreign keys)
  await prisma.connection.deleteMany();
  await prisma.stop.deleteMany();
  await prisma.zone.deleteMany();

  // ─── STOPS ───────────────────────────────────────────────────────────────

  const stops = await prisma.stop.createManyAndReturn({
    data: [
      // Koumassi
      {
        name: 'Koumassi Remblai',
        commune: 'Koumassi',
        latitude: 5.3000,
        longitude: -3.9800,
        type: StopType.taxi_stop,
      },
      {
        name: 'Koumassi Grand Carrefour',
        commune: 'Koumassi',
        latitude: 5.3050,
        longitude: -3.9750,
        type: StopType.gbaka_station,
      },
      // Treichville
      {
        name: 'Treichville Gare Sud',
        commune: 'Treichville',
        latitude: 5.2950,
        longitude: -3.9900,
        type: StopType.gbaka_station,
      },
      {
        name: 'Treichville Marché',
        commune: 'Treichville',
        latitude: 5.2920,
        longitude: -3.9870,
        type: StopType.taxi_stop,
      },
      // Adjamé
      {
        name: 'Adjamé Liberté',
        commune: 'Adjamé',
        latitude: 5.3600,
        longitude: -4.0100,
        type: StopType.gbaka_station,
      },
      {
        name: 'Adjamé 220 Logements',
        commune: 'Adjamé',
        latitude: 5.3650,
        longitude: -4.0050,
        type: StopType.taxi_stop,
      },
      // Yopougon
      {
        name: 'Carrefour La Vie',
        commune: 'Yopougon',
        latitude: 5.3450,
        longitude: -4.0700,
        type: StopType.gbaka_station,
      },
      {
        name: 'Yopougon Toit Rouge',
        commune: 'Yopougon',
        latitude: 5.3500,
        longitude: -4.0800,
        type: StopType.taxi_stop,
      },
      {
        name: 'Yopougon Marché',
        commune: 'Yopougon',
        latitude: 5.3480,
        longitude: -4.0650,
        type: StopType.taxi_stop,
      },
      // Plateau
      {
        name: 'Plateau Gare Nord',
        commune: 'Plateau',
        latitude: 5.3200,
        longitude: -4.0200,
        type: StopType.landmark,
      },
    ],
  });

  // Helper to find stop by name
  const s = (name: string) => {
    const stop = stops.find(s => s.name === name);
    if (!stop) throw new Error(`Stop not found: ${name}`);
    return stop.id;
  };

  // ─── CONNECTIONS ─────────────────────────────────────────────────────────
  // These are directional (A→B and B→A are separate entries)
  // Prices in CFA francs, duration in minutes

  await prisma.connection.createMany({
    data: [
      // Koumassi ↔ Treichville (communal taxi)
      {
        fromStopId: s('Koumassi Remblai'),
        toStopId: s('Treichville Gare Sud'),
        transportType: TransportType.communal_taxi,
        basePrice: 200,
        durationMinutes: 10,
        routeDescription: 'Taxi Koumassi → Treichville Gare Sud',
      },
      {
        fromStopId: s('Treichville Gare Sud'),
        toStopId: s('Koumassi Remblai'),
        transportType: TransportType.communal_taxi,
        basePrice: 200,
        durationMinutes: 10,
        routeDescription: 'Taxi Treichville → Koumassi Remblai',
      },

      // Koumassi Grand Carrefour ↔ Adjamé (gbaka)
      {
        fromStopId: s('Koumassi Grand Carrefour'),
        toStopId: s('Adjamé Liberté'),
        transportType: TransportType.gbaka,
        basePrice: 300,
        durationMinutes: 25,
        routeDescription: 'Gbaka Koumassi → Adjamé Liberté',
      },
      {
        fromStopId: s('Adjamé Liberté'),
        toStopId: s('Koumassi Grand Carrefour'),
        transportType: TransportType.gbaka,
        basePrice: 300,
        durationMinutes: 25,
        routeDescription: 'Gbaka Adjamé → Koumassi Grand Carrefour',
      },

      // Treichville ↔ Plateau (communal taxi)
      {
        fromStopId: s('Treichville Marché'),
        toStopId: s('Plateau Gare Nord'),
        transportType: TransportType.communal_taxi,
        basePrice: 200,
        durationMinutes: 12,
        routeDescription: 'Taxi Treichville → Plateau',
      },
      {
        fromStopId: s('Plateau Gare Nord'),
        toStopId: s('Treichville Marché'),
        transportType: TransportType.communal_taxi,
        basePrice: 200,
        durationMinutes: 12,
        routeDescription: 'Taxi Plateau → Treichville',
      },

      // Plateau ↔ Adjamé (communal taxi)
      {
        fromStopId: s('Plateau Gare Nord'),
        toStopId: s('Adjamé Liberté'),
        transportType: TransportType.communal_taxi,
        basePrice: 200,
        durationMinutes: 15,
        routeDescription: 'Taxi Plateau → Adjamé',
      },
      {
        fromStopId: s('Adjamé Liberté'),
        toStopId: s('Plateau Gare Nord'),
        transportType: TransportType.communal_taxi,
        basePrice: 200,
        durationMinutes: 15,
        routeDescription: 'Taxi Adjamé → Plateau',
      },

      // Adjamé ↔ Yopougon (gbaka)
      {
        fromStopId: s('Adjamé Liberté'),
        toStopId: s('Carrefour La Vie'),
        transportType: TransportType.gbaka,
        basePrice: 300,
        durationMinutes: 20,
        routeDescription: 'Gbaka Adjamé → Carrefour La Vie (Yopougon)',
      },
      {
        fromStopId: s('Carrefour La Vie'),
        toStopId: s('Adjamé Liberté'),
        transportType: TransportType.gbaka,
        basePrice: 300,
        durationMinutes: 20,
        routeDescription: 'Gbaka Carrefour La Vie → Adjamé',
      },

      // Adjamé ↔ Yopougon Marché (gbaka, alternative)
      {
        fromStopId: s('Adjamé 220 Logements'),
        toStopId: s('Yopougon Marché'),
        transportType: TransportType.gbaka,
        basePrice: 250,
        durationMinutes: 18,
        routeDescription: 'Gbaka Adjamé 220 → Yopougon Marché',
      },
      {
        fromStopId: s('Yopougon Marché'),
        toStopId: s('Adjamé 220 Logements'),
        transportType: TransportType.gbaka,
        basePrice: 250,
        durationMinutes: 18,
        routeDescription: 'Gbaka Yopougon Marché → Adjamé 220',
      },

      // Within Yopougon (communal taxi)
      {
        fromStopId: s('Carrefour La Vie'),
        toStopId: s('Yopougon Toit Rouge'),
        transportType: TransportType.communal_taxi,
        basePrice: 200,
        durationMinutes: 8,
        routeDescription: 'Taxi Carrefour La Vie → Toit Rouge',
      },
      {
        fromStopId: s('Yopougon Toit Rouge'),
        toStopId: s('Carrefour La Vie'),
        transportType: TransportType.communal_taxi,
        basePrice: 200,
        durationMinutes: 8,
        routeDescription: 'Taxi Toit Rouge → Carrefour La Vie',
      },
      {
        fromStopId: s('Yopougon Marché'),
        toStopId: s('Yopougon Toit Rouge'),
        transportType: TransportType.communal_taxi,
        basePrice: 200,
        durationMinutes: 10,
        routeDescription: 'Taxi Yopougon Marché → Toit Rouge',
      },
      {
        fromStopId: s('Yopougon Toit Rouge'),
        toStopId: s('Yopougon Marché'),
        transportType: TransportType.communal_taxi,
        basePrice: 200,
        durationMinutes: 10,
        routeDescription: 'Taxi Toit Rouge → Yopougon Marché',
      },

      // Walking connections (short distances within same area)
      {
        fromStopId: s('Koumassi Remblai'),
        toStopId: s('Koumassi Grand Carrefour'),
        transportType: TransportType.walking,
        basePrice: 0,
        durationMinutes: 5,
        routeDescription: 'Walk from Koumassi Remblai to Grand Carrefour',
      },
      {
        fromStopId: s('Koumassi Grand Carrefour'),
        toStopId: s('Koumassi Remblai'),
        transportType: TransportType.walking,
        basePrice: 0,
        durationMinutes: 5,
        routeDescription: 'Walk from Grand Carrefour to Koumassi Remblai',
      },
      {
        fromStopId: s('Treichville Gare Sud'),
        toStopId: s('Treichville Marché'),
        transportType: TransportType.walking,
        basePrice: 0,
        durationMinutes: 5,
        routeDescription: 'Walk from Treichville Gare Sud to Marché',
      },
      {
        fromStopId: s('Adjamé Liberté'),
        toStopId: s('Adjamé 220 Logements'),
        transportType: TransportType.walking,
        basePrice: 0,
        durationMinutes: 7,
        routeDescription: 'Walk from Adjamé Liberté to 220 Logements',
      },
    ],
  });

  console.log(`✅ Seeded ${stops.length} stops`);
  console.log('✅ Seeded connections');
  console.log('🎉 Done!');
}

main()
  .catch(e => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });