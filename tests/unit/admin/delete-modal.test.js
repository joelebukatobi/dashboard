import { describe, it, expect } from 'vitest';
import { DeleteModal } from '../../../src/admin/templates/components/delete-modal.js';

function buildModal() {
  return new DeleteModal({
    entityName: 'Category',
    entityLabel: 'title',
    deleteUrlPath: '/admin/categories',
    csrfToken: 'token',
    hasConditionalMessage: true,
    conditionalConfig: {
      messageWithItems: 'The {name} category has {count} post(s). They will be moved to Uncategorized.',
      messageWithoutItems: 'This action cannot be undone. The {name} category will be permanently deleted.',
      countAttribute: 'data-post-count',
    },
  });
}

function fakeElement() {
  return {
    innerHTML: '',
    textContent: '',
    classList: { add() {}, remove() {}, toggle() {} },
    setAttribute() {},
  };
}

function extractOpenDeleteModal(scriptHtml) {
  const match = scriptHtml.match(/function openDeleteModal\(button\) \{([\s\S]*?)\n\s*\}\n\n\s*function closeDeleteModal/);
  if (!match) throw new Error('openDeleteModal body not found');
  return match[1];
}

function runOpen(scriptHtml, elements, attrs) {
  const body = extractOpenDeleteModal(scriptHtml);
  const fakeDocument = {
    getElementById(id) {
      return elements[id] || null;
    },
  };
  const button = { getAttribute: (name) => attrs[name] ?? null };
  const fn = new Function('button', 'document', 'htmx', body);
  fn(button, fakeDocument, undefined);
}

describe('DeleteModal conditional message', () => {
  it('shows the current item name on every open, not just the first', () => {
    const modal = buildModal();
    const html = modal.render();

    const elements = {
      deleteModal: fakeElement(),
      deleteCategoryForm: fakeElement(),
      deleteEntityName: fakeElement(),
      deleteWithItems: fakeElement(),
      deleteNoItems: fakeElement(),
      deleteWithItemsName: fakeElement(),
      deleteNoItemsName: fakeElement(),
      deleteItemCount: fakeElement(),
    };

    runOpen(html, elements, {
      'data-category-id': '1',
      'data-category-title': 'Electronics',
      'data-post-count': '3',
    });
    expect(elements.deleteWithItemsName.textContent).toBe('Electronics');
    expect(elements.deleteNoItemsName.textContent).toBe('Electronics');

    runOpen(html, elements, {
      'data-category-id': '2',
      'data-category-title': 'Books',
      'data-post-count': '0',
    });
    expect(elements.deleteWithItemsName.textContent).toBe('Books');
    expect(elements.deleteNoItemsName.textContent).toBe('Books');
  });

  it('renders a name containing HTML as text, never as markup', () => {
    const modal = buildModal();
    const html = modal.render();

    const elements = {
      deleteModal: fakeElement(),
      deleteCategoryForm: fakeElement(),
      deleteEntityName: fakeElement(),
      deleteWithItems: fakeElement(),
      deleteNoItems: fakeElement(),
      deleteWithItemsName: fakeElement(),
      deleteNoItemsName: fakeElement(),
      deleteItemCount: fakeElement(),
    };

    const payload = '<img src=x onerror=alert(1)>';
    runOpen(html, elements, {
      'data-category-id': '1',
      'data-category-title': payload,
      'data-post-count': '1',
    });

    expect(elements.deleteWithItemsName.textContent).toBe(payload);
    expect(elements.deleteWithItemsName.innerHTML).toBe('');
    expect(elements.deleteNoItemsName.innerHTML).toBe('');
  });

  it('template leaves no literal {name} placeholder to be consumed', () => {
    const modal = buildModal();
    const html = modal.template();
    expect(html).not.toContain('{name}');
    expect(html).toContain('id="deleteWithItemsName"');
    expect(html).toContain('id="deleteNoItemsName"');
  });
});
