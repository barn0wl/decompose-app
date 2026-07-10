-- Enable PostGIS extension if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- Verify PostGIS is available (optional, but good for debugging)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'postgis'
    ) THEN
        RAISE EXCEPTION 'PostGIS extension is not installed!';
    END IF;
END $$;


ALTER TABLE "Connection" DROP COLUMN IF EXISTS "votedBy";

-- Add geometry columns
ALTER TABLE "Stop" ADD COLUMN "geom" geometry(Point, 4326);
ALTER TABLE "Zone" ADD COLUMN "geom" geometry(Polygon, 4326);

-- Populate Stop geometries from existing lat/lng data
UPDATE "Stop" 
SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Make geom columns NOT NULL after populating
ALTER TABLE "Stop" ALTER COLUMN "geom" SET NOT NULL;

-- Create spatial indexes for lightning-fast spatial queries
CREATE INDEX IF NOT EXISTS "stop_geom_idx" ON "Stop" USING GIST ("geom");
CREATE INDEX IF NOT EXISTS "zone_geom_idx" ON "Zone" USING GIST ("geom");

-- Add a trigger to automatically update geom when lat/lng changes (optional)
CREATE OR REPLACE FUNCTION update_stop_geom() 
RETURNS TRIGGER AS $$
BEGIN
    NEW.geom = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stop_geom_update 
BEFORE INSERT OR UPDATE OF latitude, longitude ON "Stop" 
FOR EACH ROW 
EXECUTE FUNCTION update_stop_geom();


-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "vote" SMALLINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes for Vote table
CREATE INDEX "Vote_deviceId_idx" ON "Vote"("deviceId");
CREATE INDEX "Vote_connectionId_idx" ON "Vote"("connectionId");
CREATE INDEX "Vote_createdAt_idx" ON "Vote"("createdAt");
CREATE UNIQUE INDEX "Vote_connectionId_deviceId_key" ON "Vote"("connectionId", "deviceId");


ALTER TABLE "Vote" ADD CONSTRAINT "Vote_connectionId_fkey" 
    FOREIGN KEY ("connectionId") REFERENCES "Connection"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE;


-- Add a partial index for high-vote connections (for faster routing)
CREATE INDEX "connection_high_vote_idx" ON "Connection" ("voteScore") 
    WHERE "voteScore" > 0;

-- Add an index for low-vote connections (for trust score calculations)
CREATE INDEX "connection_low_vote_idx" ON "Connection" ("voteScore") 
    WHERE "voteScore" < 0;
