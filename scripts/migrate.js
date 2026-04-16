#!/usr/bin/env node
// scripts/migrate.js
// Run database migrations programmatically

import { ensureDatabaseUrl } from './lib/load-env.js';
import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';

// Load DATABASE_URL from available sources
ensureDatabaseUrl({ scriptName: 'migrate.js' });

const DATABASE_URL = process.env.DATABASE_URL;

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
