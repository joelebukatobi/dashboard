// src/admin/templates/components/modal.js
// Reusable Modal Component - Simplified Structure

export function modal({
  id,
  title,
  description,
  icon = 'alert-triangle',
  iconVariant = 'danger',
  content,
  actions,
  highZIndex = false,
}) {
  const modalClass = highZIndex ? 'modal modal--high' : 'modal';
  const iconClass = `modal__icon modal__icon--${iconVariant}`;

  const defaultBody = `
    <div class="modal__header">
      <div class="${iconClass}">
        <i data-lucide="${icon}"></i>
      </div>
      <h3 class="modal__title">${title}</h3>
      <p class="modal__description">${description}</p>
    </div>
  `;

  const defaultActions = `
    <div class="modal__footer">
      <button type="button" class="btn btn--danger btn--full" onclick="closeModal('${id}')">Confirm</button>
      <button type="button" class="btn btn--outline btn--full" onclick="closeModal('${id}')">Cancel</button>
    </div>
  `;

  return `
    <div id="${id}" class="${modalClass}" role="dialog" tabindex="-1" aria-labelledby="${id}Label">
      <div class="modal__backdrop" onclick="closeModal('${id}')"></div>
      <div class="modal__panel">
        ${content || defaultBody}
        ${actions || defaultActions}
      </div>
    </div>
  `;
}

export function deleteModal({
  id = 'deleteModal',
  entityName,
  entityLabel,
  message,
  csrfToken,
  deleteUrl = '',
  highZIndex = false,
}) {
  const defaultMessage = `This action cannot be undone. The <span id="${id}EntityName"></span> ${entityName.toLowerCase()} will be permanently deleted.`;

  const body = `
    <div class="modal__header">
      <div class="modal__icon modal__icon--danger">
        <i data-lucide="alert-triangle"></i>
      </div>
      <h3 id="${id}Label" class="modal__title">Delete ${entityName}?</h3>
      <p class="modal__description">${message || defaultMessage}</p>
    </div>
  `;

  const actions = `
    <form id="${id}Form" hx-delete="${deleteUrl}" hx-target="body" hx-swap="none" class="modal__footer">
      <input type="hidden" name="_csrf" value="${csrfToken}" />
      <button type="submit" class="btn btn--danger btn--full">Delete ${entityName}</button>
      <button type="button" class="btn btn--outline btn--full" onclick="closeModal('${id}')">Cancel</button>
    </form>
  `;

  return modal({ id, content: body, actions, highZIndex });
}

export function modalScript() {
  return `
    <script>
      function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('is-open');
      }

      function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('is-open');
      }

      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
          const openModal = document.querySelector('.modal.is-open');
          if (openModal) openModal.classList.remove('is-open');
        }
      });
    </script>
  `;
}
