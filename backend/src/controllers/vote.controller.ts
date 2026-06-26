import { Request, Response } from 'express';
import { voteService } from '../services/vote.service';
import { z } from 'zod';

const voteSchema = z.object({
  connectionId: z.uuid(),
  deviceId: z.string().min(1),
  vote: z.number().int().refine(v => v === 1 || v === -1, {
    message: 'Vote must be 1 (upvote) or -1 (downvote)'
  }),
});

/**
 * Cast a vote on a connection
 */
export async function castVote(req: Request, res: Response) {
  try {
    const validated = voteSchema.parse(req.body);
    const result = await voteService.castVote(validated);
    res.json({
      success: true,
      message: result.userVote === 1 ? '⬆️ Upvoted!' : '⬇️ Downvoted!',
      voteScore: result.voteScore,
      totalVotes: result.totalVotes,
      userVote: result.userVote,
      connection: result.connection,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      });
    }
    console.error('Vote error:', error);
    res.status(500).json({
      error: error.message || 'Failed to cast vote'
    });
  }
}

/**
 * Get vote stats for a connection
 */
export async function getVoteStats(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    // Ensure id is a string (not an array)
    if (!id || Array.isArray(id)) {
      return res.status(400).json({ error: 'Invalid connection ID' });
    }

    const { deviceId } = req.query;
    
    const stats = await voteService.getVoteStats(id);
    
    let userVote = 0;
    if (deviceId && typeof deviceId === 'string') {
      userVote = await voteService.getUserVote(id, deviceId);
    }

    res.json({
      ...stats,
      userVote,
    });
  } catch (error: any) {
    console.error('Get vote stats error:', error);
    res.status(500).json({
      error: error.message || 'Failed to get vote stats'
    });
  }
}
