import crypto from 'crypto';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { setupTokens } from '../../../src/db/schema.js';
import { eq } from 'drizzle-orm';
import { ensureDatabaseUrl, loadCpanelDomain } from '../../../env.js';

function generateToken(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

async function cleanupTokens(db) {
  const now = new Date();
  await db.delete(setupTokens).where(eq(setupTokens.expiresAt < now, true));

  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  await db.delete(setupTokens).where(eq(setupTokens.usedAt < sevenDaysAgo, true));
}

export async function generateSetupToken(args = []) {
  ensureDatabaseUrl({ scriptName: 'cli setup-token' });

  let connection;

  try {
    connection = await mysql.createConnection(process.env.DATABASE_URL);
    const db = drizzle(connection);

    await cleanupTokens(db);

    const plainToken = generateToken(32);
    const tokenHash = crypto.createHash('sha256').update(plainToken).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.insert(setupTokens).values({
      id: crypto.randomUUID(),
      tokenHash,
      expiresAt,
      usedAt: null,
      createdAt: new Date(),
    });

    let appUrl = process.env.APP_URL || process.env.SANDBOX_URL;

    if (!appUrl) {
      const domain = loadCpanelDomain();
      appUrl = domain ? `https://${domain}` : 'http://localhost:3000';
    }

    const setupUrl = `${appUrl}/setup?token=${plainToken}`;

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

    if (args.includes('--json')) {
      console.log(JSON.stringify({ token: plainToken, expiresAt: expiresAt.toISOString(), url: setupUrl }));
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}
