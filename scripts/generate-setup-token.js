#!/usr/bin/env node
// scripts/generate-setup-token.js
// CLI tool to generate setup tokens for first-launch configuration

import crypto from 'crypto';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { setupTokens } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { resolve, basename } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if DATABASE_URL is already set (e.g., from cPanel environment)
if (!process.env.DATABASE_URL) {
  // Load from .env files if not already set
  const envFile = process.env.NODE_ENV === 'production'
    ? '.env.production'
    : '.env.development';

  // Try to load env file, fallback to .env if specific file not found
  dotenv.config({ path: join(__dirname, '..', envFile) });

  // If still no DATABASE_URL, try generic .env file
  if (!process.env.DATABASE_URL) {
    dotenv.config({ path: join(__dirname, '..', '.env') });
  }
}

/**
 * Load config from cPanel Node.js selector
 * Returns { databaseUrl, domain } or null
 */
function loadCpanelConfig() {
  try {
    // cPanel stores app config in ~/.cl.selector/node-selector.json
    const configPath = resolve(homedir(), '.cl.selector', 'node-selector.json');
    const configContent = readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    // Match app by current directory basename (e.g., "sandbox" or "production")
    const currentDir = basename(resolve('.'));

    if (config[currentDir]) {
      const appConfig = config[currentDir];
      return {
        databaseUrl: appConfig.env_vars?.DATABASE_URL || null,
        domain: appConfig.domain || null
      };
    }

    // Fallback: search all apps for one with DATABASE_URL
    for (const [appName, appConfig] of Object.entries(config)) {
      if (appConfig.env_vars && appConfig.env_vars.DATABASE_URL) {
        return {
          databaseUrl: appConfig.env_vars.DATABASE_URL,
          domain: appConfig.domain || null
        };
      }
    }
  } catch {
    // Silently fail if file doesn't exist or can't be parsed
  }
  return null;
}

// Load cPanel config
const cpanelConfig = loadCpanelConfig();

// If still no DATABASE_URL, try cPanel's node-selector.json
if (!process.env.DATABASE_URL && cpanelConfig?.databaseUrl) {
  process.env.DATABASE_URL = cpanelConfig.databaseUrl;
}

// Set APP_URL from cPanel domain if available
if (cpanelConfig?.domain && !process.env.APP_URL) {
  process.env.APP_URL = `https://${cpanelConfig.domain}`;
}

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('Error: DATABASE_URL environment variable is required');
  console.error('Could not find DATABASE_URL in:');
  console.error('  - process.env.DATABASE_URL');
  console.error('  - .env.development or .env.production');
  console.error('  - .env file');
  console.error('  - ~/.cl.selector/node-selector.json');
  process.exit(1);
}

/**
 * Generate a cryptographically secure random token
 */
function generateToken(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

/**
 * Clean up expired and used tokens
 */
async function cleanupTokens(db) {
  const now = new Date();
  
  // Delete expired tokens
  await db.delete(setupTokens).where(
    eq(setupTokens.expiresAt < now, true)
  );
  
  // Delete used tokens older than 7 days
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  await db.delete(setupTokens).where(
    eq(setupTokens.usedAt < sevenDaysAgo, true)
  );
}

async function main() {
  let connection;
  
  try {
    // Create database connection
    connection = await mysql.createConnection(DATABASE_URL);
    const db = drizzle(connection);

    // Clean up old tokens
    await cleanupTokens(db);

    // Generate new token
    const plainToken = generateToken(32);
    const tokenHash = crypto.createHash('sha256').update(plainToken).digest('hex');
    
    // Set expiration to 24 hours from now
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Store in database
    const tokenId = crypto.randomUUID();
    await db.insert(setupTokens).values({
      id: tokenId,
      tokenHash,
      expiresAt,
      usedAt: null,
      createdAt: new Date()
    });

    // Get app URL from environment or use default
    const appUrl = process.env.APP_URL || process.env.SANDBOX_URL || 'http://localhost:3000';
    const setupUrl = `${appUrl}/setup?token=${plainToken}`;

    // Output
    console.log('\n========================================');
    console.log('   Setup Token Generated');
    console.log('========================================\n');
    console.log(`Token:      ${plainToken}`);
    console.log(`Expires:    ${expiresAt.toISOString()} (24 hours)`);
    console.log(`URL:        ${setupUrl}\n`);
    console.log('========================================');
    console.log('   Share this URL with the client');
    console.log('   Token is single-use and expires in 24 hours');
    console.log('========================================\n');

    // JSON output option for scripts
    if (process.argv.includes('--json')) {
      console.log(JSON.stringify({
        token: plainToken,
        expiresAt: expiresAt.toISOString(),
        url: setupUrl
      }));
    }

    process.exit(0);

  } catch (error) {
    console.error('Error generating setup token:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

main();
