import { describe, it, expect } from 'vitest';
import { isSettingEnabled, settingsService } from '../../../src/services/settings.service.js';

describe('isSettingEnabled', () => {
  it('accepts boolean true', () => {
    expect(isSettingEnabled(true)).toBe(true);
  });

  it('accepts string "true" from legacy STRING rows', () => {
    expect(isSettingEnabled('true')).toBe(true);
  });

  it('rejects false and string false', () => {
    expect(isSettingEnabled(false)).toBe(false);
    expect(isSettingEnabled('false')).toBe(false);
    expect(isSettingEnabled(undefined)).toBe(false);
  });
});

describe('settingsService.parseValue', () => {
  it('coerces string booleans when type is STRING', () => {
    expect(settingsService.parseValue('true', 'STRING')).toBe(true);
    expect(settingsService.parseValue('false', 'STRING')).toBe(false);
  });

  it('parses BOOLEAN type', () => {
    expect(settingsService.parseValue('true', 'BOOLEAN')).toBe(true);
    expect(settingsService.parseValue('false', 'BOOLEAN')).toBe(false);
  });
});

describe('settingsService.inferType', () => {
  it('infers BOOLEAN for form checkbox strings', () => {
    expect(settingsService.inferType('true')).toBe('BOOLEAN');
    expect(settingsService.inferType('false')).toBe('BOOLEAN');
    expect(settingsService.inferType('true', 'twoFactorAuth')).toBe('BOOLEAN');
  });
});
