import { Router } from 'express';
import { calculateRoute, searchStops, getAllStops } from '@controllers/route.controller';
import { 
  createSuggestion, 
  getPendingSuggestions, 
  confirmSuggestion,
  getPendingCount 
} from '@controllers/suggestion.controller';
import { castVote, getBulkVoteStats, getVoteStats } from '@controllers/vote.controller';
import {
  getPendingSuggestions as adminGetPending,
  approveSuggestion,
  rejectSuggestion,
  getConnections,
  deleteConnection,
  getStops,
  createStop,
  updateStop,
  deleteStop,
} from '@controllers/admin.controller';
import prisma from '@lib/prisma';

const router = Router();

// ─── Public routes ──────────────────────────────────────────────────────

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

// ─── Suggestion routes (Public) ──────────────────────────────────────

router.post('/suggestions', createSuggestion);
router.get('/suggestions/pending', getPendingSuggestions);
router.get('/suggestions/pending/count', getPendingCount);
router.post('/suggestions/:id/confirm', confirmSuggestion);

// ─── Vote routes ──────────────────────────────────────────────────────

router.post('/votes', castVote);
router.get('/votes/bulk', getBulkVoteStats);
router.get('/votes/:id', getVoteStats);

// ─── Admin routes ─────────────────────────────────────────────────────

// Suggestions
router.get('/admin/suggestions/pending', adminGetPending);
router.post('/admin/suggestions/:id/approve', approveSuggestion);
router.post('/admin/suggestions/:id/reject', rejectSuggestion);

// Connections
router.get('/admin/connections', getConnections);
router.delete('/admin/connections/:id', deleteConnection);

// Stops
router.get('/admin/stops', getStops);
router.post('/admin/stops', createStop);
router.put('/admin/stops/:id', updateStop);
router.delete('/admin/stops/:id', deleteStop);

export default router;
