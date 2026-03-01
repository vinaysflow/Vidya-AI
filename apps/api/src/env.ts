/**
 * Environment bootstrap — MUST be the first import in index.ts.
 * Loads .env files before any other module reads process.env.
 */
import { config } from 'dotenv';
import path from 'path';

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
