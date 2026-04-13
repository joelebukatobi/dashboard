// scripts/recalculate-post-counts.js
// Recalculate post counts for all categories

import { db, categories, posts } from '../src/db/index.js';
import { eq, sql } from 'drizzle-orm';

async function recalculatePostCounts() {
  console.log('Recalculating post counts for all categories...');

  // Get all categories
  const allCategories = await db.select().from(categories);

  for (const category of allCategories) {
    // Count published posts in this category
    const [{ count }] = await db
      .select({ count: sql`count(*)` })
      .from(posts)
      .where(eq(posts.categoryId, category.id))
      .where(eq(posts.status, 'PUBLISHED'));

    // Update category post count
    await db
      .update(categories)
      .set({ postCount: count })
      .where(eq(categories.id, category.id));

    console.log(`Updated "${category.title}": ${count} posts`);
  }

  console.log('Done!');
  process.exit(0);
}

recalculatePostCounts().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
