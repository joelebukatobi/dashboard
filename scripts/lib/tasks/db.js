import { ensureDatabaseUrl } from '../../../env.js';
import mysql from 'mysql2/promise';

export async function testConnection() {
  ensureDatabaseUrl({ scriptName: 'cli db test' });

  const pool = mysql.createPool({
    uri: process.env.DATABASE_URL,
    connectionLimit: 5,
  });

  try {
    console.log('Testing database connection...');
    const [rows] = await pool.query('SELECT VERSION() AS version');
    console.log('MySQL version:', rows[0].version);
    console.log('Connection test successful');
  } finally {
    await pool.end();
  }
}

export async function recalculatePostCounts() {
  ensureDatabaseUrl({ scriptName: 'cli db recalculate-counts' });

  const { db, categories, posts } = await import('../../../src/db/index.js');
  const { eq, sql, and } = await import('drizzle-orm');

  console.log('Recalculating post counts for all categories...');

  const allCategories = await db.select().from(categories);

  for (const category of allCategories) {
    const [{ count }] = await db
      .select({ count: sql`count(*)` })
      .from(posts)
      .where(and(eq(posts.categoryId, category.id), eq(posts.status, 'PUBLISHED')));

    await db.update(categories).set({ postCount: count }).where(eq(categories.id, category.id));
    console.log(`Updated "${category.title}": ${count} posts`);
  }

  console.log('Done!');
}
