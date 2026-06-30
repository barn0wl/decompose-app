import { Request, Response } from 'express';
import prisma from '../lib/prisma';

// Helper to safely get string parameter
function getParamId(req: Request): string {
  const id = req.params.id;
  if (Array.isArray(id)) {
    return id[0]; // Take first element if it's an array
  }
  return id;
}

// ─── Suggestions ────────────────────────────────────────────────────────

/**
 * Get all pending suggestions for admin review
 */
export async function getPendingSuggestions(req: Request, res: Response) {
  try {
    const suggestions = await prisma.suggestedConnection.findMany({
      where: { status: 'pending' },
      include: {
        fromStop: true,
        toStop: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json(suggestions);
  } catch (error) {
    console.error('Get pending suggestions error:', error);
    res.status(500).json({ error: 'Failed to get pending suggestions' });
  }
}

/**
 * Approve a suggestion (admin override)
 * Unlike user confirmation, this instantly approves regardless of confirmation count
 */
export async function approveSuggestion(req: Request, res: Response) {
  try {
    const id = getParamId(req);
    
    const suggestion = await prisma.suggestedConnection.findUnique({
      where: { id },
      include: { fromStop: true, toStop: true },
    });

    if (!suggestion) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    if (suggestion.status !== 'pending') {
      return res.status(400).json({ 
        error: `Suggestion is already ${suggestion.status}` 
      });
    }

    // Admin approval - create connection directly
    const connection = await prisma.$transaction(async (tx) => {
      // Create the connection
      const newConnection = await tx.connection.create({
        data: {
          fromStopId: suggestion.fromStopId,
          toStopId: suggestion.toStopId,
          transportType: suggestion.transportType,
          basePrice: suggestion.basePrice,
          durationMinutes: suggestion.durationMinutes,
          routeDescription: suggestion.routeDescription,
          upvotes: 0,
          downvotes: 0,
          voteScore: 0,
        },
        include: {
          fromStop: true,
          toStop: true,
        },
      });

      // Update suggestion status
      await tx.suggestedConnection.update({
        where: { id: suggestion.id },
        data: {
          status: 'approved',
          approvedAt: new Date(),
        },
      });

      return newConnection;
    });

    res.json({
      success: true,
      message: 'Suggestion approved and added to connections',
      connection,
    });
  } catch (error) {
    console.error('Approve suggestion error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to approve suggestion' 
    });
  }
}

/**
 * Reject a suggestion (admin)
 */
export async function rejectSuggestion(req: Request, res: Response) {
  try {
    const id = getParamId(req);
    const { reason } = req.body;

    const suggestion = await prisma.suggestedConnection.findUnique({
      where: { id },
    });

    if (!suggestion) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    if (suggestion.status !== 'pending') {
      return res.status(400).json({ 
        error: `Suggestion is already ${suggestion.status}` 
      });
    }

    const updated = await prisma.suggestedConnection.update({
      where: { id: suggestion.id },
      data: {
        status: 'rejected',
        rejectedAt: new Date(),
        rejectedReason: reason || 'Rejected by admin',
        rejectedBy: 'admin',
      },
    });

    res.json({
      success: true,
      message: 'Suggestion rejected',
      suggestion: updated,
    });
  } catch (error) {
    console.error('Reject suggestion error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to reject suggestion' 
    });
  }
}

// ─── Connections (Admin) ───────────────────────────────────────────────

/**
 * Get all connections with stop details
 */
export async function getConnections(req: Request, res: Response) {
  try {
    const connections = await prisma.connection.findMany({
      include: {
        fromStop: true,
        toStop: true,
        fromZone: true,
        toZone: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(connections);
  } catch (error) {
    console.error('Get connections error:', error);
    res.status(500).json({ error: 'Failed to get connections' });
  }
}

/**
 * Delete a connection (admin)
 */
export async function deleteConnection(req: Request, res: Response) {
  try {
    const id = getParamId(req);

    const connection = await prisma.connection.findUnique({
      where: { id },
    });

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    await prisma.connection.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Connection deleted successfully',
    });
  } catch (error) {
    console.error('Delete connection error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to delete connection' 
    });
  }
}

// ─── Stops (Admin) ──────────────────────────────────────────────────────

/**
 * Get all stops
 */
export async function getStops(req: Request, res: Response) {
  try {
    const stops = await prisma.stop.findMany({
      include: { zone: true },
      orderBy: { name: 'asc' },
    });
    res.json(stops);
  } catch (error) {
    console.error('Get stops error:', error);
    res.status(500).json({ error: 'Failed to get stops' });
  }
}

/**
 * Create a new stop (admin)
 */
export async function createStop(req: Request, res: Response) {
  try {
    const { name, commune, latitude, longitude, type, zoneId } = req.body;

    // Validate required fields
    if (!name || !commune || latitude === undefined || longitude === undefined || !type) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, commune, latitude, longitude, type' 
      });
    }

    const stop = await prisma.stop.create({
      data: {
        name,
        commune,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        type,
        zoneId: zoneId || null,
      },
      include: { zone: true },
    });

    res.status(201).json(stop);
  } catch (error) {
    console.error('Create stop error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to create stop' 
    });
  }
}

/**
 * Update a stop (admin)
 */
export async function updateStop(req: Request, res: Response) {
  try {
    const id = getParamId(req);
    const { name, commune, latitude, longitude, type, zoneId } = req.body;

    const stop = await prisma.stop.findUnique({
      where: { id },
    });

    if (!stop) {
      return res.status(404).json({ error: 'Stop not found' });
    }

    const updated = await prisma.stop.update({
      where: { id },
      data: {
        name: name || stop.name,
        commune: commune || stop.commune,
        latitude: latitude !== undefined ? parseFloat(latitude) : stop.latitude,
        longitude: longitude !== undefined ? parseFloat(longitude) : stop.longitude,
        type: type || stop.type,
        zoneId: zoneId !== undefined ? zoneId : stop.zoneId,
      },
      include: { zone: true },
    });

    res.json(updated);
  } catch (error) {
    console.error('Update stop error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to update stop' 
    });
  }
}

/**
 * Delete a stop (admin)
 */
export async function deleteStop(req: Request, res: Response) {
  try {
    const id = getParamId(req);

    const stop = await prisma.stop.findUnique({
      where: { id },
      include: {
        connectionsFrom: true,
        connectionsTo: true,
        suggestedFrom: true,
        suggestedTo: true,
      },
    });

    if (!stop) {
      return res.status(404).json({ error: 'Stop not found' });
    }

    // Check if stop has related connections
    if (stop.connectionsFrom.length > 0 || stop.connectionsTo.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete stop with existing connections. Delete connections first.' 
      });
    }

    await prisma.stop.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Stop deleted successfully',
    });
  } catch (error) {
    console.error('Delete stop error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to delete stop' 
    });
  }
}
