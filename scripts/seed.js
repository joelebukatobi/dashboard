// scripts/seed.js
// Master seed script - combines all seeders into one
// Usage: node scripts/seed.js [--fresh] [--core] [--images] [--videos]

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync, statSync, existsSync, mkdirSync, copyFileSync } from 'fs';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '..', '.env.development') });

// Parse CLI arguments
const args = process.argv.slice(2);
const isFresh = args.includes('--fresh');
const isCoreOnly = args.includes('--core');
const includeImages = args.includes('--images') || !isCoreOnly;
const includeVideos = args.includes('--videos') || !isCoreOnly;

// Stats tracking
const stats = {
  users: 0,
  categories: 0,
  tags: 0,
  settings: 0,
  posts: 0,
  images: 0,
  videos: 0,
  comments: 0,
  subscribers: 0,
  activities: 0,
};

async function seed() {
  console.log('🌱 Starting database seed...\n');
  const startTime = Date.now();

  // Dynamic imports after env is loaded
  const { db, users, categories, tags, settings, posts, postTags, comments, mediaItems, subscribers, activities } = await import('../src/db/index.js');
  const { eq, sql } = await import('drizzle-orm');
  const { default: bcrypt } = await import('bcryptjs');

  const dialect = process.env.DATABASE_URL?.startsWith('mysql') ? 'mysql' : 'postgres';

  const insertWithIgnore = (table, values) => {
    if (dialect === 'mysql') {
      return db.insert(table).values(values);
    }

    return db.insert(table).values(values).onConflictDoNothing();
  };

  try {
    // Fresh start - clear all data
    if (isFresh) {
      console.log('🗑️  Clearing existing data...');
      if (dialect === 'mysql') {
        await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);
        await db.execute(sql`TRUNCATE TABLE activities`);
        await db.execute(sql`TRUNCATE TABLE analytics_events`);
        await db.execute(sql`TRUNCATE TABLE comments`);
        await db.execute(sql`TRUNCATE TABLE daily_page_views`);
        await db.execute(sql`TRUNCATE TABLE media_items`);
        await db.execute(sql`TRUNCATE TABLE post_tags`);
        await db.execute(sql`TRUNCATE TABLE posts`);
        await db.execute(sql`TRUNCATE TABLE settings`);
        await db.execute(sql`TRUNCATE TABLE subscribers`);
        await db.execute(sql`TRUNCATE TABLE tags`);
        await db.execute(sql`TRUNCATE TABLE categories`);
        await db.execute(sql`TRUNCATE TABLE sessions`);
        await db.execute(sql`TRUNCATE TABLE password_resets`);
        await db.execute(sql`TRUNCATE TABLE oauth_accounts`);
        await db.execute(sql`TRUNCATE TABLE users`);
        await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);
      } else {
        await db.execute(sql`TRUNCATE TABLE activities, analytics_events, comments, daily_page_views, media_items, post_tags, posts, settings, subscribers, tags, categories, sessions, password_resets, oauth_accounts, users CASCADE`);
      }
      console.log('✅ Data cleared\n');
    }

    // ============================================
    // 1. USERS
    // ============================================
    console.log('👤 Creating users...');
    const adminPassword = await bcrypt.hash('Admin@123', 10);
    await insertWithIgnore(users, {
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@example.com',
      password: adminPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
    });

    const adminId = (await db.select().from(users).where(eq(users.email, 'admin@example.com')).limit(1))[0]?.id;
    stats.users = 1;
    console.log('✅ Admin user created: admin@example.com / Admin@123\n');

    // ============================================
    // 2. CATEGORIES
    // ============================================
    console.log('📁 Creating categories...');
    const categoryData = [
      { title: 'Development', slug: 'development', description: 'Software development articles' },
      { title: 'Design', slug: 'design', description: 'UI/UX and graphic design' },
      { title: 'CSS', slug: 'css', description: 'CSS tutorials and tips' },
      { title: 'JavaScript', slug: 'javascript', description: 'JavaScript and Node.js' },
      { title: 'Tutorials', slug: 'tutorials', description: 'Step-by-step guides' },
      { title: 'News', slug: 'news', description: 'Latest updates and announcements' },
    ];
    await insertWithIgnore(categories, categoryData);
    stats.categories = categoryData.length;
    console.log(`✅ ${categoryData.length} categories created\n`);

    // Get category IDs
    const allCategories = await db.select().from(categories);
    const getCategoryId = (slug) => allCategories.find(c => c.slug === slug)?.id;

    // ============================================
    // 3. TAGS
    // ============================================
    console.log('🏷️  Creating tags...');
    const tagData = [
      { name: 'Tutorial', slug: 'tutorial', description: 'How-to guides' },
      { name: 'Best Practices', slug: 'best-practices', description: 'Recommended approaches' },
      { name: 'Tips & Tricks', slug: 'tips-tricks', description: 'Quick helpful tips' },
      { name: 'Beginner', slug: 'beginner', description: 'For beginners' },
      { name: 'Advanced', slug: 'advanced', description: 'Advanced topics' },
      { name: 'Performance', slug: 'performance', description: 'Performance optimization' },
      { name: 'Security', slug: 'security', description: 'Security topics' },
      { name: 'Tools', slug: 'tools', description: 'Development tools' },
    ];
    await insertWithIgnore(tags, tagData);
    stats.tags = tagData.length;
    console.log(`✅ ${tagData.length} tags created\n`);

    // Get tag IDs
    const allTags = await db.select().from(tags);
    const getTagIds = () => allTags.map(t => t.id);

    // ============================================
    // 4. SETTINGS
    // ============================================
    console.log('⚙️  Creating settings...');
    const settingsData = [
      { key: 'siteName', value: 'My Blog', group: 'GENERAL', type: 'STRING' },
      { key: 'siteTagline', value: 'A modern blog built with Fastify', group: 'GENERAL', type: 'STRING' },
      { key: 'siteUrl', value: 'http://localhost:3000', group: 'GENERAL', type: 'STRING' },
      { key: 'timezone', value: 'UTC', group: 'GENERAL', type: 'STRING' },
      { key: 'dateFormat', value: 'MM/DD/YYYY', group: 'GENERAL', type: 'STRING' },
      { key: 'language', value: 'en', group: 'GENERAL', type: 'STRING' },
      { key: 'postsPerPage', value: '10', group: 'CONTENT', type: 'NUMBER' },
      { key: 'defaultPostStatus', value: 'DRAFT', group: 'CONTENT', type: 'STRING' },
      { key: 'maxUploadSize', value: '10', group: 'CONTENT', type: 'NUMBER' },
      { key: 'require2FA', value: 'false', group: 'SECURITY', type: 'BOOLEAN' },
      { key: 'passwordMinLength', value: '8', group: 'SECURITY', type: 'NUMBER' },
      { key: 'sessionTimeout', value: '60', group: 'SECURITY', type: 'NUMBER' },
    ];
    await insertWithIgnore(settings, settingsData);
    stats.settings = settingsData.length;
    console.log(`✅ ${settingsData.length} settings created\n`);

    // ============================================
    // 5. IMAGES (from files in public/uploads/images)
    // ============================================
    if (includeImages) {
      console.log('🖼️  Seeding images from files...');
      const imagesDir = join(__dirname, '..', 'public', 'uploads', 'images');
      const thumbsDir = join(imagesDir, 'thumbs');
      
      try {
        // Ensure thumbs directory exists
        if (!existsSync(thumbsDir)) {
          mkdirSync(thumbsDir, { recursive: true });
        }
        
        const files = readdirSync(imagesDir).filter(f => 
          /\.(jpg|jpeg|png|gif|webp)$/i.test(f) && 
          !f.includes('thumbs')
        );
        
        const imageTitles = [
          'Mountain Landscape', 'Sunset Beach', 'Forest Path', 'City Skyline',
          'Ocean View', 'Desert Dunes', 'Tech Setup', 'Coffee Break',
          'Workspace', 'Nature Trail', 'Urban Architecture', 'Abstract Art'
        ];
        
        const imageTags = ['Nature', 'Travel', 'Urban', 'Technology', 'Lifestyle', 'Art'];
        
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const filePath = join(imagesDir, file);
          const fileStats = statSync(filePath);
          const thumbPath = join(thumbsDir, file);
          
          // Generate thumbnail
          let width = 1920, height = 1080;
          try {
            // Get image dimensions
            const metadata = await sharp(filePath).metadata();
            width = metadata.width || 1920;
            height = metadata.height || 1080;
            
            // Create thumbnail (400x300, fit cover)
            await sharp(filePath)
              .resize(400, 300, { fit: 'cover' })
              .jpeg({ quality: 80 })
              .toFile(thumbPath);
          } catch (err) {
            console.log(`  ⚠️  Failed to generate thumbnail for ${file}: ${err.message}`);
          }
          
          await insertWithIgnore(mediaItems, {
            type: 'IMAGE',
            filename: file,
            originalName: file,
            mimeType: 'image/jpeg',
            size: fileStats.size,
            width: width,
            height: height,
            title: imageTitles[i % imageTitles.length],
            tag: imageTags[i % imageTitles.length],
            path: `/public/uploads/images/${file}`,
            thumbnailPath: `/public/uploads/images/thumbs/${file}`,
            uploadedBy: adminId,
            createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
          });
          
          stats.images++;
        }
        console.log(`✅ ${stats.images} images created from files\n`);
      } catch (err) {
        console.log('⚠️  No images directory found or error reading images:', err.message, '\n');
      }
    }

    // ============================================
    // 6. VIDEOS (from files in public/uploads/videos)
    // ============================================
    if (includeVideos) {
      console.log('🎥 Seeding videos from files...');
      const videosDir = join(__dirname, '..', 'public', 'uploads', 'videos');
      const thumbsDir = join(videosDir, 'thumbs');
      
      try {
        // Check if existing thumbnails directory exists
        const existingThumbsDir = join(videosDir, 'thumbs');
        const hasExistingThumbs = existsSync(existingThumbsDir);
        
        const files = readdirSync(videosDir).filter(f => 
          /\.(mp4|webm|mov|avi)$/i.test(f)
        );
        
        const videoTitles = [
          'Tutorial: Getting Started', 'Product Demo', 'Conference Talk',
          'Behind the Scenes', 'Quick Tips', 'Full Course'
        ];
        
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const filePath = join(videosDir, file);
          const fileStats = statSync(filePath);
          const videoId = file.match(/-(\d+)-/)?.[1] || i;
          const thumbFilename = `thumb-${file.replace(/\.[^/.]+$/, '.jpg')}`;
          const thumbPath = join(thumbsDir, thumbFilename);
          
          // Try to find or copy existing thumbnail
          let thumbnailPath = null;
          if (hasExistingThumbs) {
            // Look for existing thumbnail with matching pattern
            const existingThumbs = readdirSync(existingThumbsDir).filter(f => f.endsWith('.jpg'));
            const matchingThumb = existingThumbs.find(t => t.includes(videoId));
            
            if (matchingThumb) {
              const existingThumbPath = join(existingThumbsDir, matchingThumb);
              // Copy to expected location
              try {
                copyFileSync(existingThumbPath, thumbPath);
                thumbnailPath = `/public/uploads/videos/thumbs/${thumbFilename}`;
              } catch (err) {
                console.log(`  ⚠️  Failed to copy thumbnail for ${file}`);
              }
            }
          }
          
          // If no thumbnail, use first available one
          if (!thumbnailPath && hasExistingThumbs) {
            const existingThumbs = readdirSync(existingThumbsDir).filter(f => f.endsWith('.jpg'));
            if (existingThumbs.length > 0) {
              thumbnailPath = `/public/uploads/videos/thumbs/${existingThumbs[i % existingThumbs.length]}`;
            }
          }
          
          await insertWithIgnore(mediaItems, {
            type: 'VIDEO',
            filename: file,
            originalName: file,
            mimeType: 'video/mp4',
            size: fileStats.size,
            duration: Math.floor(Math.random() * 600) + 60, // 1-10 minutes
            title: videoTitles[i % videoTitles.length],
            path: `/public/uploads/videos/${file}`,
            thumbnailPath: thumbnailPath,
            uploadedBy: adminId,
            createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
          });
          
          stats.videos++;
        }
        console.log(`✅ ${stats.videos} videos created from files\n`);
      } catch (err) {
        console.log('⚠️  No videos directory found or error reading videos:', err.message, '\n');
      }
    }

    // ============================================
    // 7. POSTS
    // ============================================
    console.log('📝 Creating posts...');

    const getDateMonthsAgo = (months) => {
      const date = new Date();
      date.setMonth(date.getMonth() - months);
      return date;
    };

    const imagePool = await db
      .select({ id: mediaItems.id })
      .from(mediaItems)
      .where(eq(mediaItems.type, 'IMAGE'));

    const imageIds = imagePool.map((item) => item.id);

    const postsData = [
      { title: 'Getting Started with React Hooks', slug: 'getting-started-with-react-hooks', content: '<p>React Hooks have revolutionized how we write React components...</p>', excerpt: 'Learn how to use React Hooks', categorySlug: 'javascript', monthsAgo: 0 },
      { title: 'CSS Grid Layout: A Complete Guide', slug: 'css-grid-layout-complete-guide', content: '<p>CSS Grid Layout is a two-dimensional layout system...</p>', excerpt: 'Master CSS Grid Layout', categorySlug: 'css', monthsAgo: 1 },
      { title: 'Building Scalable APIs with Fastify', slug: 'building-scalable-apis-fastify', content: '<p>Fastify is a high-performance web framework...</p>', excerpt: 'Learn Fastify', categorySlug: 'development', monthsAgo: 1 },
      { title: 'Advanced TypeScript Patterns', slug: 'advanced-typescript-patterns', content: '<p>TypeScript provides powerful type system features...</p>', excerpt: 'Advanced TypeScript', categorySlug: 'javascript', monthsAgo: 2 },
      { title: 'UI Design Principles for Developers', slug: 'ui-design-principles-developers', content: '<p>Good UI design is not just for designers...</p>', excerpt: 'UI Design Principles', categorySlug: 'design', monthsAgo: 2 },
      { title: 'Mastering Flexbox for Modern Layouts', slug: 'mastering-flexbox-modern-layouts', content: '<p>Flexbox is a powerful layout system...</p>', excerpt: 'Master Flexbox', categorySlug: 'css', monthsAgo: 3 },
      { title: 'Docker for Beginners', slug: 'docker-beginners-containerization-basics', content: '<p>Docker has revolutionized how we deploy applications...</p>', excerpt: 'Get started with Docker', categorySlug: 'development', monthsAgo: 3 },
      { title: 'Introduction to PostgreSQL', slug: 'introduction-to-postgresql', content: '<p>PostgreSQL is a powerful, open-source relational database...</p>', excerpt: 'Learn PostgreSQL', categorySlug: 'development', monthsAgo: 4 },
      { title: 'Web Security Best Practices', slug: 'web-security-best-practices', content: '<p>Security should never be an afterthought...</p>', excerpt: 'Security best practices', categorySlug: 'development', monthsAgo: 4 },
      { title: 'Async/Await in JavaScript', slug: 'async-await-javascript', content: '<p>Async/await has made asynchronous programming...</p>', excerpt: 'Async/await guide', categorySlug: 'javascript', monthsAgo: 5 },
      { title: 'Responsive Design Patterns', slug: 'responsive-design-patterns', content: '<p>Creating websites that work well on all devices...</p>', excerpt: 'Responsive design', categorySlug: 'design', monthsAgo: 5 },
      { title: 'Git Workflow Strategies', slug: 'git-workflow-strategies', content: '<p>Choosing the right Git workflow...</p>', excerpt: 'Git workflows', categorySlug: 'development', monthsAgo: 6 },
      { title: 'Node.js Performance Optimization', slug: 'nodejs-performance-optimization', content: '<p>Performance optimization is crucial...</p>', excerpt: 'Node.js optimization', categorySlug: 'development', monthsAgo: 7 },
      { title: 'Color Theory for Web Designers', slug: 'color-theory-web-designers', content: '<p>Understanding color theory...</p>', excerpt: 'Color theory basics', categorySlug: 'design', monthsAgo: 8 },
      { title: 'Modern CSS Features', slug: 'modern-css-features', content: '<p>CSS has evolved significantly...</p>', excerpt: 'Modern CSS', categorySlug: 'css', monthsAgo: 8 },
      { title: 'React Server Components', slug: 'react-server-components', content: '<p>React Server Components are changing...</p>', excerpt: 'Server Components', categorySlug: 'javascript', monthsAgo: 9 },
      { title: 'Database Indexing Strategies', slug: 'database-indexing-strategies', content: '<p>Proper indexing is crucial...</p>', excerpt: 'Database indexing', categorySlug: 'development', monthsAgo: 10 },
      { title: 'Accessibility in Web Design', slug: 'accessibility-web-design', content: '<p>Web accessibility is essential...</p>', excerpt: 'Web accessibility', categorySlug: 'design', monthsAgo: 10 },
      { title: 'JavaScript ES2024 Features', slug: 'javascript-es2024-features', content: '<p>ES2024 brings exciting new features...</p>', excerpt: 'ES2024 features', categorySlug: 'javascript', monthsAgo: 11 },
      { title: 'Building RESTful APIs', slug: 'building-restful-apis', content: '<p>RESTful API design principles...</p>', excerpt: 'RESTful APIs', categorySlug: 'development', monthsAgo: 11 },
    ];

    const tagIds = getTagIds();

    for (const [index, postData] of postsData.entries()) {
      const createdAt = getDateMonthsAgo(postData.monthsAgo);
      const viewCount = Math.floor(Math.random() * 400) + 100;
      const featuredImageId = imageIds.length ? imageIds[index % imageIds.length] : null;

      await insertWithIgnore(posts, {
        title: postData.title,
        slug: postData.slug,
        content: postData.content,
        excerpt: postData.excerpt,
        featuredImageId,
        authorId: adminId,
        categoryId: getCategoryId(postData.categorySlug),
        status: 'PUBLISHED',
        viewCount,
        commentCount: 0,
        publishedAt: createdAt,
        createdAt,
        updatedAt: createdAt,
      });

      const [post] = await db.select({ id: posts.id }).from(posts).where(eq(posts.slug, postData.slug)).limit(1);

      if (post) {
        const numTags = Math.floor(Math.random() * 3) + 2;
        const shuffledTags = [...tagIds].sort(() => 0.5 - Math.random()).slice(0, numTags);

        for (const tagId of shuffledTags) {
          await insertWithIgnore(postTags, {
            postId: post.id,
            tagId,
          });
        }

        stats.posts++;
      }
    }
    console.log(`✅ ${stats.posts} posts created\n`);

    // ============================================
    // 8. COMMENTS
    // ============================================
    console.log('💬 Creating comments...');
    const allPosts = await db.select({ id: posts.id }).from(posts);
    const commentTexts = [
      'Great article! Really helped me understand this topic.',
      'Thanks for sharing this. Very informative.',
      'This is exactly what I was looking for.',
      'Could you elaborate more on the advanced topics?',
      'Well written and easy to follow.',
      'I learned a lot from this. Thanks!',
      'Nice explanation of the concepts.',
      'This clarified many doubts I had.',
    ];
    
    for (const post of allPosts.slice(0, 10)) { // Add comments to first 10 posts
      const numComments = Math.floor(Math.random() * 4) + 1; // 1-4 comments per post
      
      for (let i = 0; i < numComments; i++) {
        await db.insert(comments).values({
          postId: post.id,
          parentId: null,
          authorName: `User ${i + 1}`,
          authorEmail: `user${i + 1}@example.com`,
          content: commentTexts[Math.floor(Math.random() * commentTexts.length)],
          status: 'APPROVED',
          createdAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000), // Last 60 days
        });
        stats.comments++;
      }
      
      // Update post comment count
      await db.update(posts).set({ 
        commentCount: numComments 
      }).where(eq(posts.id, post.id));
    }
    console.log(`✅ ${stats.comments} comments created\n`);

    // ============================================
    // 9. SUBSCRIBERS
    // ============================================
    console.log('📧 Creating subscribers...');
    const subscriberEmails = [
      'john@example.com', 'jane@example.com', 'bob@example.com',
      'alice@example.com', 'charlie@example.com', 'diana@example.com',
      'eve@example.com', 'frank@example.com', 'grace@example.com',
      'henry@example.com'
    ];
    
    for (const email of subscriberEmails) {
      await insertWithIgnore(subscribers, {
        email: email,
        name: email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1),
        status: Math.random() > 0.2 ? 'ACTIVE' : 'PENDING',
        createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
      });
      stats.subscribers++;
    }
    console.log(`✅ ${stats.subscribers} subscribers created\n`);

    // ============================================
    // 10. ACTIVITIES
    // ============================================
    console.log('📊 Creating activities...');
    const activityTypes = [
      'POST_CREATED', 'POST_PUBLISHED', 'POST_UPDATED',
      'CATEGORY_CREATED', 'TAG_CREATED',
      'IMAGE_UPLOADED', 'VIDEO_UPLOADED',
      'LOGIN', 'SETTINGS_UPDATED'
    ];
    
    const activityDescriptions = [
      'Created a new post', 'Published post', 'Updated post content',
      'Added new category', 'Created new tag',
      'Uploaded image', 'Uploaded video',
      'Logged in', 'Updated site settings'
    ];
    
    for (let i = 0; i < 36; i++) {
      const typeIndex = Math.floor(Math.random() * activityTypes.length);
      await db.insert(activities).values({
        userId: adminId,
        type: activityTypes[typeIndex],
        description: activityDescriptions[typeIndex],
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      });
      stats.activities++;
    }
    console.log(`✅ ${stats.activities} activities created\n`);

    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n' + '='.repeat(50));
    console.log('✨ SEED COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(50));
    console.log(`\n📊 Summary:`);
    console.log(`  👤 Users: ${stats.users}`);
    console.log(`  📁 Categories: ${stats.categories}`);
    console.log(`  🏷️  Tags: ${stats.tags}`);
    console.log(`  ⚙️  Settings: ${stats.settings}`);
    console.log(`  📝 Posts: ${stats.posts}`);
    console.log(`  🖼️  Images: ${stats.images}`);
    console.log(`  🎥 Videos: ${stats.videos}`);
    console.log(`  💬 Comments: ${stats.comments}`);
    console.log(`  📧 Subscribers: ${stats.subscribers}`);
    console.log(`  📈 Activities: ${stats.activities}`);
    console.log(`\n⏱️  Duration: ${duration}s`);
    console.log('\n🔑 Login credentials:');
    console.log('   Email: admin@example.com');
    console.log('   Password: Admin@123');
    console.log('='.repeat(50) + '\n');

  } catch (error) {
    console.error('\n❌ SEED FAILED:');
    console.error(error);
    process.exit(1);
  }
}

/**
 * Seed demo data programmatically (used by setup wizard)
 * @param {Object} options
 * @param {boolean} options.skipAdmin - Skip creating admin user (already created by setup)
 * @param {boolean} options.includeMedia - Include images and videos
 */
export async function seedDemoData(options = {}) {
  const { skipAdmin = false, includeMedia = false } = options;

  console.log('🌱 Seeding demo data...\n');
  const startTime = Date.now();

  // Dynamic imports
  const { db, users, categories, tags, settings, posts, postTags, comments, mediaItems, subscribers, activities } = await import('../src/db/index.js');
  const { eq, sql } = await import('drizzle-orm');
  const { default: bcrypt } = await import('bcryptjs');

  const dialect = process.env.DATABASE_URL?.startsWith('mysql') ? 'mysql' : 'postgres';

  const insertWithIgnore = (table, values) => {
    if (dialect === 'mysql') {
      return db.insert(table).values(values);
    }
    return db.insert(table).values(values).onConflictDoNothing();
  };

  // Get or create admin user
  let adminId;
  if (!skipAdmin) {
    console.log('👤 Creating admin user...');
    const adminPassword = await bcrypt.hash('Admin@123', 10);
    await insertWithIgnore(users, {
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@example.com',
      password: adminPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
    });
    adminId = (await db.select().from(users).where(eq(users.email, 'admin@example.com')).limit(1))[0]?.id;
    console.log('✅ Admin user created\n');
  } else {
    // Get existing admin
    const [admin] = await db.select().from(users).where(eq(users.role, 'ADMIN')).limit(1);
    adminId = admin?.id;
    console.log('👤 Using existing admin user\n');
  }

  // Seed categories
  console.log('📁 Creating categories...');
  const categoryData = [
    { name: 'Development', slug: 'development', description: 'Software development articles' },
    { name: 'Design', slug: 'design', description: 'Design tips and inspiration' },
    { name: 'CSS', slug: 'css', description: 'CSS tutorials and techniques' },
    { name: 'JavaScript', slug: 'javascript', description: 'JavaScript and Node.js content' },
    { name: 'Tutorials', slug: 'tutorials', description: 'Step-by-step guides' },
    { name: 'News', slug: 'news', description: 'Industry news and updates' },
  ];

  for (const cat of categoryData) {
    await insertWithIgnore(categories, cat);
  }
  const allCategories = await db.select().from(categories);
  console.log(`✅ ${allCategories.length} categories created\n`);

  // Seed tags
  console.log('🏷️  Creating tags...');
  const tagData = [
    { name: 'Tutorial', slug: 'tutorial' },
    { name: 'Best Practices', slug: 'best-practices' },
    { name: 'Tips & Tricks', slug: 'tips-tricks' },
    { name: 'Beginner', slug: 'beginner' },
    { name: 'Advanced', slug: 'advanced' },
    { name: 'Performance', slug: 'performance' },
    { name: 'Security', slug: 'security' },
    { name: 'Tools', slug: 'tools' },
  ];

  for (const tag of tagData) {
    await insertWithIgnore(tags, tag);
  }
  const allTags = await db.select().from(tags);
  console.log(`✅ ${allTags.length} tags created\n`);

  // Seed settings
  console.log('⚙️  Creating settings...');
  const settingData = [
    { key: 'siteName', value: 'My Blog', group: 'GENERAL', type: 'STRING' },
    { key: 'siteTagline', value: 'A modern blog built with Fastify', group: 'GENERAL', type: 'STRING' },
    { key: 'siteUrl', value: process.env.APP_URL || 'http://localhost:3000', group: 'GENERAL', type: 'STRING' },
    { key: 'timezone', value: 'UTC', group: 'GENERAL', type: 'STRING' },
    { key: 'postsPerPage', value: '10', group: 'CONTENT', type: 'NUMBER' },
  ];

  for (const setting of settingData) {
    await insertWithIgnore(settings, setting);
  }
  console.log(`✅ ${settingData.length} settings created\n`);

  // Seed sample posts
  console.log('📝 Creating sample posts...');
  const samplePosts = [
    {
      title: 'Welcome to Your New Blog',
      slug: 'welcome-to-your-new-blog',
      excerpt: 'This is your first blog post. Edit or delete it to get started!',
      content: '<p>Welcome to your new blog! This is a sample post to help you get started.</p><p>You can create, edit, and manage posts from the admin dashboard.</p>',
      status: 'PUBLISHED',
      categoryId: allCategories[0]?.id,
      tagIds: [allTags[0]?.id, allTags[1]?.id],
    },
    {
      title: 'Getting Started with Fastify',
      slug: 'getting-started-with-fastify',
      excerpt: 'Learn how to build high-performance web applications with Fastify.',
      content: '<p>Fastify is a fast and low overhead web framework for Node.js.</p><p>In this post, we\'ll explore the basics of building applications with Fastify.</p>',
      status: 'PUBLISHED',
      categoryId: allCategories[3]?.id,
      tagIds: [allTags[0]?.id, allTags[3]?.id],
    },
    {
      title: 'CSS Best Practices',
      slug: 'css-best-practices',
      excerpt: 'Tips and tricks for writing maintainable CSS.',
      content: '<p>Writing clean, maintainable CSS is essential for any web project.</p><p>Here are some best practices to follow.</p>',
      status: 'PUBLISHED',
      categoryId: allCategories[2]?.id,
      tagIds: [allTags[1]?.id, allTags[2]?.id],
    },
  ];

  for (const postData of samplePosts) {
    const { tagIds, ...post } = postData;
    const [inserted] = await db.insert(posts).values({
      ...post,
      authorId: adminId,
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Add post tags
    if (tagIds) {
      for (const tagId of tagIds) {
        if (tagId) {
          await db.insert(postTags).values({
            postId: inserted.insertId || inserted[0]?.insertId,
            tagId,
          });
        }
      }
    }
  }
  console.log(`✅ ${samplePosts.length} sample posts created\n`);

  // Seed subscribers
  console.log('📧 Creating subscribers...');
  const subscriberEmails = ['john@example.com', 'jane@example.com', 'bob@example.com'];
  for (const email of subscriberEmails) {
    await insertWithIgnore(subscribers, {
      email,
      status: 'ACTIVE',
      createdAt: new Date(),
    });
  }
  console.log(`✅ ${subscriberEmails.length} subscribers created\n`);

  // Summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\n✨ Demo data seeded successfully!');
  console.log(`⏱️  Duration: ${duration}s\n`);

  return { success: true, duration };
}

// Run seed if called directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  seed();
}
