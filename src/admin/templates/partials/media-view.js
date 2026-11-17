// Media list: grid ↔ table dropdown + breakpoint page-size hint

import { escapeHtml } from '../utils/helpers.js';

/**
 * Toolbar view control: same hs-dropdown pattern as list filters.
 * Pass as listToolbar.leadingButtons so it sits before Upload.
 * @param {Object} options
 * @param {string} options.basePath - e.g. /admin/media/images
 * @param {'grid'|'table'} options.view
 * @param {Record<string, string|number|undefined>} [options.filters]
 */
export function mediaViewToggle({ basePath, view = 'grid', filters = {} }) {
  const qs = (nextView) => {
    const p = new URLSearchParams();
    p.set('view', nextView);
    if (filters.search) p.set('search', String(filters.search));
    if (filters.limit) p.set('limit', String(filters.limit));
    return `${basePath}?${p.toString()}`;
  };

  const label = view === 'table' ? 'Table' : 'Grid';
  const options = [
    { label: 'Grid', url: qs('grid'), active: view === 'grid' },
    { label: 'Table', url: qs('table'), active: view === 'table' },
  ];

  return `
    <div class="hs-dropdown list-toolbar__filter" data-hs-dropdown-auto-close="outside">
      <button type="button" id="hs-dropdown-media-view" class="hs-dropdown-toggle list-toolbar__dropdown-trigger">
        <span>${escapeHtml(label)}</span>
        <i data-lucide="chevron-down"></i>
      </button>
      <div
        class="hs-dropdown-menu dropdown__menu dropdown__menu--sm list-toolbar__dropdown-menu"
        aria-labelledby="hs-dropdown-media-view"
      >
        ${options
          .map(
            (opt) => `
          <a
            href="${escapeHtml(opt.url)}"
            class="dropdown__item ${opt.active ? 'dropdown__item--active' : ''} list-toolbar__dropdown-item ${opt.active ? 'list-toolbar__dropdown-item--active' : ''}"
          >
            ${escapeHtml(opt.label)}
          </a>
        `,
          )
          .join('')}
      </div>
    </div>
  `;
}

/**
 * On grid view, align ?limit= with viewport breakpoints (B tiers).
 * lg≈15, xl≈20, 2xl≈30, else 10.
 */
export function mediaLimitScript() {
  return `
    <script>
      (function () {
        var params = new URLSearchParams(window.location.search);
        if ((params.get('view') || 'grid') !== 'grid') return;
        var want = 10;
        if (window.matchMedia('(min-width: 1536px)').matches) want = 30;
        else if (window.matchMedia('(min-width: 1280px)').matches) want = 20;
        else if (window.matchMedia('(min-width: 1024px)').matches) want = 15;
        var cur = parseInt(params.get('limit') || '10', 10);
        if (cur === want) return;
        params.set('limit', String(want));
        params.delete('page');
        var url = window.location.pathname + '?' + params.toString();
        window.location.replace(url);
      })();
    </script>
  `;
}
