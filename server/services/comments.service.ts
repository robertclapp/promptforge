/**
 * Comments Service
 * Handles threaded commenting on prompts with @mentions and reactions
 */

import { nanoid } from "nanoid";
import { eq, and, desc, sql } from "drizzle-orm";
import { getDb } from "../db";
import { notifyNewComment } from "./notification.service";
import { comments, commentNotifications, users, type InsertComment } from "../../drizzle/schema";
import { v4 as uuidv4 } from "uuid";

interface CreateCommentInput {
  promptId: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  content: string;
  parentId?: string;
  mentions?: string[];
}

interface UpdateCommentInput {
  commentId: string;
  userId: string;
  content: string;
  mentions?: string[];
}

/**
 * Create a comment on a prompt (with threading support)
 */
export async function createComment(input: CreateCommentInput | string, userIdArg?: string, contentArg?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Support both old and new API
  let promptId: string;
  let userId: string;
  let content: string;
  let parentId: string | null = null;
  let mentions: string[] = [];
  let userName: string | undefined;
  let userAvatar: string | undefined;

  if (typeof input === "string") {
    // Old API: createComment(promptId, userId, content)
    promptId = input;
    userId = userIdArg!;
    content = contentArg!;
  } else {
    // New API: createComment({ promptId, userId, content, parentId, mentions })
    promptId = input.promptId;
    userId = input.userId;
    content = input.content;
    parentId = input.parentId || null;
    mentions = input.mentions || [];
    userName = input.userName;
    userAvatar = input.userAvatar;
  }

  const id = nanoid();
  let rootId: string | null = null;
  let depth = 0;

  // If this is a reply, get the parent comment to set rootId and depth
  if (parentId) {
    const parent = await db
      .select()
      .from(comments)
      .where(eq(comments.id, parentId))
      .limit(1);

    if (parent.length > 0) {
      rootId = parent[0].rootId || parent[0].id;
      depth = (parent[0].depth || 0) + 1;
    }
  }

  // Get user info if not provided
  if (!userName) {
    const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    userName = userResult[0]?.name || "Anonymous";
  }

  await db.insert(comments).values({
    id,
    promptId,
    userId,
    userName,
    userAvatar,
    content,
    parentId,
    rootId,
    depth,
    mentions: mentions.length > 0 ? JSON.stringify(mentions) : null,
    isEdited: false,
    isDeleted: false,
  });

  // Create notifications for mentions
  if (mentions.length > 0) {
    for (const mentionedUserId of mentions) {
      if (mentionedUserId !== userId) {
        await db.insert(commentNotifications).values({
          id: uuidv4(),
          commentId: id,
          userId: mentionedUserId,
          promptId,
          type: "mention",
          isRead: false,
        });
      }
    }
  }

  // Create notification for reply
  if (parentId) {
    const parent = await db
      .select()
      .from(comments)
      .where(eq(comments.id, parentId))
      .limit(1);

    if (parent.length > 0 && parent[0].userId !== userId) {
      await db.insert(commentNotifications).values({
        id: uuidv4(),
        commentId: id,
        userId: parent[0].userId,
        promptId,
        type: "reply",
        isRead: false,
      });
    }
  }

  // Get prompt and user info for notifications (legacy)
  const { prompts } = await import("../../drizzle/schema");
  const promptResult = await db.select().from(prompts).where(eq(prompts.id, promptId)).limit(1);
  const prompt = promptResult[0];

  // Notify prompt owner (if not the commenter and not a reply)
  if (prompt && prompt.userId !== userId && !parentId) {
    await notifyNewComment(prompt.userId, userName || "Someone", prompt.name, promptId);
  }

  // Return the comment with user info
  const result = await db
    .select({
      id: comments.id,
      promptId: comments.promptId,
      userId: comments.userId,
      content: comments.content,
      parentId: comments.parentId,
      rootId: comments.rootId,
      depth: comments.depth,
      mentions: comments.mentions,
      reactions: comments.reactions,
      isEdited: comments.isEdited,
      isDeleted: comments.isDeleted,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      userName: comments.userName,
    })
    .from(comments)
    .where(eq(comments.id, id))
    .limit(1);

  return result[0];
}

/**
 * Get all comments for a prompt (with threading)
 */
export async function getCommentsByPrompt(promptId: string) {
  const db = await getDb();
  if (!db) return [];

  const allComments = await db
    .select({
      id: comments.id,
      promptId: comments.promptId,
      userId: comments.userId,
      content: comments.content,
      parentId: comments.parentId,
      rootId: comments.rootId,
      depth: comments.depth,
      mentions: comments.mentions,
      reactions: comments.reactions,
      isEdited: comments.isEdited,
      isDeleted: comments.isDeleted,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      userName: comments.userName,
      userAvatar: comments.userAvatar,
    })
    .from(comments)
    .where(eq(comments.promptId, promptId))
    .orderBy(desc(comments.createdAt));

  // Build threaded structure
  const commentMap = new Map<string, any>();
  const rootComments: any[] = [];

  // First pass: create map of all comments
  for (const comment of allComments) {
    if (comment.isDeleted) {
      commentMap.set(comment.id, {
        ...comment,
        content: "[deleted]",
        mentions: [],
        reactions: {},
        replies: [],
      });
    } else {
      commentMap.set(comment.id, {
        ...comment,
        mentions: comment.mentions ? JSON.parse(comment.mentions) : [],
        reactions: comment.reactions ? JSON.parse(comment.reactions) : {},
        replies: [],
      });
    }
  }

  // Second pass: build tree structure
  for (const comment of allComments) {
    const commentWithReplies = commentMap.get(comment.id);
    if (comment.parentId && commentMap.has(comment.parentId)) {
      commentMap.get(comment.parentId).replies.push(commentWithReplies);
    } else if (!comment.parentId) {
      rootComments.push(commentWithReplies);
    }
  }

  // Sort replies by createdAt ascending (oldest first)
  const sortReplies = (comment: any) => {
    comment.replies.sort(
      (a: any, b: any) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    comment.replies.forEach(sortReplies);
  };
  rootComments.forEach(sortReplies);

  return rootComments;
}

/**
 * Update a comment
 */
export async function updateComment(commentIdOrInput: string | UpdateCommentInput, userIdArg?: string, contentArg?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let commentId: string;
  let userId: string;
  let content: string;
  let mentions: string[] = [];

  if (typeof commentIdOrInput === "string") {
    // Old API
    commentId = commentIdOrInput;
    userId = userIdArg!;
    content = contentArg!;
  } else {
    // New API
    commentId = commentIdOrInput.commentId;
    userId = commentIdOrInput.userId;
    content = commentIdOrInput.content;
    mentions = commentIdOrInput.mentions || [];
  }

  // Verify ownership
  const existing = await db
    .select()
    .from(comments)
    .where(eq(comments.id, commentId))
    .limit(1);

  if (existing.length === 0) throw new Error("Comment not found");
  if (existing[0].userId !== userId) throw new Error("Unauthorized");

  await db
    .update(comments)
    .set({ 
      content, 
      mentions: mentions.length > 0 ? JSON.stringify(mentions) : null,
      isEdited: true,
      updatedAt: new Date() 
    })
    .where(eq(comments.id, commentId));

  return { success: true };
}

/**
 * Delete a comment (soft delete)
 */
export async function deleteComment(commentId: string, userId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Verify ownership
  const existing = await db
    .select()
    .from(comments)
    .where(eq(comments.id, commentId))
    .limit(1);

  if (existing.length === 0) throw new Error("Comment not found");
  if (existing[0].userId !== userId) throw new Error("Unauthorized");

  // Soft delete - mark as deleted but keep for threading
  await db
    .update(comments)
    .set({ 
      isDeleted: true,
      content: "[deleted]",
    })
    .where(eq(comments.id, commentId));

  return { success: true };
}

/**
 * Add/toggle reaction to a comment
 */
export async function addReaction(commentId: string, userId: string, emoji: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(comments)
    .where(eq(comments.id, commentId))
    .limit(1);

  if (existing.length === 0) {
    throw new Error("Comment not found");
  }

  const reactions = existing[0].reactions
    ? JSON.parse(existing[0].reactions)
    : {};

  if (!reactions[emoji]) {
    reactions[emoji] = [];
  }

  if (!reactions[emoji].includes(userId)) {
    reactions[emoji].push(userId);
    
    // Create notification for reaction
    if (existing[0].userId !== userId) {
      await db.insert(commentNotifications).values({
        id: uuidv4(),
        commentId,
        userId: existing[0].userId,
        promptId: existing[0].promptId,
        type: "reaction",
        isRead: false,
      });
    }
  } else {
    // Toggle off if already reacted
    reactions[emoji] = reactions[emoji].filter((id: string) => id !== userId);
    if (reactions[emoji].length === 0) {
      delete reactions[emoji];
    }
  }

  await db
    .update(comments)
    .set({ reactions: JSON.stringify(reactions) })
    .where(eq(comments.id, commentId));

  return { success: true, reactions };
}

/**
 * Get user notifications
 */
export async function getUserNotifications(userId: string, limit = 20) {
  const db = await getDb();
  if (!db) return [];

  const notifications = await db
    .select()
    .from(commentNotifications)
    .where(eq(commentNotifications.userId, userId))
    .orderBy(desc(commentNotifications.createdAt))
    .limit(limit);

  return notifications;
}

/**
 * Mark notification as read
 */
export async function markNotificationRead(notificationId: string, userId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(commentNotifications)
    .set({ isRead: true })
    .where(
      and(
        eq(commentNotifications.id, notificationId),
        eq(commentNotifications.userId, userId)
      )
    );

  return { success: true };
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsRead(userId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(commentNotifications)
    .set({ isRead: true })
    .where(eq(commentNotifications.userId, userId));

  return { success: true };
}

/**
 * Get comment count for a prompt
 */
export async function getCommentCount(promptId: string) {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(comments)
    .where(and(eq(comments.promptId, promptId), eq(comments.isDeleted, false)));

  return result[0]?.count || 0;
}

/**
 * Extract @mentions from comment content
 */
export function extractMentions(content: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]);
  }

  return Array.from(new Set(mentions)); // Remove duplicates
}

/**
 * Search users for @mention autocomplete
 */
export async function searchUsersForMention(query: string, limit: number = 5) {
  const db = await getDb();
  if (!db) return [];

  const searchTerm = `%${query}%`;

  const results = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(users)
    .where(eq(users.name, searchTerm))
    .limit(limit);

  return results;
}
