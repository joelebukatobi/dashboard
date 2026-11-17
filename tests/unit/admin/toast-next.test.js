import { describe, it, expect } from 'vitest';
import { toastQueryScript } from '../../../src/admin/templates/utils/helpers.js';

// After "Add to album" the list shows the toast, then moves on to the album.
describe('toastQueryScript ?next', () => {
  it('follows an /admin/ next path once the toast has gone', () => {
    const js = toastQueryScript('Added 2 images to album');
    expect(js).toContain("url.searchParams.get('next')");
    expect(js).toContain('window.location.assign(next)');
    expect(js).toContain('3400');
  });

  it('only follows admin paths, and the script parses', () => {
    const js = toastQueryScript('x');
    const body = js.replace(/<\/?script>/g, '');
    expect(() => new Function(body)).not.toThrow();
    expect(js).toContain("next.indexOf('/admin/') === 0");
  });
});
