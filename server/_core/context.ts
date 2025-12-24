import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  activeTeamId: string | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  // Extract activeTeamId from request headers (sent by frontend)
  const activeTeamId = opts.req.headers['x-active-team-id'] as string | undefined;

  return {
    req: opts.req,
    res: opts.res,
    user,
    activeTeamId: activeTeamId || null,
  };
}
