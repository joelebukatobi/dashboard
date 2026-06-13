import { ensureDatabaseUrl } from '../../../env.js';
import { eq, sql } from 'drizzle-orm';
import crypto from 'crypto';
import config from '../simulation.config.js';

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

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

export async function simulateDay(args = []) {
  ensureDatabaseUrl({ scriptName: 'cli analytics day' });

  console.log('Starting analytics simulation...\n');

  const { db, dailyPageViews, analyticsEvents, posts, activities, users } = await import('../../../src/db/index.js');

  const dateArg = args.find((arg) => arg.startsWith('--date='))?.split('=')[1];
  const daysArg = parseInt(args.find((arg) => arg.startsWith('--days='))?.split('=')[1] || '1', 10);
  const isBackdate = args.includes('--backdate');

  const allPosts = await db.select({
    id: posts.id,
    title: posts.title,
    viewCount: posts.viewCount,
  }).from(posts).where(eq(posts.status, 'PUBLISHED'));

  if (allPosts.length === 0) {
    console.log('No published posts found. Run npm run db:seed first.');
    return;
  }

  console.log(`Found ${allPosts.length} published posts\n`);

  const dates = [];

  if (dateArg) {
    dates.push(new Date(dateArg));
  } else if (isBackdate && daysArg > 1) {
    for (let i = 0; i < daysArg; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date);
    }
  } else {
    dates.push(new Date());
  }

  let totalViews = 0;
  let totalEvents = 0;

  for (const simDate of dates) {
    const dateStr = simDate.toISOString().split('T')[0];
    console.log(`Simulating: ${dateStr}`);

    const existingData = await db.select().from(dailyPageViews).where(eq(dailyPageViews.date, dateStr));

    if (existingData.length > 0 && !args.includes('--force')) {
      console.log(`  Data already exists for ${dateStr} (use --force to overwrite)`);
      continue;
    }

    const baseViews = Math.floor(Math.random() * 500) + 200;
    const uniqueVisitors = Math.floor(baseViews * (0.6 + Math.random() * 0.3));

    await db.insert(dailyPageViews).values({
      date: dateStr,
      totalViews: baseViews,
      uniqueVisitors,
    }).onConflictDoUpdate({
      target: dailyPageViews.date,
      set: { totalViews: baseViews, uniqueVisitors, updatedAt: new Date() },
    });

    totalViews += baseViews;

    const eventCount = Math.floor(Math.random() * 50) + 20;
    const eventTypes = ['page_view', 'post_view', 'scroll', 'time_on_page'];

    for (let i = 0; i < eventCount; i++) {
      const randomPost = allPosts[Math.floor(Math.random() * allPosts.length)];
      const eventTime = new Date(simDate);
      eventTime.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

      await db.insert(analyticsEvents).values({
        type: randomItem(eventTypes),
        postId: randomPost.id,
        path: `/blog/${randomPost.title.toLowerCase().replace(/\s+/g, '-')}`,
        metadata: {
          userAgent: 'Mozilla/5.0 (simulated)',
          referrer: Math.random() > 0.5 ? 'google.com' : 'direct',
        },
        createdAt: eventTime,
      });
      totalEvents++;
    }

    for (const post of allPosts) {
      if (Math.random() > 0.3) {
        const increment = Math.floor(Math.random() * 20) + 1;
        await db.update(posts).set({
          viewCount: sql`${posts.viewCount} + ${increment}`,
        }).where(eq(posts.id, post.id));
      }
    }

    console.log(`  ${baseViews} views, ${uniqueVisitors} unique visitors, ${eventCount} events`);
  }

  const adminUser = await db.select().from(users).where(eq(users.email, 'admin@example.com')).limit(1);
  if (adminUser.length > 0) {
    await db.insert(activities).values({
      userId: adminUser[0].id,
      type: 'SIMULATION_RUN',
      description: `Simulated ${dates.length} day(s) of analytics data`,
      metadata: {
        dates: dates.map((d) => d.toISOString().split('T')[0]),
        totalViews,
        totalEvents,
      },
    });
  }

  console.log('\nSimulation complete');
  console.log(`  Days: ${dates.length}`);
  console.log(`  Views: ${totalViews.toLocaleString()}`);
  console.log(`  Events: ${totalEvents.toLocaleString()}`);
}

export async function runSimulation() {
  ensureDatabaseUrl({ scriptName: 'cli analytics run' });

  const { db, posts, comments, subscribers, activities, dailyPageViews } = await import('../../../src/db/index.js');

  const day = await getSimulationDay(db, dailyPageViews);

  if (day > config.duration) {
    console.log('Simulation already complete (7 days finished)');
    return { complete: true, day };
  }

  console.log(`Day ${day}/${config.duration}\n`);

  const allPosts = await db.select({ id: posts.id, title: posts.title, viewCount: posts.viewCount }).from(posts);
  console.log(`  Found ${allPosts.length} posts`);

  const viewStats = await simulateViews(db, day, allPosts, posts, dailyPageViews);
  const commentStats = await simulateComments(db, allPosts, comments, activities);
  const subscriberStats = await simulateSubscribers(db, subscribers, activities);

  console.log(`\nDay ${day} complete`);
  console.log(`  Views: ${viewStats.totalViews} | Comments: ${commentStats.commentsAdded} | Subscribers: ${subscriberStats.subscribersAdded}`);

  return {
    complete: false,
    day,
    stats: { ...viewStats, ...commentStats, ...subscriberStats },
  };
}

async function getSimulationDay(db, dailyPageViews) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const result = await db
    .select({ count: sql`count(*)` })
    .from(dailyPageViews)
    .where(sql`${dailyPageViews.createdAt} > ${sevenDaysAgo}`);

  return Number(result[0]?.count || 0) + 1;
}

async function simulateViews(db, day, allPosts, posts, dailyPageViews) {
  const multiplier = config.dayMultipliers[day];
  let totalViews = 0;
  const viewUpdates = [];

  for (const post of allPosts) {
    const category = categorizePost(post.title);
    const range = config.viewRanges[category];
    const adjustedViews = Math.round(randomInt(range.min, range.max) * multiplier);

    if (adjustedViews > 0) {
      viewUpdates.push({ id: post.id, views: adjustedViews });
      totalViews += adjustedViews;
    }
  }

  for (const update of viewUpdates) {
    await db.execute(sql`UPDATE posts SET view_count = view_count + ${update.views} WHERE id = ${update.id}`);
  }

  const today = new Date();
  today.setDate(today.getDate() - (config.duration - day));

  await db.insert(dailyPageViews).values({
    date: today.toISOString().split('T')[0],
    totalViews,
    uniqueVisitors: Math.floor(totalViews * 0.6),
    createdAt: new Date(),
    updatedAt: new Date(),
  }).onConflictDoNothing();

  return { totalViews, postsUpdated: viewUpdates.length };
}

async function simulateComments(db, allPosts, comments, activities) {
  const commentCount = randomInt(config.dailyTargets.comments.min, config.dailyTargets.comments.max);
  const eligiblePosts = allPosts.filter((p) => {
    const cat = categorizePost(p.title);
    return cat === 'trendingUp' || cat === 'stable';
  });

  let commentsAdded = 0;

  for (let i = 0; i < commentCount; i++) {
    const post = randomItem(eligiblePosts);
    const commenterName = randomItem(config.subscriberNames);

    try {
      const commentId = crypto.randomUUID();
      await db.insert(comments).values({
        id: commentId,
        postId: post.id,
        parentId: null,
        authorName: commenterName,
        authorEmail: `${commenterName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        content: randomItem(config.commentTemplates),
        status: 'APPROVED',
        isEdited: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await db.insert(activities).values({
        type: 'COMMENT_CREATED',
        description: `${commenterName} commented on "${post.title}"`,
        userId: null,
        entityId: post.id,
        entityType: 'POST',
        createdAt: new Date(),
      });

      commentsAdded++;
    } catch {
      // skip failed comment
    }
  }

  return { commentsAdded };
}

async function simulateSubscribers(db, subscribers, activities) {
  const subscriberCount = randomInt(config.dailyTargets.subscribers.min, config.dailyTargets.subscribers.max);
  let subscribersAdded = 0;

  for (let i = 0; i < subscriberCount; i++) {
    const name = randomItem(config.subscriberNames);
    const email = `${name.toLowerCase().replace(/\s+/g, '.')}.${randomInt(1, 999)}@example.com`;

    try {
      const subscriberId = crypto.randomUUID();
      await db.insert(subscribers).values({
        id: subscriberId,
        email,
        name,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await db.insert(activities).values({
        type: 'SUBSCRIBER_CREATED',
        description: `${name} subscribed to the newsletter`,
        userId: null,
        entityId: subscriberId,
        entityType: 'SUBSCRIBER',
        createdAt: new Date(),
      });

      subscribersAdded++;
    } catch {
      // skip duplicate email
    }
  }

  return { subscribersAdded };
}

export async function aggregateDailyViews() {
  ensureDatabaseUrl({ scriptName: 'cli analytics aggregate' });

  console.log('Running daily view aggregation...\n');

  const { analyticsService } = await import('../../../src/services/analytics.service.js');
  const result = await analyticsService.aggregateDailyViews();

  console.log('Aggregation complete');
  console.log(`  Date: ${result.date.toISOString().split('T')[0]}`);
  console.log(`  Total views: ${result.totalViews.toLocaleString()}`);
  console.log(`  Action: ${result.action}`);
}

export async function runScheduler() {
  const cron = (await import('node-cron')).default;

  console.log('Analytics simulation scheduler');
  console.log('  Schedule: daily at 9:00 AM\n');

  let isRunning = false;

  cron.schedule('0 9 * * *', async () => {
    if (isRunning) {
      console.log('Previous simulation still running, skipping...');
      return;
    }

    isRunning = true;

    try {
      const result = await runSimulation();
      if (result.complete) {
        console.log('\n7-day simulation complete');
      }
    } catch (error) {
      console.error('Scheduled simulation failed:', error);
    } finally {
      isRunning = false;
    }
  });

  console.log('Scheduler running. Press Ctrl+C to stop.');
}
