import { describe, it, expect } from 'vitest';
import { renderProjectNav, sidebar } from '../../../src/admin/templates/partials/sidebar.js';
import { projectNavItems } from '../../../src/admin/nav.project.js';

const isActive = (route) => (route === '/admin/events' ? 'sidebar__item--active' : '');

describe('renderProjectNav', () => {
  it('renders nothing when a fork supplies no items', () => {
    expect(renderProjectNav({ items: [], title: 'Project', isActive })).toBe('');
  });

  it('renders a group with one entry per item', () => {
    const html = renderProjectNav({
      items: [
        { href: '/admin/events', label: 'Events', icon: 'calendar' },
        { href: '/admin/departments', label: 'Departments', icon: 'building' },
      ],
      title: 'Organisation',
      isActive,
    });

    expect(html).toContain('Organisation');
    expect(html).toContain('href="/admin/events"');
    expect(html).toContain('data-lucide="calendar"');
    expect(html).toContain('href="/admin/departments"');
    expect(html).toContain('data-lucide="building"');
  });

  it('marks the active item', () => {
    const html = renderProjectNav({
      items: [{ href: '/admin/events', label: 'Events', icon: 'calendar' }],
      title: 'Organisation',
      isActive,
    });
    expect(html).toContain('sidebar__item--active');
  });

  it('escapes item text', () => {
    const html = renderProjectNav({
      items: [{ href: '/admin/x', label: '<script>alert(1)</script>', icon: 'box' }],
      title: 'Project',
      isActive,
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('nav.project.js', () => {
  it('is empty in dashboard', () => {
    expect(projectNavItems).toEqual([]);
  });
});

describe('sidebar', () => {
  it('renders no project group when there are no project items', () => {
    const html = sidebar({ activeRoute: '/admin', user: { role: 'ADMIN' } });
    expect(html).toContain('/admin/posts');
    expect(html).not.toContain('sidebar__group--project');
  });
});

// The settings row holding siteIcon and the uploaded file can drift apart —
// a database restored without its uploads, or a fork inheriting settings.
// Without a fallback the sidebar renders a broken image instead of the icon
// it already has for the no-icon case.
describe('sidebar logo fallback', () => {
  it('renders a hidden fallback alongside a configured icon', () => {
    const html = sidebar({
      activeRoute: '/admin',
      user: { role: 'ADMIN' },
      siteName: 'Test',
      siteIcon: '/public/uploads/site/icon.svg',
    });

    expect(html).toContain('<img');
    expect(html).toContain('sidebar__logo-icon-fallback');
    expect(html, 'a missing file must swap to the fallback rather than showing a broken image')
      .toMatch(/onerror="[^"]*nextElementSibling\.hidden = false/);
  });

  it('renders only the lucide icon when no site icon is configured', () => {
    const html = sidebar({ activeRoute: '/admin', user: { role: 'ADMIN' }, siteName: 'Test', siteIcon: '' });

    expect(html).not.toContain('sidebar__logo-icon-img');
    expect(html).toContain('data-lucide="square-library"');
  });

  it('escapes a hostile site icon value', () => {
    const html = sidebar({ siteIcon: '"><script>alert(1)</script>' });
    expect(html).not.toContain('<script>alert(1)</script>');
  });
});
