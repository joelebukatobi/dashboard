// Script to fix the Git SSH post - put image back in content
import dotenv from 'dotenv';
dotenv.config({ path: '.env.development' });
import { db, posts } from '../src/db/index.js';
import { eq } from 'drizzle-orm';

async function fixGitSSHPost() {
  try {
    const imagePath = '/public/uploads/posts/git-ssh-terminal.jpg';

    // Update the post - put image in content, remove featured image
    await db
      .update(posts)
      .set({
        content: `<p>So if you're like me chances are you've tried to set up a repository on GitHub once or twice and you must have encountered a number of issues. One such issue is GitHub asking for a username and password for every commit you make, this slows down workflow and can be really frustrating.</p><p><br></p><p>The reason this happens is that a lot of users interact with online repositories over the terminal using HTTP URLs which in itself is an awesome standard because it's straightforward and just works, However like every other thing there's always a "but"&nbsp;and in this case, it involves GitHub requesting for your login details for every push or pull request which can become frustrating over time.</p><p><br></p><p><img src="${imagePath}" alt="Git SSH Terminal"></p>`,
        featuredImageId: null, // Remove featured image
      })
      .where(eq(posts.slug, 'git-workflow-connecting-through-ssh'));

    const [updatedPost] = await db
      .select({ id: posts.id, content: posts.content })
      .from(posts)
      .where(eq(posts.slug, 'git-workflow-connecting-through-ssh'))
      .limit(1);

    if (updatedPost) {
      console.log('✅ Post updated successfully!');
      console.log('Post ID:', updatedPost.id);
      console.log('Image is now embedded in content, not featured image');
    } else {
      console.log('Post not found!');
    }

  } catch (error) {
    console.error('Error updating post:', error);
  } finally {
    process.exit(0);
  }
}

fixGitSSHPost();
