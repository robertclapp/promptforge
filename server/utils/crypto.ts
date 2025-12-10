import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

/**
 * Secure encryption utility for sensitive data (API keys, tokens, etc.)
 * Uses AES-256-CBC encryption with random IVs
 */

const IV_LENGTH = 16;

/**
 * Get encryption key from environment
 * Fails fast if not provided to prevent using default/weak keys
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    throw new Error(
      "ENCRYPTION_KEY environment variable is required. " +
      "Generate a secure key with: openssl rand -hex 32"
    );
  }

  if (key.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY must be 64 hex characters (32 bytes). " +
      "Current length: " + key.length
    );
  }

  return Buffer.from(key, "hex");
}

/**
 * Encrypt sensitive text data
 * @param text - Plain text to encrypt
 * @returns Encrypted string in format: iv:encryptedData
 */
export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-cbc", key, iv);
  
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  return `${iv.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt encrypted text data
 * @param encryptedText - Encrypted string in format: iv:encryptedData
 * @returns Decrypted plain text
 */
export function decrypt(encryptedText: string): string {
  try {
    const key = getEncryptionKey();
    const parts = encryptedText.split(":");
    
    if (parts.length !== 2) {
      throw new Error("Invalid encrypted data format");
    }
    
    const iv = Buffer.from(parts[0], "hex");
    const encrypted = Buffer.from(parts[1], "hex");
    
    const decipher = createDecipheriv("aes-256-cbc", key, iv);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString("utf8");
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error("Failed to decrypt data");
  }
}

/**
 * Validate that encryption is properly configured
 * Should be called on application startup
 */
export function validateEncryptionSetup(): void {
  try {
    const testData = "test-encryption-" + Date.now();
    const encrypted = encrypt(testData);
    const decrypted = decrypt(encrypted);
    
    if (decrypted !== testData) {
      throw new Error("Encryption validation failed: decrypted data doesn't match");
    }
    
    console.log("✓ Encryption setup validated successfully");
  } catch (error) {
    console.error("✗ Encryption setup validation failed:", error);
    throw error;
  }
}
