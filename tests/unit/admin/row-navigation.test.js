import { describe, it, expect } from 'vitest';
import { postsTableFragment } from '../../../src/admin/templates/pages/posts/list.js';
import { categoriesTableFragment } from '../../../src/admin/templates/pages/categories/list.js';
import { tagsTableFragment } from '../../../src/admin/templates/pages/tags/list.js';
import { albumsTableFragment } from '../../../src/admin/templates/pages/albums/list.js';
import { subscribersTableFragment } from '../../../src/admin/templates/pages/subscribers/list.js';

describe('whole-row navigation on admin list tables', () => {
  it('posts row carries data-href to its edit page and a pointer cursor', () => {
    const html = postsTableFragment({
      posts: [{ id: 'p1', title: 'Hello', status: 'DRAFT', createdAt: new Date() }],
      page: 1,
      totalPages: 1,
      filters: {},
    });
    expect(html).toMatch(/<tr class="table__tr[^"]*cursor-pointer[^"]*" data-href="\/admin\/posts\/p1\/edit"/);
  });

  it('categories row carries data-href to its edit page and a pointer cursor', () => {
    const html = categoriesTableFragment({
      categories: [{ id: 'c1', title: 'News', slug: 'news', createdAt: new Date() }],
      pagination: { totalPages: 1 },
    });
    expect(html).toMatch(/<tr class="table__tr[^"]*cursor-pointer[^"]*" data-href="\/admin\/categories\/c1\/edit"/);
  });

  it('tags row carries data-href to its edit page and a pointer cursor', () => {
    const html = tagsTableFragment({
      tags: [{ id: 't1', name: 'js', slug: 'js', createdAt: new Date() }],
      pagination: { totalPages: 1 },
    });
    expect(html).toMatch(/<tr class="table__tr[^"]*cursor-pointer[^"]*" data-href="\/admin\/tags\/t1\/edit"/);
  });

  it('albums row carries data-href to its edit page and a pointer cursor', () => {
    const html = albumsTableFragment({
      albums: [{ id: 'a1', title: 'Trip', slug: 'trip', createdAt: new Date() }],
      pagination: { totalPages: 1 },
    });
    expect(html).toMatch(/<tr class="table__tr[^"]*cursor-pointer[^"]*" data-href="\/admin\/media\/albums\/a1\/edit"/);
  });

  it('subscribers row carries data-href to its edit page (not the mailto title link) and a pointer cursor', () => {
    const html = subscribersTableFragment({
      subscribers: [{ id: 's1', email: 'a@b.com', status: 'ACTIVE', createdAt: new Date() }],
      pagination: { totalPages: 1 },
      filters: {},
    });
    expect(html).toMatch(/<tr class="table__tr[^"]*cursor-pointer[^"]*" id="subscriber-s1" data-href="\/admin\/subscribers\/s1\/edit"/);
  });
});

describe('row click delegation logic', () => {
  // Pulled from the shared dashboard shell script (src/admin/templates/layouts/main.js),
  // which registers this once at the document level so it survives both the
  // boosted full-page swap and the narrower table/pagination fragment swap.
  function extractRowClickHandlers(scriptHtml) {
    const openMatch = scriptHtml.match(/function openRowTarget\(e, row\) \{([\s\S]*?)\n {6}\}\n/);
    if (!openMatch) throw new Error('openRowTarget not found in shell script');
    return openMatch[1];
  }

  function makeRow(href) {
    return { dataset: { href } };
  }

  function run(scriptHtml, event, row) {
    const body = extractRowClickHandlers(scriptHtml);
    const fn = new Function('e', 'row', 'window', body);
    const win = { opened: null, href: null, open(url) { win.opened = url; } };
    win.location = {};
    Object.defineProperty(win.location, 'href', {
      set(v) { win.href = v; },
      get() { return win.href; },
    });
    fn(event, row, win);
    return win;
  }

  it('navigates in place on a plain click', async () => {
    const { buildDashboardShell } = await import('../../../src/admin/templates/layouts/main.js');
    const html = buildDashboardShell({ content: '', user: { email: 'a@b.com' } });
    const win = run(html, { button: 0, ctrlKey: false, metaKey: false }, makeRow('/admin/posts/1/edit'));
    expect(win.href).toBe('/admin/posts/1/edit');
    expect(win.opened).toBeNull();
  });

  it('opens a new tab on ctrl/cmd click or middle click', async () => {
    const { buildDashboardShell } = await import('../../../src/admin/templates/layouts/main.js');
    const html = buildDashboardShell({ content: '', user: { email: 'a@b.com' } });

    const ctrlWin = run(html, { button: 0, ctrlKey: true, metaKey: false }, makeRow('/admin/posts/1/edit'));
    expect(ctrlWin.opened).toBe('/admin/posts/1/edit');
    expect(ctrlWin.href).toBeNull();

    const middleWin = run(html, { button: 1, ctrlKey: false, metaKey: false }, makeRow('/admin/posts/1/edit'));
    expect(middleWin.opened).toBe('/admin/posts/1/edit');
  });
});
