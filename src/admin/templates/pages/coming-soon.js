// src/admin/templates/pages/coming-soon.js
// "Coming Soon" page displayed when no admin is configured

/**
 * Coming Soon Page Template
 * Simple centered page shown before setup is complete
 */
export default function comingSoon() {
  return `<!doctype html>
<html lang="en" class="scroll-smooth">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Coming Soon</title>
    <meta name="description" content="This site is being configured" />

    <!-- Favicon -->
    <link rel="icon" href="/dist/favicon.svg" type="image/x-icon" />

    <!-- Preconnect to external resources -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

    <!-- Google Fonts - Schibsted Grotesk -->
    <link
      href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap"
      rel="stylesheet"
    />

    <!-- Compiled CSS -->
    <link rel="stylesheet" href="/dist/css/admin.css" />

    <!-- Lucide Icons -->
    <script src="https://cdn.jsdelivr.net/npm/lucide@latest/dist/umd/lucide.min.js"></script>
  </head>
  <body>
    <div class="coming-soon">
      <div class="coming-soon__card">
        <div class="coming-soon__icon">
          <i data-lucide="construction" class="w-[4.8rem] h-[4.8rem] text-grey-400"></i>
        </div>
        <h1 class="coming-soon__title">Coming Soon</h1>
        <p class="coming-soon__message">
          This site is currently being configured.<br>
          Please check back later.
        </p>
      </div>
    </div>

    <script>
      // Theme initialization
      const html = document.documentElement;
      const savedTheme = localStorage.getItem('theme');

      if (savedTheme === null) {
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          html.classList.add('dark');
          localStorage.setItem('theme', 'dark');
        } else {
          localStorage.setItem('theme', 'light');
        }
      } else if (savedTheme === 'dark') {
        html.classList.add('dark');
      }

      lucide.createIcons();
    </script>
  </body>
</html>`;
}
