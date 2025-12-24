/**
 * Collections Schema
 * Organize prompts into folders/collections
 */

import {
  mysqlTable,
  varchar,
  text,
  timestamp,
  boolean,
  int,
  index,
} from "drizzle-orm/mysql-core";

// Collections/folders for organizing prompts
export const collections = mysqlTable(
  "collections",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: varchar("userId", { length: 64 }).notNull(),
    organizationId: varchar("organizationId", { length: 64 }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    color: varchar("color", { length: 20 }).default("#6366f1"), // Hex color
    icon: varchar("icon", { length: 50 }).default("folder"), // Icon name
    parentId: varchar("parentId", { length: 64 }), // For nested folders
    sortOrder: int("sortOrder").default(0),
    isShared: boolean("isShared").default(false),
    isDefault: boolean("isDefault").default(false), // Default collection
    createdAt: timestamp("createdAt").defaultNow(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
  },
  (table) => ({
    userIdIdx: index("collections_userId_idx").on(table.userId),
    orgIdIdx: index("collections_orgId_idx").on(table.organizationId),
    parentIdIdx: index("collections_parentId_idx").on(table.parentId),
  })
);

export type Collection = typeof collections.$inferSelect;
export type InsertCollection = typeof collections.$inferInsert;

// Many-to-many relationship between prompts and collections
export const promptCollections = mysqlTable(
  "promptCollections",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    promptId: varchar("promptId", { length: 64 }).notNull(),
    collectionId: varchar("collectionId", { length: 64 }).notNull(),
    addedBy: varchar("addedBy", { length: 64 }).notNull(),
    sortOrder: int("sortOrder").default(0),
    createdAt: timestamp("createdAt").defaultNow(),
  },
  (table) => ({
    promptIdIdx: index("promptCollections_promptId_idx").on(table.promptId),
    collectionIdIdx: index("promptCollections_collectionId_idx").on(table.collectionId),
    uniqueIdx: index("promptCollections_unique_idx").on(table.promptId, table.collectionId),
  })
);

export type PromptCollection = typeof promptCollections.$inferSelect;
export type InsertPromptCollection = typeof promptCollections.$inferInsert;

// Collection sharing for team collaboration
export const collectionShares = mysqlTable(
  "collectionShares",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    collectionId: varchar("collectionId", { length: 64 }).notNull(),
    sharedWithUserId: varchar("sharedWithUserId", { length: 64 }),
    sharedWithOrgId: varchar("sharedWithOrgId", { length: 64 }),
    permission: varchar("permission", { length: 20 }).default("view"), // view, edit
    sharedBy: varchar("sharedBy", { length: 64 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow(),
  },
  (table) => ({
    collectionIdIdx: index("collectionShares_collectionId_idx").on(table.collectionId),
    sharedWithUserIdx: index("collectionShares_sharedWithUser_idx").on(table.sharedWithUserId),
    sharedWithOrgIdx: index("collectionShares_sharedWithOrg_idx").on(table.sharedWithOrgId),
  })
);

export type CollectionShare = typeof collectionShares.$inferSelect;
export type InsertCollectionShare = typeof collectionShares.$inferInsert;
