// src/admin/templates/pages/posts/index.js
// Barrel export for posts module

export {
  postsListContent,
  postsListModals,
  postsListMeta,
  postsTableFragment,
} from './list.js';
export { postNewContent, postNewMeta } from './new.js';
export { postEditContent, postEditMeta } from './edit.js';
export { postCommentsContent, postCommentsModals, postCommentsMeta, renderCommentPartial } from './comments.js';
