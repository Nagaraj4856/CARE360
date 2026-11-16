import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import auth from './routes/auth.js';
import api from './routes/api.js';
import { prisma } from './db.js';
import { databaseConfigured } from './config/env.js';

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 180 }));

app.get('/api/health', async (_req, res) => {
  let database = { status: 'not_configured', message: 'Set DATABASE_URL in server/.env to enable accounts.' };
  if (databaseConfigured()) {
    let timeout;
    try {
      await Promise.race([
        prisma.$queryRaw`SELECT 1`,
        new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('Database check timed out')), 2000); }),
      ]);
      database = { status: 'connected', message: 'PostgreSQL connection verified.' };
    } catch {
      database = { status: 'disconnected', message: 'PostgreSQL is unavailable. Check DATABASE_URL and the database service.' };
    } finally {
      clearTimeout(timeout);
    }
  }
  res.json({ ok: true, server: 'running', service: 'CARE360 API', database, demoMode: { available: true } });
});

app.use('/api/auth', auth);
app.use('/api', api);
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((error, _req, res, _next) => {
  const databaseError = Boolean(error?.code?.startsWith('P10')) || error?.name === 'PrismaClientInitializationError' || error?.name === 'PrismaClientKnownRequestError';
  if (error?.name === 'ZodError') return res.status(400).json({ error: 'Please check the request details.' });
  if (databaseError) {
    console.error('CARE360 database request failed:', error.code || error.name);
    return res.status(503).json({ error: 'Database unavailable. Check server/.env and PostgreSQL. Explore Demo remains available.' });
  }
  console.error('CARE360 request failed:', error?.name || 'UnknownError');
  res.status(error?.status || 500).json({ error: error?.status ? error.message : 'An unexpected server error occurred.' });
});

export default app;
