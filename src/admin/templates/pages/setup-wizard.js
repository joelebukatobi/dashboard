// src/admin/templates/pages/setup-wizard.js
// Setup wizard page template

/**
 * Page metadata for setup wizard (consumed via setTemplateMeta).
 */
export function setupWizardMeta({ step }) {
  if (step === 'error') {
    return {
      title: 'Setup Unavailable',
      description: 'Setup wizard is not available',
    };
  }

  return {
    title: 'Site Setup',
    description: 'Create your admin account',
  };
}

/**
 * Format seconds into human-readable countdown
 */
function formatCountdown(seconds) {
  if (seconds <= 0) return 'Expired';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }

  return `${secs}s`;
}

/**
 * Setup wizard inner content (layout applied via fastify-html addLayout).
 */
export function setupWizardContent({ step, token, expiresIn, error, errors = {}, values = {} }) {
  if (step === 'error') {
    return `
      <div class="setup-wizard__container">
        <div class="auth-card">
          <div class="auth-card__header">
            <h1 class="auth-card__title">Setup Unavailable</h1>
            <p class="auth-card__subtitle">${error || 'Unable to access setup.'}</p>
          </div>
          <div class="auth-card__footer">
            <a href="/" class="btn btn--primary btn--xl btn--full">Go to Homepage</a>
          </div>
        </div>
      </div>
    `;
  }

  const firstNameError = errors.firstName ? `<span class="form__error">${errors.firstName}</span>` : '';
  const lastNameError = errors.lastName ? `<span class="form__error">${errors.lastName}</span>` : '';
  const emailError = errors.email ? `<span class="form__error">${errors.email}</span>` : '';
  const passwordError = errors.password ? `<span class="form__error">${errors.password}</span>` : '';
  const confirmPasswordError = errors.confirmPassword ? `<span class="form__error">${errors.confirmPassword}</span>` : '';

  const firstNameClass = errors.firstName ? 'input input--lg input--error' : 'input input--lg';
  const lastNameClass = errors.lastName ? 'input input--lg input--error' : 'input input--lg';
  const emailClass = errors.email ? 'input input--lg input--error' : 'input input--lg';
  const passwordClass = errors.password ? 'input input--lg input--error' : 'input input--lg';
  const confirmPasswordClass = errors.confirmPassword ? 'input input--lg input--error' : 'input input--lg';

  return `
    <div class="auth-card">
      <div class="auth-card__header">
        <h1 class="auth-card__title">Welcome! Let's Set Up Your Site</h1>
        <p class="auth-card__subtitle">Create Your Admin Account To Get Started</p>
      </div>

      ${error ? `<div class="alert alert--danger">${error}</div>` : ''}

      <div class="setup-wizard__token-info">
        <i data-lucide="clock"></i>
        <span>Token Expires In: <strong id="countdown" class="setup-wizard__countdown">${formatCountdown(expiresIn)}</strong></span>
      </div>

      <form class="auth-card__form" method="POST" action="/setup?token=${token}">
        <div class="form__row form__row--2col">
          <div class="form__group">
            <label class="label" for="firstName">First Name</label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              class="${firstNameClass}"
              placeholder="John"
              value="${values.firstName || ''}"
              required
            />
            ${firstNameError}
          </div>

          <div class="form__group">
            <label class="label" for="lastName">Last Name</label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              class="${lastNameClass}"
              placeholder="Doe"
              value="${values.lastName || ''}"
              required
            />
            ${lastNameError}
          </div>
        </div>

        <div class="form__group">
          <label class="label" for="email">Email Address</label>
          <input
            type="email"
            id="email"
            name="email"
            class="${emailClass}"
            placeholder="admin@example.com"
            value="${values.email || ''}"
            required
          />
          ${emailError}
        </div>

        <div class="form__group">
          <label class="label" for="password">Password</label>
          <div class="form__wrapper">
            <input
              type="password"
              id="password"
              name="password"
              class="${passwordClass} input--icon-right"
              placeholder="Create a strong password"
              required
            />
            <button type="button" class="input__addon" onclick="togglePassword('password', 'password-icon')">
              <i data-lucide="eye" id="password-icon"></i>
            </button>
          </div>
          ${passwordError}
          <span class="form__hint">Min 8 characters, uppercase, lowercase, number & special character</span>
        </div>

        <div class="form__group">
          <label class="label" for="confirmPassword">Confirm Password</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            class="${confirmPasswordClass}"
            placeholder="Confirm your password"
            required
          />
          ${confirmPasswordError}
        </div>

        <div class="form__group form__group--checkbox">
          <label class="label" for="demoData">Load demo data</label>
          <label class="form__checkbox-wrapper" for="demoData">
            <input
              type="checkbox"
              id="demoData"
              name="demoData"
              class="checkbox"
              ${values.demoData ? 'checked' : ''}
            />
            <span>Includes sample posts, categories, and tags to help you get started</span>
          </label>
        </div>

        <button type="submit" class="btn btn--primary btn--xl btn--full">
          Complete Setup
        </button>
      </form>
    </div>

    <script>
      let expiresIn = ${expiresIn};
      const countdownEl = document.getElementById('countdown');

      function updateCountdownState() {
        countdownEl.classList.remove(
          'setup-wizard__countdown--warning',
          'setup-wizard__countdown--critical',
        );

        if (expiresIn <= 0 || expiresIn < 300) {
          countdownEl.classList.add('setup-wizard__countdown--critical');
        } else if (expiresIn < 1800) {
          countdownEl.classList.add('setup-wizard__countdown--warning');
        }
      }

      function updateCountdown() {
        if (expiresIn <= 0) {
          countdownEl.textContent = 'Expired';
          updateCountdownState();
          return;
        }

        const hours = Math.floor(expiresIn / 3600);
        const minutes = Math.floor((expiresIn % 3600) / 60);
        const secs = expiresIn % 60;

        let text = '';
        if (hours > 0) {
          text = hours + 'h ' + minutes + 'm ' + secs + 's';
        } else if (minutes > 0) {
          text = minutes + 'm ' + secs + 's';
        } else {
          text = secs + 's';
        }

        countdownEl.textContent = text;
        updateCountdownState();

        expiresIn--;
      }

      updateCountdown();
      setInterval(updateCountdown, 1000);

      function togglePassword(inputId, iconId) {
        const passwordInput = document.getElementById(inputId);
        const passwordIcon = document.getElementById(iconId);

        if (passwordInput.type === 'password') {
          passwordInput.type = 'text';
          passwordIcon.setAttribute('data-lucide', 'eye-off');
        } else {
          passwordInput.type = 'password';
          passwordIcon.setAttribute('data-lucide', 'eye');
        }

        lucide.createIcons();
      }
    </script>
  `;
}
