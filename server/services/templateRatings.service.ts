/**
 * Template Ratings Service
 * Handles rating and reviewing prompt templates
 */

import { v4 as uuidv4 } from "uuid";
import { eq, and, desc, sql, avg, count } from "drizzle-orm";
import { getDb } from "../db";
import { templateRatings, reviewHelpfulVotes } from "../../drizzle/schema";

export interface RatingInput {
  templateId: string;
  templateType: "builtin" | "user";
  userId: string;
  userName?: string;
  rating: number;
  review?: string;
}

export interface RatingStats {
  averageRating: number;
  totalRatings: number;
  totalReviews: number;
  distribution: {
    five: number;
    four: number;
    three: number;
    two: number;
    one: number;
  };
}

/**
 * Add or update a rating for a template
 */
export async function rateTemplate(input: RatingInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if user already rated this template
  const existing = await db
    .select()
    .from(templateRatings)
    .where(
      and(
        eq(templateRatings.promptId, input.templateId),
        eq(templateRatings.userId, input.userId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // Update existing rating
    await db
      .update(templateRatings)
      .set({
        rating: input.rating,
        review: input.review,
        userName: input.userName,
        updatedAt: new Date(),
      })
      .where(eq(templateRatings.id, existing[0].id));

    return { ...existing[0], rating: input.rating, review: input.review };
  }

  // Create new rating
  const id = uuidv4();
  await db.insert(templateRatings).values({
    id,
    promptId: input.templateId,
    templateType: input.templateType,
    userId: input.userId,
    userName: input.userName,
    rating: input.rating,
    review: input.review,
    helpful: 0,
  });

  return {
    id,
    promptId: input.templateId,
    templateType: input.templateType,
    userId: input.userId,
    userName: input.userName,
    rating: input.rating,
    review: input.review,
    helpful: 0,
    createdAt: new Date(),
  };
}

/**
 * Get ratings for a template
 */
export async function getTemplateRatings(
  templateId: string,
  options: { limit?: number; offset?: number } = {}
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { limit = 10, offset = 0 } = options;

  const ratings = await db
    .select()
    .from(templateRatings)
    .where(eq(templateRatings.promptId, templateId))
    .orderBy(desc(templateRatings.createdAt))
    .limit(limit)
    .offset(offset);

  return ratings;
}

/**
 * Get rating statistics for a template
 */
export async function getTemplateRatingStats(templateId: string): Promise<RatingStats> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const ratings = await db
    .select()
    .from(templateRatings)
    .where(eq(templateRatings.promptId, templateId));

  if (ratings.length === 0) {
    return {
      averageRating: 0,
      totalRatings: 0,
      totalReviews: 0,
      distribution: { five: 0, four: 0, three: 0, two: 0, one: 0 },
    };
  }

  const totalRatings = ratings.length;
  const totalReviews = ratings.filter((r) => r.review && r.review.trim().length > 0).length;
  const averageRating = ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings;

  const distribution = {
    five: ratings.filter((r) => r.rating === 5).length,
    four: ratings.filter((r) => r.rating === 4).length,
    three: ratings.filter((r) => r.rating === 3).length,
    two: ratings.filter((r) => r.rating === 2).length,
    one: ratings.filter((r) => r.rating === 1).length,
  };

  return {
    averageRating: Math.round(averageRating * 10) / 10,
    totalRatings,
    totalReviews,
    distribution,
  };
}

/**
 * Get user's rating for a template
 */
export async function getUserRating(templateId: string, userId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rating = await db
    .select()
    .from(templateRatings)
    .where(
      and(
        eq(templateRatings.promptId, templateId),
        eq(templateRatings.userId, userId)
      )
    )
    .limit(1);

  return rating[0] || null;
}

/**
 * Delete a rating
 */
export async function deleteRating(ratingId: string, userId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Verify ownership
  const rating = await db
    .select()
    .from(templateRatings)
    .where(eq(templateRatings.id, ratingId))
    .limit(1);

  if (!rating[0] || rating[0].userId !== userId) {
    throw new Error("Rating not found or unauthorized");
  }

  await db.delete(templateRatings).where(eq(templateRatings.id, ratingId));
  return { success: true };
}

/**
 * Vote a review as helpful
 */
export async function voteHelpful(ratingId: string, userId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if already voted
  const existing = await db
    .select()
    .from(reviewHelpfulVotes)
    .where(
      and(
        eq(reviewHelpfulVotes.ratingId, ratingId),
        eq(reviewHelpfulVotes.userId, userId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // Remove vote
    await db.delete(reviewHelpfulVotes).where(eq(reviewHelpfulVotes.id, existing[0].id));
    await db
      .update(templateRatings)
      .set({ helpful: sql`${templateRatings.helpful} - 1` })
      .where(eq(templateRatings.id, ratingId));
    return { voted: false };
  }

  // Add vote
  const id = uuidv4();
  await db.insert(reviewHelpfulVotes).values({
    id,
    ratingId,
    userId,
  });

  await db
    .update(templateRatings)
    .set({ helpful: sql`${templateRatings.helpful} + 1` })
    .where(eq(templateRatings.id, ratingId));

  return { voted: true };
}

/**
 * Check if user voted helpful for a review
 */
export async function hasVotedHelpful(ratingId: string, userId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const vote = await db
    .select()
    .from(reviewHelpfulVotes)
    .where(
      and(
        eq(reviewHelpfulVotes.ratingId, ratingId),
        eq(reviewHelpfulVotes.userId, userId)
      )
    )
    .limit(1);

  return vote.length > 0;
}

/**
 * Get top-rated templates
 */
export async function getTopRatedTemplates(limit: number = 10) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get all templates with ratings and calculate averages
  const ratingsData = await db
    .select({
      templateId: templateRatings.promptId,
      templateType: templateRatings.templateType,
      avgRating: avg(templateRatings.rating),
      totalRatings: count(templateRatings.id),
    })
    .from(templateRatings)
    .groupBy(templateRatings.promptId, templateRatings.templateType)
    .orderBy(desc(avg(templateRatings.rating)))
    .limit(limit);

  return ratingsData.map((r) => ({
    templateId: r.templateId,
    templateType: r.templateType,
    averageRating: Number(r.avgRating) || 0,
    totalRatings: Number(r.totalRatings) || 0,
  }));
}
