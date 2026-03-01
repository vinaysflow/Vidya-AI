/**
 * Vidya API Server
 * 
 * Main entry point for the backend API
 */

// env.ts MUST be the very first import so process.env is populated
// before any other module reads API keys, provider settings, etc.
import './env';

import './instrument';
import * as Sentry from '@sentry/node';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { tutorRouter } from './routes/tutor';
import { adminRouter } from './routes/admin';
import { promptsRouter } from './routes/prompts';
import { developerRouter } from './routes/developer';
import { gamificationRouter } from './routes/gamification';
import { progressRouter } from './routes/progress';
import { voiceRouter } from './routes/voice';
import { dashboardRouter } from './routes/dashboard';
import { offlineRouter } from './routes/offline';
import { apiKeyAuth } from './middleware/auth';
import { rateLimiter } from './middleware/rateLimit';
import { usageTracker } from './middleware/usageTracker';
import { cache } from './services/cache';

// Initialize cache (Redis if REDIS_URL set, else in-memory fallback)
cache.connect();

const app: express.Express = express();

// ============================================
// MIDDLEWARE
// ============================================

// Security headers
app.use(helmet());

// CORS configuration — supports per-API-key origins in production
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, curl, Postman)
    if (!origin) return callback(null, true);

    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [
      'http://localhost:3000',
      'http://localhost:5173'
    ];

    // Always allow configured origins
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }

    // In development, allow all origins
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Secret']
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const keyName = req.apiKey?.name || 'anonymous';
    console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms [${keyName}]`);
  });
  next();
});

// API key authentication (skips /health, allows unauthenticated in dev)
app.use(apiKeyAuth);

// Rate limiting (per API key in production, global fallback in dev)
app.use('/api', rateLimiter);

// Usage tracking (per API key, buffered writes)
app.use('/api', usageTracker);

// ============================================
// ROUTES
// ============================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'vidya-api',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0'
  });
});

// API routes
app.use('/api/tutor', tutorRouter);
app.use('/api/admin', adminRouter);
app.use('/api/prompts', promptsRouter);
app.use('/api/developer', developerRouter);
app.use('/api/gamification', gamificationRouter);
app.use('/api/progress', progressRouter);
app.use('/api/voice', voiceRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/offline', offlineRouter);

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    path: req.path
  });
});

// Sentry error handler — must be before the custom error handler
Sentry.setupExpressErrorHandler(app);

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);

  // Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: err.errors
    });
  }

  // Prisma errors
  if (err.code?.startsWith('P')) {
    return res.status(400).json({
      success: false,
      error: 'Database error',
      code: err.code
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// ============================================
// SERVER STARTUP
// ============================================

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════╗
║                                           ║
║   🎓 Vidya API Server                     ║
║   Socratic AI Tutor                        ║
║                                           ║
║   Port: ${PORT}                              ║
║   Environment: ${process.env.NODE_ENV || 'development'}              ║
║                                           ║
╚═══════════════════════════════════════════╝
  `);
});

export default app;
