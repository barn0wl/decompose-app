import { PrismaClient, StopType, TransportType, SuggestionStatus } from '../generated/prisma/index';
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data (order matters due to foreign keys)
  await prisma.suggestedConnection.deleteMany();
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
      {
        name: 'Cocody Taxi Zone',
        commune: 'Cocody',
        description: 'Communal taxi area covering Cocody',
      },
      {
        name: 'Marcory Taxi Zone',
        commune: 'Marcory',
        description: 'Communal taxi area covering Marcory',
      },
      {
        name: 'Port-Bouet Taxi Zone',
        commune: 'Port-Bouet',
        description: 'Communal taxi area covering Port-Bouet',
      },
      {
        name: 'Grand-Bassam Taxi Zone',
        commune: 'Grand-Bassam',
        description: 'Communal taxi area covering Grand-Bassam',
      },
    ],
  });

  const z = (name: string) => {
    const zone = zones.find(z => z.name === name);
    if (!zone) throw new Error(`Zone not found: ${name}`);
    return zone.id;
  };

  // ─── STOPS ───────────────────────────────────────────────────────────────
  console.log('📍 Creating stops with accurate coordinates...');

  const stops = await prisma.stop.createManyAndReturn({
    data: [
      // Yopougon stops
      {
        name: 'Yopougon Toit Rouge',
        commune: 'Yopougon',
        latitude: 5.349255236885707,
        longitude: -4.077624034199311,
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
      // Keeping as placeholder - may or may not exist
      {
        name: 'Yopougon SOTRA Terminus',
        commune: 'Yopougon',
        latitude: 5.3420,
        longitude: -4.0750,
        type: StopType.landmark,
        zoneId: z('Yopougon Taxi Zone'),
      },

      // Cocody stops
      {
        name: 'Carrefour La Vie',
        commune: 'Cocody',
        latitude: 5.348077183704681,
        longitude: -4.003998932346861,
        type: StopType.gbaka_station,
        zoneId: z('Cocody Taxi Zone'),
      },
      {
        name: 'Saint Jean',
        commune: 'Cocody',
        latitude: 5.335555307305185,
        longitude: -4.003757711173526,
        type: StopType.landmark,
        zoneId: z('Cocody Taxi Zone'),
      },
      {
        name: 'Carrefour 9 Kilos',
        commune: 'Cocody',
        latitude: 5.3580039615894774,
        longitude: -3.96453951595039,
        type: StopType.landmark,
        zoneId: z('Cocody Taxi Zone'),
      },
      {
        name: 'Angré Petro Ivoire',
        commune: 'Cocody',
        latitude: 5.404421098618564,
        longitude: -3.9875821630349324,
        type: StopType.landmark,
        zoneId: z('Cocody Taxi Zone'),
      },

      // Koumassi stops
      {
        name: 'Koumassi Remblais',
        commune: 'Koumassi',
        latitude: 5.300369987996002,
        longitude: -3.964877905363696,
        type: StopType.taxi_stop,
        zoneId: z('Koumassi Taxi Zone'),
      },
      {
        name: 'Grand Carrefour de Koumassi',
        commune: 'Koumassi',
        latitude: 5.288414191726205,
        longitude: -3.970688947691688,
        type: StopType.gbaka_station,
        zoneId: z('Koumassi Taxi Zone'),
      },
      // Keeping as placeholder
      {
        name: 'Koumassi SOTRA Terminus',
        commune: 'Koumassi',
        latitude: 5.2980,
        longitude: -3.9820,
        type: StopType.landmark,
        zoneId: z('Koumassi Taxi Zone'),
      },

      // Marcory stops
      {
        name: 'Grand Carrefour de Marcory',
        commune: 'Marcory',
        latitude: 5.300591519768063,
        longitude: -3.9892050937243018,
        type: StopType.gbaka_station,
        zoneId: z('Marcory Taxi Zone'),
      },

      // Treichville stops
      {
        name: 'Gare de Bassam',
        commune: 'Treichville',
        latitude: 5.299815886012507,
        longitude: -4.00247787838008,
        type: StopType.gbaka_station,
        zoneId: z('Treichville Taxi Zone'),
      },
      {
        name: 'Grand Marché de Treichville',
        commune: 'Treichville',
        latitude: 5.309172264928636,
        longitude: -4.013676734199663,
        type: StopType.taxi_stop,
        zoneId: z('Treichville Taxi Zone'),
      },
      // Keeping as placeholder
      {
        name: 'Treichville Gare Sud',
        commune: 'Treichville',
        latitude: 5.2950,
        longitude: -3.9900,
        type: StopType.gbaka_station,
        zoneId: z('Treichville Taxi Zone'),
      },

      // Adjamé stops
      {
        name: 'Adjamé Liberté',
        commune: 'Adjamé',
        latitude: 5.353515635393432,
        longitude: -4.014971905363238,
        type: StopType.gbaka_station,
        zoneId: z('Adjamé Gbaka Corridor'),
      },
      // Keeping as placeholder
      {
        name: 'Adjamé 220 Logements',
        commune: 'Adjamé',
        latitude: 5.3650,
        longitude: -4.0050,
        type: StopType.taxi_stop,
        zoneId: z('Adjamé Gbaka Corridor'),
      },

      // Plateau stops
      // Keeping as placeholder
      {
        name: 'Plateau Gare Nord',
        commune: 'Plateau',
        latitude: 5.3200,
        longitude: -4.0200,
        type: StopType.landmark,
        zoneId: z('Plateau Central Zone'),
      },
      {
        name: 'Plateau SOTRA Terminus',
        commune: 'Plateau',
        latitude: 5.3250,
        longitude: -4.0180,
        type: StopType.landmark,
        zoneId: z('Plateau Central Zone'),
      },

      // Port-Bouet stops
      {
        name: 'Rond-point d\'Anani',
        commune: 'Port-Bouet',
        latitude: 5.23614495894964,
        longitude: -3.874810508986609,
        type: StopType.landmark,
        zoneId: z('Port-Bouet Taxi Zone'),
      },

      // Grand-Bassam stops
      {
        name: 'Gare Routière de Bassam',
        commune: 'Grand-Bassam',
        latitude: 5.206774494595144,
        longitude: -3.7349442276523197,
        type: StopType.gbaka_station,
        zoneId: z('Grand-Bassam Taxi Zone'),
      },
    ],
  });

  const s = (name: string) => {
    const stop = stops.find(s => s.name === name);
    if (!stop) throw new Error(`Stop not found: ${name}`);
    return stop.id;
  };

  // ─── CONNECTIONS ─────────────────────────────────────────────────────────
  console.log('📍 Creating connections...');

  const createBidirectional = (data: any[]) => {
    const connections: any[] = [];
    for (const item of data) {
      connections.push({
        fromStopId: item.from,
        toStopId: item.to,
        transportType: item.type,
        basePrice: item.price,
        durationMinutes: item.duration,
        routeDescription: item.description,
      });
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

  // ─── REAL CONNECTIONS (from your knowledge) ────────────────────────────

  const realConnections = createBidirectional([
    // Gare de Bassam (Treichville) → Gare Routière de Bassam (Grand-Bassam)
    {
      from: s('Gare de Bassam'),
      to: s('Gare Routière de Bassam'),
      type: TransportType.gbaka,
      price: 500,
      duration: 90, // 1.5 hours
      description: 'Gbaka from Treichville to Grand-Bassam',
      reverseDescription: 'Gbaka from Grand-Bassam to Treichville',
    },
    // Gare de Bassam → Saint Jean
    {
      from: s('Gare de Bassam'),
      to: s('Saint Jean'),
      type: TransportType.gbaka,
      price: 500,
      duration: 20,
      description: 'Gbaka from Treichville to Saint Jean (Cocody)',
      reverseDescription: 'Gbaka from Saint Jean (Cocody) to Treichville',
    },
    // Gare de Bassam → Angré Petro Ivoire
    {
      from: s('Gare de Bassam'),
      to: s('Angré Petro Ivoire'),
      type: TransportType.gbaka,
      price: 1000,
      duration: 75, // 1h15
      description: 'Gbaka from Treichville to Petro Ivoire (Cocody)',
      reverseDescription: 'Gbaka from Petro Ivoire (Cocody) to Treichville',
    },
  ]);

  await prisma.connection.createMany({
    data: realConnections,
  });

  // ─── IMPROVISED CONNECTIONS ─────────────────────────────────────────────
  console.log('📍 Creating improvised connections...');

  const improvisedConnections = createBidirectional([
    // Carrefour La Vie ↔ Adjamé Liberté
    {
      from: s('Carrefour La Vie'),
      to: s('Adjamé Liberté'),
      type: TransportType.gbaka,
      price: 300,
      duration: 20,
      description: 'Gbaka from Carrefour La Vie (Cocody) to Adjamé Liberté',
      reverseDescription: 'Gbaka from Adjamé Liberté to Carrefour La Vie (Cocody)',
    },
    // Adjamé Liberté ↔ Grand Carrefour de Koumassi
    {
      from: s('Adjamé Liberté'),
      to: s('Grand Carrefour de Koumassi'),
      type: TransportType.gbaka,
      price: 300,
      duration: 25,
      description: 'Gbaka from Adjamé Liberté to Grand Carrefour de Koumassi',
      reverseDescription: 'Gbaka from Grand Carrefour de Koumassi to Adjamé Liberté',
    },
    // Grand Carrefour de Koumassi ↔ Koumassi Remblais
    {
      from: s('Grand Carrefour de Koumassi'),
      to: s('Koumassi Remblais'),
      type: TransportType.communal_taxi,
      price: 200,
      duration: 10,
      description: 'Taxi from Grand Carrefour de Koumassi to Koumassi Remblais',
      reverseDescription: 'Taxi from Koumassi Remblais to Grand Carrefour de Koumassi',
    },
    // Grand Marché de Treichville ↔ Gare de Bassam
    {
      from: s('Grand Marché de Treichville'),
      to: s('Gare de Bassam'),
      type: TransportType.communal_taxi,
      price: 200,
      duration: 10,
      description: 'Taxi from Grand Marché de Treichville to Gare de Bassam',
      reverseDescription: 'Taxi from Gare de Bassam to Grand Marché de Treichville',
    },
    // Carrefour La Vie ↔ Saint Jean
    {
      from: s('Carrefour La Vie'),
      to: s('Saint Jean'),
      type: TransportType.communal_taxi,
      price: 250,
      duration: 12,
      description: 'Taxi from Carrefour La Vie to Saint Jean (Cocody)',
      reverseDescription: 'Taxi from Saint Jean (Cocody) to Carrefour La Vie',
    },
    // Saint Jean ↔ Plateau SOTRA Terminus
    {
      from: s('Saint Jean'),
      to: s('Plateau SOTRA Terminus'),
      type: TransportType.communal_taxi,
      price: 300,
      duration: 15,
      description: 'Taxi from Saint Jean to Plateau',
      reverseDescription: 'Taxi from Plateau to Saint Jean',
    },
    // Angré Petro Ivoire ↔ Carrefour 9 Kilos
    {
      from: s('Angré Petro Ivoire'),
      to: s('Carrefour 9 Kilos'),
      type: TransportType.communal_taxi,
      price: 200,
      duration: 10,
      description: 'Taxi from Petro Ivoire to Carrefour 9 Kilos',
      reverseDescription: 'Taxi from Carrefour 9 Kilos to Petro Ivoire',
    },
    // Adjamé Liberté ↔ Plateau SOTRA Terminus
    {
      from: s('Adjamé Liberté'),
      to: s('Plateau SOTRA Terminus'),
      type: TransportType.communal_taxi,
      price: 200,
      duration: 15,
      description: 'Taxi from Adjamé Liberté to Plateau',
      reverseDescription: 'Taxi from Plateau to Adjamé Liberté',
    },
    // Grand Carrefour de Marcory ↔ Gare de Bassam
    {
      from: s('Grand Carrefour de Marcory'),
      to: s('Gare de Bassam'),
      type: TransportType.communal_taxi,
      price: 150,
      duration: 8,
      description: 'Taxi from Marcory to Gare de Bassam',
      reverseDescription: 'Taxi from Gare de Bassam to Marcory',
    },
    // Rond-point d\'Anani ↔ Gare de Bassam
    {
      from: s('Rond-point d\'Anani'),
      to: s('Gare de Bassam'),
      type: TransportType.gbaka,
      price: 400,
      duration: 30,
      description: 'Gbaka from Port-Bouet to Treichville',
      reverseDescription: 'Gbaka from Treichville to Port-Bouet',
    },
  ]);

  await prisma.connection.createMany({
    data: improvisedConnections,
  });

  // ─── SOTRA BUS CONNECTIONS ──────────────────────────────────────────────
  console.log('📍 Creating SOTRA bus connections...');

  const sotraConnections = createBidirectional([
    // Carrefour La Vie → Plateau SOTRA
    {
      from: s('Carrefour La Vie'),
      to: s('Plateau SOTRA Terminus'),
      type: TransportType.sotra_bus,
      price: 300,
      duration: 30,
      description: 'SOTRA bus from Carrefour La Vie to Plateau',
      reverseDescription: 'SOTRA bus from Plateau to Carrefour La Vie',
    },
    // Grand Carrefour de Koumassi → Plateau SOTRA
    {
      from: s('Grand Carrefour de Koumassi'),
      to: s('Plateau SOTRA Terminus'),
      type: TransportType.sotra_bus,
      price: 250,
      duration: 25,
      description: 'SOTRA bus from Koumassi to Plateau',
      reverseDescription: 'SOTRA bus from Plateau to Koumassi',
    },
    // Carrefour La Vie → Grand Carrefour de Koumassi
    {
      from: s('Carrefour La Vie'),
      to: s('Grand Carrefour de Koumassi'),
      type: TransportType.sotra_bus,
      price: 350,
      duration: 35,
      description: 'SOTRA bus from Cocody to Koumassi',
      reverseDescription: 'SOTRA bus from Koumassi to Cocody',
    },
  ]);

  await prisma.connection.createMany({
    data: sotraConnections,
  });

  // ─── ZONE-BASED CONNECTIONS ─────────────────────────────────────────────
  console.log('📍 Creating zone-based connections...');

  const zoneConnections = [
    // Yopougon Taxi Zone → Yopougon Taxi Zone
    {
      fromZoneId: z('Yopougon Taxi Zone'),
      toZoneId: z('Yopougon Taxi Zone'),
      transportType: TransportType.communal_taxi,
      basePrice: 200,
      durationMinutes: 10,
      routeDescription: 'Taxi within Yopougon (any stop)',
    },
    // Cocody Taxi Zone → Cocody Taxi Zone
    {
      fromZoneId: z('Cocody Taxi Zone'),
      toZoneId: z('Cocody Taxi Zone'),
      transportType: TransportType.communal_taxi,
      basePrice: 250,
      durationMinutes: 12,
      routeDescription: 'Taxi within Cocody (any stop)',
    },
    // Koumassi Taxi Zone → Koumassi Taxi Zone
    {
      fromZoneId: z('Koumassi Taxi Zone'),
      toZoneId: z('Koumassi Taxi Zone'),
      transportType: TransportType.communal_taxi,
      basePrice: 150,
      durationMinutes: 8,
      routeDescription: 'Taxi within Koumassi (any stop)',
    },
    // Treichville Taxi Zone → Treichville Taxi Zone
    {
      fromZoneId: z('Treichville Taxi Zone'),
      toZoneId: z('Treichville Taxi Zone'),
      transportType: TransportType.communal_taxi,
      basePrice: 150,
      durationMinutes: 8,
      routeDescription: 'Taxi within Treichville (any stop)',
    },
    // Adjamé Gbaka Corridor → Adjamé Gbaka Corridor
    {
      fromZoneId: z('Adjamé Gbaka Corridor'),
      toZoneId: z('Adjamé Gbaka Corridor'),
      transportType: TransportType.gbaka,
      basePrice: 100,
      durationMinutes: 5,
      routeDescription: 'Gbaka within Adjamé corridor',
    },
    // Stop-to-Zone: Carrefour La Vie → Any stop in Cocody Taxi Zone
    {
      fromStopId: s('Carrefour La Vie'),
      toZoneId: z('Cocody Taxi Zone'),
      transportType: TransportType.communal_taxi,
      basePrice: 200,
      durationMinutes: 10,
      routeDescription: 'Taxi from Carrefour La Vie to anywhere in Cocody',
    },
    // Zone-to-Stop: Cocody Taxi Zone → Carrefour La Vie
    {
      fromZoneId: z('Cocody Taxi Zone'),
      toStopId: s('Carrefour La Vie'),
      transportType: TransportType.communal_taxi,
      basePrice: 200,
      durationMinutes: 10,
      routeDescription: 'Taxi from anywhere in Cocody to Carrefour La Vie',
    },
  ];

  await prisma.connection.createMany({
    data: zoneConnections,
  });

  // ─── SAMPLE SUGGESTIONS ──────────────────────────────────────────────────
  console.log('📍 Creating sample suggestions...');

  await prisma.suggestedConnection.create({
    data: {
      fromStopId: s('Yopougon Toit Rouge'),
      toStopId: s('Grand Marché de Treichville'),
      transportType: TransportType.communal_taxi,
      basePrice: 300,
      durationMinutes: 25,
      routeDescription: 'Taxi Yopougon Toit Rouge → Grand Marché de Treichville (suggested)',
      submittedBy: 'device-demo-001',
      status: 'pending',
      confirmations: 0,
      confirmationThreshold: 5,
      confirmedBy: [],
    },
  });

  await prisma.suggestedConnection.create({
    data: {
      fromStopId: s('Carrefour 9 Kilos'),
      toStopId: s('Gare de Bassam'),
      transportType: TransportType.gbaka,
      basePrice: 400,
      durationMinutes: 35,
      routeDescription: 'Gbaka from Carrefour 9 Kilos to Gare de Bassam (suggested)',
      submittedBy: 'device-demo-002',
      status: 'pending',
      confirmations: 2,
      confirmationThreshold: 5,
      confirmedBy: ['device-demo-001', 'device-demo-003'],
    },
  });

  // ─── SUMMARY ─────────────────────────────────────────────────────────────
  const totalStops = await prisma.stop.count();
  const totalZones = await prisma.zone.count();
  const totalConnections = await prisma.connection.count();
  const totalSuggestions = await prisma.suggestedConnection.count();

  console.log(`✅ Seeded ${totalStops} stops`);
  console.log(`✅ Seeded ${totalZones} zones`);
  console.log(`✅ Seeded ${totalConnections} connections`);
  console.log(`✅ Seeded ${totalSuggestions} suggestions`);

  // Print stops for reference
  console.log('\n📋 Stops seeded:');
  const allStops = await prisma.stop.findMany({
    select: { name: true, commune: true, latitude: true, longitude: true },
    orderBy: { commune: 'asc' },
  });
  for (const stop of allStops) {
    console.log(`  - ${stop.name} (${stop.commune})`);
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
  