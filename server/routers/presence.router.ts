/**
 * Presence Router
 * Handles real-time collaboration presence endpoints
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { presenceService } from "../services/presence.service";

export const presenceRouter = router({
  // Join a document for collaborative editing
  join: protectedProcedure
    .input(z.object({
      documentType: z.enum(["prompt", "evaluation", "context_package"]),
      documentId: z.string()
    }))
    .mutation(({ ctx, input }) => {
      return presenceService.join(
        input.documentType,
        input.documentId,
        {
          id: ctx.user.id,
          name: ctx.user.name || "Anonymous",
          email: ctx.user.email || ""
        }
      );
    }),

  // Leave a document
  leave: protectedProcedure
    .input(z.object({
      documentType: z.enum(["prompt", "evaluation", "context_package"]),
      documentId: z.string(),
      sessionId: z.string()
    }))
    .mutation(({ input }) => {
      return presenceService.leave(
        input.documentType,
        input.documentId,
        input.sessionId
      );
    }),

  // Update cursor position
  updateCursor: protectedProcedure
    .input(z.object({
      documentType: z.enum(["prompt", "evaluation", "context_package"]),
      documentId: z.string(),
      sessionId: z.string(),
      cursor: z.object({
        line: z.number(),
        column: z.number()
      })
    }))
    .mutation(({ input }) => {
      return presenceService.updateCursor(
        input.documentType,
        input.documentId,
        input.sessionId,
        input.cursor
      );
    }),

  // Update selection range
  updateSelection: protectedProcedure
    .input(z.object({
      documentType: z.enum(["prompt", "evaluation", "context_package"]),
      documentId: z.string(),
      sessionId: z.string(),
      selection: z.object({
        start: z.object({ line: z.number(), column: z.number() }),
        end: z.object({ line: z.number(), column: z.number() })
      }).nullable()
    }))
    .mutation(({ input }) => {
      return presenceService.updateSelection(
        input.documentType,
        input.documentId,
        input.sessionId,
        input.selection
      );
    }),

  // Get all users in a document
  getDocumentUsers: protectedProcedure
    .input(z.object({
      documentType: z.enum(["prompt", "evaluation", "context_package"]),
      documentId: z.string()
    }))
    .query(({ input }) => {
      return presenceService.getDocumentUsers(
        input.documentType,
        input.documentId
      );
    }),

  // Heartbeat to keep presence alive
  heartbeat: protectedProcedure
    .input(z.object({
      documentType: z.enum(["prompt", "evaluation", "context_package"]),
      documentId: z.string(),
      sessionId: z.string()
    }))
    .mutation(({ input }) => {
      return presenceService.heartbeat(
        input.documentType,
        input.documentId,
        input.sessionId
      );
    }),

  // Get presence statistics (admin only)
  getStats: protectedProcedure.query(() => {
    return presenceService.getStats();
  })
});
