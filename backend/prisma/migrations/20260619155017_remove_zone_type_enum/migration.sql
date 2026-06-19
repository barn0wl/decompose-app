/*
  Warnings:

  - You are about to drop the column `zoneType` on the `Zone` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Zone" DROP COLUMN "zoneType";

-- DropEnum
DROP TYPE "ZoneType";
