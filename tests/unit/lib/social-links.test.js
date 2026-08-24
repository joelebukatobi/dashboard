import { describe, it, expect } from 'vitest';
import {
  normalizeSocialLinks,
  normalizeSocialHiddenPlatforms,
  parseSocialLinksFromBody,
  parseSocialHiddenPlatformsFromBody,
} from '../../../src/lib/social-links.js';

describe('parseSocialLinksFromBody', () => {
  it('pairs labels and urls, skipping empty rows', () => {
    expect(parseSocialLinksFromBody({
      socialLinkLabel: ['Instagram', '', 'TikTok'],
      socialLinkUrl: ['https://instagram.com/me', 'https://ignored.com', ''],
    })).toEqual([
      { label: 'Instagram', url: 'https://instagram.com/me' },
      { label: 'TikTok', url: '' },
    ]);
  });

  it('handles single values', () => {
    expect(parseSocialLinksFromBody({
      socialLinkLabel: 'YouTube',
      socialLinkUrl: 'https://youtube.com/@me',
    })).toEqual([
      { label: 'YouTube', url: 'https://youtube.com/@me' },
    ]);
  });
});

describe('normalizeSocialHiddenPlatforms', () => {
  it('keeps only known built-in platform keys', () => {
    expect(normalizeSocialHiddenPlatforms(['socialTwitter', 'socialFake', 'socialGitHub'])).toEqual([
      'socialTwitter',
      'socialGitHub',
    ]);
  });

  it('parses JSON strings', () => {
    expect(normalizeSocialHiddenPlatforms('["socialFacebook"]')).toEqual(['socialFacebook']);
  });
});

describe('parseSocialHiddenPlatformsFromBody', () => {
  it('reads hidden platform keys from the form body', () => {
    expect(parseSocialHiddenPlatformsFromBody({
      socialHiddenPlatforms: '["socialLinkedIn"]',
    })).toEqual(['socialLinkedIn']);
  });
});

describe('normalizeSocialLinks', () => {
  it('parses JSON strings and filters invalid rows', () => {
    expect(normalizeSocialLinks('[{"label":"IG","url":"https://ig.com"}]')).toEqual([
      { label: 'IG', url: 'https://ig.com' },
    ]);
  });

  it('returns empty array for invalid values', () => {
    expect(normalizeSocialLinks(null)).toEqual([]);
    expect(normalizeSocialLinks('not-json')).toEqual([]);
    expect(normalizeSocialLinks({})).toEqual([]);
  });
});
