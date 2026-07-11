import { PrismaClient, StopType, TransportType, SuggestionStatus } from '../generated/prisma/index';
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...\n');

  // Clean existing data (order matters due to foreign keys)
  await prisma.vote.deleteMany();
  await prisma.suggestedConnection.deleteMany();
  await prisma.connection.deleteMany();
  await prisma.stop.deleteMany();

  // ─── STOPS ───────────────────────────────────────────────────────────────
  console.log('📍 Creating stops...\n');

  // ============================================================
  // REAL STOPS (Verified locations)
  // ============================================================
  const realStops = [
    // Cocody
    {
      name: 'Carrefour La Vie',
      commune: 'Cocody',
      latitude: 5.348077183704681,
      longitude: -4.003998932346861,
      type: StopType.gbaka_station,
    },
    {
      name: 'Saint Jean',
      commune: 'Cocody',
      latitude: 5.335555307305185,
      longitude: -4.003757711173526,
      type: StopType.landmark,
    },
    {
      name: 'Carrefour 9 Kilos',
      commune: 'Cocody',
      latitude: 5.3580039615894774,
      longitude: -3.96453951595039,
      type: StopType.landmark,
    },
    {
      name: 'Angré Petro Ivoire',
      commune: 'Cocody',
      latitude: 5.404421098618564,
      longitude: -3.9875821630349324,
      type: StopType.landmark,
    },
    {
      name: 'CHU d\'Angré',
      commune: 'Cocody',
      latitude: 5.404557696766911,
      longitude: -3.956112841689849,
      type: StopType.landmark,
    },
    {
      name: 'Playce Palmeraie',
      commune: 'Cocody',
      latitude: 5.3734570431046595,
      longitude: -3.9335970196467844,
      type: StopType.landmark,
    },
    {
      name: 'Rosiers 6',
      commune: 'Cocody',
      latitude: 5.394946660919032,
      longitude: -3.9680634512354422,
      type: StopType.taxi_stop,
    },

    // Yopougon
    {
      name: 'Yopougon Toit Rouge',
      commune: 'Yopougon',
      latitude: 5.349255236885707,
      longitude: -4.077624034199311,
      type: StopType.taxi_stop,
    },
    {
      name: 'Cosmos Yopougon',
      commune: 'Yopougon',
      latitude: 5.349940589004634,
      longitude: -4.074017492824232,
      type: StopType.landmark,
    },
    {
      name: 'Yopougon Maroc',
      commune: 'Yopougon',
      latitude: 5.340875407230319,
      longitude: -4.113844050807754,
      type: StopType.taxi_stop,
    },

    // Koumassi
    {
      name: 'Koumassi Remblais',
      commune: 'Koumassi',
      latitude: 5.300369987996002,
      longitude: -3.964877905363696,
      type: StopType.taxi_stop,
    },
    {
      name: 'Grand Carrefour de Koumassi',
      commune: 'Koumassi',
      latitude: 5.288414191726205,
      longitude: -3.970688947691688,
      type: StopType.gbaka_station,
    },
    {
      name: 'Boulangerie Opéra',
      commune: 'Koumassi',
      latitude: 5.303482595162278,
      longitude: -3.9503928709185736,
      type: StopType.taxi_stop,
    },

    // Marcory
    {
      name: 'Grand Carrefour de Marcory',
      commune: 'Marcory',
      latitude: 5.300591519768063,
      longitude: -3.9892050937243018,
      type: StopType.gbaka_station,
    },
    {
      name: 'Orca Deco',
      commune: 'Marcory',
      latitude: 5.298076118304384,
      longitude: -3.9844841764436314,
      type: StopType.landmark,
    },

    // Treichville
    {
      name: 'Gare de Bassam',
      commune: 'Treichville',
      latitude: 5.299815886012507,
      longitude: -4.00247787838008,
      type: StopType.gbaka_station,
    },
    {
      name: 'Grand Marché de Treichville',
      commune: 'Treichville',
      latitude: 5.309172264928636,
      longitude: -4.013676734199663,
      type: StopType.taxi_stop,
    },
    {
      name: 'CHU de Treichville',
      commune: 'Treichville',
      latitude: 5.293713963499158,
      longitude: -4.003854169603117,
      type: StopType.landmark,
    },

    // Adjamé
    {
      name: 'Adjamé Liberté',
      commune: 'Adjamé',
      latitude: 5.353515635393432,
      longitude: -4.014971905363238,
      type: StopType.gbaka_station,
    },

    // Plateau
    {
      name: 'Gare Sud Plateau',
      commune: 'Plateau',
      latitude: 5.314771076799619,
      longitude: -4.01844129480397,
      type: StopType.landmark,
    },
    {
      name: 'Cathédrale Saint Paul',
      commune: 'Plateau',
      latitude: 5.333123736612489,
      longitude: -4.019986840603219,
      type: StopType.landmark,
    },

    // Port-Bouet
    {
      name: 'Rond-point d\'Anani',
      commune: 'Port-Bouet',
      latitude: 5.23614495894964,
      longitude: -3.874810508986609,
      type: StopType.landmark,
    },
    {
      name: 'Premier Arrêt',
      commune: 'Port-Bouet',
      latitude: 5.244641156087436,
      longitude: -3.9292019945985546,
      type: StopType.taxi_stop,
    },
    {
      name: 'Au Casier',
      commune: 'Port-Bouet',
      latitude: 5.242861075018325,
      longitude: -3.916787507298958,
      type: StopType.taxi_stop,
    },

    // Grand-Bassam
    {
      name: 'Gare Routière de Bassam',
      commune: 'Grand-Bassam',
      latitude: 5.206774494595144,
      longitude: -3.7349442276523197,
      type: StopType.gbaka_station,
    },
    {
      name: 'Rosiers 3',
      commune: 'Grand-Bassam',
      latitude: 5.216275482705988,
      longitude: -3.7817287806678093,
      type: StopType.taxi_stop,
    },
    {
      name: 'Grand Marché de Grand-Bassam',
      commune: 'Grand-Bassam',
      latitude: 5.207181393834313,
      longitude: -3.733717051626817,
      type: StopType.landmark,
    },

    // Bingerville
    {
      name: 'Nouvelle Gare de Bingerville',
      commune: 'Bingerville',
      latitude: 5.353451690339081,
      longitude: -3.8768735790148234,
      type: StopType.gbaka_station,
    },
  ];

  // ============================================================
  // TEST STOPS (Added for demonstration - may not be verified)
  // ============================================================
  const testStops = [
    // Additional Yopougon
    {
      name: 'Yopougon Marché',
      commune: 'Yopougon',
      latitude: 5.347825492701234,
      longitude: -4.065123456789012,
      type: StopType.taxi_stop,
    },
    {
      name: 'Yopougon SOTRA Terminus',
      commune: 'Yopougon',
      latitude: 5.341987654321098,
      longitude: -4.074567890123456,
      type: StopType.landmark,
    },

    // Additional Cocody
    {
      name: 'Cocody Mairie',
      commune: 'Cocody',
      latitude: 5.350987654321098,
      longitude: -3.997654321098765,
      type: StopType.taxi_stop,
    },
    {
      name: 'Cocody Université',
      commune: 'Cocody',
      latitude: 5.342123456789012,
      longitude: -3.985432109876543,
      type: StopType.landmark,
    },

    // Additional Koumassi
    {
      name: 'Koumassi SOTRA Terminus',
      commune: 'Koumassi',
      latitude: 5.297654321098765,
      longitude: -3.981234567890123,
      type: StopType.landmark,
    },
    {
      name: 'Koumassi Marché',
      commune: 'Koumassi',
      latitude: 5.295432109876543,
      longitude: -3.975678901234567,
      type: StopType.taxi_stop,
    },

    // Additional Treichville
    {
      name: 'Treichville Gare Sud',
      commune: 'Treichville',
      latitude: 5.294567890123456,
      longitude: -3.989876543210987,
      type: StopType.gbaka_station,
    },
    {
      name: 'Treichville Mairie',
      commune: 'Treichville',
      latitude: 5.304567890123456,
      longitude: -4.007654321098765,
      type: StopType.taxi_stop,
    },

    // Additional Adjamé
    {
      name: 'Adjamé 220 Logements',
      commune: 'Adjamé',
      latitude: 5.364567890123456,
      longitude: -4.004567890123456,
      type: StopType.taxi_stop,
    },
    {
      name: 'Adjamé Plateau',
      commune: 'Adjamé',
      latitude: 5.356789012345678,
      longitude: -4.008901234567890,
      type: StopType.landmark,
    },

    // Additional Plateau
    {
      name: 'Plateau Gare Nord',
      commune: 'Plateau',
      latitude: 5.319876543210987,
      longitude: -4.019876543210987,
      type: StopType.landmark,
    },
    {
      name: 'Plateau SOTRA Terminus',
      commune: 'Plateau',
      latitude: 5.324567890123456,
      longitude: -4.017654321098765,
      type: StopType.landmark,
    },
    {
      name: 'Plateau Centre',
      commune: 'Plateau',
      latitude: 5.321234567890123,
      longitude: -4.021234567890123,
      type: StopType.taxi_stop,
    },

    // Additional Marcory
    {
      name: 'Marcory Zone 4',
      commune: 'Marcory',
      latitude: 5.302345678901234,
      longitude: -3.991234567890123,
      type: StopType.taxi_stop,
    },
    {
      name: 'Marcory Mairie',
      commune: 'Marcory',
      latitude: 5.306789012345678,
      longitude: -3.996789012345678,
      type: StopType.landmark,
    },

    // Additional Port-Bouet
    {
      name: 'Port-Bouet Mairie',
      commune: 'Port-Bouet',
      latitude: 5.248765432109876,
      longitude: -3.909876543210987,
      type: StopType.landmark,
    },
    {
      name: 'Port-Bouet Gare',
      commune: 'Port-Bouet',
      latitude: 5.252345678901234,
      longitude: -3.897654321098765,
      type: StopType.gbaka_station,
    },

    // Additional Grand-Bassam
    {
      name: 'Grand-Bassam Mairie',
      commune: 'Grand-Bassam',
      latitude: 5.210987654321098,
      longitude: -3.742345678901234,
      type: StopType.landmark,
    },
    {
      name: 'Grand-Bassam Plage',
      commune: 'Grand-Bassam',
      latitude: 5.201234567890123,
      longitude: -3.721234567890123,
      type: StopType.landmark,
    },
  ];

  // Combine all stops
  const allStopsData = [...realStops, ...testStops];
  const stops = await prisma.stop.createManyAndReturn({
    data: allStopsData,
  });

  console.log(`✅ Created ${stops.length} stops (${realStops.length} real, ${testStops.length} test)\n`);

  const s = (name: string) => {
    const stop = stops.find(s => s.name === name);
    if (!stop) throw new Error(`Stop not found: ${name}`);
    return stop.id;
  };

  // ─── CONNECTIONS ─────────────────────────────────────────────────────────
  console.log('📍 Creating connections...\n');

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

  // ============================================================
  // REAL CONNECTIONS (Verified routes)
  // ============================================================
  console.log('🔵 Adding REAL connections...');

  const realConnections = createBidirectional([
    // Gare de Bassam (Treichville) → Gare Routière de Bassam (Grand-Bassam)
    {
      from: s('Gare de Bassam'),
      to: s('Gare Routière de Bassam'),
      type: TransportType.gbaka,
      price: 500,
      duration: 90,
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
      duration: 75,
      description: 'Gbaka from Treichville to Petro Ivoire (Cocody)',
      reverseDescription: 'Gbaka from Petro Ivoire (Cocody) to Treichville',
    },
  ]);

  await prisma.connection.createMany({
    data: realConnections,
  });

  console.log(`✅ Added ${realConnections.length} real connections (${realConnections.length/2} bidirectional pairs)\n`);

  // ============================================================
  // TEST CONNECTIONS (Added for demonstration)
  // ============================================================
  console.log('🟢 Adding TEST connections...');

  // ─── HUB CONNECTIONS ──────────────────────────────────────────
  const hubConnections = createBidirectional([
    // Carrefour La Vie hub
    {
      from: s('Carrefour La Vie'),
      to: s('Adjamé Liberté'),
      type: TransportType.gbaka,
      price: 300,
      duration: 20,
      description: 'Gbaka from Carrefour La Vie to Adjamé Liberté',
      reverseDescription: 'Gbaka from Adjamé Liberté to Carrefour La Vie',
    },
    {
      from: s('Carrefour La Vie'),
      to: s('Saint Jean'),
      type: TransportType.communal_taxi,
      price: 250,
      duration: 12,
      description: 'Taxi from Carrefour La Vie to Saint Jean',
      reverseDescription: 'Taxi from Saint Jean to Carrefour La Vie',
    },
    {
      from: s('Carrefour La Vie'),
      to: s('Cocody Mairie'),
      type: TransportType.communal_taxi,
      price: 200,
      duration: 10,
      description: 'Taxi from Carrefour La Vie to Cocody Mairie',
      reverseDescription: 'Taxi from Cocody Mairie to Carrefour La Vie',
    },
    {
      from: s('Carrefour La Vie'),
      to: s('Carrefour 9 Kilos'),
      type: TransportType.communal_taxi,
      price: 300,
      duration: 15,
      description: 'Taxi from Carrefour La Vie to Carrefour 9 Kilos',
      reverseDescription: 'Taxi from Carrefour 9 Kilos to Carrefour La Vie',
    },
    {
      from: s('Carrefour La Vie'),
      to: s('Plateau SOTRA Terminus'),
      type: TransportType.sotra_bus,
      price: 300,
      duration: 30,
      description: 'SOTRA bus from Carrefour La Vie to Plateau',
      reverseDescription: 'SOTRA bus from Plateau to Carrefour La Vie',
    },
    {
      from: s('Carrefour La Vie'),
      to: s('Cathédrale Saint Paul'),
      type: TransportType.sotra_bus,
      price: 350,
      duration: 25,
      description: 'SOTRA bus from Carrefour La Vie to Cathédrale Saint Paul',
      reverseDescription: 'SOTRA bus from Cathédrale Saint Paul to Carrefour La Vie',
    },
    {
      from: s('Carrefour La Vie'),
      to: s('Gare Sud Plateau'),
      type: TransportType.sotra_bus,
      price: 250,
      duration: 20,
      description: 'SOTRA bus from Carrefour La Vie to Gare Sud Plateau',
      reverseDescription: 'SOTRA bus from Gare Sud Plateau to Carrefour La Vie',
    },

    // Adjamé Liberté hub
    {
      from: s('Adjamé Liberté'),
      to: s('Grand Carrefour de Koumassi'),
      type: TransportType.gbaka,
      price: 300,
      duration: 25,
      description: 'Gbaka from Adjamé Liberté to Grand Carrefour de Koumassi',
      reverseDescription: 'Gbaka from Grand Carrefour de Koumassi to Adjamé Liberté',
    },
    {
      from: s('Adjamé Liberté'),
      to: s('Plateau SOTRA Terminus'),
      type: TransportType.communal_taxi,
      price: 200,
      duration: 15,
      description: 'Taxi from Adjamé Liberté to Plateau',
      reverseDescription: 'Taxi from Plateau to Adjamé Liberté',
    },
    {
      from: s('Adjamé Liberté'),
      to: s('Carrefour 9 Kilos'),
      type: TransportType.gbaka,
      price: 350,
      duration: 25,
      description: 'Gbaka from Adjamé to Carrefour 9 Kilos',
      reverseDescription: 'Gbaka from Carrefour 9 Kilos to Adjamé',
    },
    {
      from: s('Adjamé Liberté'),
      to: s('Adjamé 220 Logements'),
      type: TransportType.communal_taxi,
      price: 150,
      duration: 8,
      description: 'Taxi from Adjamé Liberté to Adjamé 220 Logements',
      reverseDescription: 'Taxi from Adjamé 220 Logements to Adjamé Liberté',
    },
    {
      from: s('Adjamé Liberté'),
      to: s('Adjamé Plateau'),
      type: TransportType.communal_taxi,
      price: 200,
      duration: 10,
      description: 'Taxi from Adjamé Liberté to Adjamé Plateau',
      reverseDescription: 'Taxi from Adjamé Plateau to Adjamé Liberté',
    },

    // Grand Carrefour de Koumassi hub
    {
      from: s('Grand Carrefour de Koumassi'),
      to: s('Koumassi Remblais'),
      type: TransportType.communal_taxi,
      price: 200,
      duration: 10,
      description: 'Taxi from Grand Carrefour de Koumassi to Koumassi Remblais',
      reverseDescription: 'Taxi from Koumassi Remblais to Grand Carrefour de Koumassi',
    },
    {
      from: s('Grand Carrefour de Koumassi'),
      to: s('Koumassi SOTRA Terminus'),
      type: TransportType.communal_taxi,
      price: 250,
      duration: 12,
      description: 'Taxi from Grand Carrefour de Koumassi to Koumassi SOTRA Terminus',
      reverseDescription: 'Taxi from Koumassi SOTRA Terminus to Grand Carrefour de Koumassi',
    },
    {
      from: s('Grand Carrefour de Koumassi'),
      to: s('Koumassi Marché'),
      type: TransportType.communal_taxi,
      price: 150,
      duration: 8,
      description: 'Taxi from Grand Carrefour de Koumassi to Koumassi Marché',
      reverseDescription: 'Taxi from Koumassi Marché to Grand Carrefour de Koumassi',
    },
    {
      from: s('Grand Carrefour de Koumassi'),
      to: s('Boulangerie Opéra'),
      type: TransportType.communal_taxi,
      price: 200,
      duration: 10,
      description: 'Taxi from Grand Carrefour de Koumassi to Boulangerie Opéra',
      reverseDescription: 'Taxi from Boulangerie Opéra to Grand Carrefour de Koumassi',
    },
    {
      from: s('Grand Carrefour de Koumassi'),
      to: s('Plateau SOTRA Terminus'),
      type: TransportType.sotra_bus,
      price: 250,
      duration: 25,
      description: 'SOTRA bus from Koumassi to Plateau',
      reverseDescription: 'SOTRA bus from Plateau to Koumassi',
    },

    // Gare de Bassam hub
    {
      from: s('Gare de Bassam'),
      to: s('Grand Marché de Treichville'),
      type: TransportType.communal_taxi,
      price: 200,
      duration: 10,
      description: 'Taxi from Gare de Bassam to Grand Marché de Treichville',
      reverseDescription: 'Taxi from Grand Marché de Treichville to Gare de Bassam',
    },
    {
      from: s('Gare de Bassam'),
      to: s('CHU de Treichville'),
      type: TransportType.communal_taxi,
      price: 150,
      duration: 8,
      description: 'Taxi from Gare de Bassam to CHU de Treichville',
      reverseDescription: 'Taxi from CHU de Treichville to Gare de Bassam',
    },
    {
      from: s('Gare de Bassam'),
      to: s('Treichville Gare Sud'),
      type: TransportType.communal_taxi,
      price: 200,
      duration: 10,
      description: 'Taxi from Gare de Bassam to Treichville Gare Sud',
      reverseDescription: 'Taxi from Treichville Gare Sud to Gare de Bassam',
    },
    {
      from: s('Gare de Bassam'),
      to: s('Grand Carrefour de Marcory'),
      type: TransportType.communal_taxi,
      price: 150,
      duration: 8,
      description: 'Taxi from Gare de Bassam to Grand Carrefour de Marcory',
      reverseDescription: 'Taxi from Grand Carrefour de Marcory to Gare de Bassam',
    },
    {
      from: s('Gare de Bassam'),
      to: s('Rond-point d\'Anani'),
      type: TransportType.gbaka,
      price: 400,
      duration: 30,
      description: 'Gbaka from Treichville to Port-Bouet',
      reverseDescription: 'Gbaka from Port-Bouet to Treichville',
    },

    // Yopougon hub
    {
      from: s('Yopougon Toit Rouge'),
      to: s('Yopougon Marché'),
      type: TransportType.communal_taxi,
      price: 200,
      duration: 10,
      description: 'Taxi from Yopougon Toit Rouge to Yopougon Marché',
      reverseDescription: 'Taxi from Yopougon Marché to Yopougon Toit Rouge',
    },
    {
      from: s('Yopougon Toit Rouge'),
      to: s('Cosmos Yopougon'),
      type: TransportType.communal_taxi,
      price: 150,
      duration: 8,
      description: 'Taxi from Yopougon Toit Rouge to Cosmos Yopougon',
      reverseDescription: 'Taxi from Cosmos Yopougon to Yopougon Toit Rouge',
    },
    {
      from: s('Yopougon Toit Rouge'),
      to: s('Yopougon Maroc'),
      type: TransportType.communal_taxi,
      price: 300,
      duration: 15,
      description: 'Taxi from Yopougon Toit Rouge to Yopougon Maroc',
      reverseDescription: 'Taxi from Yopougon Maroc to Yopougon Toit Rouge',
    },
    {
      from: s('Yopougon Toit Rouge'),
      to: s('Yopougon SOTRA Terminus'),
      type: TransportType.communal_taxi,
      price: 250,
      duration: 12,
      description: 'Taxi from Yopougon Toit Rouge to Yopougon SOTRA Terminus',
      reverseDescription: 'Taxi from Yopougon SOTRA Terminus to Yopougon Toit Rouge',
    },
    {
      from: s('Yopougon Toit Rouge'),
      to: s('Gare de Bassam'),
      type: TransportType.gbaka,
      price: 400,
      duration: 30,
      description: 'Gbaka from Yopougon Toit Rouge to Gare de Bassam',
      reverseDescription: 'Gbaka from Gare de Bassam to Yopougon Toit Rouge',
    },
    {
      from: s('Yopougon Toit Rouge'),
      to: s('Plateau SOTRA Terminus'),
      type: TransportType.sotra_bus,
      price: 350,
      duration: 35,
      description: 'SOTRA bus from Yopougon to Plateau',
      reverseDescription: 'SOTRA bus from Plateau to Yopougon',
    },
    {
      from: s('Yopougon Marché'),
      to: s('Cosmos Yopougon'),
      type: TransportType.communal_taxi,
      price: 150,
      duration: 8,
      description: 'Taxi from Yopougon Marché to Cosmos Yopougon',
      reverseDescription: 'Taxi from Cosmos Yopougon to Yopougon Marché',
    },
    {
      from: s('Yopougon Marché'),
      to: s('Yopougon SOTRA Terminus'),
      type: TransportType.communal_taxi,
      price: 200,
      duration: 10,
      description: 'Taxi from Yopougon Marché to Yopougon SOTRA Terminus',
      reverseDescription: 'Taxi from Yopougon SOTRA Terminus to Yopougon Marché',
    },
    {
      from: s('Yopougon SOTRA Terminus'),
      to: s('Plateau SOTRA Terminus'),
      type: TransportType.sotra_bus,
      price: 300,
      duration: 30,
      description: 'SOTRA bus from Yopougon SOTRA to Plateau',
      reverseDescription: 'SOTRA bus from Plateau to Yopougon SOTRA',
    },

    // Plateau hub
    {
      from: s('Plateau SOTRA Terminus'),
      to: s('Gare Sud Plateau'),
      type: TransportType.communal_taxi,
      price: 200,
      duration: 10,
      description: 'Taxi from Plateau SOTRA to Gare Sud Plateau',
      reverseDescription: 'Taxi from Gare Sud Plateau to Plateau SOTRA',
    },
    {
      from: s('Plateau SOTRA Terminus'),
      to: s('Cathédrale Saint Paul'),
      type: TransportType.communal_taxi,
      price: 250,
      duration: 12,
      description: 'Taxi from Plateau SOTRA to Cathédrale Saint Paul',
      reverseDescription: 'Taxi from Cathédrale Saint Paul to Plateau SOTRA',
    },
    {
      from: s('Plateau SOTRA Terminus'),
      to: s('Plateau Gare Nord'),
      type: TransportType.communal_taxi,
      price: 200,
      duration: 10,
      description: 'Taxi from Plateau SOTRA to Plateau Gare Nord',
      reverseDescription: 'Taxi from Plateau Gare Nord to Plateau SOTRA',
    },
    {
      from: s('Plateau SOTRA Terminus'),
      to: s('Plateau Centre'),
      type: TransportType.communal_taxi,
      price: 150,
      duration: 8,
      description: 'Taxi from Plateau SOTRA to Plateau Centre',
      reverseDescription: 'Taxi from Plateau Centre to Plateau SOTRA',
    },
    {
      from: s('Plateau SOTRA Terminus'),
      to: s('Grand Marché de Treichville'),
      type: TransportType.communal_taxi,
      price: 350,
      duration: 20,
      description: 'Taxi from Plateau to Grand Marché de Treichville',
      reverseDescription: 'Taxi from Grand Marché de Treichville to Plateau',
    },

    // Marcory hub
    {
      from: s('Grand Carrefour de Marcory'),
      to: s('Orca Deco'),
      type: TransportType.communal_taxi,
      price: 150,
      duration: 8,
      description: 'Taxi from Grand Carrefour de Marcory to Orca Deco',
      reverseDescription: 'Taxi from Orca Deco to Grand Carrefour de Marcory',
    },
    {
      from: s('Grand Carrefour de Marcory'),
      to: s('Marcory Zone 4'),
      type: TransportType.communal_taxi,
      price: 200,
      duration: 10,
      description: 'Taxi from Grand Carrefour de Marcory to Marcory Zone 4',
      reverseDescription: 'Taxi from Marcory Zone 4 to Grand Carrefour de Marcory',
    },
    {
      from: s('Grand Carrefour de Marcory'),
      to: s('Marcory Mairie'),
      type: TransportType.communal_taxi,
      price: 250,
      duration: 12,
      description: 'Taxi from Grand Carrefour de Marcory to Marcory Mairie',
      reverseDescription: 'Taxi from Marcory Mairie to Grand Carrefour de Marcory',
    },

    // Grand-Bassam connections
    {
      from: s('Gare Routière de Bassam'),
      to: s('Grand Marché de Grand-Bassam'),
      type: TransportType.communal_taxi,
      price: 200,
      duration: 10,
      description: 'Taxi from Gare Routière to Grand Marché de Grand-Bassam',
      reverseDescription: 'Taxi from Grand Marché de Grand-Bassam to Gare Routière',
    },
    {
      from: s('Gare Routière de Bassam'),
      to: s('Rosiers 3'),
      type: TransportType.communal_taxi,
      price: 300,
      duration: 15,
      description: 'Taxi from Gare Routière to Rosiers 3',
      reverseDescription: 'Taxi from Rosiers 3 to Gare Routière',
    },
    {
      from: s('Gare Routière de Bassam'),
      to: s('Grand-Bassam Mairie'),
      type: TransportType.communal_taxi,
      price: 250,
      duration: 12,
      description: 'Taxi from Gare Routière to Grand-Bassam Mairie',
      reverseDescription: 'Taxi from Grand-Bassam Mairie to Gare Routière',
    },
    {
      from: s('Gare Routière de Bassam'),
      to: s('Grand-Bassam Plage'),
      type: TransportType.communal_taxi,
      price: 400,
      duration: 20,
      description: 'Taxi from Gare Routière to Grand-Bassam Plage',
      reverseDescription: 'Taxi from Grand-Bassam Plage to Gare Routière',
    },

    // Port-Bouet connections
    {
      from: s('Rond-point d\'Anani'),
      to: s('Premier Arrêt'),
      type: TransportType.communal_taxi,
      price: 300,
      duration: 15,
      description: 'Taxi from Rond-point d\'Anani to Premier Arrêt',
      reverseDescription: 'Taxi from Premier Arrêt to Rond-point d\'Anani',
    },
    {
      from: s('Rond-point d\'Anani'),
      to: s('Au Casier'),
      type: TransportType.communal_taxi,
      price: 400,
      duration: 20,
      description: 'Taxi from Rond-point d\'Anani to Au Casier',
      reverseDescription: 'Taxi from Au Casier to Rond-point d\'Anani',
    },
    {
      from: s('Rond-point d\'Anani'),
      to: s('Port-Bouet Mairie'),
      type: TransportType.communal_taxi,
      price: 350,
      duration: 18,
      description: 'Taxi from Rond-point d\'Anani to Port-Bouet Mairie',
      reverseDescription: 'Taxi from Port-Bouet Mairie to Rond-point d\'Anani',
    },
    {
      from: s('Rond-point d\'Anani'),
      to: s('Port-Bouet Gare'),
      type: TransportType.gbaka,
      price: 250,
      duration: 12,
      description: 'Gbaka from Rond-point d\'Anani to Port-Bouet Gare',
      reverseDescription: 'Gbaka from Port-Bouet Gare to Rond-point d\'Anani',
    },

    // Long-distance connections
    {
      from: s('Gare Routière de Bassam'),
      to: s('Nouvelle Gare de Bingerville'),
      type: TransportType.gbaka,
      price: 600,
      duration: 45,
      description: 'Gbaka from Grand-Bassam to Bingerville',
      reverseDescription: 'Gbaka from Bingerville to Grand-Bassam',
    },
    {
      from: s('Nouvelle Gare de Bingerville'),
      to: s('Playce Palmeraie'),
      type: TransportType.gbaka,
      price: 350,
      duration: 25,
      description: 'Gbaka from Bingerville to Playce Palmeraie',
      reverseDescription: 'Gbaka from Playce Palmeraie to Bingerville',
    },
    {
      from: s('Playce Palmeraie'),
      to: s('Carrefour 9 Kilos'),
      type: TransportType.communal_taxi,
      price: 250,
      duration: 15,
      description: 'Taxi from Playce Palmeraie to Carrefour 9 Kilos',
      reverseDescription: 'Taxi from Carrefour 9 Kilos to Playce Palmeraie',
    },
    {
      from: s('Carrefour 9 Kilos'),
      to: s('Rosiers 6'),
      type: TransportType.communal_taxi,
      price: 200,
      duration: 10,
      description: 'Taxi from Carrefour 9 Kilos to Rosiers 6',
      reverseDescription: 'Taxi from Rosiers 6 to Carrefour 9 Kilos',
    },
    {
      from: s('Carrefour 9 Kilos'),
      to: s('CHU d\'Angré'),
      type: TransportType.communal_taxi,
      price: 300,
      duration: 18,
      description: 'Taxi from Carrefour 9 Kilos to CHU d\'Angré',
      reverseDescription: 'Taxi from CHU d\'Angré to Carrefour 9 Kilos',
    },
    {
      from: s('CHU d\'Angré'),
      to: s('Angré Petro Ivoire'),
      type: TransportType.communal_taxi,
      price: 200,
      duration: 10,
      description: 'Taxi from CHU d\'Angré to Angré Petro Ivoire',
      reverseDescription: 'Taxi from Angré Petro Ivoire to CHU d\'Angré',
    },
    {
      from: s('Angré Petro Ivoire'),
      to: s('Rosiers 6'),
      type: TransportType.communal_taxi,
      price: 250,
      duration: 12,
      description: 'Taxi from Angré Petro Ivoire to Rosiers 6',
      reverseDescription: 'Taxi from Rosiers 6 to Angré Petro Ivoire',
    },

    // Cross-communal connections
    {
      from: s('Grand Marché de Treichville'),
      to: s('Koumassi Remblais'),
      type: TransportType.communal_taxi,
      price: 300,
      duration: 20,
      description: 'Taxi from Treichville to Koumassi',
      reverseDescription: 'Taxi from Koumassi to Treichville',
    },
    {
      from: s('Grand Marché de Treichville'),
      to: s('Grand Carrefour de Koumassi'),
      type: TransportType.communal_taxi,
      price: 350,
      duration: 25,
      description: 'Taxi from Treichville to Grand Carrefour de Koumassi',
      reverseDescription: 'Taxi from Grand Carrefour de Koumassi to Treichville',
    },
    {
      from: s('Grand Marché de Treichville'),
      to: s('Boulangerie Opéra'),
      type: TransportType.communal_taxi,
      price: 400,
      duration: 30,
      description: 'Taxi from Treichville to Boulangerie Opéra',
      reverseDescription: 'Taxi from Boulangerie Opéra to Treichville',
    },
    {
      from: s('Cathédrale Saint Paul'),
      to: s('Gare Sud Plateau'),
      type: TransportType.communal_taxi,
      price: 200,
      duration: 10,
      description: 'Taxi from Cathédrale Saint Paul to Gare Sud Plateau',
      reverseDescription: 'Taxi from Gare Sud Plateau to Cathédrale Saint Paul',
    },
    {
      from: s('Cathédrale Saint Paul'),
      to: s('Saint Jean'),
      type: TransportType.communal_taxi,
      price: 350,
      duration: 18,
      description: 'Taxi from Cathédrale Saint Paul to Saint Jean',
      reverseDescription: 'Taxi from Saint Jean to Cathédrale Saint Paul',
    },
    {
      from: s('Saint Jean'),
      to: s('Plateau SOTRA Terminus'),
      type: TransportType.communal_taxi,
      price: 300,
      duration: 15,
      description: 'Taxi from Saint Jean to Plateau',
      reverseDescription: 'Taxi from Plateau to Saint Jean',
    },
    {
      from: s('Saint Jean'),
      to: s('Carrefour 9 Kilos'),
      type: TransportType.communal_taxi,
      price: 400,
      duration: 20,
      description: 'Taxi from Saint Jean to Carrefour 9 Kilos',
      reverseDescription: 'Taxi from Carrefour 9 Kilos to Saint Jean',
    },
    {
      from: s('Saint Jean'),
      to: s('Grand Marché de Treichville'),
      type: TransportType.communal_taxi,
      price: 350,
      duration: 18,
      description: 'Taxi from Saint Jean to Grand Marché de Treichville',
      reverseDescription: 'Taxi from Grand Marché de Treichville to Saint Jean',
    },
  ]);

  await prisma.connection.createMany({
    data: hubConnections,
  });

  console.log(`✅ Added ${hubConnections.length} test connections (${hubConnections.length/2} bidirectional pairs)\n`);

  // ─── SAMPLE SUGGESTIONS ──────────────────────────────────────────────────
  console.log('📍 Creating suggestions...');

  const suggestions = [
    {
      fromStopId: s('Yopougon Toit Rouge'),
      toStopId: s('Grand Marché de Treichville'),
      transportType: TransportType.communal_taxi,
      basePrice: 300,
      durationMinutes: 25,
      routeDescription: 'Taxi Yopougon Toit Rouge → Grand Marché de Treichville (suggested)',
      submittedBy: 'device-demo-001',
      status: 'pending' as SuggestionStatus,
      confirmations: 0,
      confirmationThreshold: 5,
      confirmedBy: [],
    },
    {
      fromStopId: s('Carrefour 9 Kilos'),
      toStopId: s('Gare de Bassam'),
      transportType: TransportType.gbaka,
      basePrice: 400,
      durationMinutes: 35,
      routeDescription: 'Gbaka from Carrefour 9 Kilos to Gare de Bassam (suggested)',
      submittedBy: 'device-demo-002',
      status: 'pending' as SuggestionStatus,
      confirmations: 2,
      confirmationThreshold: 5,
      confirmedBy: ['device-demo-001', 'device-demo-003'],
    },
    {
      fromStopId: s('Angré Petro Ivoire'),
      toStopId: s('Gare Routière de Bassam'),
      transportType: TransportType.gbaka,
      basePrice: 800,
      durationMinutes: 60,
      routeDescription: 'Gbaka from Angré Petro Ivoire to Grand-Bassam (suggested)',
      submittedBy: 'device-demo-004',
      status: 'pending' as SuggestionStatus,
      confirmations: 1,
      confirmationThreshold: 5,
      confirmedBy: ['device-demo-001'],
    },
    {
      fromStopId: s('Cosmos Yopougon'),
      toStopId: s('Adjamé Liberté'),
      transportType: TransportType.gbaka,
      basePrice: 350,
      durationMinutes: 25,
      routeDescription: 'Gbaka from Cosmos Yopougon to Adjamé Liberté (suggested)',
      submittedBy: 'device-demo-005',
      status: 'pending' as SuggestionStatus,
      confirmations: 3,
      confirmationThreshold: 5,
      confirmedBy: ['device-demo-001', 'device-demo-002', 'device-demo-003'],
    },
    {
      fromStopId: s('Rond-point d\'Anani'),
      toStopId: s('Grand-Bassam Plage'),
      transportType: TransportType.gbaka,
      basePrice: 600,
      durationMinutes: 45,
      routeDescription: 'Gbaka from Port-Bouet to Grand-Bassam Plage (suggested)',
      submittedBy: 'device-demo-006',
      status: 'pending' as SuggestionStatus,
      confirmations: 0,
      confirmationThreshold: 5,
      confirmedBy: [],
    },
  ];

  for (const suggestion of suggestions) {
    await prisma.suggestedConnection.create({
      data: suggestion,
    });
  }

  console.log(`✅ Added ${suggestions.length} suggestions\n`);

  // ─── SUMMARY ─────────────────────────────────────────────────────────────
  const totalStops = await prisma.stop.count();
  const totalConnections = await prisma.connection.count();
  const totalSuggestions = await prisma.suggestedConnection.count();

  console.log('📊 SEED SUMMARY');
  console.log('═'.repeat(40));
  console.log(`✅ Stops:        ${totalStops} (${realStops.length} real, ${testStops.length} test)`);
  console.log(`✅ Connections:  ${totalConnections} (${realConnections.length} real, ${hubConnections.length} test)`);
  console.log(`✅ Suggestions:  ${totalSuggestions}`);
  console.log('═'.repeat(40));

  // Print stops by commune
  console.log('\n📋 Stops by commune:');
  const stopsByCommune = await prisma.stop.groupBy({
    by: ['commune'],
    _count: true,
  });
  for (const group of stopsByCommune) {
    console.log(`  - ${group.commune}: ${group._count} stops`);
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
