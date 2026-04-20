#!/usr/bin/env node
// scripts/seed-daily-views.js
// Seed daily_page_views table with historical data for chart testing

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '..', '.env.development') });

async function seedDailyViews() {
  console.log('📊 Seeding daily page views data...\n');

  try {
    // Dynamic imports after env is loaded
    const { db, posts, dailyPageViews } = await import('../src/db/index.js');
    const { eq } = await import('drizzle-orm');

    // Get all posts with their view counts
    const allPosts = await db.select({ 
      id: posts.id, 
      viewCount: posts.viewCount,
      publishedAt: posts.publishedAt 
    }).from(posts);

    console.log(`Found ${allPosts.length} posts to distribute views from`);

    // Clear existing daily page views data
    console.log('Clearing existing daily page views...');
    await db.delete(dailyPageViews);
    console.log('✅ Existing data cleared\n');

    // Generate daily view data for the past 365 days
    // Target: ~2000 total views, ~1000 total visitors over the year
    const dailyData = [];
    const today = new Date();
    const targetTotalViews = 2000;
    const targetTotalVisitors = 1000;
    const days = 366;
    
    // Generate base daily values with some randomness
    // Average around 5-6 views per day for ~2000 total
    for (let i = 0; i < days; i++) {
      const dayOffset = days - 1 - i;
      const date = new Date(today);
      date.setDate(date.getDate() - dayOffset);
      date.setHours(0, 0, 0, 0);
      
      // Generate random daily views (3-10 range)
      const dailyViews = Math.floor(3 + Math.random() * 7);
      const dailyVisitors = Math.floor(dailyViews * 0.5);
      
      dailyData.push({
        date: date.toISOString().split('T')[0],
        totalViews: dailyViews,
        uniqueVisitors: dailyVisitors,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    
    // Normalize to hit exact targets
    const currentTotalViews = dailyData.reduce((sum, d) => sum + d.totalViews, 0);
    const currentTotalVisitors = dailyData.reduce((sum, d) => sum + d.uniqueVisitors, 0);
    
    const viewsMultiplier = targetTotalViews / currentTotalViews;
    const visitorsMultiplier = targetTotalVisitors / currentTotalVisitors;
    
    dailyData.forEach(day => {
      day.totalViews = Math.max(1, Math.floor(day.totalViews * viewsMultiplier));
      day.uniqueVisitors = Math.max(1, Math.floor(day.uniqueVisitors * visitorsMultiplier));
    });
    
    // Fine-tune to hit exact targets
    let finalViews = dailyData.reduce((sum, d) => sum + d.totalViews, 0);
    let finalVisitors = dailyData.reduce((sum, d) => sum + d.uniqueVisitors, 0);
    
    // Add/subtract from random days to hit exact targets
    while (finalViews < targetTotalViews) {
      const randomDay = dailyData[Math.floor(Math.random() * dailyData.length)];
      randomDay.totalViews += 1;
      finalViews++;
    }
    while (finalVisitors < targetTotalVisitors) {
      const randomDay = dailyData[Math.floor(Math.random() * dailyData.length)];
      randomDay.uniqueVisitors += 1;
      finalVisitors++;
    }

    console.log(`Generated ${dailyData.length} days of view data`);

    // Insert data in batches to avoid overwhelming the database
    const batchSize = 100;
    for (let i = 0; i < dailyData.length; i += batchSize) {
      const batch = dailyData.slice(i, i + batchSize);
      await db.insert(dailyPageViews).values(batch);
      console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(dailyData.length / batchSize)}`);
    }

    console.log('\n✅ Daily page views data seeded successfully!');
    console.log(`Total records: ${dailyData.length}`);
    console.log(`Date range: ${dailyData[0].date} to ${dailyData[dailyData.length - 1].date}`);

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }

  process.exit(0);
}

seedDailyViews();
