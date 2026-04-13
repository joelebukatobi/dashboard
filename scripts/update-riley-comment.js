// scripts/update-riley-comment.js
// Update Riley Garcia's comment on "Database Design Principles" post

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { eq, and } from 'drizzle-orm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '..', '.env.development') });

const newContent = "I've shared this with my team. Great resource! Everyone found it incredibly helpful for our current project. The examples you provided made it so much easier to understand the concepts. We'll definitely be referring back to this in the future. Keep up the excellent work!";

async function updateComment() {
  const { db, comments, posts } = await import('../src/db/index.js');
  
  // Find the post
  const postResult = await db.select({ id: posts.id }).from(posts).where(eq(posts.title, 'Database Design Principles')).limit(1);
  
  if (postResult.length === 0) {
    console.log('Post "Database Design Principles" not found');
    process.exit(1);
  }
  
  const postId = postResult[0].id;
  
  // Find and update Riley Garcia's comment
  await db.update(comments)
    .set({ 
      content: newContent,
      updatedAt: new Date()
    })
    .where(
      and(
        eq(comments.postId, postId),
        eq(comments.authorName, 'Riley Garcia')
      )
    );

  const updateResult = await db
    .select({ id: comments.id, content: comments.content })
    .from(comments)
    .where(
      and(
        eq(comments.postId, postId),
        eq(comments.authorName, 'Riley Garcia')
      )
    )
    .limit(1);
  
  if (updateResult.length > 0) {
    console.log('✅ Updated comment successfully!');
    console.log(`Comment ID: ${updateResult[0].id}`);
    console.log(`New content: ${updateResult[0].content.substring(0, 50)}...`);
  } else {
    console.log('❌ No comment found from Riley Garcia on that post');
  }
  
  process.exit(0);
}

updateComment().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
