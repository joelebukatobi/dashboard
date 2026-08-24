import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const PREFIX = 'enc:v1:';

function getEncryptionKey() {
  const secret = process.env.APP_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('APP_ENCRYPTION_KEY or JWT_SECRET is required to encrypt secrets');
  }
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypt a string for storage in settings.
 * @param {string} value
 * @returns {string}
 */
export function encryptSecret(value) {
  if (!value) return '';
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('base64url')}:${tag.toString('base64url')}:${encrypted.toString('base64url')}`;
}

/**
 * Decrypt a stored secret value.
 * @param {string} value
 * @returns {string}
 */
export function decryptSecret(value) {
  if (!value) return '';
  if (!value.startsWith(PREFIX)) return value;

  const key = getEncryptionKey();
  const payload = value.slice(PREFIX.length);
  const [ivPart, tagPart, dataPart] = payload.split(':');
  if (!ivPart || !tagPart || !dataPart) return '';

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(ivPart, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataPart, 'base64url')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

export function isEncryptedSecret(value) {
  return typeof value === 'string' && value.startsWith(PREFIX);
}
