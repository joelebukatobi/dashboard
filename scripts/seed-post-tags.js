// scripts/seed-post-tags.js
// Assign tags to existing posts for testing

// Load environment variables FIRST before any other imports
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure dotenv BEFORE importing anything that uses env vars
config({ path: join(__dirname, '..', '.env.development') });

async function seedPostTags() {
  console.log('Assigning tags to existing posts...\n');

  // Dynamic imports after env is loaded
  const { db, posts, tags, postTags } = await import('../src/db/index.js');
  const { eq, sql } = await import('drizzle-orm');

  // Get all posts
  const allPosts = await db.select({ id: posts.id, title: posts.title }).from(posts);
  console.log(`Found ${allPosts.length} posts`);

  // Get all tags
  const allTags = await db.select({ id: tags.id, name: tags.name }).from(tags);
  console.log(`Found ${allTags.length} tags: ${allTags.map(t => t.name).join(', ')}\n`);

  if (allPosts.length === 0 || allTags.length === 0) {
    console.log('Need both posts and tags to continue');
    process.exit(0);
  }

  // Assign 1-3 random tags to each post
  for (const post of allPosts) {
    // Random number of tags (1-3)
    const numTags = Math.floor(Math.random() * 3) + 1;
    
    // Shuffle tags and pick first N
    const shuffled = [...allTags].sort(() => Math.random() - 0.5);
    const selectedTags = shuffled.slice(0, numTags);
    
    console.log(`Post: "${post.title}"`);
    console.log(`  Adding ${selectedTags.length} tag(s): ${selectedTags.map(t => t.name).join(', ')}`);
    
    // Delete existing tags for this post (if any)
    await db.delete(postTags).where(eq(postTags.postId, post.id));
    
    // Insert new tag relationships
    if (selectedTags.length > 0) {
      await db.insert(postTags).values(
        selectedTags.map(tag => ({
          postId: post.id,
          tagId: tag.id,
        }))
      );
    }
  }

  // Update post_count for all tags
  console.log('\nUpdating tag post counts...');
  for (const tag of allTags) {
    const [{ count }] = await db
      .select({ count: sql`count(*)` })
      .from(postTags)
      .where(eq(postTags.tagId, tag.id));
    
    await db
      .update(tags)
      .set({ postCount: count })
      .where(eq(tags.id, tag.id));
    
    console.log(`  ${tag.name}: ${count} posts`);
  }

  console.log('\n✅ Done! Tags assigned to posts successfully.');
  process.exit(0);
}

seedPostTags().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
