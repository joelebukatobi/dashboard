#!/usr/bin/env node
// scripts/update-post-views.js
// Update post view counts to match the daily_page_views total (~2000)

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '..', '.env.development') });

async function updatePostViews() {
  console.log('📝 Updating post view counts...\n');

  try {
    const { db, posts } = await import('../src/db/index.js');
    const { sql } = await import('drizzle-orm');

    // Get current totals
    const currentTotal = await db.select({
      total: sql`sum(view_count)`
    }).from(posts);
    
    console.log('Current posts total views:', currentTotal[0].total);

    // Get all posts
    const allPosts = await db.select({
      id: posts.id,
      title: posts.title,
      viewCount: posts.viewCount
    }).from(posts);

    console.log(`Found ${allPosts.length} posts to update`);

    // Update each post with new view count (50-150 range)
    // Distribute 2000 total views across 20 posts = ~100 each
    for (let i = 0; i < allPosts.length; i++) {
      const post = allPosts[i];
      // Generate random view count between 50-150
      const newViewCount = Math.floor(50 + Math.random() * 100);
      
      await db.update(posts)
        .set({ viewCount: newViewCount })
        .where(sql`id = ${post.id}`);
      
      console.log(`Updated "${post.title.substring(0, 30)}...": ${post.viewCount} → ${newViewCount}`);
    }

    // Verify new total
    const newTotal = await db.select({
      total: sql`sum(view_count)`
    }).from(posts);
    
    console.log('\n✅ Post view counts updated!');
    console.log('New total views:', newTotal[0].total);
    console.log('Target was: ~2000');

  } catch (error) {
    console.error('❌ Update failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }

  process.exit(0);
}

updatePostViews();
