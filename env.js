// env.js — Shared environment configuration loader
// Used by both the server (src/app.js) and CLI scripts
// Priority: process.env → .env.local → .env.{NODE_ENV} → .env → cPanel

import { config } from 'dotenv';
import { resolve, basename } from 'path';
import { readFileSync } from 'fs';
import { homedir } from 'os';

/**
 * Load DATABASE_URL from available sources
 * Priority:
 *   1. process.env.DATABASE_URL (already set)
 *   2. .env.local
 *   3. .env.{NODE_ENV} (e.g., .env.development)
 *   4. .env (generic fallback)
 *   5. ~/.cl.selector/node-selector.json (cPanel)
 *
 * @returns {string|null}
 */
export function loadDatabaseUrl() {
  // Priority 1: Already set in environment
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // Priority 2: .env.local (local development override)
  const localResult = config({ path: resolve(process.cwd(), '.env.local') });
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // Priority 3: .env.{NODE_ENV}
  const envFile = process.env.NODE_ENV === 'production'
    ? '.env.production'
    : '.env.development';

  config({ path: resolve(process.cwd(), envFile) });

  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // Priority 4: .env generic fallback
  config({ path: resolve(process.cwd(), '.env') });

  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // Priority 5: cPanel Node.js selector config
  try {
    const configPath = resolve(homedir(), '.cl.selector', 'node-selector.json');
    const configContent = readFileSync(configPath, 'utf-8');
    const cpanelConfig = JSON.parse(configContent);
    const currentDir = basename(resolve('.'));

    if (cpanelConfig[currentDir]?.env_vars?.DATABASE_URL) {
      return cpanelConfig[currentDir].env_vars.DATABASE_URL;
    }

    for (const appConfig of Object.values(cpanelConfig)) {
      if (appConfig.env_vars?.DATABASE_URL) {
        return appConfig.env_vars.DATABASE_URL;
      }
    }
  } catch {
    // Silently fail if file doesn't exist
  }

  return null;
}

/**
 * Ensure DATABASE_URL is loaded into process.env
 * Exits with error if not found
 *
 * @param {object} options
 * @param {string} options.scriptName - Name of the script for error messages
 * @param {boolean} options.exitOnError - Whether to exit on error (default: true)
 * @returns {string} The DATABASE_URL
 */
export function ensureDatabaseUrl(options = {}) {
  const { scriptName = 'Script', exitOnError = true } = options;

  const dbUrl = loadDatabaseUrl();

  if (!dbUrl) {
    console.error(`Error: ${scriptName} requires DATABASE_URL`);
    console.error('Could not find DATABASE_URL in:');
    console.error('  - process.env.DATABASE_URL');
    console.error('  - .env.local');
    console.error('  - .env.development or .env.production');
    console.error('  - .env file');
    console.error('  - ~/.cl.selector/node-selector.json');

    if (exitOnError) {
      process.exit(1);
    }
    return null;
  }

  process.env.DATABASE_URL = dbUrl;
  return dbUrl;
}

/**
 * Load cPanel domain for URL generation
 * @returns {string|null}
 */
export function loadCpanelDomain() {
  try {
    const configPath = resolve(homedir(), '.cl.selector', 'node-selector.json');
    const configContent = readFileSync(configPath, 'utf-8');
    const cpanelConfig = JSON.parse(configContent);
    const currentDir = basename(resolve('.'));

    if (cpanelConfig[currentDir]?.domain) {
      return cpanelConfig[currentDir].domain;
    }

    for (const appConfig of Object.values(cpanelConfig)) {
      if (appConfig.domain) {
        return appConfig.domain;
      }
    }
  } catch {
    // Silently fail
  }
  return null;
}
