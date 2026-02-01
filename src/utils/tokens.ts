import crypto from 'crypto';

/**
 * Generate a secure random token for confirmation links
 */
export function generateToken(): string {
  return crypto.randomBytes(16).toString('hex');
}
