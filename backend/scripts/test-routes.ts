import { PrismaClient } from '../generated/prisma/index';
import { PrismaPg } from "@prisma/adapter-pg";
import { routingService } from '../src/services/routing.service';
import dotenv from 'dotenv';

dotenv.config();

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function testRoutes() {
  console.log('🧪 Testing zone-based routing...\n');

  try {
    // Get stops with their zones
    const stops = await prisma.stop.findMany({
      include: { zone: true }
    });

    if (stops.length < 2) {
      console.log('❌ Not enough stops in database. Please run seed first.');
      return;
    }

    // Test Case 1: Stop within same zone
    const yopougonStops = stops.filter(s => s.zone?.name === 'Yopougon Taxi Zone');
    if (yopougonStops.length >= 2) {
      const from = yopougonStops[0];
      const to = yopougonStops[1];
      console.log(`📍 Test 1: Same zone (${from.zone?.name})`);
      console.log(`   From: ${from.name} → To: ${to.name}`);
      
      try {
        const routes = await routingService.calculateRoute(from.id, to.id, 'price');
        const route = routes[0];
        console.log(`   ✅ Found route: ${route.totalPrice} CFA, ${route.totalDuration} min`);
        console.log(`   Steps: ${route.steps.length}`);
        route.steps.forEach((step, i) => {
          console.log(`     ${i + 1}. ${step.type} ${step.from} → ${step.to} (${step.price} CFA, ${step.duration} min)`);
        });
      } catch (error: any) {
        console.log(`   ❌ Error: ${error.message}`);
      }
      console.log('');
    }

    // Test Case 2: Different zones
    const differentZones = stops.filter(s => s.zone?.name !== stops[0]?.zone?.name);
    if (differentZones.length >= 1 && stops[0]) {
      const from = stops[0];
      const to = differentZones[0];
      console.log(`📍 Test 2: Different zones`);
      console.log(`   From: ${from.name} (${from.zone?.name || 'no zone'})`);
      console.log(`   To: ${to.name} (${to.zone?.name || 'no zone'})`);
      
      try {
        const routes = await routingService.calculateRoute(from.id, to.id, 'price');
        const route = routes[0];
        console.log(`   ✅ Found route: ${route.totalPrice} CFA, ${route.totalDuration} min`);
        console.log(`   Steps: ${route.steps.length}`);
        route.steps.forEach((step, i) => {
          console.log(`     ${i + 1}. ${step.type} ${step.from} → ${step.to} (${step.price} CFA, ${step.duration} min)`);
          if (step.fromZone) console.log(`        From zone: ${step.fromZone}`);
          if (step.toZone) console.log(`        To zone: ${step.toZone}`);
        });
      } catch (error: any) {
        console.log(`   ❌ Error: ${error.message}`);
      }
      console.log('');
    }

    // Test Case 3: Zone-to-zone route (find two stops in different zones)
    const zones = await prisma.zone.findMany({
      include: { stops: true }
    });
    const zonesWithStops = zones.filter(z => z.stops.length > 0);
    if (zonesWithStops.length >= 2) {
      const zone1 = zonesWithStops[0];
      const zone2 = zonesWithStops[1];
      if (zone1.stops.length > 0 && zone2.stops.length > 0) {
        const from = zone1.stops[0];
        const to = zone2.stops[0];
        console.log(`📍 Test 3: Zone-to-zone connection`);
        console.log(`   From: ${from.name} (${zone1.name})`);
        console.log(`   To: ${to.name} (${zone2.name})`);
        
        try {
          const routes = await routingService.calculateRoute(from.id, to.id, 'price');
          const route = routes[0];
          console.log(`   ✅ Found route: ${route.totalPrice} CFA, ${route.totalDuration} min`);
          console.log(`   Steps: ${route.steps.length}`);
          route.steps.forEach((step, i) => {
            console.log(`     ${i + 1}. ${step.type} ${step.from} → ${step.to} (${step.price} CFA, ${step.duration} min)`);
          });
        } catch (error: any) {
          console.log(`   ❌ Error: ${error.message}`);
        }
        console.log('');
      }
    }

    // Print summary of available zones and stops
    console.log('📊 Database summary:');
    console.log(`   Total stops: ${stops.length}`);
    console.log(`   Total zones: ${zones.length}`);
    console.log(`   Zones with stops: ${zonesWithStops.length}`);
    console.log('\n   Zones:');
    for (const zone of zones) {
      const stopCount = zone.stops.length;
      console.log(`     - ${zone.name}: ${stopCount} stop${stopCount !== 1 ? 's' : ''}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testRoutes();
