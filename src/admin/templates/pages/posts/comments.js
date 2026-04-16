// src/admin/templates/pages/posts/comments.js
// Post Comments Page - View and manage comments for a post

import { mainLayout } from '../../layouts/main.js';
import { getInitials, formatRelativeTime } from '../../utils/helpers.js';

/**
 * Post Comments Page Template
 * Shows all comments for a specific post with nested replies
 */
export function postCommentsPage({ user, post, comments, pagination, toast }) {
  // Build toast script if toast param is present
  const toastScript = toast ? `
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        const toastMessages = {
          replied: 'Reply posted successfully!',
          deleted: 'Comment deleted successfully!',
          updated: 'Comment updated successfully!',
        };
        const message = toastMessages['${toast}'] || '${toast}';
        document.body.dispatchEvent(new CustomEvent('htmx:toast', {
          detail: { message: message, type: 'success' }
        }));
        // Clean up URL (remove toast param)
        const url = new URL(window.location);
        url.searchParams.delete('toast');
        window.history.replaceState({}, '', url);
      });
    </script>
  ` : '';

  const content = `
    <div class="posts">
      <div class="content">
        <!-- Page Header -->
        <div class="page-header">
          <div class="page-header__left">
            <h1 class="page-header__title">${escapeHtml(post.title)}</h1>
            <p class="page-header__subtitle">Comments (${pagination.total})</p>
          </div>
          <div class="page-header__toast-container"></div>
        </div>

        <div class="form__row">
          <!-- Comments List -->
          <div class="form__col">
            <div class="card">
              <div class="card__header">
                <div class="card__header-group">
                  <div class="card__icon-box card__icon-box--blue">
                    <i data-lucide="message-circle" stroke-width="1"></i>
                  </div>
                  <div class="card__info">
                    <h2 class="card__title">All Comments</h2>
                    <p class="card__subtitle">${pagination.total} total comments</p>
                  </div>
                </div>
              </div>
              <div class="card__body">
                ${comments.length === 0 
                  ? emptyCommentsState()
                  : `
                    <div class="comments-list">
                      ${comments.map(comment => renderComment(comment, user)).join('')}
                    </div>
                    
                    ${paginationHtml(pagination, post.id)}
                  `
                }
               </div>
             </div>
           </div>
         </div>
      </div>
    </div>

    <script>
      // Toggle reply form visibility
      function toggleReplyForm(commentId) {
        const form = document.getElementById('reply-form-' + commentId);
        if (form) {
          form.classList.toggle('hidden');
        }
      }

      // Toggle edit form visibility
      function toggleEditForm(commentId) {
        const form = document.getElementById('edit-form-' + commentId);
        if (form) {
          form.classList.toggle('hidden');
        }
      }

      // Delete Modal Functions
      function openDeleteModal(button) {
        const commentId = button.getAttribute('data-comment-id');
        const authorName = button.getAttribute('data-author-name');
        const modal = document.getElementById('deleteCommentModal');
        const form = document.getElementById('deleteCommentForm');
        const nameElement = document.getElementById('deleteCommentAuthor');

        // Update form action
        const postId = button.closest('[data-post-id]')?.getAttribute('data-post-id');
        form.setAttribute('hx-delete', '/admin/posts/' + postId + '/comments/' + commentId);

        // Set target to the specific comment element (modal is outside content, so can't use 'closest')
        form.setAttribute('hx-target', '#comment-' + commentId);
        form.setAttribute('hx-swap', 'outerHTML swap:300ms');

        // Tell HTMX to re-process the form with the new attributes
        if (typeof htmx !== 'undefined') {
          htmx.process(form);
        }

        // Update name display
        if (nameElement) {
          nameElement.textContent = authorName || 'this comment';
        }

        // Show modal
        modal.classList.remove('hidden');
        requestAnimationFrame(() => {
          document.getElementById('commentModalBackdrop').classList.remove('opacity-0');
        });
      }
      
      function closeDeleteModal() {
        const modal = document.getElementById('deleteCommentModal');
        document.getElementById('commentModalBackdrop').classList.add('opacity-0');
        setTimeout(() => {
          modal.classList.add('hidden');
        }, 200);
      }
      
      // Close modal on backdrop click
      document.addEventListener('DOMContentLoaded', function() {
        const modal = document.getElementById('deleteCommentModal');
        if (modal) {
          modal.addEventListener('click', function(e) {
            if (e.target === this || e.target.id === 'commentModalBackdrop') {
              closeDeleteModal();
            }
          });
        }
      });
      
      // Close modal on escape key
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
          closeDeleteModal();
        }
      });
    </script>
  `;

  // Delete Modal
  const modal = `
    <!-- Delete Confirmation Modal -->
    <div
      id="deleteCommentModal"
      class="hs-overlay hidden z-[100]"
      role="dialog"
      tabindex="-1"
      aria-labelledby="deleteCommentModalLabel"
    >
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black/50 transition-opacity opacity-0 z-[100]" id="commentModalBackdrop"></div>

      <!-- Modal Container -->
      <div
        class="fixed inset-0 z-[100] flex min-h-full items-center justify-center p-4"
      >
        <div class="modal__content modal__content--confirm">
          <!-- Icon -->
          <div class="pt-8 pb-4">
            <div class="modal__icon modal__icon--danger mx-auto">
              <i data-lucide="alert-triangle" class="size-6"></i>
            </div>
          </div>

          <!-- Body -->
          <div class="px-6 pb-6">
            <h3 id="deleteCommentModalLabel" class="modal__title">Delete Comment?</h3>
            <p class="modal__description">
              This action cannot be undone. <span id="deleteCommentAuthor">this comment</span> will be permanently deleted, including all replies.
            </p>
          </div>

          <!-- Buttons (stacked, full-width) -->
          <form
            id="deleteCommentForm"
            hx-delete=""
            class="px-6 pb-6 flex flex-col gap-3"
          >
            <input type="hidden" name="_csrf" value="${user?.csrfToken || ''}" />
            <button 
              type="submit" 
              class="btn btn--danger btn--full"
              onclick="closeDeleteModal()"
            >
              Delete Comment
            </button>
            <button 
              type="button" 
              class="btn btn--outline btn--full"
              onclick="closeDeleteModal()"
            >
              Cancel
            </button>
          </form>
        </div>
      </div>
    </div>
  `;

  return mainLayout({
    title: `Comments - ${post.title}`,
    description: 'Manage post comments',
    content: content + toastScript,
    modals: modal,
    user,
    activeRoute: '/admin/posts',
    breadcrumbs: [
      { label: 'Dashboard', url: '/admin' },
      { label: 'Posts', url: '/admin/posts' },
      { label: 'Comments', url: `/admin/posts/${post.id}/comments` },
    ],
  });
}

/**
 * Render a single comment with nested replies
 */
function renderComment(comment, currentUser, depth = 0) {
  const maxDepth = 10; // Visual limit
  const indentClass = depth > 0 ? `comment--nested comment--depth-${Math.min(depth, maxDepth)}` : '';
  const isReply = depth > 0;
  
  return `
    <div class="comment ${indentClass}" id="comment-${comment.id}" data-post-id="${comment.postId}">
      <div class="comment__main">
        <div class="comment__avatar">
          <div class="avatar avatar--sm avatar--initials">
            ${getInitials(comment.authorName, '')}
          </div>
        </div>
        <div class="comment__content">
          <div class="comment__header">
            <div class="comment__meta">
              <span class="comment__author">${escapeHtml(comment.authorName || 'Anonymous')}</span>
              ${comment.authorEmail ? `<span class="comment__email">${escapeHtml(comment.authorEmail)}</span>` : ''}
              <span class="comment__time">${formatRelativeTime(comment.createdAt)}</span>
              <span class="comment__edited ${comment.isEdited ? 'comment__edited--visible' : ''}">(edited)</span>
            </div>
            <div class="comment__actions">
              <button 
                class="btn btn--ghost btn--xs" 
                onclick="toggleReplyForm('${comment.id}')"
              >
                <i data-lucide="reply" stroke-width="1"></i>
                Reply
              </button>
              <button 
                class="btn btn--ghost btn--xs"
                onclick="toggleEditForm('${comment.id}')"
              >
                <i data-lucide="edit" stroke-width="1"></i>
                Edit
              </button>
              <button 
                class="btn btn--ghost btn--danger btn--xs"
                data-comment-id="${comment.id}"
                data-author-name="${escapeHtml(comment.authorName || 'Anonymous')}"
                onclick="openDeleteModal(this)"
              >
                <i data-lucide="trash-2" stroke-width="1"></i>
                Delete
              </button>
            </div>
          </div>
          
          <div class="comment__body" id="comment-body-${comment.id}">
            ${escapeHtml(comment.content).replace(/\n/g, '<br>')}
          </div>
          
          <!-- Edit Form (hidden by default) -->
          <div class="comment__edit-form hidden" id="edit-form-${comment.id}">
            <form
              hx-put="/admin/posts/${comment.postId}/comments/${comment.id}"
              hx-target="#comment-body-${comment.id}"
              hx-swap="innerHTML"
              hx-on::after-request="if(event.detail.successful) { toggleEditForm('${comment.id}'); document.getElementById('comment-${comment.id}').querySelector('.comment__edited')?.classList.add('comment__edited--visible'); }"
            >
              <textarea 
                class="input" 
                name="content" 
                rows="3"
                required
              >${escapeHtml(comment.content)}</textarea>
              <div class="form__actions form__actions--right">
                <button type="submit" class="btn btn--primary btn--sm">
                  <i data-lucide="save" stroke-width="1"></i>
                  Save Changes
                </button>
                <button type="button" class="btn btn--outline btn--sm" onclick="toggleEditForm('${comment.id}')">
                  Cancel
                </button>
              </div>
            </form>
          </div>

          <!-- Reply Form (hidden by default) -->
          <div class="comment__reply-form hidden" id="reply-form-${comment.id}">
            <form
              hx-post="/admin/posts/${comment.postId}/comments/reply"
              hx-target="#replies-${comment.id}"
              hx-swap="beforeend"
              hx-on::after-request="if(event.detail.successful) { this.reset(); toggleReplyForm('${comment.id}'); }"
            >
              <input type="hidden" name="parentId" value="${comment.id}">
              <textarea 
                class="input" 
                name="content" 
                rows="3"
                placeholder="Write a reply..."
                required
              ></textarea>
              <div class="form__actions form__actions--right">
                <button type="submit" class="btn btn--primary btn--sm">
                  <i data-lucide="send" stroke-width="1"></i>
                  Post Reply
                </button>
                <button type="button" class="btn btn--outline btn--sm" onclick="toggleReplyForm('${comment.id}')">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      
      <!-- Nested Replies -->
      ${comment.replies && comment.replies.length > 0 ? `
        <div class="comment__replies" id="replies-${comment.id}">
          ${comment.replies.map(reply => renderComment(reply, currentUser, depth + 1)).join('')}
        </div>
      ` : `<div class="comment__replies" id="replies-${comment.id}"></div>`}
    </div>
  `;
}

/**
 * Export render function for use in controller
 */
export function renderCommentPartial(comment, currentUser, depth = 0) {
  return renderComment(comment, currentUser, depth);
}

/**
 * Empty state when no comments
 */
function emptyCommentsState() {
  return `
    <div class="empty">
      <i data-lucide="message-circle" stroke-width="1"></i>
      <h3>No Comments Yet</h3>
      <p>This post doesn't have any comments yet.</p>
    </div>
  `;
}

/**
 * Pagination HTML
 */
function paginationHtml(pagination, postId) {
  if (pagination.totalPages <= 1) return '';

  const pages = [];
  for (let i = 1; i <= pagination.totalPages; i++) {
    const activeClass = i === pagination.page ? 'pagination__item--active' : '';
    pages.push(`
      <a href="/admin/posts/${postId}/comments?page=${i}" class="pagination__item ${activeClass}">
        ${i}
      </a>
    `);
  }

  return `
    <div class="pagination">
      ${pagination.page > 1 ? `
        <a href="/admin/posts/${postId}/comments?page=${pagination.page - 1}" class="pagination__item">
          <i data-lucide="chevron-left" stroke-width="1"></i>
        </a>
      ` : ''}
      ${pages.join('')}
      ${pagination.page < pagination.totalPages ? `
        <a href="/admin/posts/${postId}/comments?page=${pagination.page + 1}" class="pagination__item">
          <i data-lucide="chevron-right" stroke-width="1"></i>
        </a>
      ` : ''}
    </div>
  `;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
