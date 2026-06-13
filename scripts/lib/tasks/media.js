import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import sharp from 'sharp';
import { eq } from 'drizzle-orm';
import { ensureDatabaseUrl } from '../../../env.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = join(__dirname, '../../../public/uploads/images');
const THUMBS_DIR = join(IMAGES_DIR, 'thumbs');

const SOURCE_FILES = new Set([
  'pexels-eberhardgross-443446.jpg',
  'pexels-fidan-nazim-qizi-134456769-35160132.jpg',
  'pexels-pixabay-268533.jpg',
  'pexels-quang-nguyen-vinh-222549-2563129.jpg',
  'pexels-robshumski-1903702.jpg',
]);

function listImageFiles() {
  return readdirSync(IMAGES_DIR).filter((file) => /\.(jpg|jpeg|png|gif|webp)$/i.test(file));
}

export async function generateThumbnails(args = []) {
  const regenerate = args.includes('--regenerate');

  if (!existsSync(THUMBS_DIR)) {
    mkdirSync(THUMBS_DIR, { recursive: true });
  }

  console.log(`${regenerate ? 'Regenerating' : 'Generating'} image thumbnails...\n`);

  const files = listImageFiles();
  let generated = 0;
  let skipped = 0;

  for (const file of files) {
    const inputPath = join(IMAGES_DIR, file);
    const outputPath = join(THUMBS_DIR, `thumb-${file}`);

    if (!regenerate && existsSync(outputPath)) {
      console.log(`  skip ${file} (exists)`);
      skipped++;
      continue;
    }

    try {
      await sharp(inputPath)
        .resize(400, 300, { fit: 'cover', position: 'center' })
        .jpeg({ quality: 80 })
        .toFile(outputPath);

      console.log(`  ok ${file}`);
      generated++;
    } catch (error) {
      console.error(`  fail ${file}: ${error.message}`);
    }
  }

  console.log(`\nSummary: ${generated} generated, ${skipped} skipped`);
}

export async function clearImages() {
  ensureDatabaseUrl({ scriptName: 'cli media clear' });

  console.log('Clearing images...\n');

  const { db, mediaItems } = await import('../../../src/db/index.js');

  const existing = await db.select({ id: mediaItems.id }).from(mediaItems).where(eq(mediaItems.type, 'IMAGE'));
  await db.delete(mediaItems).where(eq(mediaItems.type, 'IMAGE'));
  console.log(`Deleted ${existing.length} database entries\n`);

  let deletedFiles = 0;
  for (const file of listImageFiles()) {
    if (SOURCE_FILES.has(file)) {
      console.log(`  kept (source): ${file}`);
      continue;
    }

    unlinkSync(join(IMAGES_DIR, file));
    console.log(`  deleted: ${file}`);
    deletedFiles++;
  }

  if (existsSync(THUMBS_DIR)) {
    let deletedThumbs = 0;
    for (const file of readdirSync(THUMBS_DIR).filter((f) => f.startsWith('thumb-'))) {
      unlinkSync(join(THUMBS_DIR, file));
      deletedThumbs++;
    }
    console.log(`\nDeleted ${deletedThumbs} thumbnails`);
  }

  console.log(`\nDeleted ${deletedFiles} image files`);
}

export async function cleanupDuplicates() {
  ensureDatabaseUrl({ scriptName: 'cli media cleanup' });

  const { db, mediaItems } = await import('../../../src/db/index.js');

  const images = await db
    .select({
      id: mediaItems.id,
      filename: mediaItems.filename,
      path: mediaItems.path,
      createdAt: mediaItems.createdAt,
    })
    .from(mediaItems)
    .where(eq(mediaItems.type, 'IMAGE'))
    .orderBy(mediaItems.createdAt);

  console.log(`Found ${images.length} image records`);

  if (images.length <= 2) {
    console.log('Nothing to clean up');
    return;
  }

  const toDelete = images.slice(0, images.length - 2);
  const toKeep = images.slice(images.length - 2);

  console.log('\nKeeping:');
  toKeep.forEach((img) => console.log(`  - ${img.filename}`));

  for (const img of toDelete) {
    await db.delete(mediaItems).where(eq(mediaItems.id, img.id));

    const filePath = join(process.cwd(), img.path.replace('/public/', 'public/'));
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }

    console.log(`Deleted: ${img.filename}`);
  }

  console.log('\nCleanup complete');
}
