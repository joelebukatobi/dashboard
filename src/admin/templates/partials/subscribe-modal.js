/**
 * Newsletter subscribe HTMX modal fragment.
 * @param {{ type: 'success'|'error', title: string, message: string }} options
 */
export function subscribeModal({ type, title, message }) {
  const icon = type === 'success' ? 'ph ph-check-circle' : 'ph ph-warning-circle';

  return `
    <div class="newsletter-modal" id="newsletterModal" role="dialog" aria-modal="true" aria-labelledby="newsletterModalTitle">
      <div class="newsletter-modal__card">
        <div class="newsletter-modal__header">
          <h3 class="newsletter-modal__title" id="newsletterModalTitle">${title}</h3>
          <button class="newsletter-modal__close" onclick="closeNewsletterModal()" aria-label="Close">
            <i class="ph ph-x"></i>
          </button>
        </div>
        <div class="newsletter-modal__body">
          <div class="newsletter-modal__icon newsletter-modal__icon--${type}">
            <i class="${icon}"></i>
          </div>
          <p class="newsletter-modal__message">${message}</p>
          <div class="newsletter-modal__action">
            <button class="btn btn--primary" onclick="closeNewsletterModal()">Close</button>
          </div>
        </div>
      </div>
    </div>
    <script>
      function closeNewsletterModal() {
        var modal = document.getElementById('newsletterModal');
        if (modal) modal.remove();
      }
      setTimeout(closeNewsletterModal, 6000);
    </script>
  `;
}
