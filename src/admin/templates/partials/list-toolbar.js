// src/admin/templates/partials/list-toolbar.js
// Reusable list toolbar component for all list pages
// This is a CREATE-ONLY file - not integrated yet for testing

/**
 * List Toolbar Partial
 * Provides consistent toolbar layout across all list pages
 *
 * @param {Object} options
 * @param {string} options.searchPlaceholder - Placeholder text for search input
 * @param {string} options.searchValue - Current search value
 * @param {Array} options.filters - Array of filter dropdowns
 * @param {boolean} options.hasAddButton - Whether to show add new button
 * @param {string} options.addButtonUrl - URL for add button
 * @param {string} options.addButtonText - Text for add button
 * @returns {string} HTML string
 */
export function listToolbar({
  searchPlaceholder = 'Search...',
  searchValue = '',
  filters = [],
  hasAddButton = false,
  addButtonUrl = '#',
  addButtonText = 'Add New',
}) {
  const filtersHtml = filters
    .map(
      (filter) => `
      <div class="list-toolbar__filter">
        <button type="button" class="list-toolbar__dropdown-trigger">
          <span>${filter.label}</span>
          <i data-lucide="chevron-down"></i>
        </button>
        <div class="list-toolbar__dropdown-menu">
          ${filter.options
            .map(
              (opt) => `
            <a href="${opt.url}" class="list-toolbar__dropdown-item ${opt.active ? 'list-toolbar__dropdown-item--active' : ''}">
              ${opt.label}
            </a>
          `,
            )
            .join('')}
        </div>
      </div>
    `,
    )
    .join('');

  const addButtonHtml = hasAddButton
    ? `
    <a href="${addButtonUrl}" class="btn btn--primary list-toolbar__add-btn">
      <i data-lucide="plus"></i>
      <span>${addButtonText}</span>
    </a>
  `
    : '';

  return `
    <div class="list-toolbar">
      <div class="list-toolbar__search">
        <i data-lucide="search" class="list-toolbar__search-icon"></i>
        <input
          type="text"
          class="list-toolbar__search-input"
          placeholder="${searchPlaceholder}"
          value="${searchValue}"
          hx-get=""
          hx-trigger="keyup changed delay:300ms"
          hx-target="#table-container"
          hx-push-url="true"
        />
      </div>
      <div class="list-toolbar__filters">
        ${filtersHtml}
        ${addButtonHtml}
      </div>
    </div>
  `;
}

/**
 * List Toolbar - Minimal variant
 * For pages without filters (simple search + add)
 */
export function listToolbarMinimal({
  searchPlaceholder = 'Search...',
  searchValue = '',
  hasAddButton = false,
  addButtonUrl = '#',
  addButtonText = 'Add New',
}) {
  const addButtonHtml = hasAddButton
    ? `
    <a href="${addButtonUrl}" class="btn btn--primary list-toolbar__add-btn">
      <i data-lucide="plus"></i>
      <span>${addButtonText}</span>
    </a>
  `
    : '';

  return `
    <div class="list-toolbar list-toolbar--minimal">
      <div class="list-toolbar__search">
        <i data-lucide="search" class="list-toolbar__search-icon"></i>
        <input
          type="text"
          class="list-toolbar__search-input"
          placeholder="${searchPlaceholder}"
          value="${searchValue}"
          hx-get=""
          hx-trigger="keyup changed delay:300ms"
          hx-target="#table-container"
          hx-push-url="true"
        />
      </div>
      ${addButtonHtml}
    </div>
  `;
}
