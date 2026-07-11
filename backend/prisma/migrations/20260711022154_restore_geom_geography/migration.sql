-- Restore geom as a real, correctly-typed spatial column, recomputed
-- straight from latitude/longitude (the actual source of truth) rather
-- than trusting whatever is currently sitting in the text column.
ALTER TABLE "Stop"
  ALTER COLUMN "geom" TYPE geography(Point, 4326)
  USING ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography;

ALTER TABLE "Stop" ALTER COLUMN "geom" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "stop_geom_idx" ON "Stop" USING GIST ("geom");

-- Keep geom auto-synced with lat/lng, now writing geography instead of geometry
CREATE OR REPLACE FUNCTION update_stop_geom()
RETURNS TRIGGER AS $$
BEGIN
    NEW.geom = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- trigger itself (stop_geom_update) already exists and points at this
-- function, so CREATE OR REPLACE is enough — no need to recreate it.
