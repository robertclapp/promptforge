/**
 * Export Encryption Service
 * Provides AES-256-GCM encryption for export files with password-based key derivation
 */

import crypto from "crypto";

// Encryption constants
const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12; // 96 bits for GCM
const SALT_LENGTH = 32; // 256 bits
const TAG_LENGTH = 16; // 128 bits
const PBKDF2_ITERATIONS = 100000;

export interface EncryptedData {
  encrypted: string; // Base64 encoded encrypted data
  iv: string; // Base64 encoded IV
  salt: string; // Base64 encoded salt
  tag: string; // Base64 encoded auth tag
  version: number; // Encryption version for future compatibility
}

export interface EncryptionResult {
  data: EncryptedData;
  originalSize: number;
  encryptedSize: number;
}

/**
 * Derive encryption key from password using PBKDF2
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(
    password,
    salt,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    "sha256"
  );
}

/**
 * Encrypt data with AES-256-GCM using a password
 */
export function encryptData(data: string | Buffer, password: string): EncryptionResult {
  const dataBuffer = typeof data === "string" ? Buffer.from(data, "utf-8") : data;
  const originalSize = dataBuffer.length;
  
  // Generate random salt and IV
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  
  // Derive key from password
  const key = deriveKey(password, salt);
  
  // Create cipher and encrypt
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(dataBuffer),
    cipher.final(),
  ]);
  
  // Get authentication tag
  const tag = cipher.getAuthTag();
  
  const encryptedData: EncryptedData = {
    encrypted: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    salt: salt.toString("base64"),
    tag: tag.toString("base64"),
    version: 1,
  };
  
  return {
    data: encryptedData,
    originalSize,
    encryptedSize: encrypted.length,
  };
}

/**
 * Decrypt data with AES-256-GCM using a password
 */
export function decryptData(encryptedData: EncryptedData, password: string): Buffer {
  // Decode base64 values
  const encrypted = Buffer.from(encryptedData.encrypted, "base64");
  const iv = Buffer.from(encryptedData.iv, "base64");
  const salt = Buffer.from(encryptedData.salt, "base64");
  const tag = Buffer.from(encryptedData.tag, "base64");
  
  // Derive key from password
  const key = deriveKey(password, salt);
  
  // Create decipher and decrypt
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  
  return decrypted;
}

/**
 * Decrypt data and return as string
 */
export function decryptDataAsString(encryptedData: EncryptedData, password: string): string {
  return decryptData(encryptedData, password).toString("utf-8");
}

/**
 * Check if data is encrypted (has the expected structure)
 */
export function isEncryptedData(data: unknown): data is EncryptedData {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.encrypted === "string" &&
    typeof obj.iv === "string" &&
    typeof obj.salt === "string" &&
    typeof obj.tag === "string" &&
    typeof obj.version === "number"
  );
}

/**
 * Validate password strength
 * Returns a score from 0-100 and feedback
 */
export function validatePasswordStrength(password: string): {
  score: number;
  feedback: string[];
  isStrong: boolean;
} {
  const feedback: string[] = [];
  let score = 0;
  
  // Length check
  if (password.length >= 8) score += 20;
  else feedback.push("Password should be at least 8 characters");
  
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;
  
  // Character variety checks
  if (/[a-z]/.test(password)) score += 10;
  else feedback.push("Add lowercase letters");
  
  if (/[A-Z]/.test(password)) score += 10;
  else feedback.push("Add uppercase letters");
  
  if (/[0-9]/.test(password)) score += 15;
  else feedback.push("Add numbers");
  
  if (/[^a-zA-Z0-9]/.test(password)) score += 15;
  else feedback.push("Add special characters");
  
  // Penalize common patterns
  if (/^[a-zA-Z]+$/.test(password)) {
    score -= 10;
    feedback.push("Avoid using only letters");
  }
  
  if (/^[0-9]+$/.test(password)) {
    score -= 20;
    feedback.push("Avoid using only numbers");
  }
  
  // Check for sequential characters
  if (/(.)\1{2,}/.test(password)) {
    score -= 10;
    feedback.push("Avoid repeated characters");
  }
  
  // Normalize score
  score = Math.max(0, Math.min(100, score));
  
  return {
    score,
    feedback,
    isStrong: score >= 60,
  };
}

/**
 * Generate a secure random password
 */
export function generateSecurePassword(length: number = 16): string {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";
  const randomBytes = crypto.randomBytes(length);
  let password = "";
  
  for (let i = 0; i < length; i++) {
    password += charset[randomBytes[i] % charset.length];
  }
  
  return password;
}

/**
 * Create an encrypted export package
 */
export function createEncryptedExport(
  jsonContent: string,
  password: string
): {
  encryptedPackage: string;
  metadata: {
    originalSize: number;
    encryptedSize: number;
    algorithm: string;
    version: number;
  };
} {
  const result = encryptData(jsonContent, password);
  
  // Create a package that includes the encrypted data and metadata
  const package_ = {
    type: "promptforge-encrypted-export",
    ...result.data,
  };
  
  return {
    encryptedPackage: JSON.stringify(package_, null, 2),
    metadata: {
      originalSize: result.originalSize,
      encryptedSize: result.encryptedSize,
      algorithm: ALGORITHM,
      version: 1,
    },
  };
}

/**
 * Decrypt an encrypted export package
 */
export function decryptExportPackage(
  encryptedPackage: string,
  password: string
): string {
  const package_ = JSON.parse(encryptedPackage);
  
  if (package_.type !== "promptforge-encrypted-export") {
    throw new Error("Invalid encrypted export package");
  }
  
  const encryptedData: EncryptedData = {
    encrypted: package_.encrypted,
    iv: package_.iv,
    salt: package_.salt,
    tag: package_.tag,
    version: package_.version,
  };
  
  return decryptDataAsString(encryptedData, password);
}

/**
 * Check if content is an encrypted export package
 */
export function isEncryptedExport(content: string): boolean {
  try {
    const parsed = JSON.parse(content);
    return parsed.type === "promptforge-encrypted-export" && isEncryptedData(parsed);
  } catch {
    return false;
  }
}
