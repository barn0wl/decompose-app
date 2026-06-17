import { Router } from 'express';
import { calculateRoute, searchStops, getAllStops } from '../controllers/route.controller';
import prisma from '../lib/prisma';

const router = Router();

// Public routes
router.get('/stops', getAllStops);
router.get('/stops/search', searchStops);
router.post('/routes/calculate', calculateRoute);

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Database connection test route
router.get('/db-test', async (_req, res) => {
  try {
    // Test database connection
    const count = await prisma.stop.count();
    res.json({ 
      status: 'connected', 
      stopCount: count,
      databaseUrl: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] // Hide credentials
    });
  } catch (error) {
    console.error('Database test failed:', error);
    res.status(500).json({ 
      status: 'disconnected', 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
