import { mysqlTable, varchar, timestamp, mysqlEnum, index } from "drizzle-orm/mysql-core";

/**
 * Team Invitations Schema
 * Manages email-based team invitations with expiry
 */

export const teamInvitations = mysqlTable(
  "team_invitations",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 191 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    token: varchar("token", { length: 255 }).notNull().unique(),
    role: mysqlEnum("role", ["owner", "admin", "member", "viewer"]).notNull().default("member"),
    invitedBy: varchar("invited_by", { length: 191 }).notNull(),
    status: mysqlEnum("status", ["pending", "accepted", "expired", "revoked"]).notNull().default("pending"),
    expiresAt: timestamp("expires_at").notNull(),
    acceptedAt: timestamp("accepted_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    orgIdx: index("org_idx").on(table.organizationId),
    emailIdx: index("email_idx").on(table.email),
    tokenIdx: index("token_idx").on(table.token),
    statusIdx: index("status_idx").on(table.status),
  })
);

export type TeamInvitation = typeof teamInvitations.$inferSelect;
export type NewTeamInvitation = typeof teamInvitations.$inferInsert;
