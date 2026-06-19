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

  // ─── ZONES ────────────────────────────────────────────────────────────────
  
  console.log('📍 Creating zones...');
  
  const zones = await prisma.zone.createManyAndReturn({
    data: [
      {
        name: 'Yopougon Taxi Zone',
        commune: 'Yopougon',
        description: 'Communal taxi area covering Yopougon',
      },
      {
        name: 'Koumassi Taxi Zone',
        commune: 'Koumassi',
        description: 'Communal taxi area covering Koumassi',
      },
      {
        name: 'Treichville Taxi Zone',
        commune: 'Treichville',
        description: 'Communal taxi area covering Treichville',
      },
      {
        name: 'Plateau Central Zone',
        commune: 'Plateau',
        description: 'Central Plateau area with taxis and gbakas',
      },
      {
        name: 'Adjamé Gbaka Corridor',
        commune: 'Adjamé',
        description: 'Gbaka corridor through Adjamé',
      },
    ],
  });

  // Helper to find zone by name
  const z = (name: string) => {
    const zone = zones.find(z => z.name === name);
    if (!zone) throw new Error(`Zone not found: ${name}`);
    return zone.id;
  };

  // ─── STOPS ───────────────────────────────────────────────────────────────
  
  console.log('📍 Creating stops with zone assignments...');

  const stops = await prisma.stop.createManyAndReturn({
    data: [
      // Yopougon stops (Zone: Yopougon Taxi Zone)
      {
        name: 'Carrefour La Vie',
        commune: 'Yopougon',
        latitude: 5.3450,
        longitude: -4.0700,
        type: StopType.gbaka_station,
        zoneId: z('Yopougon Taxi Zone'),
      },
      {
        name: 'Yopougon Toit Rouge',
        commune: 'Yopougon',
        latitude: 5.3500,
        longitude: -4.0800,
        type: StopType.taxi_stop,
        zoneId: z('Yopougon Taxi Zone'),
      },
      {
        name: 'Yopougon Marché',
        commune: 'Yopougon',
        latitude: 5.3480,
        longitude: -4.0650,
        type: StopType.taxi_stop,
        zoneId: z('Yopougon Taxi Zone'),
      },

      // Koumassi stops (Zone: Koumassi Taxi Zone)
      {
        name: 'Koumassi Remblai',
        commune: 'Koumassi',
        latitude: 5.3000,
        longitude: -3.9800,
        type: StopType.taxi_stop,
        zoneId: z('Koumassi Taxi Zone'),
      },
      {
        name: 'Koumassi Grand Carrefour',
        commune: 'Koumassi',
        latitude: 5.3050,
        longitude: -3.9750,
        type: StopType.gbaka_station,
        zoneId: z('Koumassi Taxi Zone'),
      },

      // Treichville stops (Zone: Treichville Taxi Zone)
      {
        name: 'Treichville Gare Sud',
        commune: 'Treichville',
        latitude: 5.2950,
        longitude: -3.9900,
        type: StopType.gbaka_station,
        zoneId: z('Treichville Taxi Zone'),
      },
      {
        name: 'Treichville Marché',
        commune: 'Treichville',
        latitude: 5.2920,
        longitude: -3.9870,
        type: StopType.taxi_stop,
        zoneId: z('Treichville Taxi Zone'),
      },

      // Adjamé stops (Zone: Adjamé Gbaka Corridor)
      {
        name: 'Adjamé Liberté',
        commune: 'Adjamé',
        latitude: 5.3600,
        longitude: -4.0100,
        type: StopType.gbaka_station,
        zoneId: z('Adjamé Gbaka Corridor'),
      },
      {
        name: 'Adjamé 220 Logements',
        commune: 'Adjamé',
        latitude: 5.3650,
        longitude: -4.0050,
        type: StopType.taxi_stop,
        zoneId: z('Adjamé Gbaka Corridor'),
      },

      // Plateau stops (Zone: Plateau Central Zone)
      {
        name: 'Plateau Gare Nord',
        commune: 'Plateau',
        latitude: 5.3200,
        longitude: -4.0200,
        type: StopType.landmark,
        zoneId: z('Plateau Central Zone'),
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
  
  console.log('📍 Creating connections...');

  // Helper to create bidirectional connections
  const createBidirectional = (data: any[]) => {
    const connections: any[] = [];
    for (const item of data) {
      // Forward direction
      connections.push({
        fromStopId: item.from,
        toStopId: item.to,
        transportType: item.type,
        basePrice: item.price,
        durationMinutes: item.duration,
        routeDescription: item.description,
      });
      // Reverse direction
      connections.push({
        fromStopId: item.to,
        toStopId: item.from,
        transportType: item.type,
        basePrice: item.price,
        durationMinutes: item.duration,
        routeDescription: item.reverseDescription || item.description,
      });
    }
    return connections;
  };

  // ─── POINT-TO-POINT CONNECTIONS (Existing) ──────────────────────────────

  const pointToPointConnections = createBidirectional([
    // Koumassi ↔ Treichville (communal taxi)
    {
      from: s('Koumassi Remblai'),
      to: s('Treichville Gare Sud'),
      type: TransportType.communal_taxi,
      price: 200,
      duration: 10,
      description: 'Taxi Koumassi → Treichville Gare Sud',
      reverseDescription: 'Taxi Treichville → Koumassi Remblai',
    },
    // Koumassi Grand Carrefour ↔ Adjamé (gbaka)
    {
      from: s('Koumassi Grand Carrefour'),
      to: s('Adjamé Liberté'),
      type: TransportType.gbaka,
      price: 300,
      duration: 25,
      description: 'Gbaka Koumassi → Adjamé Liberté',
      reverseDescription: 'Gbaka Adjamé → Koumassi Grand Carrefour',
    },
    // Treichville ↔ Plateau (communal taxi)
    {
      from: s('Treichville Marché'),
      to: s('Plateau Gare Nord'),
      type: TransportType.communal_taxi,
      price: 200,
      duration: 12,
      description: 'Taxi Treichville → Plateau',
      reverseDescription: 'Taxi Plateau → Treichville',
    },
    // Plateau ↔ Adjamé (communal taxi)
    {
      from: s('Plateau Gare Nord'),
      to: s('Adjamé Liberté'),
      type: TransportType.communal_taxi,
      price: 200,
      duration: 15,
      description: 'Taxi Plateau → Adjamé',
      reverseDescription: 'Taxi Adjamé → Plateau',
    },
    // Adjamé ↔ Yopougon (gbaka)
    {
      from: s('Adjamé Liberté'),
      to: s('Carrefour La Vie'),
      type: TransportType.gbaka,
      price: 300,
      duration: 20,
      description: 'Gbaka Adjamé → Carrefour La Vie (Yopougon)',
      reverseDescription: 'Gbaka Carrefour La Vie → Adjamé',
    },
    // Adjamé ↔ Yopougon Marché (gbaka, alternative)
    {
      from: s('Adjamé 220 Logements'),
      to: s('Yopougon Marché'),
      type: TransportType.gbaka,
      price: 250,
      duration: 18,
      description: 'Gbaka Adjamé 220 → Yopougon Marché',
      reverseDescription: 'Gbaka Yopougon Marché → Adjamé 220',
    },
    // Within Yopougon (communal taxi)
    {
      from: s('Carrefour La Vie'),
      to: s('Yopougon Toit Rouge'),
      type: TransportType.communal_taxi,
      price: 200,
      duration: 8,
      description: 'Taxi Carrefour La Vie → Toit Rouge',
      reverseDescription: 'Taxi Toit Rouge → Carrefour La Vie',
    },
    {
      from: s('Yopougon Marché'),
      to: s('Yopougon Toit Rouge'),
      type: TransportType.communal_taxi,
      price: 200,
      duration: 10,
      description: 'Taxi Yopougon Marché → Toit Rouge',
      reverseDescription: 'Taxi Toit Rouge → Yopougon Marché',
    },
    // Walking connections
    {
      from: s('Koumassi Remblai'),
      to: s('Koumassi Grand Carrefour'),
      type: TransportType.walking,
      price: 0,
      duration: 5,
      description: 'Walk from Koumassi Remblai to Grand Carrefour',
      reverseDescription: 'Walk from Grand Carrefour to Koumassi Remblai',
    },
    {
      from: s('Treichville Gare Sud'),
      to: s('Treichville Marché'),
      type: TransportType.walking,
      price: 0,
      duration: 5,
      description: 'Walk from Treichville Gare Sud to Marché',
      reverseDescription: 'Walk from Marché to Treichville Gare Sud',
    },
    {
      from: s('Adjamé Liberté'),
      to: s('Adjamé 220 Logements'),
      type: TransportType.walking,
      price: 0,
      duration: 7,
      description: 'Walk from Adjamé Liberté to 220 Logements',
      reverseDescription: 'Walk from 220 Logements to Adjamé Liberté',
    },
  ]);

  await prisma.connection.createMany({
    data: pointToPointConnections,
  });

  // ─── ZONE-BASED CONNECTIONS (NEW) ──────────────────────────────────────

  console.log('📍 Creating zone-based connections...');

  await prisma.connection.createMany({
    data: [
      // Zone-to-Zone: Yopougon Taxi Zone → Yopougon Taxi Zone (any taxi within Yopougon)
      {
        fromZoneId: z('Yopougon Taxi Zone'),
        toZoneId: z('Yopougon Taxi Zone'),
        transportType: TransportType.communal_taxi,
        basePrice: 200,
        durationMinutes: 10,
        routeDescription: 'Taxi within Yopougon (any stop)',
      },
      // Zone-to-Zone: Koumassi Taxi Zone → Koumassi Taxi Zone
      {
        fromZoneId: z('Koumassi Taxi Zone'),
        toZoneId: z('Koumassi Taxi Zone'),
        transportType: TransportType.communal_taxi,
        basePrice: 150,
        durationMinutes: 8,
        routeDescription: 'Taxi within Koumassi (any stop)',
      },
      // Zone-to-Zone: Treichville Taxi Zone → Treichville Taxi Zone
      {
        fromZoneId: z('Treichville Taxi Zone'),
        toZoneId: z('Treichville Taxi Zone'),
        transportType: TransportType.communal_taxi,
        basePrice: 150,
        durationMinutes: 8,
        routeDescription: 'Taxi within Treichville (any stop)',
      },
      // Stop-to-Zone: Carrefour La Vie → Any stop in Yopougon Taxi Zone
      {
        fromStopId: s('Carrefour La Vie'),
        toZoneId: z('Yopougon Taxi Zone'),
        transportType: TransportType.communal_taxi,
        basePrice: 200,
        durationMinutes: 10,
        routeDescription: 'Taxi from Carrefour La Vie to anywhere in Yopougon',
      },
      // Zone-to-Stop: Yopougon Taxi Zone → Carrefour La Vie
      {
        fromZoneId: z('Yopougon Taxi Zone'),
        toStopId: s('Carrefour La Vie'),
        transportType: TransportType.communal_taxi,
        basePrice: 200,
        durationMinutes: 10,
        routeDescription: 'Taxi from anywhere in Yopougon to Carrefour La Vie',
      },
      // Zone-to-Stop: Adjamé Gbaka Corridor → Adjamé Liberté
      {
        fromZoneId: z('Adjamé Gbaka Corridor'),
        toStopId: s('Adjamé Liberté'),
        transportType: TransportType.gbaka,
        basePrice: 100,
        durationMinutes: 5,
        routeDescription: 'Gbaka from Adjamé corridor to Adjamé Liberté',
      },
      // Stop-to-Zone: Adjamé Liberté → Adjamé Gbaka Corridor
      {
        fromStopId: s('Adjamé Liberté'),
        toZoneId: z('Adjamé Gbaka Corridor'),
        transportType: TransportType.gbaka,
        basePrice: 100,
        durationMinutes: 5,
        routeDescription: 'Gbaka from Adjamé Liberté to Adjamé corridor',
      },
      // Zone-to-Stop: Adjamé Gbaka Corridor → Carrefour La Vie (Yopougon)
      {
        fromZoneId: z('Adjamé Gbaka Corridor'),
        toStopId: s('Carrefour La Vie'),
        transportType: TransportType.gbaka,
        basePrice: 350,
        durationMinutes: 25,
        routeDescription: 'Gbaka from Adjamé corridor to Carrefour La Vie (Yopougon)',
      },
      // Stop-to-Zone: Carrefour La Vie → Adjamé Gbaka Corridor
      {
        fromStopId: s('Carrefour La Vie'),
        toZoneId: z('Adjamé Gbaka Corridor'),
        transportType: TransportType.gbaka,
        basePrice: 350,
        durationMinutes: 25,
        routeDescription: 'Gbaka from Carrefour La Vie (Yopougon) to Adjamé corridor',
      },
    ],
  });

  console.log(`✅ Seeded ${stops.length} stops`);
  console.log(`✅ Seeded ${zones.length} zones`);
  console.log(`✅ Seeded ${pointToPointConnections.length + 9} connections (${pointToPointConnections.length} point-to-point, 9 zone-based)`);
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
