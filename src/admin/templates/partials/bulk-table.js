// Shared bulk-selection markup for admin tables (opt-in per list page).
// Reuses .table / .checkbox / .btn / .modal — not a new component system.
// Pickers (album / tags) live in the confirm modal, not the action bar.

import { escapeHtml } from '../utils/helpers.js';

/** Select-all header cell */
export function bulkSelectHead() {
  return `
    <th class="w-[3.2rem]">
      <input type="checkbox" class="checkbox bulk-select-all" aria-label="Select all on this page" />
    </th>
  `;
}

/**
 * Per-row checkbox cell. stopPropagation so data-href row clicks ignore it.
 * @param {string} id
 */
export function bulkSelectCell(id) {
  return `
    <td class="table__td" onclick="event.stopPropagation()">
      <span class="table__label">Select</span>
      <input type="checkbox" class="checkbox bulk-select-row" name="ids" value="${escapeHtml(id)}" />
    </td>
  `;
}

/**
 * Bulk action bar. Buttons open the shared confirm modal.
 * Album / tag options are stored as hidden templates and rendered in the modal.
 * @param {Object} options
 * @param {string} options.csrfToken
 * @param {string} options.deleteAction
 * @param {string} [options.entityLabel]
 * @param {boolean} [options.showAlbum]
 * @param {string} [options.albumAction]
 * @param {string} [options.albumOptionsHtml]
 * @param {boolean} [options.showDownload]
 * @param {string} [options.downloadAction]
 * @param {boolean} [options.showTags]
 * @param {string} [options.tagAction]
 * @param {string} [options.tagOptionsHtml]
 * @param {Array<{label:string,action:string,title?:string,message?:string,danger?:boolean}>} [options.statusActions]
 */
export function bulkActionsBar({
  csrfToken,
  albumOptionsHtml = '',
  showAlbum = false,
  showDownload = false,
  showTags = false,
  tagOptionsHtml = '',
  deleteAction,
  albumAction = '',
  downloadAction = '',
  tagAction = '',
  entityLabel = 'items',
  statusActions = [],
}) {
  const albumBtn = showAlbum
    ? `
      <button
        type="button"
        class="btn btn--outline"
        data-bulk-action
        data-bulk-url="${escapeHtml(albumAction)}"
        data-bulk-requires="album"
        data-bulk-title="Add to album"
        data-bulk-message="Choose an album for the selected ${escapeHtml(entityLabel)}."
        data-bulk-confirm="Add to album"
      >Add to album</button>
    `
    : '';

  const tagsBtn = showTags
    ? `
      <button
        type="button"
        class="btn btn--outline"
        data-bulk-action
        data-bulk-url="${escapeHtml(tagAction)}"
        data-bulk-requires="tags"
        data-bulk-title="Add tags"
        data-bulk-message="Choose tags to add. Existing tags on each post are kept."
        data-bulk-confirm="Add tags"
      >Add tags</button>
    `
    : '';

  const downloadBtn = showDownload
    ? `
      <button
        type="button"
        class="btn btn--outline"
        data-bulk-action
        data-bulk-url="${escapeHtml(downloadAction)}"
        data-bulk-title="Download zip?"
        data-bulk-message="Download a zip of the selected ${escapeHtml(entityLabel)}?"
        data-bulk-confirm="Download"
      >Download zip</button>
    `
    : '';

  const statusBtns = statusActions
    .map(
      (a) => `
      <button
        type="button"
        class="btn btn--outline"
        data-bulk-action
        data-bulk-url="${escapeHtml(a.action)}"
        data-bulk-title="${escapeHtml(a.title || a.label + '?')}"
        data-bulk-message="${escapeHtml(a.message || a.label + ' the selected ' + entityLabel + '?')}"
        data-bulk-confirm="${escapeHtml(a.label)}"
        ${a.danger ? 'data-bulk-danger' : ''}
      >${escapeHtml(a.label)}</button>
    `,
    )
    .join('');

  const optionSources = `
    ${
      showAlbum
        ? `<select class="hidden" data-bulk-options="album" aria-hidden="true">
            <option value="">Choose album…</option>
            ${albumOptionsHtml}
          </select>`
        : ''
    }
    ${
      showTags
        ? `<select class="hidden" multiple data-bulk-options="tags" aria-hidden="true">
            ${tagOptionsHtml}
          </select>`
        : ''
    }
  `;

  return `
    <div class="bulk-bar hidden flex flex-wrap items-center gap-[0.8rem] mb-[1.6rem]" data-bulk-bar>
      <input type="hidden" name="_csrf" value="${escapeHtml(csrfToken || '')}" />
      <span
        class="inline-flex h-[2.4rem] items-center rounded-sm border border-blue-600/30 bg-blue-600/10 px-[1.2rem] text-body-sm font-medium text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400"
        data-bulk-count
        aria-live="polite"
      >0 selected</span>
      ${albumBtn}
      ${tagsBtn}
      ${statusBtns}
      ${downloadBtn}
      <button
        type="button"
        class="btn btn--danger btn--outline"
        data-bulk-action
        data-bulk-url="${escapeHtml(deleteAction)}"
        data-bulk-title="Delete ${escapeHtml(entityLabel)}?"
        data-bulk-message="This cannot be undone. Delete the selected ${escapeHtml(entityLabel)}?"
        data-bulk-confirm="Delete"
        data-bulk-danger
      >Delete</button>
      ${optionSources}
    </div>
  `;
}

/** Shared confirm modal + listeners. Include once per list page with the bulk bar. */
export function bulkTableScript() {
  return `
    <div id="bulkConfirmModal" class="modal" role="dialog" tabindex="-1">
      <div class="modal__backdrop" onclick="closeBulkConfirmModal()"></div>
      <div class="modal__panel">
        <div class="modal__header">
          <div class="modal__icon modal__icon--info" data-bulk-modal-icon>
            <i data-lucide="images"></i>
          </div>
          <h3 class="modal__title" data-bulk-modal-title>Confirm</h3>
          <p class="modal__description" data-bulk-modal-message></p>
        </div>
        <form method="post" data-bulk-modal-form class="overflow-visible">
          <!-- overflow-visible + z so hs-select pops over footer (not clipped/scrolled by modal__body) -->
          <div class="relative z-20 overflow-visible px-4 pb-2" data-bulk-modal-picker></div>
          <div class="modal__footer relative z-0">
            <input type="hidden" name="_csrf" value="" data-bulk-modal-csrf />
            <div data-bulk-modal-fields></div>
            <button type="submit" class="btn btn--full btn--lg" data-bulk-modal-submit>Confirm</button>
            <button type="button" class="btn btn--outline btn--full btn--lg" onclick="closeBulkConfirmModal()">Cancel</button>
          </div>
        </form>
      </div>
    </div>
    <script>
      (function () {
        if (window.__bulkTableBound) return;
        window.__bulkTableBound = true;

        function selectedRows(root) {
          return Array.from(root.querySelectorAll('.bulk-select-row:checked'));
        }

        function sync(root) {
          const bar = root.querySelector('[data-bulk-bar]');
          if (!bar) return;
          const rows = root.querySelectorAll('.bulk-select-row');
          const checked = selectedRows(root);
          const countEl = bar.querySelector('[data-bulk-count]');
          if (countEl) countEl.textContent = checked.length + ' selected';
          bar.classList.toggle('hidden', checked.length === 0);
          const all = root.querySelector('.bulk-select-all');
          if (all) {
            all.checked = rows.length > 0 && checked.length === rows.length;
            all.indeterminate = checked.length > 0 && checked.length < rows.length;
          }
        }

        function syncModalSubmit() {
          const modal = document.getElementById('bulkConfirmModal');
          if (!modal) return;
          const submitBtn = modal.querySelector('[data-bulk-modal-submit]');
          const requires = modal.getAttribute('data-bulk-requires') || '';
          if (!requires) {
            submitBtn.disabled = false;
            return;
          }
          if (requires === 'album') {
            const select = modal.querySelector('select[name="albumId"]');
            const val = hsSelectValue(select);
            submitBtn.disabled = !val;
            return;
          }
          if (requires === 'tags') {
            const select = modal.querySelector('select[name="tagIds"]');
            const val = hsSelectValue(select);
            const has =
              Array.isArray(val) ? val.length > 0
                : (val && String(val).length > 0) || (select && select.selectedOptions.length > 0);
            submitBtn.disabled = !has;
          }
        }

        function destroyPickerSelects(picker) {
          if (!picker || typeof HSSelect === 'undefined') return;
          picker.querySelectorAll('[data-hs-select]').forEach(function (el) {
            var instance = HSSelect.getInstance(el);
            if (instance) instance.destroy();
          });
        }

        function hsSelectValue(select) {
          if (!select) return '';
          if (typeof HSSelect !== 'undefined') {
            var instance = HSSelect.getInstance(select);
            if (instance && instance.value != null && instance.value !== '') {
              return instance.value;
            }
          }
          return select.value;
        }

        function mountHsSelect(select, config) {
          select.className = 'form__select-native';
          select.setAttribute('data-hs-select', JSON.stringify(config));
          select.addEventListener('change', syncModalSubmit);
          // Preline also updates via its own UI; poll value on interaction
          select.addEventListener('input', syncModalSubmit);
          if (typeof HSSelect !== 'undefined') {
            new HSSelect(select);
          }
          // Catch Preline option clicks (value may update after click)
          setTimeout(function () {
            var toggle = select.parentElement && select.parentElement.querySelector('.form__select-toggle');
            var dropdown = select.parentElement && select.parentElement.querySelector('.form__select-dropdown');
            if (toggle) toggle.addEventListener('click', function () { setTimeout(syncModalSubmit, 0); });
            if (dropdown) dropdown.addEventListener('click', function () { setTimeout(syncModalSubmit, 0); });
          }, 0);
        }

        window.closeBulkConfirmModal = function () {
          const modal = document.getElementById('bulkConfirmModal');
          if (!modal) return;
          modal.classList.remove('is-open');
          modal.removeAttribute('data-bulk-requires');
          const picker = modal.querySelector('[data-bulk-modal-picker]');
          destroyPickerSelects(picker);
          if (picker) picker.innerHTML = '';
        };

        function openBulkConfirm(btn, root) {
          const checked = selectedRows(root);
          if (!checked.length) return;

          const modal = document.getElementById('bulkConfirmModal');
          if (!modal) return;
          const form = modal.querySelector('[data-bulk-modal-form]');
          const fields = modal.querySelector('[data-bulk-modal-fields]');
          const picker = modal.querySelector('[data-bulk-modal-picker]');
          const csrfSrc = root.querySelector('input[name="_csrf"]');
          const csrfDst = modal.querySelector('[data-bulk-modal-csrf]');
          const submitBtn = modal.querySelector('[data-bulk-modal-submit]');
          const icon = modal.querySelector('[data-bulk-modal-icon]');
          const danger = btn.hasAttribute('data-bulk-danger');
          const requires = btn.getAttribute('data-bulk-requires') || '';

          form.setAttribute('action', btn.getAttribute('data-bulk-url') || '');
          if (csrfDst && csrfSrc) csrfDst.value = csrfSrc.value;
          modal.querySelector('[data-bulk-modal-title]').textContent = btn.getAttribute('data-bulk-title') || 'Confirm';
          modal.querySelector('[data-bulk-modal-message]').textContent = btn.getAttribute('data-bulk-message') || '';
          submitBtn.textContent = btn.getAttribute('data-bulk-confirm') || 'Confirm';
          submitBtn.className = danger
            ? 'btn btn--danger btn--full btn--lg'
            : 'btn btn--primary btn--full btn--lg';

          fields.innerHTML = '';
          checked.forEach(function (cb) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'ids';
            input.value = cb.value;
            fields.appendChild(input);
          });

          destroyPickerSelects(picker);
          picker.innerHTML = '';
          modal.setAttribute('data-bulk-requires', requires);

          if (icon) {
            if (danger) {
              icon.className = 'modal__icon modal__icon--danger';
              icon.innerHTML = '<i data-lucide="alert-triangle"></i>';
            } else if (requires === 'album') {
              icon.className = 'modal__icon modal__icon--info';
              icon.innerHTML = '<i data-lucide="images"></i>';
            } else if (requires === 'tags') {
              icon.className = 'modal__icon modal__icon--info';
              icon.innerHTML = '<i data-lucide="tags"></i>';
            } else {
              icon.className = 'modal__icon modal__icon--info';
              icon.innerHTML = '<i data-lucide="circle-check"></i>';
            }
          }

          if (requires === 'album') {
            const source = root.querySelector('[data-bulk-options="album"]');
            const wrap = document.createElement('div');
            wrap.className = 'form__group mb-0';
            const select = document.createElement('select');
            select.name = 'albumId';
            select.id = 'bulkModalAlbumId';
            select.setAttribute('aria-label', 'Album');
            select.innerHTML = source ? source.innerHTML : '<option value="">Choose album…</option>';
            select.value = '';
            wrap.appendChild(select);
            picker.appendChild(wrap);
            mountHsSelect(select, {
              hasSearch: true,
              searchPlaceholder: 'Search albums...',
              placeholder: 'Choose album…',
              toggleClasses: 'form__select-toggle',
              dropdownClasses: 'form__select-dropdown',
              optionClasses: 'form__select-option',
              searchClasses: 'form__select-search__input',
            });
            submitBtn.disabled = true;
          } else if (requires === 'tags') {
            const source = root.querySelector('[data-bulk-options="tags"]');
            const wrap = document.createElement('div');
            wrap.className = 'form__group mb-0';
            const select = document.createElement('select');
            select.name = 'tagIds';
            select.id = 'bulkModalTagIds';
            select.multiple = true;
            select.setAttribute('aria-label', 'Tags');
            select.innerHTML = source ? source.innerHTML : '';
            wrap.appendChild(select);
            picker.appendChild(wrap);
            mountHsSelect(select, {
              placeholder: 'Select tags…',
              toggleClasses: 'form__select-toggle',
              dropdownClasses: 'form__select-dropdown',
              optionClasses: 'form__select-option',
            });
            submitBtn.disabled = true;
          } else {
            submitBtn.disabled = false;
          }

          if (typeof lucide !== 'undefined') lucide.createIcons();
          modal.classList.add('is-open');
          syncModalSubmit();
        }

        document.addEventListener('change', function (e) {
          const t = e.target;
          if (!t || !t.classList) return;
          const root = t.closest('form[data-bulk-form]') || document;
          if (t.classList.contains('bulk-select-all')) {
            root.querySelectorAll('.bulk-select-row').forEach(function (cb) {
              cb.checked = t.checked;
            });
            sync(root);
            return;
          }
          if (t.classList.contains('bulk-select-row')) sync(root);
        });

        document.addEventListener('click', function (e) {
          const btn = e.target.closest && e.target.closest('[data-bulk-action]');
          if (!btn) return;
          e.preventDefault();
          const root = btn.closest('form[data-bulk-form]') || document;
          openBulkConfirm(btn, root);
        });

        document.addEventListener('submit', function (e) {
          const form = e.target.closest && e.target.closest('[data-bulk-modal-form]');
          if (!form) return;
          if (typeof window.syncFormSelectValues === 'function') {
            window.syncFormSelectValues(form);
          }
          const modal = document.getElementById('bulkConfirmModal');
          const requires = modal && modal.getAttribute('data-bulk-requires');
          if (requires === 'album') {
            const select = form.querySelector('select[name="albumId"]');
            if (!hsSelectValue(select)) {
              e.preventDefault();
              return;
            }
          }
          if (requires === 'tags') {
            const select = form.querySelector('select[name="tagIds"]');
            const val = hsSelectValue(select);
            const has =
              Array.isArray(val) ? val.length > 0
                : (val && String(val).length > 0) || (select && select.selectedOptions.length > 0);
            if (!has) e.preventDefault();
          }
        });

        document.addEventListener('keydown', function (e) {
          if (e.key === 'Escape') window.closeBulkConfirmModal();
        });

        document.body.addEventListener('htmx:afterSwap', function (e) {
          const form = e.target.closest && e.target.closest('form[data-bulk-form]');
          if (form) sync(form);
        });
      })();
    </script>
  `;
}
