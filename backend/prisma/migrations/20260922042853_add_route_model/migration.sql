-- DropIndex
DROP INDEX "stop_geom_idx";

-- AlterTable
ALTER TABLE "Stop" ALTER COLUMN "geom" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Route" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "transportType" "TransportType" NOT NULL,
    "pricing" JSONB NOT NULL,
    "totalStops" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Route_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteSegment" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "fromStopId" TEXT NOT NULL,
    "toStopId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL,

    CONSTRAINT "RouteSegment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Route_transportType_idx" ON "Route"("transportType");

-- CreateIndex
CREATE INDEX "RouteSegment_fromStopId_idx" ON "RouteSegment"("fromStopId");

-- CreateIndex
CREATE INDEX "RouteSegment_toStopId_idx" ON "RouteSegment"("toStopId");

-- CreateIndex
CREATE INDEX "RouteSegment_routeId_idx" ON "RouteSegment"("routeId");

-- CreateIndex
CREATE UNIQUE INDEX "RouteSegment_routeId_sequence_key" ON "RouteSegment"("routeId", "sequence");

-- AddForeignKey
ALTER TABLE "RouteSegment" ADD CONSTRAINT "RouteSegment_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteSegment" ADD CONSTRAINT "RouteSegment_fromStopId_fkey" FOREIGN KEY ("fromStopId") REFERENCES "Stop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteSegment" ADD CONSTRAINT "RouteSegment_toStopId_fkey" FOREIGN KEY ("toStopId") REFERENCES "Stop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
