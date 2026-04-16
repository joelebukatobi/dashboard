// scripts/lib/load-env.js
// Shared utility for loading DATABASE_URL from multiple sources
// Falls back through: process.env → .env files → cPanel node-selector.json

import { config } from 'dotenv';
import { resolve, basename } from 'path';
import { readFileSync } from 'fs';
import { homedir } from 'os';

/**
 * Load DATABASE_URL from various sources
 * Priority:
 *   1. process.env.DATABASE_URL (already set)
 *   2. .env.{NODE_ENV} file (or .env.development if NODE_ENV not set)
 *   3. .env file (generic fallback)
 *   4. ~/.cl.selector/node-selector.json (cPanel Node.js config)
 *
 * @returns {string|null} The DATABASE_URL or null if not found
 */
export function loadDatabaseUrl() {
  // Priority 1: Already set in environment
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // Priority 2 & 3: Load from .env files
  const envFile = process.env.NODE_ENV === 'production'
    ? '.env.production'
    : '.env.development';

  // Try specific env file first
  config({ path: resolve(process.cwd(), envFile) });

  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // Try generic .env file
  config({ path: resolve(process.cwd(), '.env') });

  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // Priority 4: cPanel Node.js selector config
  try {
    const configPath = resolve(homedir(), '.cl.selector', 'node-selector.json');
    const configContent = readFileSync(configPath, 'utf-8');
    const cpanelConfig = JSON.parse(configContent);
    const currentDir = basename(resolve('.'));

    // Try to match by current directory name
    if (cpanelConfig[currentDir]?.env_vars?.DATABASE_URL) {
      return cpanelConfig[currentDir].env_vars.DATABASE_URL;
    }

    // Fallback: search all apps for one with DATABASE_URL
    for (const appConfig of Object.values(cpanelConfig)) {
      if (appConfig.env_vars?.DATABASE_URL) {
        return appConfig.env_vars.DATABASE_URL;
      }
    }
  } catch {
    // Silently fail if file doesn't exist or can't be parsed
  }

  return null;
}

/**
 * Load app domain from cPanel config
 * Useful for generating URLs (e.g., setup wizard)
 *
 * @returns {string|null} The domain or null if not found
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

    // Fallback: return first domain found
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

/**
 * Load full cPanel app config
 *
 * @returns {object|null} The app config or null if not found
 */
export function loadCpanelConfig() {
  try {
    const configPath = resolve(homedir(), '.cl.selector', 'node-selector.json');
    const configContent = readFileSync(configPath, 'utf-8');
    const cpanelConfig = JSON.parse(configContent);
    const currentDir = basename(resolve('.'));

    if (cpanelConfig[currentDir]) {
      return {
        name: currentDir,
        ...cpanelConfig[currentDir]
      };
    }

    // Fallback: return first app with DATABASE_URL
    for (const [name, appConfig] of Object.entries(cpanelConfig)) {
      if (appConfig.env_vars?.DATABASE_URL) {
        return { name, ...appConfig };
      }
    }
  } catch {
    // Silently fail
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
    console.error('  - .env.development or .env.production');
    console.error('  - .env file');
    console.error('  - ~/.cl.selector/node-selector.json');

    if (exitOnError) {
      process.exit(1);
    }
    return null;
  }

  // Set it on process.env for other code that expects it
  process.env.DATABASE_URL = dbUrl;
  return dbUrl;
}
