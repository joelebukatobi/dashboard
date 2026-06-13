import { ensureDatabaseUrl } from '../../../env.js';
import { eq, sql } from 'drizzle-orm';

export async function resetAdminPassword(args = []) {
  ensureDatabaseUrl({ scriptName: 'cli maintenance reset-password' });

  const email = args.find((a) => a.startsWith('--email='))?.split('=')[1] || 'admin@example.com';
  const password = args.find((a) => a.startsWith('--password='))?.split('=')[1] || 'Admin@123';

  const { db, users } = await import('../../../src/db/index.js');
  const { default: bcrypt } = await import('bcryptjs');

  console.log(`Resetting password for ${email}...\n`);

  const hashed = await bcrypt.hash(password, 10);
  await db.update(users).set({ password: hashed }).where(eq(users.email, email));

  const updated = await db.select({ email: users.email }).from(users).where(eq(users.email, email)).limit(1);

  if (updated.length === 0) {
    throw new Error(`User not found: ${email}`);
  }

  console.log('Password updated successfully');
}

export async function updatePostViews() {
  ensureDatabaseUrl({ scriptName: 'cli maintenance update-views' });

  const { db, posts } = await import('../../../src/db/index.js');

  const allPosts = await db.select({
    id: posts.id,
    title: posts.title,
    viewCount: posts.viewCount,
  }).from(posts);

  console.log(`Updating view counts for ${allPosts.length} posts...\n`);

  for (const post of allPosts) {
    const newViewCount = Math.floor(50 + Math.random() * 100);
    await db.update(posts).set({ viewCount: newViewCount }).where(eq(posts.id, post.id));
    console.log(`  ${post.title.slice(0, 40)}: ${post.viewCount} -> ${newViewCount}`);
  }

  const [{ total }] = await db.select({ total: sql`sum(view_count)` }).from(posts);
  console.log(`\nNew total views: ${total}`);
}

export async function updateCategoryColors() {
  ensureDatabaseUrl({ scriptName: 'cli maintenance update-colors' });

  const { db, categories } = await import('../../../src/db/index.js');

  const colors = [
    'badge--primary', 'badge--purple', 'badge--info', 'badge--warning',
    'badge--success', 'badge--danger', 'badge--pink', 'badge--neutral',
  ];

  const slugs = ['development', 'design', 'css', 'javascript', 'tutorials', 'news'];

  console.log('Updating category colors...\n');

  for (let i = 0; i < slugs.length; i++) {
    const slug = slugs[i];
    const color = colors[i % colors.length];
    await db.update(categories).set({ colorClass: color }).where(eq(categories.slug, slug));
    console.log(`  ${slug} -> ${color}`);
  }

  console.log('\nCategory colors updated');
}
