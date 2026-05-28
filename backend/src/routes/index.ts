import { Router } from 'express';
import { calculateRoute, searchStops, getAllStops } from '../controllers/route.controller.js';

const router = Router();

// Public routes
router.get('/stops', getAllStops);
router.get('/stops/search', searchStops);
router.post('/routes/calculate', calculateRoute);

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
