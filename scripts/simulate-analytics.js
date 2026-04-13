// scripts/simulate-analytics.js
// Core analytics simulation engine

import dotenv from 'dotenv';
dotenv.config({ path: '.env.development' });

import { eq, sql } from 'drizzle-orm';
import config from './simulation.config.js';
import crypto from 'crypto';

// Dynamically import db after env is loaded
let db, posts, comments, subscribers, activities, dailyPageViews;

async function loadDb() {
  const dbModule = await import('../src/db/index.js');
  db = dbModule.db;
  posts = dbModule.posts;
  comments = dbModule.comments;
  subscribers = dbModule.subscribers;
  activities = dbModule.activities;
  dailyPageViews = dbModule.dailyPageViews;
}

/**
 * Get random integer between min and max (inclusive)
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Get random item from array
 */
function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Categorize posts based on title matching
 */
function categorizePost(title) {
  const lowerTitle = title.toLowerCase();

  for (const keyword of config.categories.trendingUp) {
    if (lowerTitle.includes(keyword.toLowerCase())) return 'trendingUp';
  }

  for (const keyword of config.categories.trendingDown) {
    if (lowerTitle.includes(keyword.toLowerCase())) return 'trendingDown';
  }

  for (const keyword of config.categories.excluded) {
    if (lowerTitle.includes(keyword.toLowerCase())) return 'excluded';
  }

  return 'stable';
}

/**
 * Get current simulation day from daily_page_views table
 */
async function getSimulationDay() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const result = await db
    .select({ count: sql`count(*)` })
    .from(dailyPageViews)
    .where(sql`${dailyPageViews.createdAt} > ${sevenDaysAgo}`);

  const count = Number(result[0]?.count || 0);
  return count + 1; // Day 1 = first run
}

/**
 * Simulate page views for posts and record daily totals
 */
async function simulateViews(day, allPosts) {
  const multiplier = config.dayMultipliers[day];
  const viewUpdates = [];
  let totalViews = 0;

  for (const post of allPosts) {
    const category = categorizePost(post.title);
    const range = config.viewRanges[category];

    // Calculate views with day multiplier
    const baseViews = randomInt(range.min, range.max);
    const adjustedViews = Math.round(baseViews * multiplier);

    if (adjustedViews > 0) {
      // Update post view count
      viewUpdates.push({
        id: post.id,
        views: adjustedViews,
        title: post.title
      });
      totalViews += adjustedViews;
    }
  }

  // Apply all view updates
  for (const update of viewUpdates) {
    await db.execute(sql`
      UPDATE posts
      SET view_count = view_count + ${update.views}
      WHERE id = ${update.id}
    `);
  }

  // Insert daily page views record
  const uniqueVisitors = Math.floor(totalViews * 0.6); // 60% unique
  const today = new Date();
  today.setDate(today.getDate() - (config.duration - day)); // Backdate to simulate past days

  await db.insert(dailyPageViews).values({
    date: today.toISOString().split('T')[0],
    totalViews: totalViews,
    uniqueVisitors: uniqueVisitors,
    createdAt: new Date(),
    updatedAt: new Date()
  }).onConflictDoNothing();

  return {
    totalViews,
    postsUpdated: viewUpdates.length
  };
}

/**
 * Simulate comments on random posts
 */
async function simulateComments(day, allPosts) {
  const commentCount = randomInt(
    config.dailyTargets.comments.min,
    config.dailyTargets.comments.max
  );

  const commentsAdded = [];

  // Only add comments to trending up and stable posts
  const eligiblePosts = allPosts.filter(p => {
    const cat = categorizePost(p.title);
    return cat === 'trendingUp' || cat === 'stable';
  });

  for (let i = 0; i < commentCount; i++) {
    const post = randomItem(eligiblePosts);
    const commentText = randomItem(config.commentTemplates);
    const commenterName = randomItem(config.subscriberNames);

    try {
      // Create comment
      const commentId = crypto.randomUUID();

      await db.insert(comments).values({
        id: commentId,
        postId: post.id,
        parentId: null,
        authorName: commenterName,
        authorEmail: `${commenterName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        content: commentText,
        status: 'APPROVED',
        isEdited: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const [comment] = await db
        .select({ id: comments.id })
        .from(comments)
        .where(eq(comments.id, commentId))
        .limit(1);

      commentsAdded.push(comment);

      // Log COMMENT_CREATED activity
      await db.insert(activities).values({
        type: 'COMMENT_CREATED',
        description: `${commenterName} commented on "${post.title}"`,
        userId: null,
        entityId: post.id,
        entityType: 'POST',
        createdAt: new Date()
      });
    } catch (error) {
      // Continue if this comment fails
      console.log(`  ⚠️  Skipped comment: ${error.message}`);
    }
  }

  return { commentsAdded: commentsAdded.length };
}

/**
 * Simulate new subscribers
 */
async function simulateSubscribers(day) {
  const subscriberCount = randomInt(
    config.dailyTargets.subscribers.min,
    config.dailyTargets.subscribers.max
  );

  const newSubscribers = [];

  for (let i = 0; i < subscriberCount; i++) {
    const name = randomItem(config.subscriberNames);
    const email = `${name.toLowerCase().replace(/\s+/g, '.')}.${randomInt(1, 999)}@example.com`;

    try {
      // Create subscriber
      const subscriberId = crypto.randomUUID();

      await db.insert(subscribers).values({
        id: subscriberId,
        email,
        name,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const [subscriber] = await db
        .select({ id: subscribers.id })
        .from(subscribers)
        .where(eq(subscribers.id, subscriberId))
        .limit(1);

      newSubscribers.push(subscriber);

      // Log SUBSCRIBER_CREATED activity
      await db.insert(activities).values({
        type: 'SUBSCRIBER_CREATED',
        description: `${name} subscribed to the newsletter`,
        userId: null,
        entityId: subscriber.id,
        entityType: 'SUBSCRIBER',
        createdAt: new Date()
      });
    } catch (error) {
      // Email might already exist, skip
      console.log(`  ⚠️  Skipped duplicate subscriber: ${email}`);
    }
  }

  return { subscribersAdded: newSubscribers.length };
}

/**
 * Main simulation runner
 */
export async function runSimulation() {
  console.log('🚀 Starting Analytics Simulation...\n');

  try {
    // Load database connection
    await loadDb();

    // Get current day
    const day = await getSimulationDay();

    if (day > config.duration) {
      console.log('✅ Simulation already complete! (7 days finished)');
      return { complete: true, day };
    }

    console.log(`📊 Day ${day}/${config.duration}\n`);

    // Get all posts
    const allPosts = await db.select({
      id: posts.id,
      title: posts.title,
      viewCount: posts.viewCount
    }).from(posts);

    console.log(`  Found ${allPosts.length} posts`);

    // Run simulations
    console.log('  📝 Simulating views...');
    const viewStats = await simulateViews(day, allPosts);
    console.log(`     ✓ Added ${viewStats.totalViews} views to ${viewStats.postsUpdated} posts`);

    console.log('  💬 Simulating comments...');
    const commentStats = await simulateComments(day, allPosts);
    console.log(`     ✓ Added ${commentStats.commentsAdded} comments`);

    console.log('  👥 Simulating subscribers...');
    const subscriberStats = await simulateSubscribers(day);
    console.log(`     ✓ Added ${subscriberStats.subscribersAdded} subscribers`);

    const stats = {
      day,
      totalViews: viewStats.totalViews,
      postsUpdated: viewStats.postsUpdated,
      commentsAdded: commentStats.commentsAdded,
      subscribersAdded: subscriberStats.subscribersAdded
    };

    console.log(`\n✅ Day ${day} complete!`);
    console.log(`   Views: ${stats.totalViews} | Comments: ${stats.commentsAdded} | Subscribers: ${stats.subscribersAdded}\n`);

    return { complete: false, day, stats };

  } catch (error) {
    console.error('❌ Simulation failed:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSimulation()
    .then(result => {
      if (result.complete) {
        console.log('\n🎉 7-day simulation is complete!');
        console.log('   Check your dashboard at http://localhost:3000/admin');
      }
      process.exit(0);
    })
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}
