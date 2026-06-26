-- CreateEnum
CREATE TYPE "SuggestionStatus" AS ENUM ('pending', 'approved', 'rejected', 'auto_rejected');

-- AlterEnum
ALTER TYPE "TransportType" ADD VALUE 'sotra_bus';

-- AlterTable
ALTER TABLE "Connection" ADD COLUMN     "downvotes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "upvotes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "voteScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "votedBy" JSONB;

-- CreateTable
CREATE TABLE "SuggestedConnection" (
    "id" TEXT NOT NULL,
    "fromStopId" TEXT NOT NULL,
    "toStopId" TEXT NOT NULL,
    "transportType" "TransportType" NOT NULL,
    "basePrice" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "routeDescription" TEXT,
    "submittedBy" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "SuggestionStatus" NOT NULL DEFAULT 'pending',
    "confirmations" INTEGER NOT NULL DEFAULT 0,
    "confirmationThreshold" INTEGER NOT NULL DEFAULT 5,
    "confirmedBy" JSONB,
    "rejectedBy" TEXT,
    "rejectedReason" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuggestedConnection_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SuggestedConnection" ADD CONSTRAINT "SuggestedConnection_fromStopId_fkey" FOREIGN KEY ("fromStopId") REFERENCES "Stop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuggestedConnection" ADD CONSTRAINT "SuggestedConnection_toStopId_fkey" FOREIGN KEY ("toStopId") REFERENCES "Stop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
