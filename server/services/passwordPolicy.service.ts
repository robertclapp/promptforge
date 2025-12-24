import { getDb } from "../db";
import { passwordPolicies, passwordHistory } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  expirationDays: number;
  warningDays: number;
  historyCount: number;
  maxFailedAttempts: number;
  lockoutDurationMinutes: number;
}

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  strength: "weak" | "fair" | "good" | "strong";
  score: number;
}

const DEFAULT_POLICY: PasswordPolicy = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: false,
  expirationDays: 0,
  warningDays: 14,
  historyCount: 5,
  maxFailedAttempts: 5,
  lockoutDurationMinutes: 15,
};

/**
 * Get password policy for an organization
 */
export async function getPasswordPolicy(organizationId: string): Promise<PasswordPolicy> {
  const db = await getDb();
  if (!db) return DEFAULT_POLICY;

  const [policy] = await db
    .select()
    .from(passwordPolicies)
    .where(eq(passwordPolicies.organizationId, organizationId))
    .limit(1);

  if (!policy) {
    return DEFAULT_POLICY;
  }

  return {
    minLength: policy.minLength,
    maxLength: policy.maxLength,
    requireUppercase: policy.requireUppercase,
    requireLowercase: policy.requireLowercase,
    requireNumbers: policy.requireNumbers,
    requireSpecialChars: policy.requireSpecialChars,
    expirationDays: policy.expirationDays,
    warningDays: policy.warningDays,
    historyCount: policy.historyCount,
    maxFailedAttempts: policy.maxFailedAttempts,
    lockoutDurationMinutes: policy.lockoutDurationMinutes,
  };
}

/**
 * Update password policy for an organization
 */
export async function updatePasswordPolicy(
  organizationId: string,
  updates: Partial<PasswordPolicy>
): Promise<PasswordPolicy> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [existing] = await db
    .select()
    .from(passwordPolicies)
    .where(eq(passwordPolicies.organizationId, organizationId))
    .limit(1);

  if (existing) {
    await db
      .update(passwordPolicies)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(passwordPolicies.id, existing.id));
  } else {
    await db.insert(passwordPolicies).values({
      id: uuidv4(),
      organizationId,
      ...DEFAULT_POLICY,
      ...updates,
    });
  }

  return getPasswordPolicy(organizationId);
}

/**
 * Validate a password against the policy
 */
export function validatePassword(
  password: string,
  policy: PasswordPolicy
): PasswordValidationResult {
  const errors: string[] = [];
  let score = 0;

  // Length checks
  if (password.length < policy.minLength) {
    errors.push(`Password must be at least ${policy.minLength} characters`);
  } else {
    score += 20;
  }

  if (password.length > policy.maxLength) {
    errors.push(`Password must be no more than ${policy.maxLength} characters`);
  }

  // Uppercase check
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  } else if (/[A-Z]/.test(password)) {
    score += 20;
  }

  // Lowercase check
  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  } else if (/[a-z]/.test(password)) {
    score += 20;
  }

  // Numbers check
  if (policy.requireNumbers && !/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  } else if (/[0-9]/.test(password)) {
    score += 20;
  }

  // Special characters check
  if (policy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("Password must contain at least one special character");
  } else if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 20;
  }

  // Bonus points for length
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;

  // Cap score at 100
  score = Math.min(100, score);

  // Determine strength
  let strength: "weak" | "fair" | "good" | "strong";
  if (score < 40) {
    strength = "weak";
  } else if (score < 60) {
    strength = "fair";
  } else if (score < 80) {
    strength = "good";
  } else {
    strength = "strong";
  }

  return {
    valid: errors.length === 0,
    errors,
    strength,
    score,
  };
}

/**
 * Hash a password for history storage
 */
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

/**
 * Check if password was used recently
 */
export async function isPasswordInHistory(
  userId: string,
  password: string,
  historyCount: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const history = await db
    .select()
    .from(passwordHistory)
    .where(eq(passwordHistory.userId, userId))
    .orderBy(desc(passwordHistory.createdAt))
    .limit(historyCount);

  const passwordHash = hashPassword(password);
  return history.some((h) => h.passwordHash === passwordHash);
}

/**
 * Add password to history
 */
export async function addPasswordToHistory(
  userId: string,
  password: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const passwordHash = hashPassword(password);

  await db.insert(passwordHistory).values({
    id: uuidv4(),
    userId,
    passwordHash,
  });
}

/**
 * Clean up old password history entries
 */
export async function cleanupPasswordHistory(
  userId: string,
  keepCount: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const history = await db
    .select({ id: passwordHistory.id })
    .from(passwordHistory)
    .where(eq(passwordHistory.userId, userId))
    .orderBy(desc(passwordHistory.createdAt));

  // Delete entries beyond the keep count
  const toDelete = history.slice(keepCount);
  for (const entry of toDelete) {
    await db
      .delete(passwordHistory)
      .where(eq(passwordHistory.id, entry.id));
  }
}

/**
 * Get password strength requirements as a human-readable list
 */
export function getPasswordRequirements(policy: PasswordPolicy): string[] {
  const requirements: string[] = [];

  requirements.push(`At least ${policy.minLength} characters`);
  
  if (policy.requireUppercase) {
    requirements.push("At least one uppercase letter (A-Z)");
  }
  
  if (policy.requireLowercase) {
    requirements.push("At least one lowercase letter (a-z)");
  }
  
  if (policy.requireNumbers) {
    requirements.push("At least one number (0-9)");
  }
  
  if (policy.requireSpecialChars) {
    requirements.push("At least one special character (!@#$%^&*...)");
  }

  return requirements;
}

/**
 * Calculate password strength score for UI display
 */
export function calculatePasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;

  // Length scoring
  if (password.length >= 8) score += 20;
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;

  // Character variety
  if (/[a-z]/.test(password)) score += 15;
  if (/[A-Z]/.test(password)) score += 15;
  if (/[0-9]/.test(password)) score += 15;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 15;

  // Cap at 100
  score = Math.min(100, score);

  let label: string;
  let color: string;

  if (score < 30) {
    label = "Very Weak";
    color = "red";
  } else if (score < 50) {
    label = "Weak";
    color = "orange";
  } else if (score < 70) {
    label = "Fair";
    color = "yellow";
  } else if (score < 90) {
    label = "Good";
    color = "blue";
  } else {
    label = "Strong";
    color = "green";
  }

  return { score, label, color };
}
