import { describe, it, expect, vi } from "vitest";
import {
  encryptData,
  decryptData,
  isEncryptedData,
  validatePasswordStrength,
  type EncryptedData,
} from "../services/exportEncryption.service";

describe("Export Encryption Service", () => {
  describe("encryptData", () => {
    it("should encrypt data with a password", () => {
      const data = "Hello, World!";
      const password = "SecurePassword123!";
      
      const result = encryptData(data, password);
      
      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.data.encrypted).toBeDefined();
      expect(result.originalSize).toBe(data.length);
    });

    it("should produce different ciphertext for same plaintext (due to random IV)", () => {
      const data = "Hello, World!";
      const password = "SecurePassword123!";
      
      const result1 = encryptData(data, password);
      const result2 = encryptData(data, password);
      
      // Due to random IV, same plaintext should produce different ciphertext
      expect(result1.data.encrypted).not.toBe(result2.data.encrypted);
    });

    it("should handle empty string", () => {
      const data = "";
      const password = "SecurePassword123!";
      
      const result = encryptData(data, password);
      
      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
    });

    it("should handle unicode characters", () => {
      const data = "Hello, 世界! 🌍";
      const password = "SecurePassword123!";
      
      const result = encryptData(data, password);
      const decrypted = decryptData(result.data, password);
      
      expect(decrypted.toString("utf-8")).toBe(data);
    });

    it("should handle large data", () => {
      const data = "x".repeat(100000);
      const password = "SecurePassword123!";
      
      const result = encryptData(data, password);
      const decrypted = decryptData(result.data, password);
      
      expect(decrypted.toString("utf-8")).toBe(data);
    });
  });

  describe("decryptData", () => {
    it("should decrypt data with correct password", () => {
      const data = "Hello, World!";
      const password = "SecurePassword123!";
      
      const result = encryptData(data, password);
      const decrypted = decryptData(result.data, password);
      
      expect(decrypted.toString("utf-8")).toBe(data);
    });

    it("should throw error with incorrect password", () => {
      const data = "Hello, World!";
      const password = "SecurePassword123!";
      const wrongPassword = "WrongPassword456!";
      
      const result = encryptData(data, password);
      
      expect(() => decryptData(result.data, wrongPassword)).toThrow();
    });

    it("should throw error with invalid encrypted data", () => {
      const invalidData: EncryptedData = {
        encrypted: "not-valid",
        iv: "not-valid",
        salt: "not-valid",
        tag: "not-valid",
        version: 1,
      };
      const password = "SecurePassword123!";
      
      expect(() => decryptData(invalidData, password)).toThrow();
    });

    it("should throw error with tampered data", () => {
      const data = "Hello, World!";
      const password = "SecurePassword123!";
      
      const result = encryptData(data, password);
      // Tamper with the encrypted data
      const tampered: EncryptedData = {
        ...result.data,
        encrypted: result.data.encrypted.slice(0, -10) + "0000000000",
      };
      
      expect(() => decryptData(tampered, password)).toThrow();
    });
  });

  describe("isEncryptedData", () => {
    it("should return true for encrypted data", () => {
      const data = "Hello, World!";
      const password = "SecurePassword123!";
      
      const result = encryptData(data, password);
      
      expect(isEncryptedData(result.data)).toBe(true);
    });

    it("should return false for plain text", () => {
      const plainText = "Hello, World!";
      
      expect(isEncryptedData(plainText)).toBe(false);
    });

    it("should return false for JSON data", () => {
      const jsonData = JSON.stringify({ hello: "world" });
      
      expect(isEncryptedData(jsonData)).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(isEncryptedData("")).toBe(false);
    });
  });

  describe("validatePasswordStrength", () => {
    it("should return low score for short passwords", () => {
      const result = validatePasswordStrength("abc");
      expect(result.score).toBeLessThan(50);
      expect(result.isStrong).toBe(false);
    });

    it("should return low score for passwords without variety", () => {
      const result = validatePasswordStrength("password");
      expect(result.score).toBeLessThan(70);
      expect(result.isStrong).toBe(false);
    });

    it("should return medium score for passwords with some variety", () => {
      const result = validatePasswordStrength("Password1");
      expect(result.score).toBeGreaterThanOrEqual(50);
    });

    it("should return high score for passwords with good variety", () => {
      const result = validatePasswordStrength("Password1!");
      expect(result.score).toBeGreaterThanOrEqual(70);
    });

    it("should return strong for long passwords with variety", () => {
      const result = validatePasswordStrength("MySecurePassword123!@#");
      expect(result.isStrong).toBe(true);
    });

    it("should handle empty password", () => {
      const result = validatePasswordStrength("");
      expect(result.score).toBe(0);
      expect(result.isStrong).toBe(false);
    });
  });

  describe("Round-trip encryption", () => {
    it("should preserve JSON structure", () => {
      const data = JSON.stringify({
        prompts: [
          { id: "1", name: "Test Prompt", content: "Hello {{name}}" },
          { id: "2", name: "Another Prompt", content: "Goodbye {{name}}" },
        ],
        metadata: {
          version: "1.0",
          exportedAt: new Date().toISOString(),
        },
      });
      const password = "SecurePassword123!";
      
      const result = encryptData(data, password);
      const decrypted = decryptData(result.data, password);
      
      expect(JSON.parse(decrypted.toString("utf-8"))).toEqual(JSON.parse(data));
    });

    it("should work with special characters in password", () => {
      const data = "Test data";
      const password = "P@$$w0rd!#$%^&*()_+-=[]{}|;':\",./<>?";
      
      const result = encryptData(data, password);
      const decrypted = decryptData(result.data, password);
      
      expect(decrypted.toString("utf-8")).toBe(data);
    });

    it("should work with unicode password", () => {
      const data = "Test data";
      const password = "密码123!";
      
      const result = encryptData(data, password);
      const decrypted = decryptData(result.data, password);
      
      expect(decrypted.toString("utf-8")).toBe(data);
    });
  });
});
