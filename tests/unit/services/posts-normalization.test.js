import { describe, it, expect } from 'vitest';
import { normalizeOptionalId } from '../../../src/lib/post-input.js';

describe('normalizeOptionalId', () => {
  it('turns an empty string into null', () => {
    expect(normalizeOptionalId('')).toBeNull();
  });

  it('turns a whitespace-only string into null', () => {
    expect(normalizeOptionalId('   ')).toBeNull();
  });

  it('turns undefined and null into null', () => {
    expect(normalizeOptionalId(undefined)).toBeNull();
    expect(normalizeOptionalId(null)).toBeNull();
  });

  it('preserves a real id, trimmed', () => {
    expect(normalizeOptionalId('  abc-123  ')).toBe('abc-123');
  });
});

// The update path must distinguish "field absent" (keep existing) from
// "field cleared" (set null). Getting this backwards silently prevents users
// from ever removing a category once set.
describe('update-path expression', () => {
  const applied = (incoming, existing) =>
    incoming !== undefined ? normalizeOptionalId(incoming) : existing;

  it('keeps the existing value when the field is absent', () => {
    expect(applied(undefined, 'existing-id')).toBe('existing-id');
  });

  it('clears the value when the field is submitted empty', () => {
    expect(applied('', 'existing-id')).toBeNull();
  });

  it('replaces the value when a new id is submitted', () => {
    expect(applied('new-id', 'existing-id')).toBe('new-id');
  });
});
