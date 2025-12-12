import { eq, and, or, desc, like, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  organizations,
  InsertOrganization,
  organizationMemberships,
  InsertOrganizationMembership,
  aiProviders,
  InsertAIProvider,
  prompts,
  InsertPrompt,
  promptVersions,
  InsertPromptVersion,
  contextPackages,
  InsertContextPackage,
  evaluations,
  InsertEvaluation,
  evaluationResults,
  InsertEvaluationResult,
  analyticsEvents,
  InsertAnalyticsEvent,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { randomUUID } from "crypto";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============= USER FUNCTIONS =============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.id) {
    throw new Error("User ID is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      id: user.id,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role === undefined) {
      if (user.id === ENV.ownerId) {
        user.role = "admin";
        values.role = "admin";
        updateSet.role = "admin";
      }
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUser(id: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserApiUsage(userId: string, increment: number = 1) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(users)
    .set({ apiCallsUsed: sql`${users.apiCallsUsed} + ${increment}` })
    .where(eq(users.id, userId));
}

// ============= ORGANIZATION FUNCTIONS =============

export async function createOrganization(org: Omit<InsertOrganization, "id">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const id = randomUUID();
  await db.insert(organizations).values({ ...org, id });
  return id;
}

export async function getOrganization(id: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserOrganizations(userId: string) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      organization: organizations,
      membership: organizationMemberships,
    })
    .from(organizationMemberships)
    .innerJoin(organizations, eq(organizationMemberships.organizationId, organizations.id))
    .where(
      and(
        eq(organizationMemberships.userId, userId),
        eq(organizationMemberships.isActive, true),
        eq(organizations.isActive, true)
      )
    );

  return result;
}

export async function addOrganizationMember(
  membership: Omit<InsertOrganizationMembership, "id">
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const id = randomUUID();
  await db.insert(organizationMemberships).values({ ...membership, id });
  return id;
}

export async function getOrganizationMembership(userId: string, organizationId: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(organizationMemberships)
    .where(
      and(
        eq(organizationMemberships.userId, userId),
        eq(organizationMemberships.organizationId, organizationId),
        eq(organizationMemberships.isActive, true)
      )
    )
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============= AI PROVIDER FUNCTIONS =============

export async function createAIProvider(provider: Omit<InsertAIProvider, "id">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const id = randomUUID();
  await db.insert(aiProviders).values({ ...provider, id });
  return id;
}

export async function getAIProvider(id: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(aiProviders).where(eq(aiProviders.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserAIProviders(userId: string, organizationId?: string) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(aiProviders.userId, userId), eq(aiProviders.isActive, true)];

  if (organizationId) {
    conditions.push(eq(aiProviders.organizationId, organizationId));
  }

  const result = await db
    .select()
    .from(aiProviders)
    .where(and(...conditions))
    .orderBy(desc(aiProviders.createdAt));

  return result;
}

export async function updateAIProvider(id: string, updates: Partial<InsertAIProvider>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(aiProviders).set(updates).where(eq(aiProviders.id, id));
}

export async function deleteAIProvider(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(aiProviders).set({ isActive: false }).where(eq(aiProviders.id, id));
}

// ============= PROMPT FUNCTIONS =============

export async function createPrompt(prompt: Omit<InsertPrompt, "id">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const id = randomUUID();
  await db.insert(prompts).values({ ...prompt, id });
  return id;
}

export async function getPrompt(id: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(prompts).where(eq(prompts.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserPrompts(
  userId: string,
  options?: {
    organizationId?: string;
    search?: string;
    tags?: string[];
    isTemplate?: boolean;
    limit?: number;
    offset?: number;
  }
) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(prompts.isActive, true)];

  // User can see their own prompts or public prompts
  conditions.push(or(eq(prompts.userId, userId), eq(prompts.isPublic, true))!);

  if (options?.organizationId) {
    conditions.push(eq(prompts.organizationId, options.organizationId));
  }

  if (options?.search) {
    // Escape special LIKE characters to prevent SQL injection
    const escapedSearch = options.search
      .replace(/\\/g, '\\\\')
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_');
    const searchPattern = `%${escapedSearch}%`;
    conditions.push(
      or(
        like(prompts.name, searchPattern),
        like(prompts.description, searchPattern),
        like(prompts.content, searchPattern)
      )!
    );
  }

  if (options?.isTemplate !== undefined) {
    conditions.push(eq(prompts.isTemplate, options.isTemplate));
  }

  let query = db
    .select()
    .from(prompts)
    .where(and(...conditions))
    .orderBy(desc(prompts.updatedAt));

  if (options?.limit) {
    query = query.limit(options.limit) as any;
  }

  if (options?.offset) {
    query = query.offset(options.offset) as any;
  }

  const result = await query;
  return result;
}

export async function updatePrompt(id: string, updates: Partial<InsertPrompt>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(prompts).set(updates).where(eq(prompts.id, id));
}

export async function deletePrompt(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(prompts).set({ isActive: false }).where(eq(prompts.id, id));
}

// ============= PROMPT VERSION FUNCTIONS =============

export async function createPromptVersion(version: Omit<InsertPromptVersion, "id">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const id = randomUUID();
  await db.insert(promptVersions).values({ ...version, id });
  return id;
}

export async function getPromptVersions(promptId: string) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(promptVersions)
    .where(eq(promptVersions.promptId, promptId))
    .orderBy(desc(promptVersions.version));

  return result;
}

// ============= CONTEXT PACKAGE FUNCTIONS =============

export async function createContextPackage(pkg: Omit<InsertContextPackage, "id">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const id = randomUUID();
  await db.insert(contextPackages).values({ ...pkg, id });
  return id;
}

export async function getContextPackage(id: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(contextPackages)
    .where(eq(contextPackages.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserContextPackages(userId: string, organizationId?: string) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(contextPackages.isActive, true)];
  conditions.push(or(eq(contextPackages.userId, userId), eq(contextPackages.isPublic, true))!);

  if (organizationId) {
    conditions.push(eq(contextPackages.organizationId, organizationId));
  }

  const result = await db
    .select()
    .from(contextPackages)
    .where(and(...conditions))
    .orderBy(desc(contextPackages.updatedAt));

  return result;
}

export async function updateContextPackage(id: string, updates: Partial<InsertContextPackage>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(contextPackages).set(updates).where(eq(contextPackages.id, id));
}

export async function deleteContextPackage(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(contextPackages).set({ isActive: false }).where(eq(contextPackages.id, id));
}

// ============= EVALUATION FUNCTIONS =============

export async function createEvaluation(evaluation: Omit<InsertEvaluation, "id">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const id = randomUUID();
  await db.insert(evaluations).values({ ...evaluation, id });
  return id;
}

export async function getEvaluation(id: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(evaluations).where(eq(evaluations.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserEvaluations(
  userId: string,
  options?: {
    organizationId?: string;
    promptId?: string;
    status?: "pending" | "running" | "completed" | "failed";
    limit?: number;
    offset?: number;
  }
) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(evaluations.userId, userId)];

  if (options?.organizationId) {
    conditions.push(eq(evaluations.organizationId, options.organizationId));
  }

  if (options?.promptId) {
    conditions.push(eq(evaluations.promptId, options.promptId));
  }

  if (options?.status) {
    conditions.push(eq(evaluations.status, options.status));
  }

  let query = db
    .select()
    .from(evaluations)
    .where(and(...conditions))
    .orderBy(desc(evaluations.createdAt));

  if (options?.limit) {
    query = query.limit(options.limit) as any;
  }

  if (options?.offset) {
    query = query.offset(options.offset) as any;
  }

  const result = await query;
  return result;
}

export async function updateEvaluation(id: string, updates: Partial<InsertEvaluation>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(evaluations).set(updates).where(eq(evaluations.id, id));
}

export async function deleteEvaluation(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(evaluations).where(eq(evaluations.id, id));
}

// ============= EVALUATION RESULT FUNCTIONS =============

export async function createEvaluationResult(result: Omit<InsertEvaluationResult, "id">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const id = randomUUID();
  await db.insert(evaluationResults).values({ ...result, id });
  return id;
}

export async function getEvaluationResults(evaluationId: string) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(evaluationResults)
    .where(eq(evaluationResults.evaluationId, evaluationId))
    .orderBy(evaluationResults.testCaseIndex);

  return result;
}

export async function deleteEvaluationResults(evaluationId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(evaluationResults).where(eq(evaluationResults.evaluationId, evaluationId));
}

// ============= ANALYTICS FUNCTIONS =============

export async function trackEvent(event: Omit<InsertAnalyticsEvent, "id">) {
  const db = await getDb();
  if (!db) return;

  const id = randomUUID();
  await db.insert(analyticsEvents).values({ ...event, id });
}

export async function getUserAnalytics(userId: string, days: number = 30) {
  const db = await getDb();
  if (!db) return [];

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const result = await db
    .select()
    .from(analyticsEvents)
    .where(and(eq(analyticsEvents.userId, userId), sql`${analyticsEvents.createdAt} >= ${startDate}`))
    .orderBy(desc(analyticsEvents.createdAt));

  return result;
}

