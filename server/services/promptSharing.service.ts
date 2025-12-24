/**
 * Prompt Sharing Service
 * Handles creating and managing shared prompt links
 */

import { v4 as uuidv4 } from "uuid";
import { eq, and, desc, sql } from "drizzle-orm";
import { getDb } from "../db";
import {
  sharedPrompts,
  sharedPromptForks,
  sharedPromptViews,
  prompts,
  promptVersions,
} from "../../drizzle/schema";
import crypto from "crypto";

/**
 * Generate a short unique share code
 */
function generateShareCode(): string {
  return crypto.randomBytes(8).toString("base64url").slice(0, 12);
}

/**
 * Hash password for storage
 */
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export interface CreateShareInput {
  promptId: string;
  userId: string;
  title?: string;
  description?: string;
  accessLevel: "view" | "fork";
  password?: string;
  expiresInDays?: number;
}

export interface ShareInfo {
  id: string;
  shareCode: string;
  shareUrl: string;
  title: string;
  description: string | null;
  accessLevel: "view" | "fork";
  hasPassword: boolean;
  expiresAt: Date | null;
  viewCount: number;
  forkCount: number;
  createdAt: Date | null;
}

/**
 * Create a shared link for a prompt
 */
export async function createShare(input: CreateShareInput): Promise<ShareInfo> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get the prompt to share
  const prompt = await db
    .select()
    .from(prompts)
    .where(eq(prompts.id, input.promptId))
    .limit(1);

  if (!prompt[0]) {
    throw new Error("Prompt not found");
  }

  // Verify ownership
  if (prompt[0].userId !== input.userId) {
    throw new Error("You can only share your own prompts");
  }

  const id = uuidv4();
  const shareCode = generateShareCode();
  const expiresAt = input.expiresInDays
    ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  await db.insert(sharedPrompts).values({
    id,
    promptId: input.promptId,
    userId: input.userId,
    shareCode,
    title: input.title || prompt[0].name,
    description: input.description || prompt[0].description,
    accessLevel: input.accessLevel,
    password: input.password ? hashPassword(input.password) : null,
    expiresAt,
    viewCount: 0,
    forkCount: 0,
    isActive: true,
  });

  return {
    id,
    shareCode,
    shareUrl: `/shared/${shareCode}`,
    title: input.title || prompt[0].name,
    description: input.description || prompt[0].description,
    accessLevel: input.accessLevel,
    hasPassword: !!input.password,
    expiresAt,
    viewCount: 0,
    forkCount: 0,
    createdAt: new Date(),
  };
}

/**
 * Get shared prompt by share code (public access)
 */
export async function getSharedPrompt(shareCode: string, password?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const shared = await db
    .select()
    .from(sharedPrompts)
    .where(
      and(eq(sharedPrompts.shareCode, shareCode), eq(sharedPrompts.isActive, true))
    )
    .limit(1);

  if (!shared[0]) {
    throw new Error("Shared prompt not found");
  }

  // Check expiration
  if (shared[0].expiresAt && new Date(shared[0].expiresAt) < new Date()) {
    throw new Error("This shared link has expired");
  }

  // Check password
  if (shared[0].password) {
    if (!password) {
      return { requiresPassword: true };
    }
    if (hashPassword(password) !== shared[0].password) {
      throw new Error("Incorrect password");
    }
  }

  // Get the prompt content
  const prompt = await db
    .select()
    .from(prompts)
    .where(eq(prompts.id, shared[0].promptId))
    .limit(1);

  if (!prompt[0]) {
    throw new Error("Original prompt no longer exists");
  }

  return {
    requiresPassword: false,
    share: {
      id: shared[0].id,
      shareCode: shared[0].shareCode,
      title: shared[0].title,
      description: shared[0].description,
      accessLevel: shared[0].accessLevel,
      viewCount: shared[0].viewCount,
      forkCount: shared[0].forkCount,
      createdAt: shared[0].createdAt,
    },
    prompt: {
      id: prompt[0].id,
      name: prompt[0].name,
      description: prompt[0].description,
      content: prompt[0].content,
      variables: prompt[0].variables,
      tags: prompt[0].tags,
    },
  };
}

/**
 * Record a view of a shared prompt
 */
export async function recordView(
  shareCode: string,
  viewerIp?: string,
  userId?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const shared = await db
    .select()
    .from(sharedPrompts)
    .where(eq(sharedPrompts.shareCode, shareCode))
    .limit(1);

  if (!shared[0]) return;

  // Record view
  await db.insert(sharedPromptViews).values({
    id: uuidv4(),
    sharedPromptId: shared[0].id,
    viewerIp,
    userId,
  });

  // Increment view count
  await db
    .update(sharedPrompts)
    .set({ viewCount: sql`${sharedPrompts.viewCount} + 1` })
    .where(eq(sharedPrompts.id, shared[0].id));
}

/**
 * Fork a shared prompt to user's account
 */
export async function forkPrompt(
  shareCode: string,
  userId: string,
  organizationId?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get the shared prompt
  const shared = await db
    .select()
    .from(sharedPrompts)
    .where(
      and(eq(sharedPrompts.shareCode, shareCode), eq(sharedPrompts.isActive, true))
    )
    .limit(1);

  if (!shared[0]) {
    throw new Error("Shared prompt not found");
  }

  // Check if forking is allowed
  if (shared[0].accessLevel !== "fork") {
    throw new Error("This prompt does not allow forking");
  }

  // Check expiration
  if (shared[0].expiresAt && new Date(shared[0].expiresAt) < new Date()) {
    throw new Error("This shared link has expired");
  }

  // Get the original prompt
  const original = await db
    .select()
    .from(prompts)
    .where(eq(prompts.id, shared[0].promptId))
    .limit(1);

  if (!original[0]) {
    throw new Error("Original prompt no longer exists");
  }

  // Create the forked prompt
  const forkedId = uuidv4();
  await db.insert(prompts).values({
    id: forkedId,
    userId,
    organizationId,
    name: `${original[0].name} (Forked)`,
    description: original[0].description,
    content: original[0].content,
    variables: original[0].variables,
    tags: original[0].tags,
    folderPath: "/",
    isTemplate: false,
    isPublic: false,
    version: 1,
    isActive: true,
  });

  // Create initial version
  await db.insert(promptVersions).values({
    id: uuidv4(),
    promptId: forkedId,
    version: 1,
    content: original[0].content,
    variables: original[0].variables,
    changeMessage: `Forked from shared prompt: ${shared[0].title}`,
    createdBy: userId,
  });

  // Record the fork
  await db.insert(sharedPromptForks).values({
    id: uuidv4(),
    sharedPromptId: shared[0].id,
    forkedPromptId: forkedId,
    userId,
  });

  // Increment fork count
  await db
    .update(sharedPrompts)
    .set({ forkCount: sql`${sharedPrompts.forkCount} + 1` })
    .where(eq(sharedPrompts.id, shared[0].id));

  return {
    forkedPromptId: forkedId,
    name: `${original[0].name} (Forked)`,
  };
}

/**
 * Get user's shared prompts
 */
export async function getUserShares(userId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const shares = await db
    .select()
    .from(sharedPrompts)
    .where(and(eq(sharedPrompts.userId, userId), eq(sharedPrompts.isActive, true)))
    .orderBy(desc(sharedPrompts.createdAt));

  return shares.map((s) => ({
    id: s.id,
    shareCode: s.shareCode,
    shareUrl: `/shared/${s.shareCode}`,
    title: s.title,
    description: s.description,
    accessLevel: s.accessLevel,
    hasPassword: !!s.password,
    expiresAt: s.expiresAt,
    viewCount: s.viewCount,
    forkCount: s.forkCount,
    createdAt: s.createdAt,
  }));
}

/**
 * Delete a shared link
 */
export async function deleteShare(shareId: string, userId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const share = await db
    .select()
    .from(sharedPrompts)
    .where(eq(sharedPrompts.id, shareId))
    .limit(1);

  if (!share[0] || share[0].userId !== userId) {
    throw new Error("Share not found or unauthorized");
  }

  await db
    .update(sharedPrompts)
    .set({ isActive: false })
    .where(eq(sharedPrompts.id, shareId));

  return { success: true };
}

/**
 * Update share settings
 */
export async function updateShare(
  shareId: string,
  userId: string,
  updates: {
    title?: string;
    description?: string;
    accessLevel?: "view" | "fork";
    password?: string | null;
    expiresInDays?: number | null;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const share = await db
    .select()
    .from(sharedPrompts)
    .where(eq(sharedPrompts.id, shareId))
    .limit(1);

  if (!share[0] || share[0].userId !== userId) {
    throw new Error("Share not found or unauthorized");
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.accessLevel !== undefined) updateData.accessLevel = updates.accessLevel;
  if (updates.password !== undefined) {
    updateData.password = updates.password ? hashPassword(updates.password) : null;
  }
  if (updates.expiresInDays !== undefined) {
    updateData.expiresAt = updates.expiresInDays
      ? new Date(Date.now() + updates.expiresInDays * 24 * 60 * 60 * 1000)
      : null;
  }

  await db.update(sharedPrompts).set(updateData).where(eq(sharedPrompts.id, shareId));

  return { success: true };
}

/**
 * Generate embed code for a shared prompt
 */
export function generateEmbedCode(shareCode: string, baseUrl: string): string {
  return `<iframe src="${baseUrl}/embed/${shareCode}" width="100%" height="400" frameborder="0"></iframe>`;
}
