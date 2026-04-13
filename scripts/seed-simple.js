// scripts/seed-simple.js - Simplified seed script with dynamic imports
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '..', '.env.development') });

async function seed() {
  console.log('🌱 Seeding database...\n');
  
  try {
    // Dynamic imports after env is loaded
    const { db, users, categories, tags, settings, posts, activities } = await import('../src/db/index.js');
    const { eq } = await import('drizzle-orm');
    const { default: bcrypt } = await import('bcryptjs');
    
    // Create admin user
    console.log('Creating admin user...');
    const adminPassword = await bcrypt.hash('Admin@123', 10);
    
    const adminIdCandidate = crypto.randomUUID();

    await db.insert(users).values({
      id: adminIdCandidate,
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@example.com',
      password: adminPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
    }).onConflictDoNothing();

    const [adminUser] = await db.select().from(users).where(eq(users.email, 'admin@example.com')).limit(1);
    
    let adminId;
    if (adminUser) {
      adminId = adminUser.id;
      console.log('✅ Admin user created\n');
    } else {
      const existing = await db.select().from(users).where(eq(users.email, 'admin@example.com')).limit(1);
      adminId = existing[0]?.id;
      console.log('✅ Admin user already exists\n');
    }
    
    // Create categories
    console.log('Creating default categories...');
    const categoryColors = [
      'badge--primary', 'badge--purple', 'badge--info', 'badge--warning',
      'badge--success', 'badge--danger', 'badge--pink', 'badge--neutral'
    ];
    
    await db.insert(categories).values([
      { title: 'Development', slug: 'development', description: 'Software development articles', status: 'PUBLISHED', colorClass: categoryColors[0] },
      { title: 'Design', slug: 'design', description: 'UI/UX and graphic design', status: 'PUBLISHED', colorClass: categoryColors[1] },
      { title: 'CSS', slug: 'css', description: 'CSS tutorials and tips', status: 'PUBLISHED', colorClass: categoryColors[2] },
      { title: 'JavaScript', slug: 'javascript', description: 'JavaScript and Node.js', status: 'PUBLISHED', colorClass: categoryColors[3] },
      { title: 'Tutorials', slug: 'tutorials', description: 'Step-by-step guides', status: 'PUBLISHED', colorClass: categoryColors[4] },
      { title: 'News', slug: 'news', description: 'Latest updates and announcements', status: 'PUBLISHED', colorClass: categoryColors[5] },
    ]).onConflictDoNothing();
    console.log('✅ Default categories created\n');
    
    // Create tags
    console.log('Creating default tags...');
    await db.insert(tags).values([
      { name: 'Tutorial', slug: 'tutorial', description: 'How-to guides' },
      { name: 'Best Practices', slug: 'best-practices', description: 'Recommended approaches' },
      { name: 'Tips & Tricks', slug: 'tips-tricks', description: 'Quick helpful tips' },
      { name: 'Beginner', slug: 'beginner', description: 'For beginners' },
      { name: 'Advanced', slug: 'advanced', description: 'Advanced topics' },
      { name: 'Performance', slug: 'performance', description: 'Performance optimization' },
      { name: 'Security', slug: 'security', description: 'Security topics' },
      { name: 'Tools', slug: 'tools', description: 'Development tools' },
    ]).onConflictDoNothing();
    console.log('✅ Default tags created\n');
    
    console.log('🎉 Database seeding completed!');
    console.log('\nDefault admin credentials:');
    console.log('  Email: admin@example.com');
    console.log('  Password: Admin@123');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
  
  process.exit(0);
}

seed();
