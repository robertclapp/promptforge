import { nanoid } from "nanoid";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { getDb } from "../db";
import {
  prompts,
  templateRatings,
  templateUsage,
  templateCategories,
  templateCategoryMappings,
  type InsertTemplateRating,
  type InsertTemplateUsage,
} from "../../drizzle/schema";

/**
 * Get all public templates (prompts marked as isPublic and isTemplate)
 */
export async function getPublicTemplates(categoryId?: string) {
  const db = await getDb();
  if (!db) return [];

  let query = db
    .select()
    .from(prompts)
    .where(and(eq(prompts.isPublic, true), eq(prompts.isTemplate, true)));

  // If category filter is provided
  if (categoryId) {
    const mappings = await db
      .select()
      .from(templateCategoryMappings)
      .where(eq(templateCategoryMappings.categoryId, categoryId));

    const promptIds = mappings.map((m) => m.promptId);
    if (promptIds.length === 0) return [];

    query = db
      .select()
      .from(prompts)
      .where(
        and(
          eq(prompts.isPublic, true),
          eq(prompts.isTemplate, true),
          inArray(prompts.id, promptIds)
        )
      );
  }

  const templates = await query.orderBy(desc(prompts.createdAt));

  // Enrich with ratings and usage stats
  const enriched = await Promise.all(
    templates.map(async (template) => {
      const stats = await getTemplateStats(template.id);
      return { ...template, ...stats };
    })
  );

  return enriched;
}

/**
 * Get template statistics (average rating, total ratings, usage count)
 */
export async function getTemplateStats(promptId: string) {
  const db = await getDb();
  if (!db) return { averageRating: 0, totalRatings: 0, usageCount: 0 };

  // Get ratings
  const ratings = await db
    .select()
    .from(templateRatings)
    .where(eq(templateRatings.promptId, promptId));

  const totalRatings = ratings.length;
  const averageRating =
    totalRatings > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings
      : 0;

  // Get usage count
  const usage = await db
    .select()
    .from(templateUsage)
    .where(eq(templateUsage.promptId, promptId));

  return {
    averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
    totalRatings,
    usageCount: usage.length,
  };
}

/**
 * Publish a prompt as a public template
 */
export async function publishTemplate(promptId: string, userId: string, categoryIds?: string[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Verify ownership
  const prompt = await db.select().from(prompts).where(eq(prompts.id, promptId)).limit(1);
  if (prompt.length === 0) throw new Error("Prompt not found");
  if (prompt[0].userId !== userId) throw new Error("Unauthorized");

  // Update prompt to be public and template
  await db
    .update(prompts)
    .set({ isPublic: true, isTemplate: true })
    .where(eq(prompts.id, promptId));

  // Add categories if provided
  if (categoryIds && categoryIds.length > 0) {
    await Promise.all(
      categoryIds.map((categoryId) =>
        db.insert(templateCategoryMappings).values({
          id: nanoid(),
          promptId,
          categoryId,
        })
      )
    );
  }

  return { success: true };
}

/**
 * Unpublish a template (make it private)
 */
export async function unpublishTemplate(promptId: string, userId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Verify ownership
  const prompt = await db.select().from(prompts).where(eq(prompts.id, promptId)).limit(1);
  if (prompt.length === 0) throw new Error("Prompt not found");
  if (prompt[0].userId !== userId) throw new Error("Unauthorized");

  // Update prompt to be private
  await db
    .update(prompts)
    .set({ isPublic: false, isTemplate: false })
    .where(eq(prompts.id, promptId));

  return { success: true };
}

/**
 * Rate a template
 */
export async function rateTemplate(
  promptId: string,
  userId: string,
  rating: number,
  review?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (rating < 1 || rating > 5) {
    throw new Error("Rating must be between 1 and 5");
  }

  // Check if user already rated this template
  const existing = await db
    .select()
    .from(templateRatings)
    .where(and(eq(templateRatings.promptId, promptId), eq(templateRatings.userId, userId)))
    .limit(1);

  if (existing.length > 0) {
    // Update existing rating
    await db
      .update(templateRatings)
      .set({ rating, review, createdAt: new Date() })
      .where(eq(templateRatings.id, existing[0].id));

    return { id: existing[0].id };
  } else {
    // Create new rating
    const id = nanoid();
    await db.insert(templateRatings).values({
      id,
      promptId,
      userId,
      rating,
      review,
    });

    return { id };
  }
}

/**
 * Use a template (copy it to user's prompts and track usage)
 */
export async function useTemplate(promptId: string, userId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get the template
  const template = await db.select().from(prompts).where(eq(prompts.id, promptId)).limit(1);
  if (template.length === 0) throw new Error("Template not found");
  if (!template[0].isPublic || !template[0].isTemplate) {
    throw new Error("Not a public template");
  }

  // Create a copy for the user
  const newPromptId = nanoid();
  await db.insert(prompts).values({
    id: newPromptId,
    userId,
    name: `${template[0].name} (Copy)`,
    content: template[0].content,
    description: template[0].description,
    variables: template[0].variables,
    tags: template[0].tags,
    folderPath: template[0].folderPath,
    isTemplate: false, // User's copy is not a template
    isPublic: false, // User's copy is private
    version: 1,
  });

  // Track usage
  await db.insert(templateUsage).values({
    id: nanoid(),
    promptId,
    userId,
  });

  return { newPromptId };
}

/**
 * Get all categories
 */
export async function getCategories() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(templateCategories);
}

/**
 * Get template ratings (reviews)
 */
export async function getTemplateRatings(promptId: string) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(templateRatings)
    .where(eq(templateRatings.promptId, promptId))
    .orderBy(desc(templateRatings.createdAt));
}

/**
 * Search templates by name or tags
 */
export async function searchTemplates(query: string) {
  const db = await getDb();
  if (!db) return [];

  const searchTerm = `%${query}%`;

  const results = await db
    .select()
    .from(prompts)
    .where(
      and(
        eq(prompts.isPublic, true),
        eq(prompts.isTemplate, true),
        sql`(${prompts.name} LIKE ${searchTerm} OR ${prompts.description} LIKE ${searchTerm})`
      )
    )
    .orderBy(desc(prompts.createdAt));

  // Enrich with stats
  const enriched = await Promise.all(
    results.map(async (template) => {
      const stats = await getTemplateStats(template.id);
      return { ...template, ...stats };
    })
  );

  return enriched;
}
