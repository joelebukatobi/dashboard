// HTMX fragment: pick site icon from media library

import { escapeHtml, toPublicMediaUrl } from '../utils/helpers.js';

/**
 * @param {{ images: Array<{ id: string, path: string, thumbnailPath?: string, title?: string }> }} options
 */
export function siteIconPickerFragment({ images = [] }) {
  if (!images.length) {
    return `
      <div class="site-icon-picker site-icon-picker--empty">
        <p>No images in the media library yet.</p>
        <a href="/admin/media/images/new" class="btn btn--outline">Upload an image</a>
      </div>
    `;
  }

  return `
    <div class="site-icon-picker">
      <p class="site-icon-picker__hint">Click an image to use as the site icon</p>
      <div class="site-icon-picker__grid">
        ${images.map((img) => `
          <button
            type="button"
            class="site-icon-picker__item"
            hx-post="/admin/settings/icon/select"
            hx-include="#settings-csrf"
            data-path="${escapeHtml(img.path)}"
            hx-vals='js:{siteIcon: this.dataset.path}'
            hx-target="#form-response"
            hx-swap="innerHTML"
            title="${escapeHtml(img.title || 'Select')}"
          >
            <img src="${escapeHtml(toPublicMediaUrl(img.thumbnailPath || img.path))}" alt="" />
          </button>
        `).join('')}
      </div>
    </div>
  `;
}
