// src/db/index.js
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema.js';

const isProduction = process.env.NODE_ENV === 'production';

// Configure connection pool
const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,

  // Connection limits for shared hosting
  connectionLimit: isProduction ? 20 : 10,

  // Timeouts (in milliseconds)
  connectTimeout: 5000,
  idleTimeout: 30000,

  // Queue behavior
  waitForConnections: true,
  queueLimit: 0,

  // Keep datetime behavior predictable
  timezone: 'Z',
  dateStrings: false,
});

// Create Drizzle client with schema
export const db = drizzle(pool, { schema, mode: 'default' });

// Export schema for use in other files
export * from './schema.js';

// Graceful shutdown helper
export async function closePool() {
  console.log('🔌 Closing database pool...');
  await pool.end();
  console.log('✅ Database pool closed');
}

// Test connection helper
export async function testConnection() {
  try {
    const [rows] = await pool.query('SELECT NOW() AS now');
    console.log('✅ Database connected:', rows[0]?.now);
    return true;
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    return false;
  }
}
