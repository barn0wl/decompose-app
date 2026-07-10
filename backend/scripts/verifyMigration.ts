import prisma from '../src/lib/prisma';

async function verifyMigration() {
  console.log('🔍 Verifying migration...\n');

  // 1. Check PostGIS
  const postgisCheck = await prisma.$queryRaw`
    SELECT extversion FROM pg_extension WHERE extname = 'postgis'
  `;
  console.log('✅ PostGIS version:', postgisCheck);

  // 2. Check geometry columns
  const geomCheck = await prisma.$queryRaw`
    SELECT 
      COUNT(*) as total_stops,
      COUNT(geom) as stops_with_geom
    FROM "Stop"
  `;
  console.log('📊 Stop geometries:', geomCheck);

  // 3. Check Vote table
  const voteCount = await prisma.vote.count();
  console.log('📊 Total votes:', voteCount);

  // 4. Test spatial query
  const spatialTest = await prisma.$queryRaw`
    SELECT 
      ST_Distance(
        ST_SetSRID(ST_MakePoint(-1.6595, 48.1120), 4326),
        ST_SetSRID(ST_MakePoint(-1.6600, 48.1130), 4326)
      ) as distance
  `;
  console.log('📍 Spatial query test:', spatialTest);

  // 5. Check indexes
  const indexes = await prisma.$queryRaw`
    SELECT 
      schemaname,
      tablename,
      indexname,
      indexdef
    FROM pg_indexes
    WHERE indexname IN ('stop_geom_idx', 'zone_geom_idx', 'Vote_connectionId_deviceId_key')
  `;
  console.log('🗂️  Indexes created:', indexes);

  console.log('\n✅ Migration verification complete!');
}

verifyMigration()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });