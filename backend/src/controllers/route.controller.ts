import { Request, Response } from 'express';
import { routingService } from '../services/routing.service';
import { calculateRouteSchema } from '../validators/route.validator';
import prisma from '../lib/prisma';

export async function calculateRoute(req: Request, res: Response) {
  try {
    // Validate input
    const validated = calculateRouteSchema.parse(req.body);
    
    // Get stop details for response (optional)
    const originStop = await prisma.stop.findUnique({
      where: { id: validated.originStopId }
    });
    const destinationStop = await prisma.stop.findUnique({
      where: { id: validated.destinationStopId }
    });
    
    if (!originStop || !destinationStop) {
      return res.status(404).json({ error: 'Stop not found' });
    }
    
    // Calculate route
    const routes = await routingService.calculateRoute(
      validated.originStopId,
      validated.destinationStopId,
      validated.optimizeBy
    );
    
    res.json({
      origin: { id: originStop.id, name: originStop.name, commune: originStop.commune },
      destination: { id: destinationStop.id, name: destinationStop.name, commune: destinationStop.commune },
      routes,
      optimizedFor: validated.optimizeBy
    });
    
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors });
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
      take: 10
    });
    
    res.json({ stops });
    
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to search stops' });
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