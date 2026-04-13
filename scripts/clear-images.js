// scripts/clear-images.js - Clear all images from DB and delete created files, keep sources
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync, unlinkSync, existsSync } from 'fs';
import { eq } from 'drizzle-orm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const IMAGES_DIR = join(__dirname, '..', 'public', 'uploads', 'images');
const THUMBS_DIR = join(IMAGES_DIR, 'thumbs');

// Source files to keep (don't delete these)
const SOURCE_FILES = [
  'pexels-eberhardgross-443446.jpg',
  'pexels-fidan-nazim-qizi-134456769-35160132.jpg',
  'pexels-pixabay-268533.jpg',
  'pexels-quang-nguyen-vinh-222549-2563129.jpg',
  'pexels-robshumski-1903702.jpg'
];

async function clearImages() {
  console.log('🧹 Clearing images...\n');
  
  try {
    // Dynamic imports after env is loaded
    const { db, mediaItems } = await import('../src/db/index.js');
    
    // Delete all image entries from database
    console.log('Deleting database entries...');
    const existing = await db
      .select({ id: mediaItems.id })
      .from(mediaItems)
      .where(eq(mediaItems.type, 'IMAGE'));

    await db.delete(mediaItems).where(eq(mediaItems.type, 'IMAGE'));
    console.log(`✅ Deleted ${existing.length} database entries\n`);
    
    // Delete all image files except source files
    console.log('Deleting created image files...');
    const imageFiles = readdirSync(IMAGES_DIR)
      .filter(file => {
        const ext = file.split('.').pop().toLowerCase();
        return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
      });
    
    let deletedFiles = 0;
    for (const file of imageFiles) {
      if (!SOURCE_FILES.includes(file)) {
        const filePath = join(IMAGES_DIR, file);
        try {
          unlinkSync(filePath);
          console.log(`  🗑️  Deleted: ${file}`);
          deletedFiles++;
        } catch (err) {
          console.error(`  ❌ Failed to delete: ${file} - ${err.message}`);
        }
      } else {
        console.log(`  ⏭️  Kept (source): ${file}`);
      }
    }
    console.log(`\n✅ Deleted ${deletedFiles} image files\n`);
    
    // Delete all thumbnails
    console.log('Deleting all thumbnails...');
    if (existsSync(THUMBS_DIR)) {
      const thumbFiles = readdirSync(THUMBS_DIR)
        .filter(file => file.startsWith('thumb-'));
      
      let deletedThumbs = 0;
      for (const file of thumbFiles) {
        const filePath = join(THUMBS_DIR, file);
        try {
          unlinkSync(filePath);
          deletedThumbs++;
        } catch (err) {
          console.error(`  ❌ Failed to delete: ${file} - ${err.message}`);
        }
      }
      console.log(`✅ Deleted ${deletedThumbs} thumbnails\n`);
    }
    
    console.log('🎉 Cleanup complete!');
    console.log('\nRemaining source files:');
    SOURCE_FILES.forEach(file => console.log(`  • ${file}`));
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

clearImages();
