import { Router } from 'express';
import { calculateRoute, searchStops, getAllStops } from '../controllers/route.controller';
import { 
  createSuggestion, 
  getPendingSuggestions, 
  confirmSuggestion,
  getPendingCount 
} from '../controllers/suggestion.controller';
import { castVote, getVoteStats } from '../controllers/vote.controller';
import prisma from '../lib/prisma';

const router = Router();

// ─── Public routes  ──────────────────────────────────────────

router.get('/stops', getAllStops);
router.get('/stops/search', searchStops);
router.post('/routes/calculate', calculateRoute);

// ─── Health check ──────────────────────────────────────────────────────

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Database test ─────────────────────────────────────────────────────

router.get('/db-test', async (_req, res) => {
  try {
    const count = await prisma.stop.count();
    res.json({
      status: 'connected',
      stopCount: count,
    });
  } catch (error) {
    console.error('Database test failed:', error);
    res.status(500).json({
      status: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ─── Suggestion routes  ──────────────────────────────────────────

router.post('/suggestions', createSuggestion);
router.get('/suggestions/pending', getPendingSuggestions);
router.get('/suggestions/pending/count', getPendingCount);
router.post('/suggestions/:id/confirm', confirmSuggestion);

// ─── Vote routes  ────────────────────────────────────────────────

router.post('/votes', castVote);
router.get('/votes/:id', getVoteStats);

export default router;
