import { getDb } from "../db";

/**
 * Execute multiple database operations in a transaction
 * Automatically rolls back on error
 * 
 * @example
 * await withTransaction(async (tx) => {
 *   await tx.insert(prompts).values({...});
 *   await tx.insert(promptVersions).values({...});
 * });
 */
export async function withTransaction<T>(
  callback: (tx: Awaited<ReturnType<typeof getDb>>) => Promise<T>
): Promise<T> {
  const db = await getDb();
  
  if (!db) {
    throw new Error("Database connection not available");
  }

  try {
    // Start transaction
    await db.execute("START TRANSACTION");
    
    // Execute callback with db connection
    const result = await callback(db);
    
    // Commit if successful
    await db.execute("COMMIT");
    
    return result;
  } catch (error) {
    // Rollback on error
    try {
      await db.execute("ROLLBACK");
    } catch (rollbackError) {
      console.error("Failed to rollback transaction:", rollbackError);
    }
    
    // Re-throw original error
    throw error;
  }
}

/**
 * Check if database supports transactions
 * Some database configurations may not support transactions
 */
export async function supportsTransactions(): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;
    
    await db.execute("START TRANSACTION");
    await db.execute("ROLLBACK");
    return true;
  } catch (error) {
    console.warn("Database does not support transactions:", error);
    return false;
  }
}
