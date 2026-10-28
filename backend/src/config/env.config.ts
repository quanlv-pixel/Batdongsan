import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let envInitialized = false;

/**
 * Initializes environment configuration reliably.
 * Resolves backend/.env relative to the module root (independent of process.cwd()),
 * strictly preserves any already supplied environment variables,
 * and validates required settings.
 */
export function initEnvironment(): void {
  if (envInitialized) {
    return;
  }

  // Resolve backend root: backend/src/config/env.config.ts -> ../../.. -> backend/
  const backendDir = path.resolve(fileURLToPath(import.meta.url), '../../..');
  const envPath = path.join(backendDir, '.env');

  if (fs.existsSync(envPath)) {
    try {
      // Node 24 process.loadEnvFile preserves existing process.env variables by default
      process.loadEnvFile(envPath);
    } catch {
      // Handled by validation below
    }
  }

  validateRequiredEnv();
  envInitialized = true;
}

/**
 * Validates that all required configuration settings are present and non-empty.
 */
export function validateRequiredEnv(): void {
  const missing: string[] = [];
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.trim() === '') {
    missing.push('DATABASE_URL');
  }
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === '') {
    missing.push('JWT_SECRET');
  }

  if (missing.length > 0) {
    throw new Error(
      `Configuration Error: Missing required environment variable(s): ${missing.join(', ')}. Please verify backend/.env.`,
    );
  }
}
