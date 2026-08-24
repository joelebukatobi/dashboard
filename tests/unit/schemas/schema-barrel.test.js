import { describe, it, expect } from 'vitest';
import * as barrel from '../../../src/db/schema.js';
import * as core from '../../../src/db/schema/core.js';

describe('schema barrel', () => {
  it('re-exports every core table and helper', () => {
    for (const name of Object.keys(core)) {
      expect(barrel[name], `barrel is missing ${name}`).toBe(core[name]);
    }
  });

  it('still exports the tables the app imports by name', () => {
    for (const name of [
      'users', 'sessions', 'passwordResets', 'categories', 'tags',
      'posts', 'postTags', 'postLikes', 'comments', 'mediaItems',
      'albums', 'settings', 'activities', 'analyticsEvents',
      'dailyPageViews', 'subscribers', 'oauthAccounts', 'setupTokens',
      'now',
    ]) {
      expect(barrel[name], `missing export ${name}`).toBeDefined();
    }
  });

  it('exposes the project schema module as an extension point', async () => {
    const project = await import('../../../src/db/schema/project.js');
    expect(project).toBeDefined();
  });
});
