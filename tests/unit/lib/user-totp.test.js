import { describe, expect, it } from 'vitest';
import {
  isUserTotpEnabled,
  isUserTotpPending,
  getLoginTotpAction,
  canDisableUserTotp,
} from '../../../src/lib/user-totp.js';

describe('user-totp', () => {
  describe('isUserTotpEnabled', () => {
    it('accepts boolean true', () => {
      expect(isUserTotpEnabled(true)).toBe(true);
    });

    it('accepts MySQL-style 1', () => {
      expect(isUserTotpEnabled(1)).toBe(true);
    });

    it('accepts string true and 1', () => {
      expect(isUserTotpEnabled('true')).toBe(true);
      expect(isUserTotpEnabled('1')).toBe(true);
    });

    it('rejects falsey values', () => {
      expect(isUserTotpEnabled(false)).toBe(false);
      expect(isUserTotpEnabled(0)).toBe(false);
      expect(isUserTotpEnabled('false')).toBe(false);
      expect(isUserTotpEnabled(null)).toBe(false);
    });
  });

  describe('isUserTotpPending', () => {
    it('is pending when secret exists and not enabled', () => {
      expect(isUserTotpPending({ totpSecret: 'abc', totpEnabled: false })).toBe(true);
      expect(isUserTotpPending({ totpSecret: 'abc', totpEnabled: 0 })).toBe(true);
    });

    it('is not pending when enabled or no secret', () => {
      expect(isUserTotpPending({ totpSecret: 'abc', totpEnabled: true })).toBe(false);
      expect(isUserTotpPending({ totpSecret: null, totpEnabled: false })).toBe(false);
    });
  });

  describe('getLoginTotpAction', () => {
    it('returns verify when user enrolled', () => {
      expect(getLoginTotpAction({ role: 'EDITOR', totpEnabled: true }, {})).toBe('verify');
    });

    it('returns setup for admin under site mandate without enrollment', () => {
      expect(getLoginTotpAction(
        { role: 'ADMIN', totpEnabled: false },
        { twoFactorAuth: true },
      )).toBe('setup');
    });

    it('returns none for non-admin without enrollment', () => {
      expect(getLoginTotpAction(
        { role: 'EDITOR', totpEnabled: false },
        { twoFactorAuth: true },
      )).toBe('none');
    });
  });

  describe('canDisableUserTotp', () => {
    it('blocks admins when site mandate is on', () => {
      expect(canDisableUserTotp({ role: 'ADMIN' }, { twoFactorAuth: true })).toBe(false);
    });

    it('allows editors and admins when mandate is off', () => {
      expect(canDisableUserTotp({ role: 'EDITOR' }, { twoFactorAuth: true })).toBe(true);
      expect(canDisableUserTotp({ role: 'ADMIN' }, { twoFactorAuth: false })).toBe(true);
    });
  });
});
