/**
 * Public app layout shells (fastify-html addLayout).
 */

function escapeAttr(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function headBlock({ title, favicon = '/favicon.svg', ogMeta = '' }) {
  return `
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeAttr(title)}</title>
    ${ogMeta}
    <link rel="icon" href="${escapeAttr(favicon)}" />
    <link rel="stylesheet" href="/dist/css/app.css" />`;
}

/**
 * Minimal shell for the app home page.
 */
export function buildAppShell({ title, content, favicon, ogMeta }) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>${headBlock({ title, favicon, ogMeta })}
  </head>
  <body class="app-shell">
    ${content}
  </body>
</html>`;
}

/**
 * Blog layout shell with header and optional footer.
 */
export function buildBlogShell({
  title,
  siteName = 'BlogCMS',
  activeBlogNav = false,
  content,
  footer = '',
  favicon,
  ogMeta,
}) {
  const activeClass = activeBlogNav ? ' blog-header__link--active' : '';

  return `<!DOCTYPE html>
<html lang="en">
  <head>${headBlock({ title, favicon, ogMeta })}
  </head>
  <body class="app-shell blog-home">
    <header class="blog-header">
      <div class="blog-header__inner">
        <a class="blog-header__brand" href="/">${escapeAttr(siteName)}</a>
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
 */
export function buildComingSoonShell({ content, favicon = '/favicon.svg', ogMeta = '' }) {
  return `<!doctype html>
<html lang="en" class="scroll-smooth">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Coming Soon</title>
    <meta name="description" content="This site is being configured" />
    ${ogMeta}
    <link rel="icon" href="${escapeAttr(favicon)}" />
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
 */
export function buildAppErrorShell({ title, content, favicon, ogMeta }) {
  return buildAppShell({
    title,
    content: `<main class="app-home"><h1>${escapeAttr(title)}</h1>${content}</main>`,
    favicon,
    ogMeta,
  });
}
