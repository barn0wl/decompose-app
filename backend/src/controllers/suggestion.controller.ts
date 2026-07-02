import { Request, Response } from 'express';
import { suggestionService } from '../services/suggestion.service';
import { ZodError } from 'zod';
import { z } from 'zod';

// Validation schemas
const createSuggestionSchema = z.object({
  fromStopId: z.uuid(),
  toStopId: z.uuid(),
  transportType: z.enum(['communal_taxi', 'gbaka', 'sotra_bus', 'walking']),
  basePrice: z.number().int().positive(),
  durationMinutes: z.number().int().positive(),
  routeDescription: z.string().optional(),
  deviceId: z.string().min(1),
});

const confirmSuggestionSchema = z.object({
  suggestionId: z.uuid(),
  deviceId: z.string().min(1),
});

/**
 * Submit a new connection suggestion
 */
export async function createSuggestion(req: Request, res: Response) {
  try {
    const validated = createSuggestionSchema.parse(req.body);
    
    const result = await suggestionService.createSuggestion({
      fromStopId: validated.fromStopId,
      toStopId: validated.toStopId,
      transportType: validated.transportType,
      basePrice: validated.basePrice,
      durationMinutes: validated.durationMinutes,
      routeDescription: validated.routeDescription,
      submittedBy: validated.deviceId,
    });
    
    res.status(201).json({
      success: true,
      suggestion: result,
      message: 'Suggestion submitted successfully. It will be reviewed by the community.'
    });
  } catch (error: any) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      });
    }
    console.error('Create suggestion error:', error);
    res.status(500).json({
      error: error.message || 'Failed to create suggestion'
    });
  }
}

/**
 * Get pending suggestions for confirmation
 */
export async function getPendingSuggestions(req: Request, res: Response) {
  try {
    const { deviceId } = req.query;
    if (!deviceId || typeof deviceId !== 'string') {
      return res.status(400).json({ error: 'Device ID is required' });
    }
    const suggestions = await suggestionService.getPendingSuggestions(deviceId);
    const count = await suggestionService.getPendingCount(deviceId);
    res.json({
      suggestions,
      count,
      message: `${count} pending suggestions available`
    });
  } catch (error) {
    console.error('Get pending suggestions error:', error);
    res.status(500).json({ error: 'Failed to get pending suggestions' });
  }
}

/**
 * Confirm a suggestion
 */
export async function confirmSuggestion(req: Request, res: Response) {
  try {
    const validated = confirmSuggestionSchema.parse({
      suggestionId: req.params.id,
      deviceId: req.body.deviceId,
    });

    const result = await suggestionService.confirmSuggestion({
      suggestionId: validated.suggestionId,
      confirmedBy: validated.deviceId,
    });

    if (result.approved) {
      res.json({
        success: true,
        approved: true,
        message: '🎉 Suggestion approved! It is now available as a route.',
        connection: result.connection,
      });
    } else {
      res.json({
        success: true,
        approved: false,
        message: `✅ Confirmed! ${result.remainingConfirmations} more confirmations needed.`,
        suggestion: result.suggestion,
        remainingConfirmations: result.remainingConfirmations,
      });
    }
  } catch (error: any) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      });
    }
    console.error('Confirm suggestion error:', error);
    res.status(500).json({
      error: error.message || 'Failed to confirm suggestion'
    });
  }
}

/**
 * Get pending suggestions count (for banner)
 */
export async function getPendingCount(req: Request, res: Response) {
  try {
    const { deviceId } = req.query;
    if (!deviceId || typeof deviceId !== 'string') {
      return res.status(400).json({ error: 'Device ID is required' });
    }
    const count = await suggestionService.getPendingCount(deviceId);
    res.json({ count });
  } catch (error) {
    console.error('Get pending count error:', error);
    res.status(500).json({ error: 'Failed to get pending count' });
  }
}
