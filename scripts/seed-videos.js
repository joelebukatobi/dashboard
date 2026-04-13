// scripts/seed-videos.js - Seed 8 videos using existing source file with real metadata
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join, basename } from 'path';
import { existsSync, copyFileSync, mkdirSync } from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '..', '.env.development') });

const VIDEOS_DIR = join(__dirname, '..', 'public', 'uploads', 'videos');
const THUMBS_DIR = join(VIDEOS_DIR, 'thumbs');

// Source video file
const SOURCE_VIDEO = join(VIDEOS_DIR, 'seeder-video.mp4');

// 8 different video titles/descriptions
const VIDEO_DATA = [
  { title: 'Product Demo', tag: 'Tutorial', altText: 'Product demonstration video' },
  { title: 'Getting Started Guide', tag: 'Tutorial', altText: 'Quick start tutorial' },
  { title: 'Nature Documentary', tag: 'Nature', altText: 'Wildlife footage' },
  { title: 'Conference Talk 2024', tag: 'Event', altText: 'Tech presentation' },
  { title: 'Marketing Promo', tag: 'Marketing', altText: 'Brand promotion' },
  { title: 'CEO Interview', tag: 'Interview', altText: 'Leadership interview' },
  { title: 'Coding Tutorial', tag: 'Education', altText: 'Programming guide' },
  { title: 'Behind the Scenes', tag: 'Lifestyle', altText: 'Making of video' }
];

/**
 * Get video metadata using FFmpeg
 * @param {string} videoPath - Path to video file
 * @returns {Promise<Object>} - { duration, width, height, size }
 */
async function getVideoMetadata(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }

      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      const stats = existsSync(videoPath) ? { size: 0 } : { size: 0 };
      
      resolve({
        duration: Math.round(metadata.format.duration || 0),
        width: videoStream?.width || 0,
        height: videoStream?.height || 0,
        size: metadata.format.size || 0
      });
    });
  });
}

/**
 * Generate video thumbnail using FFmpeg
 * @param {string} videoPath - Path to video file
 * @param {string} outputPath - Path for thumbnail output
 * @returns {Promise<boolean>}
 */
async function generateThumbnail(videoPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .screenshots({
        timestamps: ['1'], // Extract frame at 1 second
        filename: basename(outputPath),
        folder: dirname(outputPath),
        size: '400x400'
      })
      .on('end', () => resolve(true))
      .on('error', (err) => {
        console.error(`Thumbnail error: ${err.message}`);
        resolve(false);
      });
  });
}

/**
 * Format duration for display (seconds to MM:SS)
 * @param {number} seconds - Duration in seconds
 * @returns {string} - Formatted duration
 */
function formatDuration(seconds) {
  if (!seconds || seconds === 0) return '00:00';
  
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

async function seed() {
  console.log('🌱 Seeding videos database...\n');
  
  try {
    // Dynamic imports after env is loaded
    const { db, mediaItems, users } = await import('../src/db/index.js');
    const { eq } = await import('drizzle-orm');
    
    // Ensure directories exist
    if (!existsSync(THUMBS_DIR)) {
      mkdirSync(THUMBS_DIR, { recursive: true });
    }
    
    // Check if source video exists
    if (!existsSync(SOURCE_VIDEO)) {
      console.error('❌ Source video not found:', SOURCE_VIDEO);
      console.log('Please place a video file named "seeder-video.mp4" in public/uploads/videos/');
      process.exit(1);
    }
    
    // Get source video metadata (REAL data!)
    console.log('📊 Analyzing source video...');
    const sourceMetadata = await getVideoMetadata(SOURCE_VIDEO);
    console.log(`   Duration: ${formatDuration(sourceMetadata.duration)}`);
    console.log(`   Dimensions: ${sourceMetadata.width}x${sourceMetadata.height}`);
    console.log(`   Size: ${(sourceMetadata.size / 1024 / 1024).toFixed(2)} MB\n`);
    
    // Find admin user
    console.log('Finding admin user...');
    const [adminUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, 'admin@example.com'))
      .limit(1);
    
    if (!adminUser) {
      console.error('❌ Admin user not found. Please run seed.js first.');
      process.exit(1);
    }
    
    console.log(`✅ Found admin user: ${adminUser.id}\n`);
    
    // Seed videos
    console.log(`Creating ${VIDEO_DATA.length} video entries...\n`);
    
    for (let i = 0; i < VIDEO_DATA.length; i++) {
      const data = VIDEO_DATA[i];
      
      // Generate unique filename
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      const filename = `video-${timestamp}-${random}.mp4`;
      const videoPath = join(VIDEOS_DIR, filename);
      
      // Copy source video
      console.log(`📁 Copying: ${filename}`);
      copyFileSync(SOURCE_VIDEO, videoPath);
      
      // Generate thumbnail
      const thumbFilename = `thumb-${timestamp}-${random}.jpg`;
      const thumbPath = join(THUMBS_DIR, thumbFilename);
      
      console.log(`🎬 Generating thumbnail: ${thumbFilename}`);
      const thumbnailSuccess = await generateThumbnail(videoPath, thumbPath);
      
      if (!thumbnailSuccess) {
        console.warn(`   ⚠️  Failed to generate thumbnail for ${filename}`);
      }
      
      // Insert into database with REAL metadata
      const mediaId = crypto.randomUUID();
      await db
        .insert(mediaItems)
        .values({
          id: mediaId,
          type: 'VIDEO',
          filename,
          originalName: data.title.replace(/\s+/g, '-').toLowerCase() + '.mp4',
          mimeType: 'video/mp4',
          size: sourceMetadata.size,
          width: sourceMetadata.width,
          height: sourceMetadata.height,
          duration: sourceMetadata.duration,
          title: data.title,
          altText: data.altText,
          tag: data.tag,
          path: `/public/uploads/videos/${filename}`,
          thumbnailPath: thumbnailSuccess ? `/public/uploads/videos/thumbs/${thumbFilename}` : null,
          uploadedBy: adminUser.id,
        });

      await db
        .select({ id: mediaItems.id })
        .from(mediaItems)
        .where(eq(mediaItems.id, mediaId))
        .limit(1);
      
      console.log(`✅ Seeded: ${data.title} (${formatDuration(sourceMetadata.duration)})`);
    }
    
    console.log('\n🎉 Successfully seeded videos!');
    console.log(`\nVideos created: ${VIDEO_DATA.length}`);
    console.log(`All videos have duration: ${formatDuration(sourceMetadata.duration)}`);
    console.log(`All videos are ${sourceMetadata.width}x${sourceMetadata.height}`);
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

seed();
