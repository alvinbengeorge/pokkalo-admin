import { pbkdf2Sync, randomBytes } from 'crypto';

/**
 * Hash a password using PBKDF2.
 * Returns a salt and hash joined by a colon.
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify a password against a stored hashed password.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, originalHash] = storedHash.split(':');
  if (!salt || !originalHash) return false;
  const hash = pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === originalHash;
}
export const ADMIN_CREDENTIALS = {
  username: 'admin',
  passwordHash: hashPassword('password123'), // We'll compare admin statically or database based
};
