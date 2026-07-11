import { Request, Response } from 'express';
import { routingService } from '../services/routing.service';
import { calculateRouteSchema } from '../validators/route.validator';
import { ZodError } from 'zod';
import prisma from '../lib/prisma';

export async function calculateRoute(req: Request, res: Response) {
  try {
    const validated = calculateRouteSchema.parse(req.body);

    const originStop = await prisma.stop.findUnique({
      where: { id: validated.originStopId },
    });
    const destinationStop = await prisma.stop.findUnique({
      where: { id: validated.destinationStopId },
    });

    if (!originStop || !destinationStop) {
      return res.status(404).json({ error: 'Stop not found' });
    }

    const routes = await routingService.calculateRoute(
      validated.originStopId,
      validated.destinationStopId,
      validated.optimizeBy
    );

    const routesWithScores = await Promise.all(
      routes.map(async (route) => {
        const trustScore = await routingService.computeRouteTrustScore(route);
        return {
          ...route,
          trustScore,
        };
      })
    );

    res.json({
      origin: { id: originStop.id, name: originStop.name, commune: originStop.commune },
      destination: { id: destinationStop.id, name: destinationStop.name, commune: destinationStop.commune },
      routes: routesWithScores,
      optimizedFor: validated.optimizeBy
    });

  } catch (error: any) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      });
    }

    console.error('Route calculation error:', error);
    res.status(500).json({ error: 'Failed to calculate route' });
  }
}

export async function searchStops(req: Request, res: Response) {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Search query required' });
    }

    const stops = await prisma.stop.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { commune: { contains: q, mode: 'insensitive' } }
        ]
      },
      take: 10,
      select: {
        id: true,
        name: true,
        commune: true,
        latitude: true,
        longitude: true,
        type: true,
      }
    });

    return res.json({ stops });
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ error: 'Failed to search stops' });
  }
}

export async function getAllStops(req: Request, res: Response) {
  try {
    const stops = await prisma.stop.findMany({
      orderBy: { name: 'asc' }
    });
    res.json({ stops });
  } catch (error) {
    console.error('Error fetching stops:', error);
    res.status(500).json({ error: 'Failed to fetch stops' });
  }
}
