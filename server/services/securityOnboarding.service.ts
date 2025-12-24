import { getDb } from "../db";
import { 
  securityOnboarding, 
  twoFactorSettings,
  ipAllowlistSettings,
  securityAlertSettings,
  passwordPolicies,
  organizationMemberships
} from "../../drizzle/schema";
import { eq, and, count } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  action: string;
  actionUrl: string;
  priority: "high" | "medium" | "low";
}

export interface OnboardingProgress {
  id: string;
  organizationId: string;
  steps: OnboardingStep[];
  completedCount: number;
  totalCount: number;
  percentComplete: number;
  isCompleted: boolean;
  isDismissed: boolean;
}

/**
 * Get or create onboarding progress for a workspace
 */
export async function getOnboardingProgress(
  organizationId: string,
  userId: string
): Promise<OnboardingProgress> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get or create onboarding record
  let [onboarding] = await db
    .select()
    .from(securityOnboarding)
    .where(eq(securityOnboarding.organizationId, organizationId))
    .limit(1);

  if (!onboarding) {
    const id = uuidv4();
    await db.insert(securityOnboarding).values({
      id,
      organizationId,
      userId,
      twoFactorSetup: false,
      ipAllowlistSetup: false,
      securityAlertsSetup: false,
      passwordPolicySetup: false,
      teamRolesReviewed: false,
      auditLoggingReviewed: false,
      isCompleted: false,
      isDismissed: false,
    });

    [onboarding] = await db
      .select()
      .from(securityOnboarding)
      .where(eq(securityOnboarding.id, id))
      .limit(1);
  }

  // Check actual completion status from related tables
  const [
    twoFactorStatus,
    ipAllowlistStatus,
    alertsStatus,
    passwordPolicyStatus,
    teamMembersCount,
  ] = await Promise.all([
    // Check if any user in the org has 2FA enabled
    checkTwoFactorSetup(organizationId),
    // Check if IP allowlist is configured
    checkIpAllowlistSetup(organizationId),
    // Check if security alerts are configured
    checkSecurityAlertsSetup(organizationId),
    // Check if password policy is customized
    checkPasswordPolicySetup(organizationId),
    // Get team member count for role review
    getTeamMemberCount(organizationId),
  ]);

  // Build steps
  const steps: OnboardingStep[] = [
    {
      id: "two_factor",
      title: "Enable Two-Factor Authentication",
      description: "Protect your account with TOTP-based 2FA for an extra layer of security",
      completed: twoFactorStatus,
      action: "Set up 2FA",
      actionUrl: "/two-factor",
      priority: "high",
    },
    {
      id: "ip_allowlist",
      title: "Configure IP Allowlisting",
      description: "Restrict access to your workspace from specific IP addresses or ranges",
      completed: ipAllowlistStatus,
      action: "Configure IPs",
      actionUrl: "/ip-allowlist",
      priority: "medium",
    },
    {
      id: "security_alerts",
      title: "Set Up Security Alerts",
      description: "Get notified when suspicious activity is detected in your workspace",
      completed: alertsStatus,
      action: "Configure Alerts",
      actionUrl: "/security-settings",
      priority: "high",
    },
    {
      id: "password_policy",
      title: "Configure Password Policy",
      description: "Set password requirements for your team members",
      completed: passwordPolicyStatus,
      action: "Set Policy",
      actionUrl: "/password-policy",
      priority: "medium",
    },
    {
      id: "team_roles",
      title: "Review Team Roles",
      description: `Review and assign appropriate roles to your ${teamMembersCount} team members`,
      completed: onboarding.teamRolesReviewed,
      action: "Review Roles",
      actionUrl: "/teams",
      priority: "medium",
    },
    {
      id: "audit_logging",
      title: "Review Audit Logs",
      description: "Familiarize yourself with the audit logging system for compliance",
      completed: onboarding.auditLoggingReviewed,
      action: "View Logs",
      actionUrl: "/audit-logs",
      priority: "low",
    },
  ];

  const completedCount = steps.filter(s => s.completed).length;
  const totalCount = steps.length;
  const percentComplete = Math.round((completedCount / totalCount) * 100);
  const isCompleted = completedCount === totalCount;

  // Update onboarding record if completion status changed
  if (isCompleted !== onboarding.isCompleted) {
    await db
      .update(securityOnboarding)
      .set({
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
        twoFactorSetup: twoFactorStatus,
        ipAllowlistSetup: ipAllowlistStatus,
        securityAlertsSetup: alertsStatus,
        passwordPolicySetup: passwordPolicyStatus,
      })
      .where(eq(securityOnboarding.id, onboarding.id));
  }

  return {
    id: onboarding.id,
    organizationId,
    steps,
    completedCount,
    totalCount,
    percentComplete,
    isCompleted,
    isDismissed: onboarding.isDismissed,
  };
}

/**
 * Mark a step as completed
 */
export async function markStepCompleted(
  organizationId: string,
  stepId: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const [onboarding] = await db
    .select()
    .from(securityOnboarding)
    .where(eq(securityOnboarding.organizationId, organizationId))
    .limit(1);

  if (!onboarding) return;

  const updates: Record<string, boolean> = {};
  
  switch (stepId) {
    case "team_roles":
      updates.teamRolesReviewed = true;
      break;
    case "audit_logging":
      updates.auditLoggingReviewed = true;
      break;
    // Other steps are auto-detected from their respective tables
  }

  if (Object.keys(updates).length > 0) {
    await db
      .update(securityOnboarding)
      .set(updates)
      .where(eq(securityOnboarding.id, onboarding.id));
  }
}

/**
 * Dismiss the onboarding checklist
 */
export async function dismissOnboarding(organizationId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .update(securityOnboarding)
    .set({
      isDismissed: true,
      dismissedAt: new Date(),
    })
    .where(eq(securityOnboarding.organizationId, organizationId));
}

/**
 * Reset onboarding (show it again)
 */
export async function resetOnboarding(organizationId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .update(securityOnboarding)
    .set({
      isDismissed: false,
      dismissedAt: null,
    })
    .where(eq(securityOnboarding.organizationId, organizationId));
}

// Helper functions to check setup status

async function checkTwoFactorSetup(organizationId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  // Check if any member of the org has 2FA enabled
  const members = await db
    .select({ userId: organizationMemberships.userId })
    .from(organizationMemberships)
    .where(eq(organizationMemberships.organizationId, organizationId));

  for (const member of members) {
    const [settings] = await db
      .select()
      .from(twoFactorSettings)
      .where(and(
        eq(twoFactorSettings.userId, member.userId),
        eq(twoFactorSettings.enabled, true)
      ))
      .limit(1);

    if (settings) return true;
  }

  return false;
}

async function checkIpAllowlistSetup(organizationId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const [settings] = await db
    .select()
    .from(ipAllowlistSettings)
    .where(and(
      eq(ipAllowlistSettings.organizationId, organizationId),
      eq(ipAllowlistSettings.enabled, true)
    ))
    .limit(1);

  return !!settings;
}

async function checkSecurityAlertsSetup(organizationId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const [settings] = await db
    .select()
    .from(securityAlertSettings)
    .where(and(
      eq(securityAlertSettings.organizationId, organizationId),
      eq(securityAlertSettings.enabled, true)
    ))
    .limit(1);

  return !!settings;
}

async function checkPasswordPolicySetup(organizationId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const [policy] = await db
    .select()
    .from(passwordPolicies)
    .where(eq(passwordPolicies.organizationId, organizationId))
    .limit(1);

  return !!policy;
}

async function getTeamMemberCount(organizationId: string): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const [result] = await db
    .select({ count: count() })
    .from(organizationMemberships)
    .where(eq(organizationMemberships.organizationId, organizationId));

  return result?.count || 0;
}
