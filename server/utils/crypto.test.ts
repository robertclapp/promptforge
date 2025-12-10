import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { encrypt, decrypt, validateEncryptionSetup } from './crypto';

describe('Crypto Utilities', () => {
  const originalEnv = process.env.ENCRYPTION_KEY;

  beforeEach(() => {
    // Set valid encryption key for tests
    process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  });

  afterEach(() => {
    process.env.ENCRYPTION_KEY = originalEnv;
  });

  describe('encrypt', () => {
    it('should encrypt plain text successfully', () => {
      const plainText = 'my-secret-api-key';
      const encrypted = encrypt(plainText);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plainText);
      expect(encrypted).toContain(':'); // IV:encrypted format
    });

    it('should produce different ciphertext for same input (random IV)', () => {
      const plainText = 'same-text';
      const encrypted1 = encrypt(plainText);
      const encrypted2 = encrypt(plainText);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should throw error if encryption key is missing', () => {
      delete process.env.ENCRYPTION_KEY;

      expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY environment variable is required');
    });

    it('should throw error if encryption key has invalid length', () => {
      process.env.ENCRYPTION_KEY = 'short';

      expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY must be 64 hex characters');
    });
  });

  describe('decrypt', () => {
    it('should decrypt encrypted text back to original', () => {
      const plainText = 'my-secret-api-key';
      const encrypted = encrypt(plainText);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plainText);
    });

    it('should handle special characters', () => {
      const plainText = 'key-with-special-chars!@#$%^&*()';
      const encrypted = encrypt(plainText);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plainText);
    });

    it('should handle unicode characters', () => {
      const plainText = '密钥-🔐-clé';
      const encrypted = encrypt(plainText);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plainText);
    });

    it('should throw error for invalid encrypted format', () => {
      expect(() => decrypt('invalid-format')).toThrow('Failed to decrypt data');
    });

    it('should throw error for corrupted data', () => {
      const plainText = 'test';
      const encrypted = encrypt(plainText);
      const corrupted = encrypted.replace('a', 'b');

      expect(() => decrypt(corrupted)).toThrow('Failed to decrypt data');
    });
  });

  describe('validateEncryptionSetup', () => {
    it('should validate successful encryption/decryption cycle', () => {
      expect(() => validateEncryptionSetup()).not.toThrow();
    });

    it('should throw error if encryption is not properly configured', () => {
      delete process.env.ENCRYPTION_KEY;

      expect(() => validateEncryptionSetup()).toThrow();
    });
  });

  describe('end-to-end encryption', () => {
    it('should handle empty string', () => {
      const plainText = '';
      const encrypted = encrypt(plainText);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plainText);
    });

    it('should handle very long text', () => {
      const plainText = 'a'.repeat(10000);
      const encrypted = encrypt(plainText);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plainText);
    });

    it('should handle newlines and whitespace', () => {
      const plainText = 'line1\nline2\r\nline3\t\ttab';
      const encrypted = encrypt(plainText);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plainText);
    });
  });
});
