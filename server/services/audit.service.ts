import { getDb } from "../db";
import { auditLogs, type InsertAuditLog, type AuditLog, type AuditEventType } from "../../drizzle/schema";
import { eq, and, desc, gte, lte, like, or, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

/**
 * Event category mapping for audit events
 */
const eventCategoryMap: Record<string, InsertAuditLog["eventCategory"]> = {
  // Permission events
  permission_denied: "permission",
  permission_granted: "permission",
  
  // Resource operations
  prompt_created: "resource",
  prompt_updated: "resource",
  prompt_deleted: "resource",
  evaluation_created: "resource",
  evaluation_deleted: "resource",
  ai_provider_created: "resource",
  ai_provider_updated: "resource",
  ai_provider_deleted: "resource",
  context_package_created: "resource",
  context_package_updated: "resource",
  context_package_deleted: "resource",
  budget_created: "resource",
  budget_updated: "resource",
  budget_deleted: "resource",
  test_suite_created: "resource",
  test_suite_deleted: "resource",
  test_suite_run: "resource",
  optimization_created: "resource",
  optimization_applied: "resource",
  template_published: "resource",
  template_unpublished: "resource",
  
  // Team management
  team_created: "team",
  team_updated: "team",
  team_deleted: "team",
  member_invited: "team",
  member_removed: "team",
  member_role_changed: "team",
  invitation_accepted: "team",
  invitation_rejected: "team",
  
  // Billing events
  subscription_created: "billing",
  subscription_updated: "billing",
  subscription_cancelled: "billing",
  payment_succeeded: "billing",
  payment_failed: "billing",
  
  // API events
  api_key_created: "api",
  api_key_revoked: "api",
  api_key_deleted: "api",
  api_rate_limit_exceeded: "api",
  
  // Security events
  login_success: "security",
  login_failed: "security",
  logout: "security",
  password_changed: "security",
  settings_changed: "security",
};

/**
 * Action mapping for audit events
 */
const eventActionMap: Record<string, InsertAuditLog["action"]> = {
  permission_denied: "denied",
  permission_granted: "read",
  
  prompt_created: "create",
  prompt_updated: "update",
  prompt_deleted: "delete",
  evaluation_created: "create",
  evaluation_deleted: "delete",
  ai_provider_created: "create",
  ai_provider_updated: "update",
  ai_provider_deleted: "delete",
  context_package_created: "create",
  context_package_updated: "update",
  context_package_deleted: "delete",
  budget_created: "create",
  budget_updated: "update",
  budget_deleted: "delete",
  test_suite_created: "create",
  test_suite_deleted: "delete",
  test_suite_run: "execute",
  optimization_created: "create",
  optimization_applied: "update",
  template_published: "create",
  template_unpublished: "delete",
  
  team_created: "create",
  team_updated: "update",
  team_deleted: "delete",
  member_invited: "create",
  member_removed: "delete",
  member_role_changed: "update",
  invitation_accepted: "update",
  invitation_rejected: "update",
  
  subscription_created: "create",
  subscription_updated: "update",
  subscription_cancelled: "delete",
  payment_succeeded: "execute",
  payment_failed: "execute",
  
  api_key_created: "create",
  api_key_revoked: "update",
  api_key_deleted: "delete",
  api_rate_limit_exceeded: "denied",
  
  login_success: "execute",
  login_failed: "denied",
  logout: "execute",
  password_changed: "update",
  settings_changed: "update",
};

export interface AuditLogInput {
  // User context
  userId?: string;
  userName?: string;
  userEmail?: string;
  userRole?: "viewer" | "member" | "admin" | "owner";
  
  // Organization context
  organizationId?: string;
  organizationName?: string;
  
  // Event details
  eventType: string;
  
  // Resource details
  resourceType?: string;
  resourceId?: string;
  resourceName?: string;
  
  // Status
  status: "success" | "failure" | "denied";
  
  // Additional context
  details?: Record<string, unknown>;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  
  // Request metadata
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  
  // Permission context (for permission_denied events)
  requiredPermission?: string;
  userPermissions?: string[];
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(input: AuditLogInput): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const id = uuidv4();
  const eventCategory = eventCategoryMap[input.eventType] || "resource";
  const action = eventActionMap[input.eventType] || "execute";

  await db.insert(auditLogs).values({
    id,
    userId: input.userId,
    userName: input.userName,
    userEmail: input.userEmail,
    userRole: input.userRole,
    organizationId: input.organizationId,
    organizationName: input.organizationName,
    eventType: input.eventType,
    eventCategory,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    resourceName: input.resourceName,
    action,
    status: input.status,
    details: input.details,
    previousValue: input.previousValue,
    newValue: input.newValue,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    requestId: input.requestId,
    requiredPermission: input.requiredPermission,
    userPermissions: input.userPermissions,
  });

  return id;
}

/**
 * Log a permission denied event
 */
export async function logPermissionDenied(params: {
  userId: string;
  userName?: string;
  userEmail?: string;
  userRole?: "viewer" | "member" | "admin" | "owner";
  organizationId: string;
  organizationName?: string;
  requiredPermission: string;
  resourceType?: string;
  resourceId?: string;
  resourceName?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<string> {
  return createAuditLog({
    ...params,
    eventType: "permission_denied",
    status: "denied",
    details: {
      requiredPermission: params.requiredPermission,
      userRole: params.userRole,
    },
  });
}

/**
 * Log a resource operation (create, update, delete)
 */
export async function logResourceOperation(params: {
  userId: string;
  userName?: string;
  userEmail?: string;
  userRole?: "viewer" | "member" | "admin" | "owner";
  organizationId?: string;
  organizationName?: string;
  eventType: string;
  resourceType: string;
  resourceId: string;
  resourceName?: string;
  status: "success" | "failure";
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}): Promise<string> {
  return createAuditLog(params);
}

/**
 * Log a team management event
 */
export async function logTeamEvent(params: {
  userId: string;
  userName?: string;
  userEmail?: string;
  userRole?: "viewer" | "member" | "admin" | "owner";
  organizationId: string;
  organizationName?: string;
  eventType: string;
  targetUserId?: string;
  targetUserName?: string;
  targetUserRole?: string;
  previousRole?: string;
  newRole?: string;
  status: "success" | "failure";
  ipAddress?: string;
  userAgent?: string;
}): Promise<string> {
  return createAuditLog({
    ...params,
    resourceType: "team_member",
    resourceId: params.targetUserId,
    resourceName: params.targetUserName,
    details: {
      targetUserId: params.targetUserId,
      targetUserName: params.targetUserName,
      targetUserRole: params.targetUserRole,
    },
    previousValue: params.previousRole ? { role: params.previousRole } : undefined,
    newValue: params.newRole ? { role: params.newRole } : undefined,
  });
}

/**
 * Log a billing event
 */
export async function logBillingEvent(params: {
  userId: string;
  userName?: string;
  userEmail?: string;
  organizationId: string;
  organizationName?: string;
  eventType: string;
  subscriptionId?: string;
  planName?: string;
  amount?: number;
  currency?: string;
  status: "success" | "failure";
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}): Promise<string> {
  return createAuditLog({
    ...params,
    resourceType: "subscription",
    resourceId: params.subscriptionId,
    resourceName: params.planName,
    details: {
      ...params.details,
      amount: params.amount,
      currency: params.currency,
    },
  });
}

/**
 * Log an API event
 */
export async function logApiEvent(params: {
  userId?: string;
  userName?: string;
  userEmail?: string;
  organizationId?: string;
  eventType: string;
  apiKeyId?: string;
  apiKeyName?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  status: "success" | "failure" | "denied";
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}): Promise<string> {
  return createAuditLog({
    ...params,
    resourceType: "api_key",
    resourceId: params.apiKeyId,
    resourceName: params.apiKeyName,
    details: {
      ...params.details,
      endpoint: params.endpoint,
      method: params.method,
      statusCode: params.statusCode,
    },
  });
}

/**
 * Log a security event
 */
export async function logSecurityEvent(params: {
  userId?: string;
  userName?: string;
  userEmail?: string;
  eventType: string;
  status: "success" | "failure" | "denied";
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}): Promise<string> {
  return createAuditLog({
    ...params,
    resourceType: "user",
    resourceId: params.userId,
    resourceName: params.userName,
  });
}

export interface AuditLogFilters {
  userId?: string;
  organizationId?: string;
  eventType?: string;
  eventCategory?: string;
  resourceType?: string;
  resourceId?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Get audit logs with filtering and pagination
 */
export async function getAuditLogs(filters: AuditLogFilters): Promise<{
  logs: AuditLog[];
  total: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions = [];

  if (filters.userId) {
    conditions.push(eq(auditLogs.userId, filters.userId));
  }
  if (filters.organizationId) {
    conditions.push(eq(auditLogs.organizationId, filters.organizationId));
  }
  if (filters.eventType) {
    conditions.push(eq(auditLogs.eventType, filters.eventType));
  }
  if (filters.eventCategory) {
    conditions.push(eq(auditLogs.eventCategory, filters.eventCategory as any));
  }
  if (filters.resourceType) {
    conditions.push(eq(auditLogs.resourceType, filters.resourceType));
  }
  if (filters.resourceId) {
    conditions.push(eq(auditLogs.resourceId, filters.resourceId));
  }
  if (filters.status) {
    conditions.push(eq(auditLogs.status, filters.status as any));
  }
  if (filters.startDate) {
    conditions.push(gte(auditLogs.createdAt, filters.startDate));
  }
  if (filters.endDate) {
    conditions.push(lte(auditLogs.createdAt, filters.endDate));
  }
  if (filters.search) {
    conditions.push(
      or(
        like(auditLogs.userName, `%${filters.search}%`),
        like(auditLogs.userEmail, `%${filters.search}%`),
        like(auditLogs.resourceName, `%${filters.search}%`),
        like(auditLogs.eventType, `%${filters.search}%`)
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get total count
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditLogs)
    .where(whereClause);

  const total = countResult?.count || 0;

  // Get paginated results
  const logs = await db
    .select()
    .from(auditLogs)
    .where(whereClause)
    .orderBy(desc(auditLogs.createdAt))
    .limit(filters.limit || 50)
    .offset(filters.offset || 0);

  return { logs, total };
}

/**
 * Get audit logs for a specific user
 */
export async function getUserAuditLogs(
  userId: string,
  limit = 50,
  offset = 0
): Promise<AuditLog[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.userId, userId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Get audit logs for a specific organization
 */
export async function getOrganizationAuditLogs(
  organizationId: string,
  limit = 50,
  offset = 0
): Promise<AuditLog[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.organizationId, organizationId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Get audit logs for a specific resource
 */
export async function getResourceAuditLogs(
  resourceType: string,
  resourceId: string,
  limit = 50,
  offset = 0
): Promise<AuditLog[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.resourceType, resourceType),
        eq(auditLogs.resourceId, resourceId)
      )
    )
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Get permission denied events for a user
 */
export async function getPermissionDeniedEvents(
  userId: string,
  limit = 50,
  offset = 0
): Promise<AuditLog[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.userId, userId),
        eq(auditLogs.eventType, "permission_denied")
      )
    )
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Get sensitive operations (deletions, role changes, billing)
 */
export async function getSensitiveOperations(
  organizationId: string,
  limit = 50,
  offset = 0
): Promise<AuditLog[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.organizationId, organizationId),
        or(
          eq(auditLogs.action, "delete"),
          eq(auditLogs.eventType, "member_role_changed"),
          eq(auditLogs.eventCategory, "billing"),
          eq(auditLogs.eventType, "permission_denied")
        )
      )
    )
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Export audit logs to JSON format
 */
export async function exportAuditLogsJson(
  filters: AuditLogFilters
): Promise<string> {
  const { logs } = await getAuditLogs({ ...filters, limit: 10000 });
  return JSON.stringify(logs, null, 2);
}

/**
 * Export audit logs to CSV format
 */
export async function exportAuditLogsCsv(
  filters: AuditLogFilters
): Promise<string> {
  const { logs } = await getAuditLogs({ ...filters, limit: 10000 });

  const headers = [
    "ID",
    "Timestamp",
    "User ID",
    "User Name",
    "User Email",
    "User Role",
    "Organization ID",
    "Organization Name",
    "Event Type",
    "Event Category",
    "Resource Type",
    "Resource ID",
    "Resource Name",
    "Action",
    "Status",
    "IP Address",
    "Details",
  ];

  const rows = logs.map((log) => [
    log.id,
    log.createdAt?.toISOString() || "",
    log.userId || "",
    log.userName || "",
    log.userEmail || "",
    log.userRole || "",
    log.organizationId || "",
    log.organizationName || "",
    log.eventType,
    log.eventCategory,
    log.resourceType || "",
    log.resourceId || "",
    log.resourceName || "",
    log.action,
    log.status,
    log.ipAddress || "",
    JSON.stringify(log.details || {}),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  return csvContent;
}

/**
 * Get audit log statistics
 */
export async function getAuditLogStats(
  organizationId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalEvents: number;
  permissionDenied: number;
  deletions: number;
  roleChanges: number;
  billingEvents: number;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions = [eq(auditLogs.organizationId, organizationId)];
  if (startDate) conditions.push(gte(auditLogs.createdAt, startDate));
  if (endDate) conditions.push(lte(auditLogs.createdAt, endDate));

  const whereClause = and(...conditions);

  // Get total count
  const [totalResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditLogs)
    .where(whereClause);

  // Get permission denied count
  const [permDeniedResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditLogs)
    .where(and(whereClause, eq(auditLogs.eventType, "permission_denied")));

  // Get deletions count
  const [deletionsResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditLogs)
    .where(and(whereClause, eq(auditLogs.action, "delete")));

  // Get role changes count
  const [roleChangesResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditLogs)
    .where(and(whereClause, eq(auditLogs.eventType, "member_role_changed")));

  // Get billing events count
  const [billingResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditLogs)
    .where(and(whereClause, eq(auditLogs.eventCategory, "billing")));

  // Get counts by category
  const categoryResults = await db
    .select({
      category: auditLogs.eventCategory,
      count: sql<number>`count(*)`,
    })
    .from(auditLogs)
    .where(whereClause)
    .groupBy(auditLogs.eventCategory);

  // Get counts by status
  const statusResults = await db
    .select({
      status: auditLogs.status,
      count: sql<number>`count(*)`,
    })
    .from(auditLogs)
    .where(whereClause)
    .groupBy(auditLogs.status);

  const byCategory: Record<string, number> = {};
  categoryResults.forEach((r) => {
    byCategory[r.category] = r.count;
  });

  const byStatus: Record<string, number> = {};
  statusResults.forEach((r) => {
    byStatus[r.status] = r.count;
  });

  return {
    totalEvents: totalResult?.count || 0,
    permissionDenied: permDeniedResult?.count || 0,
    deletions: deletionsResult?.count || 0,
    roleChanges: roleChangesResult?.count || 0,
    billingEvents: billingResult?.count || 0,
    byCategory,
    byStatus,
  };
}
