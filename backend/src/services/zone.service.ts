import prisma from '../lib/prisma';

/**
 * Get all stops that belong to a zone
 */
export async function getStopsInZone(zoneId: string): Promise<string[]> {
  const stops = await prisma.stop.findMany({
    where: { zoneId },
    select: { id: true }
  });
  return stops.map(stop => stop.id);
}

/**
 * Check if an ID is a zone ID
 */
export async function isZone(id: string): Promise<boolean> {
  const zone = await prisma.zone.findUnique({
    where: { id },
    select: { id: true }
  });
  return zone !== null;
}

/**
 * Check if an ID is a stop ID
 */
export async function isStop(id: string): Promise<boolean> {
  const stop = await prisma.stop.findUnique({
    where: { id },
    select: { id: true }
  });
  return stop !== null;
}

/**
 * Get zone info for a stop
 */
export async function getZoneForStop(stopId: string): Promise<{ id: string; name: string } | null> {
  const stop = await prisma.stop.findUnique({
    where: { id: stopId },
    include: { zone: true }
  });
  
  if (!stop || !stop.zone) return null;
  
  return {
    id: stop.zone.id,
    name: stop.zone.name
  };
}
