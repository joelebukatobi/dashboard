import { describe, it, expect } from 'vitest';
import { getMailSettings } from '../../../src/lib/mail-settings.js';
import { encryptSecret } from '../../../src/lib/secret-crypto.js';

describe('getMailSettings', () => {
  it('marks settings configured when host and from address exist', () => {
    const settings = getMailSettings({
      smtpHost: 'mail.example.com',
      smtpPort: '587',
      smtpSecure: 'tls',
      emailFromAddress: 'noreply@example.com',
    });

    expect(settings.configured).toBe(true);
    expect(settings.requireTLS).toBe(true);
    expect(settings.secure).toBe(false);
  });

  it('decrypts stored SMTP password', () => {
    process.env.JWT_SECRET = 'test-secret-for-encryption-32chars';
    const settings = getMailSettings({
      smtpHost: 'mail.example.com',
      smtpPassword: encryptSecret('secret'),
      emailFromAddress: 'noreply@example.com',
    });

    expect(settings.pass).toBe('secret');
  });
});
