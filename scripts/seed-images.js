// scripts/seed-images.js - Seed 14 images using existing files
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join, basename } from 'path';
import { existsSync, copyFileSync, mkdirSync } from 'fs';
import sharp from 'sharp';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '..', '.env.development') });

const IMAGES_DIR = join(__dirname, '..', 'public', 'uploads', 'images');
const THUMBS_DIR = join(__dirname, '..', 'public', 'uploads', 'images', 'thumbs');

// Real images to use (will be rotated to create 14 entries)
const SOURCE_IMAGES = [
  {
    filename: 'pexels-eberhardgross-443446.jpg',
    tag: 'Nature'
  },
  {
    filename: 'pexels-fidan-nazim-qizi-134456769-35160132.jpg',
    tag: 'Travel'
  },
  {
    filename: 'pexels-pixabay-268533.jpg',
    tag: 'Nature'
  },
  {
    filename: 'pexels-quang-nguyen-vinh-222549-2563129.jpg',
    tag: 'Urban'
  },
  {
    filename: 'pexels-robshumski-1903702.jpg',
    tag: 'Travel'
  }
];

// 14 different image titles/descriptions
const IMAGE_DATA = [
  { title: 'Mountain Landscape', tag: 'Nature', altText: 'Beautiful mountain view' },
  { title: 'Sunset Beach', tag: 'Travel', altText: 'Golden sunset over beach' },
  { title: 'Forest Path', tag: 'Nature', altText: 'Green forest trail' },
  { title: 'City Skyline', tag: 'Urban', altText: 'City lights at night' },
  { title: 'Ocean View', tag: 'Travel', altText: 'Crystal clear ocean' },
  { title: 'Desert Dunes', tag: 'Travel', altText: 'Golden sand dunes' },
  { title: 'Tech Setup', tag: 'Technology', altText: 'Computer setup' },
  { title: 'Coffee Break', tag: 'Lifestyle', altText: 'Morning coffee' },
  { title: 'Food Photography', tag: 'Food', altText: 'Delicious meal' },
  { title: 'Abstract Art', tag: 'Art', altText: 'Colorful abstract' },
  { title: 'Winter Snow', tag: 'Nature', altText: 'Snowy landscape' },
  { title: 'Flower Garden', tag: 'Nature', altText: 'Colorful flowers' },
  { title: 'Business Meeting', tag: 'Business', altText: 'Team meeting' },
  { title: 'Featured Post', tag: 'Featured', altText: 'Featured post image' }
];

async function generateThumbnail(sourcePath, outputPath) {
  try {
    await sharp(sourcePath)
      .resize(200, 200, { fit: 'cover' })
      .toFile(outputPath);
    return true;
  } catch (error) {
    console.error(`Failed to generate thumbnail for ${basename(sourcePath)}:`, error.message);
    return false;
  }
}

async function seed() {
  console.log('🌱 Seeding images database...\n');
  
  try {
    // Dynamic imports after env is loaded
    const { db, mediaItems, users } = await import('../src/db/index.js');
    const { eq } = await import('drizzle-orm');
    
    // Ensure thumbs directory exists
    if (!existsSync(THUMBS_DIR)) {
      mkdirSync(THUMBS_DIR, { recursive: true });
    }
    
    // Get admin user ID
    console.log('Finding admin user...');
    const adminUser = await db.select().from(users).where(eq(users.email, 'admin@example.com')).limit(1);
    
    if (!adminUser || adminUser.length === 0) {
      console.error('❌ Admin user not found. Please run seed-simple.js first.');
      process.exit(1);
    }
    
    const adminId = adminUser[0].id;
    console.log(`✅ Found admin user: ${adminId}\n`);
    
    // Check which source images exist
    const availableSources = SOURCE_IMAGES.filter(img => 
      existsSync(join(IMAGES_DIR, img.filename))
    );
    
    if (availableSources.length === 0) {
      console.error('❌ No source images found in', IMAGES_DIR);
      process.exit(1);
    }
    
    console.log(`Found ${availableSources.length} source images to use\n`);
    
    // Create 14 images by rotating through available sources
    const createdImages = [];
    
    for (let i = 0; i < 14; i++) {
      const imageInfo = IMAGE_DATA[i];
      const sourceImage = availableSources[i % availableSources.length];
      
      // Generate unique filename
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      const ext = sourceImage.filename.split('.').pop();
      const newFilename = `image-${timestamp}-${random}.${ext}`;
      const thumbFilename = `thumb-${newFilename}`;
      
      // Copy source image with new name
      const sourcePath = join(IMAGES_DIR, sourceImage.filename);
      const targetPath = join(IMAGES_DIR, newFilename);
      const thumbPath = join(THUMBS_DIR, thumbFilename);
      
      try {
        copyFileSync(sourcePath, targetPath);
        console.log(`📁 Copied: ${newFilename}`);
        
        // Generate thumbnail
        const thumbnailSuccess = await generateThumbnail(targetPath, thumbPath);
        if (thumbnailSuccess) {
          console.log(`🖼️  Thumbnail: ${thumbFilename}`);
        }
        
        // Get image dimensions using Sharp
        let width, height;
        try {
          const metadata = await sharp(targetPath).metadata();
          width = metadata.width;
          height = metadata.height;
        } catch (e) {
          width = null;
          height = null;
        }
        
        // Insert into database
        const mediaId = crypto.randomUUID();
        await db.insert(mediaItems).values({
          id: mediaId,
          type: 'IMAGE',
          filename: newFilename,
          originalName: imageInfo.title,
          mimeType: ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png',
          size: 0, // Will be calculated
          width,
          height,
          altText: imageInfo.altText,
          title: imageInfo.title,
          tag: imageInfo.tag,
          path: `/public/uploads/images/${newFilename}`,
          thumbnailPath: `/public/uploads/images/thumbs/${thumbFilename}`,
          uploadedBy: adminId,
        });

        const [imageRecord] = await db
          .select()
          .from(mediaItems)
          .where(eq(mediaItems.id, mediaId))
          .limit(1);
        
        createdImages.push(imageRecord);
        console.log(`✅ Seeded: ${imageInfo.title}\n`);
        
      } catch (error) {
        console.error(`❌ Failed to process ${imageInfo.title}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Successfully seeded ${createdImages.length} images!`);
    console.log('\nImages created:');
    createdImages.forEach((img, idx) => {
      console.log(`  ${idx + 1}. ${img.title} (${img.tag})`);
    });
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
  
  process.exit(0);
}

seed();
