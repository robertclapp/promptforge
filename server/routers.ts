import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

// Import domain-specific routers
import { promptsRouter } from "./routers/prompts.router";
import { aiProvidersRouter } from "./routers/aiProviders.router";
import { evaluationsRouter } from "./routers/evaluations.router";
import { contextPackagesRouter } from "./routers/contextPackages.router";
import { analyticsRouter } from "./routers/analytics.router";

/**
 * Main Application Router
 * Combines all domain-specific routers into a single API
 */
export const appRouter = router({
  // System router (health checks, notifications, etc.)
  system: systemRouter,

  // Authentication router
  auth: router({
    /**
     * Get current user
     */
    me: publicProcedure.query((opts) => opts.ctx.user),

    /**
     * Logout user
     */
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Domain-specific routers
  prompts: promptsRouter,
  aiProviders: aiProvidersRouter,
  evaluations: evaluationsRouter,
  contextPackages: contextPackagesRouter,
  analytics: analyticsRouter,
});

export type AppRouter = typeof appRouter;
