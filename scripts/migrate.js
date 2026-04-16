#!/usr/bin/env node
// scripts/migrate.js
// Run database migrations programmatically

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join, resolve, basename } from 'path';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env files
const envFile = process.env.NODE_ENV === 'production'
  ? '.env.production'
  : '.env.development';

config({ path: join(__dirname, '..', envFile) });

// If still no DATABASE_URL, try cPanel's node-selector.json
if (!process.env.DATABASE_URL) {
  try {
    const configPath = resolve(homedir(), '.cl.selector', 'node-selector.json');
    const configContent = readFileSync(configPath, 'utf-8');
    const cpanelConfig = JSON.parse(configContent);
    const currentDir = basename(resolve('.'));

    if (cpanelConfig[currentDir]?.env_vars?.DATABASE_URL) {
      process.env.DATABASE_URL = cpanelConfig[currentDir].env_vars.DATABASE_URL;
    } else {
      // Fallback: search all apps
      for (const appConfig of Object.values(cpanelConfig)) {
        if (appConfig.env_vars?.DATABASE_URL) {
          process.env.DATABASE_URL = appConfig.env_vars.DATABASE_URL;
          break;
        }
      }
    }
  } catch {
    // Silently fail if cPanel config not found
  }
}

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('Error: DATABASE_URL environment variable is required');
  process.exit(1);
}

async function runMigrations() {
  console.log('🔄 Running database migrations...\n');

  const connection = await mysql.createConnection(DATABASE_URL);

  try {
    const db = drizzle(connection);

    // Run migrations from the migrations folder
    await migrate(db, { migrationsFolder: './src/db/migrations' });

    console.log('✅ Migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runMigrations();
