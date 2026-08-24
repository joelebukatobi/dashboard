/**
 * Password field that shows masked dots when empty/blurred (stored secret unchanged).
 */
export function ghostPasswordField({
  id,
  name,
  label,
  error = '',
  autocomplete = 'current-password',
  hint = '',
  displayOnly = false,
}) {
  const inputAttrs = displayOnly
    ? 'readonly tabindex="-1" aria-readonly="true" data-password-ghost-display-only'
    : `name="${name}"`;

  return `
    <div class="form__group ${error ? 'form__group--error' : ''}">
      <label class="label" for="${id}">${label}</label>
      <div class="password-ghost-field${displayOnly ? ' password-ghost-field--display-only' : ''}" data-password-ghost>
        <input
          type="password"
          class="input password-ghost-field__input password-ghost-field__input--ghost"
          id="${id}"
          ${inputAttrs}
          autocomplete="${autocomplete}"
          data-password-ghost-input
        />
        <span class="password-ghost-field__mask" aria-hidden="true">••••••••</span>
      </div>
      ${hint ? `<p class="form-feedback form-feedback--hint">${hint}</p>` : ''}
      ${error ? `<p class="form-feedback form-feedback--error">${error}</p>` : ''}
    </div>
  `;
}
