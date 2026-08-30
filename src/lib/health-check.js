// src/lib/health-check.js
// Builds the report served by /health.
//
// The point of a health endpoint is to report that the app cannot serve
// traffic. One that answers "healthy" while the database is unreachable is
// worse than none, because every uptime monitor and load balancer above it
// believes the lie.

import { createRequire } from 'module';
import { testConnection } from '../db/index.js';
import { getAssetVersion } from './asset-version.js';

const require = createRequire(import.meta.url);

// Deliberately no migration check. This project applies migrations as a
// deploy step rather than at boot, so a pending migration is a failed deploy,
// not a running-but-degraded app — there is no boot-time state to report.
const REQUIRED_PACKAGES = ['fastify', 'mysql2', 'drizzle-orm', 'zod'];

function checkDependencies() {
  for (const pkg of REQUIRED_PACKAGES) {
    try {
      require.resolve(pkg);
    } catch {
      return false;
    }
  }
  return true;
}

/**
 * @returns {Promise<{status: string, checks: Object}>} Health report.
 */
export async function buildHealthReport() {
  const dependenciesOk = checkDependencies();
  const databaseOk = process.env.DATABASE_URL
    ? await testConnection({ quiet: true })
    : false;

  const checks = {
    database: databaseOk ? 'ok' : 'error',
    dependencies: dependenciesOk ? 'ok' : 'error',
  };

  const healthy = checks.database === 'ok' && checks.dependencies === 'ok';

  return {
    status: healthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
    build: {
      assetVersion: getAssetVersion(),
    },
    checks,
  };
}
