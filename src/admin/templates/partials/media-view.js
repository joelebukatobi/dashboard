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
 * Size a page to the whole rows that actually fit, so no row is ever clipped.
 *
 * Breakpoint guesses cannot do this: how many rows fit depends on the window's
 * height and on how tall a card or table row renders, neither of which the
 * server knows. So measure both, work out the whole rows that fit between the
 * toolbar and the fixed pagination footer, and drop the row that would be cut -
 * it becomes page two.
 *
 * The measurement is written to a cookie the controller reads, so only the
 * first visit at a given window size costs a correction; every later navigation
 * is one correctly sized request.
 */
export function mediaPageFitScript({ view = 'grid' } = {}) {
  const isTable = view === 'table';

  return `
    <script>
      (function () {
        var IS_TABLE = ${isTable ? 'true' : 'false'};
        var COOKIE = 'media_page_size_' + (IS_TABLE ? 'table' : 'grid');

        function writeCookie(value) {
          try {
            document.cookie =
              COOKIE + '=' + value + ';path=/admin;max-age=31536000;samesite=lax';
          } catch (e) {}
        }

        // How many whole rows fit, and how many items that is per row.
        function measure() {
          var box = document.querySelector(
            IS_TABLE ? '[class$="__table-content"]' : '.media-grid'
          );
          if (!box) return null;

          // The box fills the space between toolbar and footer, so its own
          // height is the budget. Cross-check it against the fixed footer in
          // case a wrapper ever breaks the flex chain again and lets the box
          // grow past the viewport - then the smaller number is the truth.
          var footer = document.querySelector('.page-footer');
          var floorY = footer
            ? footer.getBoundingClientRect().top
            : window.innerHeight;
          var visible = floorY - box.getBoundingClientRect().top;
          var available = Math.min(box.clientHeight || Infinity, visible);
          if (!available || available === Infinity || available < 1) return null;

          if (IS_TABLE) {
            var row = box.querySelector('tbody tr');
            var head = box.querySelector('thead');
            if (!row) return null;
            var rowH = row.getBoundingClientRect().height;
            if (!rowH) return null;
            var headH = head ? head.getBoundingClientRect().height : 0;
            var rows = Math.floor((available - headH) / rowH);
            return Math.max(1, rows);
          }

          var card = box.querySelector('.media-card');
          if (!card) return null;
          var cardH = card.getBoundingClientRect().height;
          if (!cardH) return null;

          var styles = window.getComputedStyle(box);
          var gap = parseFloat(styles.rowGap) || 0;
          var cols = styles.gridTemplateColumns.split(' ').filter(Boolean).length || 1;

          // n rows occupy n*cardH + (n-1)*gap, so solve for n.
          var rows = Math.floor((available + gap) / (cardH + gap));
          return Math.max(1, rows) * cols;
        }

        function apply() {
          var want = measure();
          if (!want) return;

          var params = new URLSearchParams(window.location.search);
          var current = parseInt(params.get('limit') || '0', 10);
          writeCookie(String(want));

          if (current === want) return;

          // Keep the viewer among the items they were already looking at
          // instead of dropping them back on page one.
          if (current > 0) {
            var page = parseInt(params.get('page') || '1', 10) || 1;
            var firstItem = (page - 1) * current;
            params.set('page', String(Math.floor(firstItem / want) + 1));
          }
          params.set('limit', String(want));
          // The reload keeps ?toast and ?next; tell the toast script to leave
          // them for the reloaded page.
          window.__adminReloading = true;
          window.location.replace(window.location.pathname + '?' + params.toString());
        }

        // A resize changes how much fits, but reloading the page under someone
        // mid-resize is hostile. Record the new size and let the next
        // navigation use it.
        var resizeTimer;
        window.addEventListener('resize', function () {
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(function () {
            var want = measure();
            if (want) writeCookie(String(want));
          }, 250);
        });

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', apply);
        } else {
          apply();
        }
      })();
    </script>
  `;
}
