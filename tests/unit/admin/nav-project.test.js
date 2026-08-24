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
