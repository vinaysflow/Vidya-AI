/**
 * Environment bootstrap — MUST be the first import in index.ts.
 * Loads .env files before any other module reads process.env.
 * Validates required variables at startup so missing config fails fast.
 */
import { config } from 'dotenv';
import path from 'path';
import { z } from 'zod';

const nodeEnv = process.env.NODE_ENV || 'development';
const envRoot = path.resolve(__dirname, '..');
const envPaths = [
  path.join(envRoot, '.env'),
  path.join(envRoot, `.env.${nodeEnv}`),
  path.join(envRoot, '.env.local'),
  path.join(envRoot, `.env.${nodeEnv}.local`),
];
envPaths.forEach((envPath, idx) => {
  const isLocal = idx >= 2;
  config({ path: envPath, override: isLocal });
});

// Validate required environment variables
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  ALLOWED_ORIGINS: z.string().optional(),
  ADMIN_SECRET: z.string().optional(),
});

const result = envSchema.safeParse(process.env);
if (!result.success) {
  console.error('❌ Missing required environment variables:');
  result.error.issues.forEach(issue => {
    console.error(`   ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);
}

// At least one LLM provider must be configured
if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
  console.error('❌ At least one of OPENAI_API_KEY or ANTHROPIC_API_KEY must be set');
  process.exit(1);
}
