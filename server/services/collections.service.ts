/**
 * Collections Service
 * Manages prompt collections/folders
 */

import { eq, and, desc, asc, or, isNull, sql } from "drizzle-orm";
import { getDb } from "../db";
import { collections, promptCollections, collectionShares, prompts } from "../../drizzle/schema";
import { nanoid } from "nanoid";

interface CreateCollectionInput {
  userId: string;
  organizationId?: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  parentId?: string;
}

interface UpdateCollectionInput {
  id: string;
  userId: string;
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  parentId?: string;
  sortOrder?: number;
}

// Create a new collection
export async function createCollection(input: CreateCollectionInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const id = nanoid();

  await db.insert(collections).values({
    id,
    userId: input.userId,
    organizationId: input.organizationId,
    name: input.name,
    description: input.description,
    color: input.color || "#6366f1",
    icon: input.icon || "folder",
    parentId: input.parentId,
    sortOrder: 0,
    isShared: false,
    isDefault: false,
  });

  return { id };
}

// Get all collections for a user
export async function getUserCollections(userId: string, organizationId?: string) {
  const db = await getDb();
  if (!db) return [];

  const conditions = organizationId
    ? or(
        eq(collections.userId, userId),
        eq(collections.organizationId, organizationId)
      )
    : eq(collections.userId, userId);

  const result = await db
    .select()
    .from(collections)
    .where(conditions)
    .orderBy(asc(collections.sortOrder), asc(collections.name));

  // Build tree structure
  const collectionMap = new Map<string, any>();
  const rootCollections: any[] = [];

  for (const collection of result) {
    collectionMap.set(collection.id, { ...collection, children: [] });
  }

  for (const collection of result) {
    const item = collectionMap.get(collection.id);
    if (collection.parentId && collectionMap.has(collection.parentId)) {
      collectionMap.get(collection.parentId).children.push(item);
    } else {
      rootCollections.push(item);
    }
  }

  return rootCollections;
}

// Get a single collection with prompts
export async function getCollectionWithPrompts(collectionId: string, userId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const collection = await db
    .select()
    .from(collections)
    .where(eq(collections.id, collectionId))
    .limit(1);

  if (collection.length === 0) {
    throw new Error("Collection not found");
  }

  // Get prompts in this collection
  const promptsInCollection = await db
    .select({
      promptId: promptCollections.promptId,
      sortOrder: promptCollections.sortOrder,
      addedAt: promptCollections.createdAt,
      prompt: {
        id: prompts.id,
        name: prompts.name,
        description: prompts.description,
        tags: prompts.tags,
        updatedAt: prompts.updatedAt,
      },
    })
    .from(promptCollections)
    .innerJoin(prompts, eq(promptCollections.promptId, prompts.id))
    .where(eq(promptCollections.collectionId, collectionId))
    .orderBy(asc(promptCollections.sortOrder));

  return {
    ...collection[0],
    prompts: promptsInCollection.map((p) => ({
      ...p.prompt,
      sortOrder: p.sortOrder,
      addedAt: p.addedAt,
    })),
  };
}

// Update a collection
export async function updateCollection(input: UpdateCollectionInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(collections)
    .where(and(eq(collections.id, input.id), eq(collections.userId, input.userId)))
    .limit(1);

  if (existing.length === 0) {
    throw new Error("Collection not found or you don't have permission");
  }

  const updates: any = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.description !== undefined) updates.description = input.description;
  if (input.color !== undefined) updates.color = input.color;
  if (input.icon !== undefined) updates.icon = input.icon;
  if (input.parentId !== undefined) updates.parentId = input.parentId;
  if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder;

  await db
    .update(collections)
    .set(updates)
    .where(eq(collections.id, input.id));

  return { success: true };
}

// Delete a collection
export async function deleteCollection(collectionId: string, userId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(collections)
    .where(and(eq(collections.id, collectionId), eq(collections.userId, userId)))
    .limit(1);

  if (existing.length === 0) {
    throw new Error("Collection not found or you don't have permission");
  }

  // Delete prompt associations
  await db
    .delete(promptCollections)
    .where(eq(promptCollections.collectionId, collectionId));

  // Delete shares
  await db
    .delete(collectionShares)
    .where(eq(collectionShares.collectionId, collectionId));

  // Delete the collection
  await db.delete(collections).where(eq(collections.id, collectionId));

  return { success: true };
}

// Add prompt to collection
export async function addPromptToCollection(
  promptId: string,
  collectionId: string,
  userId: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if already exists
  const existing = await db
    .select()
    .from(promptCollections)
    .where(
      and(
        eq(promptCollections.promptId, promptId),
        eq(promptCollections.collectionId, collectionId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return { success: true, message: "Prompt already in collection" };
  }

  // Get max sort order
  const maxOrder = await db
    .select({ max: sql<number>`MAX(${promptCollections.sortOrder})` })
    .from(promptCollections)
    .where(eq(promptCollections.collectionId, collectionId));

  const sortOrder = (maxOrder[0]?.max || 0) + 1;

  await db.insert(promptCollections).values({
    id: nanoid(),
    promptId,
    collectionId,
    addedBy: userId,
    sortOrder,
  });

  return { success: true };
}

// Remove prompt from collection
export async function removePromptFromCollection(
  promptId: string,
  collectionId: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(promptCollections)
    .where(
      and(
        eq(promptCollections.promptId, promptId),
        eq(promptCollections.collectionId, collectionId)
      )
    );

  return { success: true };
}

// Move prompt within collection (reorder)
export async function reorderPromptInCollection(
  promptId: string,
  collectionId: string,
  newSortOrder: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(promptCollections)
    .set({ sortOrder: newSortOrder })
    .where(
      and(
        eq(promptCollections.promptId, promptId),
        eq(promptCollections.collectionId, collectionId)
      )
    );

  return { success: true };
}

// Share collection with user
export async function shareCollection(
  collectionId: string,
  sharedBy: string,
  sharedWithUserId?: string,
  sharedWithOrgId?: string,
  permission: "view" | "edit" = "view"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(collectionShares).values({
    id: nanoid(),
    collectionId,
    sharedWithUserId,
    sharedWithOrgId,
    permission,
    sharedBy,
  });

  // Mark collection as shared
  await db
    .update(collections)
    .set({ isShared: true })
    .where(eq(collections.id, collectionId));

  return { success: true };
}

// Get collections containing a prompt
export async function getCollectionsForPrompt(promptId: string, userId: string) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      collectionId: promptCollections.collectionId,
      collection: {
        id: collections.id,
        name: collections.name,
        color: collections.color,
        icon: collections.icon,
      },
    })
    .from(promptCollections)
    .innerJoin(collections, eq(promptCollections.collectionId, collections.id))
    .where(
      and(
        eq(promptCollections.promptId, promptId),
        eq(collections.userId, userId)
      )
    );

  return result.map((r) => r.collection);
}

// Get collection count
export async function getCollectionCount(userId: string, organizationId?: string) {
  const db = await getDb();
  if (!db) return 0;

  const conditions = organizationId
    ? or(
        eq(collections.userId, userId),
        eq(collections.organizationId, organizationId)
      )
    : eq(collections.userId, userId);

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(collections)
    .where(conditions);

  return result[0]?.count || 0;
}
