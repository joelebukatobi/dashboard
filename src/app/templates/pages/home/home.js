export function homeMeta() {
  return {
    title: 'BlogCMS App',
    layout: 'app',
  };
}

export function homeContent() {
  return `
    <main class="app-home">
      <div class="app-home__badge">BlogCMS</div>

      <h1 class="app-home__title">Build from this public app surface.</h1>
      <p class="app-home__subtitle">
        Get started by editing <code>src/app/templates/pages/home.js</code> and
        <code>scss/app/pages/_home.scss</code>.
      </p>

      <div class="app-home__actions">
        <a class="app-home__btn app-home__btn--primary" href="/blog">Open Blog</a>
        <a class="app-home__btn app-home__btn--secondary" href="/admin">Admin Dashboard</a>
      </div>

      <section class="app-home__grid" aria-label="Quick links">
        <a class="app-home__card" href="/blog">
          <h2 class="app-home__card-title">Blog</h2>
          <p class="app-home__card-text">Browse published posts and verify the public-facing layout.</p>
        </a>
        <a class="app-home__card" href="/api/v1/posts">
          <h2 class="app-home__card-title">API</h2>
          <p class="app-home__card-text">Inspect the JSON feed consumed by the app pages.</p>
        </a>
        <a class="app-home__card" href="/admin/posts">
          <h2 class="app-home__card-title">CMS</h2>
          <p class="app-home__card-text">Create and manage content from the admin dashboard.</p>
        </a>
        <a class="app-home__card" href="/health">
          <h2 class="app-home__card-title">Health</h2>
          <p class="app-home__card-text">Check service status and uptime of the running server.</p>
        </a>
      </section>

      <p class="app-home__footer">Public app starter surface for BlogCMS.</p>
    </main>
  `;
}
