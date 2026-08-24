import { escapeHtml } from '../utils/helpers.js';

export function renderSelectOptions(options, selectedValue, defaultValue = '') {
  const currentValue = selectedValue ?? defaultValue;

  return options.map((option) => `
    <option value="${option.value}" ${currentValue === option.value ? 'selected' : ''}>
      ${escapeHtml(option.label)}
    </option>
  `).join('');
}

export function renderFormSelect(name, options, selectedValue, defaultValue, placeholder, id = name) {
  return `
    <select
      id="${id}"
      name="${name}"
      class="hidden"
      required
      data-hs-select='{
        "placeholder": "${placeholder}",
        "toggleClasses": "form__select-toggle",
        "dropdownClasses": "form__select-dropdown",
        "optionClasses": "form__select-option"
      }'
    >
      ${renderSelectOptions(options, selectedValue, defaultValue)}
    </select>
  `;
}

export function syncFormSelectValues(form) {
  if (typeof HSSelect === 'undefined') return;

  form.querySelectorAll('[data-hs-select]').forEach((el) => {
    const instance = HSSelect.getInstance(el);
    if (instance?.value) {
      el.value = instance.value;
    }
  });
}
