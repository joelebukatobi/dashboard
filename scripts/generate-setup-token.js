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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envFile = process.env.NODE_ENV === 'production'
  ? '.env.production'
  : '.env.development';

dotenv.config({ path: join(__dirname, '..', envFile) });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('Error: DATABASE_URL environment variable is required');
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
