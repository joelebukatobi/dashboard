// Script to create the Git SSH post with image
import dotenv from 'dotenv';
dotenv.config({ path: '.env.development' });
import { db, posts, mediaItems, categories, tags, postTags, users } from '../src/db/index.js';
import { eq, and } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createGitSSHPost() {
  try {
    // First, let's find or create the category
    let category = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, 'web-dev'))
      .limit(1);

    let categoryId;
    if (category.length === 0) {
      // Create the category
      const newCategoryId = crypto.randomUUID();
      await db
        .insert(categories)
        .values({
          id: newCategoryId,
          title: 'Web Dev',
          slug: 'web-dev',
          description: 'Your go-to destination for all things related to web development, where you\'ll find a plethora of information and resources to help you on your journey to building better websites and web applications.',
        });
      const [newCategory] = await db.select().from(categories).where(eq(categories.id, newCategoryId)).limit(1);
      categoryId = newCategory.id;
      console.log('Created category:', newCategory.title);
    } else {
      categoryId = category[0].id;
      console.log('Using existing category:', category[0].title);
    }

    // Find or create tags
    const tagNames = [
      { name: 'web dev', slug: 'web-dev' },
      { name: 'GitHub', slug: 'github' }
    ];
    const tagIds = [];

    for (const tagData of tagNames) {
      let tag = await db
        .select()
        .from(tags)
        .where(eq(tags.slug, tagData.slug))
        .limit(1);

        if (tag.length === 0) {
        const newTagId = crypto.randomUUID();
        await db
          .insert(tags)
          .values({
            id: newTagId,
            name: tagData.name,
            slug: tagData.slug,
          });
        const [newTag] = await db.select().from(tags).where(eq(tags.id, newTagId)).limit(1);
        tagIds.push(newTag.id);
        console.log('Created tag:', newTag.name);
      } else {
        tagIds.push(tag[0].id);
        console.log('Using existing tag:', tag[0].name);
      }
    }

    // Check if post already exists
    const existingPost = await db
      .select()
      .from(posts)
      .where(eq(posts.slug, 'git-workflow-connecting-through-ssh'))
      .limit(1);

    if (existingPost.length > 0) {
      console.log('Post already exists!');
      return;
    }

    // Get the first admin user as author
    const adminUser = await db
      .select({ id: users.id })
      .from(users)
      .limit(1);

    if (adminUser.length === 0) {
      console.log('No user found! Please create a user first.');
      return;
    }

    const authorId = adminUser[0].id;

    // Create the media item for the image
    // The image is saved at /public/uploads/posts/git-ssh-terminal.jpg
    const imageFilename = 'git-ssh-terminal.jpg';
    const imagePath = `/public/uploads/posts/${imageFilename}`;
    const imageFullPath = path.join(process.cwd(), 'public', 'uploads', 'posts', imageFilename);

    // Get file size
    let fileSize = 0;
    try {
      const stats = fs.statSync(imageFullPath);
      fileSize = stats.size;
    } catch (e) {
      console.log('Warning: Could not read image file size');
    }

    const mediaItemId = crypto.randomUUID();
    await db
      .insert(mediaItems)
      .values({
        id: mediaItemId,
        filename: imageFilename,
        originalName: 'git-ssh-terminal.jpg',
        mimeType: 'image/jpeg',
        size: fileSize,
        path: imagePath,
        type: 'IMAGE',
        uploadedBy: authorId,
      });

    const [mediaItem] = await db.select().from(mediaItems).where(eq(mediaItems.id, mediaItemId)).limit(1);

    console.log('Created media item:', mediaItem.id);

    // Create the post
    const postId = crypto.randomUUID();
    await db
      .insert(posts)
      .values({
        id: postId,
        title: 'Git Workflow: Connecting Through SSH',
        slug: 'git-workflow-connecting-through-ssh',
        content: `<p>So if you're like me chances are you've tried to set up a repository on GitHub once or twice and you must have encountered a number of issues. One such issue is GitHub asking for a username and password for every commit you make, this slows down workflow and can be really frustrating.</p><p><br></p><p>The reason this happens is that a lot of users interact with online repositories over the terminal using HTTP URLs which in itself is an awesome standard because it's straightforward and just works, However like every other thing there's always a "but"&nbsp;and in this case, it involves GitHub requesting for your login details for every push or pull request which can become frustrating over time.</p><p><br></p><p><img src="${imagePath}" alt="Git SSH Terminal"></p>`,
        excerpt: "So if you're like me chances are you've tried to set up a repository on GitHub once or twice and you must have encountered a number of issues. One such issue is GitHub asking for a username and password for every commit you make, this slows down workflow and can be really frustrating.",
        categoryId: categoryId,
        authorId: authorId,
        status: 'PUBLISHED',
        featuredImageId: mediaItem.id,
        viewCount: 0,
        publishedAt: new Date(),
      });

    const [post] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);

    console.log('Created post:', post.title);

    // Add tags to post
    for (const tagId of tagIds) {
      await db
        .insert(postTags)
        .values({
          postId: post.id,
          tagId: tagId,
        });
    }
    console.log('Added tags to post');

    console.log('\n✅ Post created successfully!');
    console.log('Post ID:', post.id);
    console.log('Slug:', post.slug);

  } catch (error) {
    console.error('Error creating post:', error);
  } finally {
    process.exit(0);
  }
}

createGitSSHPost();
