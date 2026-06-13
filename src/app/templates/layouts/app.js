/**
 * Public app layout shells (fastify-html addLayout).
 */

/**
 * Minimal shell for the app home page.
 * @param {{ title: string, content: string }} options
 */
export function buildAppShell({ title, content }) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="stylesheet" href="/dist/css/app.css" />
  </head>
  <body class="app-shell">
    ${content}
  </body>
</html>`;
}

/**
 * Blog layout shell with header and optional footer.
 * @param {{ title: string, activeBlogNav?: boolean, content: string, footer?: string }} options
 */
export function buildBlogShell({ title, activeBlogNav = false, content, footer = '' }) {
  const activeClass = activeBlogNav ? ' blog-header__link--active' : '';

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="stylesheet" href="/dist/css/app.css" />
  </head>
  <body class="app-shell blog-home">
    <header class="blog-header">
      <div class="blog-header__inner">
        <a class="blog-header__brand" href="/">BlogCMS</a>
        <nav class="blog-header__nav">
          <a class="blog-header__link${activeClass}" href="/blog">Blog</a>
        </nav>
      </div>
    </header>

    <main class="blog-main">
      ${content}
    </main>
    ${footer}
  </body>
</html>`;
}

/**
 * Coming soon shell (uses admin CSS — shown before setup).
 * @param {{ content: string }} options
 */
export function buildComingSoonShell({ content }) {
  return `<!doctype html>
<html lang="en" class="scroll-smooth">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Coming Soon</title>
    <meta name="description" content="This site is being configured" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="/dist/css/admin.css" />
    <script src="https://cdn.jsdelivr.net/npm/lucide@latest/dist/umd/lucide.min.js"></script>
  </head>
  <body>
    ${content}
    <script>
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

/**
 * Minimal shell for simple public error pages.
 * @param {{ title: string, content: string }} options
 */
export function buildAppErrorShell({ title, content }) {
  return buildAppShell({ title, content: `<main class="app-home"><h1>${title}</h1>${content}</main>` });
}
