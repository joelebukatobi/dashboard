// src/admin/templates/components/delete-modal.js
// Reusable Delete Modal Component - Simplified Structure

export class DeleteModal {
  constructor(config) {
    this.config = {
      id: 'deleteModal',
      entityName: config.entityName,
      entityLabel: config.entityLabel || 'name',
      deleteUrlPath: config.deleteUrlPath,
      targetSelector: config.targetSelector || '.table',
      swapMode: config.swapMode || 'innerHTML',
      title: config.title || 'Are you sure?',
      message: config.message || null,
      buttonText: config.buttonText || 'Delete',
      csrfToken: config.csrfToken || '',
      hasConditionalMessage: config.hasConditionalMessage || false,
      conditionalConfig: config.conditionalConfig || null
    };
  }

  render() {
    return `
      ${this.template()}
      ${this.script()}
    `;
  }

  template() {
    const { entityName, title, csrfToken } = this.config;

    let messageHtml = '';
    if (this.config.hasConditionalMessage && this.config.conditionalConfig) {
      const { messageWithItems, messageWithoutItems } = this.config.conditionalConfig;
      messageHtml = `
        <p class="modal__description hidden" id="deleteWithItems">
          ${messageWithItems.replace('{count}', '<span id="deleteItemCount"></span>')}
        </p>
        <p class="modal__description hidden" id="deleteNoItems">
          ${messageWithoutItems}
        </p>
      `;
    } else {
      messageHtml = `<p class="modal__description">${this.getMessage()}</p>`;
    }

    return `
      <div id="${this.config.id}" class="modal" role="dialog" tabindex="-1">
        <div class="modal__backdrop" onclick="closeDeleteModal()"></div>
        <div class="modal__panel">
          <div class="modal__header">
            <div class="modal__icon modal__icon--danger">
              <i data-lucide="alert-triangle"></i>
            </div>
            <h3 class="modal__title">${title}</h3>
            ${messageHtml}
          </div>
          <form
            id="delete${entityName}Form"
            hx-delete=""
            hx-target="body"
            hx-swap="none"
            hx-on::after-request="closeDeleteModal()"
            class="modal__footer"
          >
            <input type="hidden" name="_csrf" value="${csrfToken}" />
            <button type="submit" class="btn btn--danger btn--full btn--lg">
              ${this.config.buttonText}
            </button>
            <button type="button" class="btn btn--outline btn--full btn--lg" onclick="closeDeleteModal()">
              Cancel
            </button>
          </form>
        </div>
      </div>
    `;
  }

  script() {
    const { entityName, entityLabel, hasConditionalMessage, conditionalConfig } = this.config;

    let conditionalLogic = '';
    if (hasConditionalMessage && conditionalConfig) {
      conditionalLogic = `
        const itemCount = button.getAttribute('${conditionalConfig.countAttribute}');
        const hasItems = parseInt(itemCount) > 0;
        const withItemsMsg = document.getElementById('deleteWithItems');
        const noItemsMsg = document.getElementById('deleteNoItems');
        withItemsMsg.innerHTML = withItemsMsg.innerHTML.replace(/\\{name\\}/g, entityDisplayName);
        noItemsMsg.innerHTML = noItemsMsg.innerHTML.replace(/\\{name\\}/g, entityDisplayName);
        withItemsMsg.classList.toggle('hidden', !hasItems);
        noItemsMsg.classList.toggle('hidden', hasItems);
        if (hasItems) {
          document.getElementById('deleteItemCount').textContent = itemCount;
        }
      `;
    }

    return `
      <script>
        function openDeleteModal(button) {
          const entityId = button.getAttribute('data-${entityName.toLowerCase()}-id');
          const entityDisplayName = button.getAttribute('data-${entityName.toLowerCase()}-${entityLabel}');
          const modal = document.getElementById('deleteModal');
          const form = document.getElementById('delete${entityName}Form');
          form.setAttribute('hx-delete', '${this.config.deleteUrlPath}/' + entityId);
          if (typeof htmx !== 'undefined') {
            htmx.process(form);
          }
          const nameElement = document.getElementById('deleteEntityName');
          if (nameElement) nameElement.textContent = entityDisplayName;
          ${conditionalLogic}
          modal.classList.add('is-open');
        }

        function closeDeleteModal() {
          const modal = document.getElementById('deleteModal');
          modal.classList.remove('is-open');
        }

        document.addEventListener('keydown', function(e) {
          if (e.key === 'Escape') {
            closeDeleteModal();
          }
        });

        document.body.addEventListener('subscriberDeleted', function(evt) {
          if (evt.detail && evt.detail.id) {
            const row = document.getElementById('subscriber-' + evt.detail.id);
            if (row) row.remove();
          }
        });
      </script>
    `;
  }

  getMessage() {
    if (this.config.message) return this.config.message;
    return `This action cannot be undone. The <span id="deleteEntityName"></span> ${this.config.entityName.toLowerCase()} will be permanently deleted.`;
  }
}
