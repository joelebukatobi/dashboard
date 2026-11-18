// scripts/seed-more-media.js
// Bulk test media for local development: extra images and videos, most of
// them in the first album, so the media lists, their pagination and the album
// page can be tried with a realistic amount of content.
//
//   npm run db:seed:media                 # 40 images, 24 videos
//   npm run db:seed:media -- 100 50       # 100 images, 50 videos
//
// Files are hard links to uploads already in public/uploads (any image there,
// and seeder-video.mp4), named seedmore-*, so they take no extra disk space.
// Images get a 400x300 thumbnail like the main seed. Every fourth image and
// every third video stays out of the album. Run `npm run db:seed` first so
// there is an admin user and some source images.
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync, linkSync, existsSync, mkdirSync } from 'fs';
import crypto from 'crypto';
import sharp from 'sharp';
import { assertLocalDevelopment } from './lib/local-dev-only.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
config({ path: join(root, '.env.development') });
assertLocalDevelopment('db:seed:media');

const IMAGES = Number(process.argv[2] ?? 40);
const VIDEOS = Number(process.argv[3] ?? 24);

const { db, closePool, users, albums, mediaItems } = await import('../src/db/index.js');
const { eq, asc } = await import('drizzle-orm');

try {
  const [admin] = await db.select().from(users).where(eq(users.role, 'ADMIN')).orderBy(asc(users.createdAt)).limit(1);
  if (!admin) throw new Error('No admin user. Run npm run db:seed first.');
  const [album] = await db.select().from(albums).orderBy(asc(albums.createdAt)).limit(1);
  const stamp = Date.now();
  const at = (i) => new Date(stamp - i * 60000);

  const imgDir = join(root, 'public/uploads/images');
  mkdirSync(join(imgDir, 'thumbs'), { recursive: true });
  const sources = readdirSync(imgDir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f) && !f.startsWith('seedmore-'));
  if (IMAGES > 0 && !sources.length) throw new Error('No images in public/uploads/images to copy.');
  const types = { png: 'image/png', webp: 'image/webp' };

  for (let i = 0; i < IMAGES; i++) {
    const src = sources[i % sources.length];
    const ext = src.split('.').pop().toLowerCase();
    const name = `seedmore-${stamp}-${i}.${ext}`;
    linkSync(join(imgDir, src), join(imgDir, name));
    const meta = await sharp(join(imgDir, name)).metadata();
    await sharp(join(imgDir, name)).resize(400, 300, { fit: 'cover' }).jpeg({ quality: 80 }).toFile(join(imgDir, 'thumbs', name));
    await db.insert(mediaItems).values({
      id: crypto.randomUUID(),
      type: 'IMAGE',
      filename: name,
      originalName: src,
      mimeType: types[ext] || 'image/jpeg',
      size: meta.size || 0,
      width: meta.width,
      height: meta.height,
      title: `Test image ${i + 1}`,
      altText: `Test image ${i + 1}`,
      path: `/public/uploads/images/${name}`,
      thumbnailPath: `/public/uploads/images/thumbs/${name}`,
      uploadedBy: admin.id,
      albumId: i % 4 === 3 ? null : album?.id ?? null,
      createdAt: at(i),
      updatedAt: at(i),
    });
  }

  const vidDir = join(root, 'public/uploads/videos');
  const vsrc = 'seeder-video.mp4';
  if (VIDEOS > 0 && !existsSync(join(vidDir, vsrc))) throw new Error(`No ${vsrc} in public/uploads/videos to copy.`);
  const vthumb = existsSync(join(vidDir, 'thumbs/thumb-seeder-video.jpg')) ? 'thumb-seeder-video.jpg' : null;

  for (let i = 0; i < VIDEOS; i++) {
    const name = `seedmore-${stamp}-${i}.mp4`;
    linkSync(join(vidDir, vsrc), join(vidDir, name));
    const thumb = vthumb ? `thumb-${name.replace('.mp4', '.jpg')}` : null;
    if (thumb) linkSync(join(vidDir, 'thumbs', vthumb), join(vidDir, 'thumbs', thumb));
    await db.insert(mediaItems).values({
      id: crypto.randomUUID(),
      type: 'VIDEO',
      filename: name,
      originalName: vsrc,
      mimeType: 'video/mp4',
      size: 4027752,
      duration: 30,
      title: `Test video ${i + 1}`,
      path: `/public/uploads/videos/${name}`,
      thumbnailPath: thumb ? `/public/uploads/videos/thumbs/${thumb}` : null,
      uploadedBy: admin.id,
      albumId: i % 3 === 2 ? null : album?.id ?? null,
      createdAt: at(i),
      updatedAt: at(i),
    });
  }

  console.log(`Added ${IMAGES} images and ${VIDEOS} videos${album ? ` (most in album "${album.title}")` : ''}.`);
} finally {
  await closePool();
}
