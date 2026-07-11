-- Delete all zone-based connections before making stop IDs required
DELETE FROM "Connection" 
WHERE "fromStopId" IS NULL OR "toStopId" IS NULL;

-- Also delete any votes that might reference these connections
DELETE FROM "Vote" 
WHERE "connectionId" IN (
  SELECT id FROM "Connection" 
  WHERE "fromStopId" IS NULL OR "toStopId" IS NULL
);


-- DropForeignKey
ALTER TABLE "Connection" DROP CONSTRAINT "Connection_fromStopId_fkey";

-- DropForeignKey
ALTER TABLE "Connection" DROP CONSTRAINT "Connection_fromZoneId_fkey";

-- DropForeignKey
ALTER TABLE "Connection" DROP CONSTRAINT "Connection_toStopId_fkey";

-- DropForeignKey
ALTER TABLE "Connection" DROP CONSTRAINT "Connection_toZoneId_fkey";

-- DropForeignKey
ALTER TABLE "Stop" DROP CONSTRAINT "Stop_zoneId_fkey";

-- DropIndex
DROP INDEX "stop_geom_idx";

-- AlterTable
ALTER TABLE "Connection" DROP COLUMN "fromZoneId",
DROP COLUMN "pricePerZone",
DROP COLUMN "toZoneId",
ALTER COLUMN "fromStopId" SET NOT NULL,
ALTER COLUMN "toStopId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Stop" DROP COLUMN "zoneId",
ALTER COLUMN "geom" DROP NOT NULL,
ALTER COLUMN "geom" SET DATA TYPE TEXT;

-- DropTable
DROP TABLE "Zone";

-- AddForeignKey
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_fromStopId_fkey" FOREIGN KEY ("fromStopId") REFERENCES "Stop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_toStopId_fkey" FOREIGN KEY ("toStopId") REFERENCES "Stop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
