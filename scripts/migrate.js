#!/usr/bin/env node
// scripts/migrate.js
// Run database migrations programmatically
// Skips if migrations have already been applied

import { ensureDatabaseUrl } from './lib/load-env.js';
import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';

// Load DATABASE_URL from available sources
ensureDatabaseUrl({ scriptName: 'migrate.js' });

const DATABASE_URL = process.env.DATABASE_URL;

/**
 * Check if migrations need to be run
 * Returns true if migrations should run, false if already applied
 */
async function shouldRunMigrations(connection) {
  try {
    // Check if __drizzle_migrations table exists
    const [tables] = await connection.query(
      "SHOW TABLES LIKE '__drizzle_migrations'"
    );

    if (tables.length === 0) {
      console.log('📋 No migrations table found - fresh database');
      return true;
    }

    // Check if any migrations have been recorded
    const [rows] = await connection.query(
      'SELECT COUNT(*) as count FROM __drizzle_migrations'
    );

    const migrationCount = rows[0].count;

    if (migrationCount === 0) {
      console.log('📋 Migrations table exists but is empty');
      return true;
    }

    console.log(`📊 Found ${migrationCount} applied migration(s)`);
    return false;
  } catch (error) {
    // If we can't check, assume we need to run migrations
    console.log('⚠️  Could not check migration status:', error.message);
    return true;
  }
}

async function runMigrations() {
  console.log('🔄 Checking database state...\n');

  const connection = await mysql.createConnection(DATABASE_URL);

  try {
    // Check if migrations are needed
    const needsMigration = await shouldRunMigrations(connection);

    if (!needsMigration) {
      console.log('✅ Database already has migrations applied - skipping');
      process.exit(0);
    }

    console.log('🔄 Running database migrations...\n');

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
