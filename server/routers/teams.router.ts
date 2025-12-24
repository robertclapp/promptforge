import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as teamService from "../services/team.service";
import { requirePermission } from "../_core/permissions";

export const teamsRouter = router({
  /**
   * Get all teams for the current user
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    return await teamService.getUserTeams(ctx.user.id);
  }),

  /**
   * Get a specific team by ID
   */
  get: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input: teamId }) => {
      return await teamService.getTeam(teamId, ctx.user.id);
    }),

  /**
   * Create a new team
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        slug: z.string().min(1).max(100),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await teamService.createTeam(
        input.name,
        input.slug,
        ctx.user.id,
        input.description
      );
    }),

  /**
   * Update a team
   */
  update: protectedProcedure
    .input(
      z.object({
        teamId: z.string(),
        name: z.string().min(1).max(255).optional(),
        slug: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { teamId, ...updates } = input;
      return await teamService.updateTeam(teamId, ctx.user.id, updates);
    }),

  /**
   * Delete a team
   */
  delete: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input: teamId }) => {
      return await teamService.deleteTeam(teamId, ctx.user.id);
    }),

  /**
   * Get team members
   */
  members: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input: teamId }) => {
      return await teamService.getTeamMembers(teamId, ctx.user.id);
    }),

  /**
   * Add a member to the team
   */
  addMember: protectedProcedure
    .input(
      z.object({
        teamId: z.string(),
        userId: z.string(),
        role: z.enum(["admin", "member", "viewer"]).default("member"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check invite permission
      await requirePermission(ctx.user.id, input.teamId, 'INVITE_MEMBERS');

      return await teamService.addTeamMember(
        input.teamId,
        ctx.user.id,
        input.userId,
        input.role
      );
    }),

  /**
   * Remove a member from the team
   */
  removeMember: protectedProcedure
    .input(
      z.object({
        teamId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check remove permission
      await requirePermission(ctx.user.id, input.teamId, 'REMOVE_MEMBERS');

      return await teamService.removeTeamMember(
        input.teamId,
        ctx.user.id,
        input.userId
      );
    }),

  /**
   * Update a member's role
   */
  updateMemberRole: protectedProcedure
    .input(
      z.object({
        teamId: z.string(),
        userId: z.string(),
        role: z.enum(["admin", "member", "viewer"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check change role permission
      await requirePermission(ctx.user.id, input.teamId, 'CHANGE_MEMBER_ROLES');

      return await teamService.updateMemberRole(
        input.teamId,
        ctx.user.id,
        input.userId,
        input.role
      );
    }),

  /**
   * Get user's active team
   */
  getActiveTeam: protectedProcedure.query(async ({ ctx }) => {
    return await teamService.getUserActiveTeam(ctx.user.id);
  }),
});
