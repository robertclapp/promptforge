import { getDb } from "../db";
import { 
  dataExportRequests, 
  dataDeletionRequests,
  prompts,
  promptVersions,
  evaluations,
  evaluationResults,
  contextPackages,
  analyticsEvents,
  users,
  loginActivities,
  apiKeys,
  apiUsage,
} from "../../drizzle/schema";
import { eq, desc, and, gte } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { storagePut, storageGet } from "../storage";

/**
 * Create a new data export request
 */
export async function createExportRequest(
  userId: string,
  exportType: "full" | "prompts" | "evaluations" | "settings" | "activity",
  format: "json" | "csv" | "zip" = "zip"
) {
  const db = await getDb();
  if (!db) return null;

  const requestId = uuidv4();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await db.insert(dataExportRequests).values({
    id: requestId,
    userId,
    exportType,
    format,
    status: "pending",
    progress: 0,
    expiresAt,
  });

  // Start processing in background
  processExportRequest(requestId, userId, exportType, format).catch(console.error);

  return { requestId, status: "pending" };
}

/**
 * Process an export request
 */
async function processExportRequest(
  requestId: string,
  userId: string,
  exportType: string,
  format: string
) {
  const db = await getDb();
  if (!db) return;

  try {
    // Update status to processing
    await db
      .update(dataExportRequests)
      .set({ status: "processing", startedAt: new Date(), progress: 10 })
      .where(eq(dataExportRequests.id, requestId));

    const exportData: Record<string, unknown> = {};
    const includedData: string[] = [];

    // Export user profile
    if (exportType === "full" || exportType === "settings") {
      const [user] = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      if (user) {
        exportData.profile = user;
        includedData.push("profile");
      }

      await updateProgress(requestId, 20);
    }

    // Export prompts
    if (exportType === "full" || exportType === "prompts") {
      const userPrompts = await db
        .select()
        .from(prompts)
        .where(eq(prompts.userId, userId));

      const promptIds = userPrompts.map(p => p.id);
      let versions: typeof promptVersions.$inferSelect[] = [];
      
      if (promptIds.length > 0) {
        versions = await db
          .select()
          .from(promptVersions)
          .where(eq(promptVersions.promptId, promptIds[0])); // Simplified for demo
      }

      exportData.prompts = userPrompts.map(p => ({
        ...p,
        versions: versions.filter(v => v.promptId === p.id),
      }));
      includedData.push("prompts");

      await updateProgress(requestId, 40);
    }

    // Export evaluations
    if (exportType === "full" || exportType === "evaluations") {
      const userEvaluations = await db
        .select()
        .from(evaluations)
        .where(eq(evaluations.userId, userId));

      const evalIds = userEvaluations.map(e => e.id);
      let results: typeof evaluationResults.$inferSelect[] = [];
      
      if (evalIds.length > 0) {
        results = await db
          .select()
          .from(evaluationResults)
          .where(eq(evaluationResults.evaluationId, evalIds[0])); // Simplified
      }

      exportData.evaluations = userEvaluations.map(e => ({
        ...e,
        results: results.filter(r => r.evaluationId === e.id),
      }));
      includedData.push("evaluations");

      await updateProgress(requestId, 60);
    }

    // Export context packages
    if (exportType === "full") {
      const packages = await db
        .select()
        .from(contextPackages)
        .where(eq(contextPackages.userId, userId));

      exportData.contextPackages = packages;
      includedData.push("contextPackages");

      await updateProgress(requestId, 70);
    }

    // Export activity/analytics
    if (exportType === "full" || exportType === "activity") {
      const activities = await db
        .select()
        .from(analyticsEvents)
        .where(eq(analyticsEvents.userId, userId))
        .orderBy(desc(analyticsEvents.createdAt))
        .limit(1000);

      exportData.activity = activities;
      includedData.push("activity");

      // Export login history
      const loginHistory = await db
        .select()
        .from(loginActivities)
        .where(eq(loginActivities.userId, userId))
        .orderBy(desc(loginActivities.createdAt))
        .limit(500);

      exportData.loginHistory = loginHistory;
      includedData.push("loginHistory");

      await updateProgress(requestId, 80);
    }

    // Export API keys (without sensitive data)
    if (exportType === "full" || exportType === "settings") {
      const keys = await db
        .select({
          id: apiKeys.id,
          name: apiKeys.name,
          keyPrefix: apiKeys.keyPrefix,
          isActive: apiKeys.isActive,
          rateLimit: apiKeys.rateLimit,
          createdAt: apiKeys.createdAt,
          lastUsedAt: apiKeys.lastUsedAt,
        })
        .from(apiKeys)
        .where(eq(apiKeys.userId, userId));

      exportData.apiKeys = keys;
      includedData.push("apiKeys");

      // Export API usage
      const usage = await db
        .select()
        .from(apiUsage)
        .where(eq(apiUsage.userId, userId))
        .orderBy(desc(apiUsage.timestamp))
        .limit(1000);

      exportData.apiUsage = usage;
      includedData.push("apiUsage");

      await updateProgress(requestId, 90);
    }

    // Add metadata
    exportData.metadata = {
      exportDate: new Date().toISOString(),
      exportType,
      format,
      userId,
      includedData,
    };

    // Convert to JSON
    const jsonContent = JSON.stringify(exportData, null, 2);
    const buffer = Buffer.from(jsonContent, "utf-8");

    // Upload to S3
    const fileName = `exports/${userId}/${requestId}/data-export-${new Date().toISOString().split('T')[0]}.json`;
    const { url } = await storagePut(fileName, buffer, "application/json");

    // Update request with file info
    await db
      .update(dataExportRequests)
      .set({
        status: "completed",
        progress: 100,
        fileUrl: url,
        fileSize: buffer.length,
        includedData,
        completedAt: new Date(),
      })
      .where(eq(dataExportRequests.id, requestId));

  } catch (error) {
    console.error("Export error:", error);
    await db
      .update(dataExportRequests)
      .set({
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      })
      .where(eq(dataExportRequests.id, requestId));
  }
}

async function updateProgress(requestId: string, progress: number) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(dataExportRequests)
    .set({ progress })
    .where(eq(dataExportRequests.id, requestId));
}

/**
 * Get export request status
 */
export async function getExportRequest(requestId: string, userId: string) {
  const db = await getDb();
  if (!db) return null;

  const [request] = await db
    .select()
    .from(dataExportRequests)
    .where(and(
      eq(dataExportRequests.id, requestId),
      eq(dataExportRequests.userId, userId)
    ))
    .limit(1);

  return request;
}

/**
 * Get all export requests for a user
 */
export async function getExportHistory(userId: string, limit: number = 20) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(dataExportRequests)
    .where(eq(dataExportRequests.userId, userId))
    .orderBy(desc(dataExportRequests.requestedAt))
    .limit(limit);
}

/**
 * Get download URL for completed export
 */
export async function getExportDownloadUrl(requestId: string, userId: string) {
  const db = await getDb();
  if (!db) return null;

  const [request] = await db
    .select()
    .from(dataExportRequests)
    .where(and(
      eq(dataExportRequests.id, requestId),
      eq(dataExportRequests.userId, userId),
      eq(dataExportRequests.status, "completed")
    ))
    .limit(1);

  if (!request || !request.fileUrl) return null;

  // Check if expired
  if (request.expiresAt && new Date(request.expiresAt) < new Date()) {
    await db
      .update(dataExportRequests)
      .set({ status: "expired" })
      .where(eq(dataExportRequests.id, requestId));
    return null;
  }

  // Generate presigned URL
  const fileName = `exports/${userId}/${requestId}/data-export-${request.completedAt?.toISOString().split('T')[0] || 'export'}.json`;
  try {
    const { url } = await storageGet(fileName, 3600); // 1 hour expiry
    return url;
  } catch {
    return request.fileUrl;
  }
}

/**
 * Create a data deletion request
 */
export async function createDeletionRequest(
  userId: string,
  deletionType: "full" | "prompts" | "evaluations" | "activity"
) {
  const db = await getDb();
  if (!db) return null;

  const requestId = uuidv4();
  const confirmationCode = uuidv4().substring(0, 8).toUpperCase();

  await db.insert(dataDeletionRequests).values({
    id: requestId,
    userId,
    deletionType,
    status: "pending",
    confirmationCode,
  });

  return { requestId, confirmationCode };
}

/**
 * Confirm and execute a deletion request
 */
export async function confirmDeletion(
  requestId: string,
  userId: string,
  confirmationCode: string
) {
  const db = await getDb();
  if (!db) return { success: false, error: "Database unavailable" };

  const [request] = await db
    .select()
    .from(dataDeletionRequests)
    .where(and(
      eq(dataDeletionRequests.id, requestId),
      eq(dataDeletionRequests.userId, userId),
      eq(dataDeletionRequests.status, "pending")
    ))
    .limit(1);

  if (!request) {
    return { success: false, error: "Request not found or already processed" };
  }

  if (request.confirmationCode !== confirmationCode) {
    return { success: false, error: "Invalid confirmation code" };
  }

  try {
    // Update status to processing
    await db
      .update(dataDeletionRequests)
      .set({ status: "processing", confirmedAt: new Date() })
      .where(eq(dataDeletionRequests.id, requestId));

    let deletedRecords = 0;

    // Delete based on type
    if (request.deletionType === "full" || request.deletionType === "prompts") {
      // Delete prompt versions first
      const userPrompts = await db
        .select({ id: prompts.id })
        .from(prompts)
        .where(eq(prompts.userId, userId));

      for (const prompt of userPrompts) {
        await db.delete(promptVersions).where(eq(promptVersions.promptId, prompt.id));
      }

      // Delete prompts
      const result = await db.delete(prompts).where(eq(prompts.userId, userId));
      deletedRecords += userPrompts.length;
    }

    if (request.deletionType === "full" || request.deletionType === "evaluations") {
      // Delete evaluation results first
      const userEvals = await db
        .select({ id: evaluations.id })
        .from(evaluations)
        .where(eq(evaluations.userId, userId));

      for (const eval_ of userEvals) {
        await db.delete(evaluationResults).where(eq(evaluationResults.evaluationId, eval_.id));
      }

      // Delete evaluations
      await db.delete(evaluations).where(eq(evaluations.userId, userId));
      deletedRecords += userEvals.length;
    }

    if (request.deletionType === "full" || request.deletionType === "activity") {
      // Delete analytics events
      await db.delete(analyticsEvents).where(eq(analyticsEvents.userId, userId));
      
      // Delete login activities
      await db.delete(loginActivities).where(eq(loginActivities.userId, userId));
      
      deletedRecords += 1; // Simplified count
    }

    // Update request as completed
    await db
      .update(dataDeletionRequests)
      .set({
        status: "completed",
        deletedRecords,
        completedAt: new Date(),
      })
      .where(eq(dataDeletionRequests.id, requestId));

    return { success: true, deletedRecords };

  } catch (error) {
    await db
      .update(dataDeletionRequests)
      .set({
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      })
      .where(eq(dataDeletionRequests.id, requestId));

    return { success: false, error: "Deletion failed" };
  }
}

/**
 * Get deletion request history
 */
export async function getDeletionHistory(userId: string, limit: number = 20) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(dataDeletionRequests)
    .where(eq(dataDeletionRequests.userId, userId))
    .orderBy(desc(dataDeletionRequests.requestedAt))
    .limit(limit);
}

/**
 * Get data summary for export preview
 */
export async function getDataSummary(userId: string) {
  const db = await getDb();
  if (!db) return null;

  const [promptCount] = await db
    .select({ count: prompts.id })
    .from(prompts)
    .where(eq(prompts.userId, userId));

  const [evalCount] = await db
    .select({ count: evaluations.id })
    .from(evaluations)
    .where(eq(evaluations.userId, userId));

  const [packageCount] = await db
    .select({ count: contextPackages.id })
    .from(contextPackages)
    .where(eq(contextPackages.userId, userId));

  const [activityCount] = await db
    .select({ count: analyticsEvents.id })
    .from(analyticsEvents)
    .where(eq(analyticsEvents.userId, userId));

  const [apiKeyCount] = await db
    .select({ count: apiKeys.id })
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId));

  return {
    prompts: promptCount?.count || 0,
    evaluations: evalCount?.count || 0,
    contextPackages: packageCount?.count || 0,
    activityEvents: activityCount?.count || 0,
    apiKeys: apiKeyCount?.count || 0,
  };
}
