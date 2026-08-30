// src/db/index.js
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema.js';

// The pool is built on first use, not at module evaluation.
//
// It used to be created at import time from process.env.DATABASE_URL, which
// made import order load-bearing: ESM evaluates a module's entire import
// graph before the importing module's own body runs, and src/app.js populates
// DATABASE_URL in its body. So any static import reaching this file from
// app.js built the pool with `uri: undefined`, and every query in the process
// failed with what looked like the database being down.
//
// Deferring means the environment is read when a query happens rather than
// when a file is imported, so no import can be in the wrong order.

let pool = null;
let client = null;
let builtWithUri;

function getPool() {
  const uri = process.env.DATABASE_URL;

  // A pool built before the environment was loaded has no connection string
  // and can never work. Rather than keeping it for the life of the process,
  // discard it once a URL appears. It never opened a connection, so there is
  // nothing to drain.
  if (pool && !builtWithUri && uri) {
    pool = null;
    client = null;
  }

  if (!pool) {
    const isProduction = process.env.NODE_ENV === 'production';
    builtWithUri = uri;

    pool = mysql.createPool({
      uri,

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
  }

  return pool;
}

function getClient() {
  if (!client) {
    client = drizzle(getPool(), { schema, mode: 'default' });
  }

  return client;
}

// A proxy so callers keep writing db.select(...) unchanged, while the client
// behind it is not constructed until the first property access.
export const db = new Proxy(
  {},
  {
    get(_target, prop, receiver) {
      const value = Reflect.get(getClient(), prop, receiver);
      return typeof value === 'function' ? value.bind(getClient()) : value;
    },
    has(_target, prop) {
      return prop in getClient();
    },
  },
);

// Export schema for use in other files
export * from './schema.js';

// Graceful shutdown helper
export async function closePool() {
  if (!pool) return;

  console.log('🔌 Closing database pool...');
  await pool.end();
  pool = null;
  client = null;
  builtWithUri = undefined;
  console.log('✅ Database pool closed');
}

// Test connection helper
export async function testConnection({ quiet = false } = {}) {
  try {
    const [rows] = await getPool().query('SELECT NOW() AS now');
    if (!quiet) console.log('✅ Database connected:', rows[0]?.now);
    return true;
  } catch (err) {
    // Quiet mode exists for the health endpoint, which may be polled every
    // few seconds — logging each failure would bury everything else.
    if (!quiet) console.error('❌ Database connection failed:', err.message);
    return false;
  }
}
