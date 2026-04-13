// scripts/seed-comments.js
// Seed 15 comments per post for testing

// Load environment variables FIRST before any other imports
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure dotenv BEFORE importing anything that uses env vars
config({ path: join(__dirname, '..', '.env.development') });

// Sample comment data
const commenters = [
  { name: 'Sarah Johnson', email: 'sarah.j@example.com' },
  { name: 'Mike Chen', email: 'mike.chen@example.com' },
  { name: 'Emily Davis', email: 'emily.d@example.com' },
  { name: 'Alex Rivera', email: 'alex.r@example.com' },
  { name: 'Jordan Smith', email: 'jordan.s@example.com' },
  { name: 'Taylor Brown', email: 'taylor.b@example.com' },
  { name: 'Casey Wilson', email: 'casey.w@example.com' },
  { name: 'Morgan Lee', email: 'morgan.l@example.com' },
  { name: 'Jamie Parker', email: 'jamie.p@example.com' },
  { name: 'Riley Garcia', email: 'riley.g@example.com' },
];

const commentTemplates = [
  'Great article! Thanks for sharing this.',
  'This was really helpful. I learned a lot!',
  'Could you explain more about the implementation details?',
  'I\'ve been looking for this exact solution. Thank you!',
  'This is exactly what I needed. Bookmarking this!',
  'Well written and easy to follow. Keep it up!',
  'I disagree with some points here, but overall good content.',
  'Can you provide more examples? Would love to see a follow-up.',
  'This helped me solve a problem I\'ve been stuck on for days!',
  'Clear and concise explanation. Appreciate it!',
  'I\'m new to this topic and this was a great introduction.',
  'The code examples were particularly useful. Thanks!',
  'I\'ve shared this with my team. Great resource! Everyone found it incredibly helpful for our current project. The examples you provided made it so much easier to understand the concepts. We\'ll definitely be referring back to this in the future. Keep up the excellent work!',
  'Looking forward to more content like this.',
  'This changed how I approach this topic. Excellent!',
  'Very practical advice. Thanks for sharing your experience.',
  'I have a question about the second example...',
  'This is the best explanation I\'ve found on this topic.',
  'Thanks for taking the time to write this!',
  'I\'ll definitely be applying these tips in my next project.',
];

const replyTemplates = [
  'Thanks for your feedback! Glad you found it helpful.',
  'I appreciate your comment! Let me know if you have any questions.',
  'That\'s a great point! I\'ll consider that for future updates.',
  'Happy to help! Thanks for reading.',
  'Thanks! Feel free to share with anyone who might benefit.',
  'I\'m glad this resonated with you. More content coming soon!',
];

import crypto from 'crypto';

async function seedComments() {
  console.log('🌱 Seeding comments...\n');

  // Dynamic imports after env is loaded
  const { db, posts, comments, users } = await import('../src/db/index.js');
  const { eq } = await import('drizzle-orm');

  // Get all posts
  const allPosts = await db.select({ id: posts.id, title: posts.title }).from(posts);
  console.log(`Found ${allPosts.length} posts\n`);

  // Get admin user for replies
  const adminUsers = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName }).from(users).where(eq(users.role, 'ADMIN')).limit(1);
  const adminUser = adminUsers[0];

  if (allPosts.length === 0) {
    console.log('No posts found to add comments to');
    process.exit(0);
  }

  let totalComments = 0;

  for (const post of allPosts) {
    console.log(`Post: "${post.title}"`);
    
    // Create 15 comments for each post
    const postComments = [];
    
    for (let i = 0; i < 15; i++) {
      const commenter = commenters[Math.floor(Math.random() * commenters.length)];
      const content = commentTemplates[Math.floor(Math.random() * commentTemplates.length)];
      
      // Create a date within the last 30 days
      const daysAgo = Math.floor(Math.random() * 30);
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - daysAgo);
      
      postComments.push({
        postId: post.id,
        authorName: commenter.name,
        authorEmail: commenter.email,
        content: content,
        status: 'APPROVED',
        createdAt: createdAt,
        updatedAt: createdAt,
      });
    }
    
    // Insert comments
    const commentsWithIds = postComments.map((comment) => ({
      id: crypto.randomUUID(),
      parentId: null,
      ...comment,
    }));

    await db.insert(comments).values(commentsWithIds);
    console.log(`  Added ${commentsWithIds.length} comments`);
    
    // Add 2-3 replies from admin to random comments
    if (adminUser && commentsWithIds.length > 0) {
      const numReplies = Math.floor(Math.random() * 2) + 2; // 2-3 replies
      const shuffled = [...commentsWithIds].sort(() => Math.random() - 0.5);
      const commentsToReply = shuffled.slice(0, numReplies);
      
      for (const parentComment of commentsToReply) {
        const replyContent = replyTemplates[Math.floor(Math.random() * replyTemplates.length)];
        const replyDate = new Date(parentComment.createdAt);
        replyDate.setHours(replyDate.getHours() + Math.floor(Math.random() * 24) + 1);
        
        await db.insert(comments).values({
          id: crypto.randomUUID(),
          postId: post.id,
          parentId: parentComment.id,
          authorName: `${adminUser.firstName} ${adminUser.lastName}`,
          authorEmail: 'admin@example.com',
          content: replyContent,
          status: 'APPROVED',
          createdAt: replyDate,
          updatedAt: replyDate,
        });
      }
      console.log(`  Added ${numReplies} admin replies`);
    }
    
    totalComments += commentsWithIds.length;
    console.log('');
  }

  console.log(`✅ Done! Added ${totalComments} comments across ${allPosts.length} posts.`);
  process.exit(0);
}

seedComments().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
