import { migrate } from "drizzle-orm/libsql/migrator";
import { drizzle } from "drizzle-orm/libsql";
import { getLibsqlDb } from "./client";

// Global database initialization flag
let dbInitialized = false;

/**
 * Run all database migrations using Drizzle migrator
 * Reads migration files from the drizzle folder and applies them
 * Only runs once per application lifecycle
 */
export async function migrateDb() {
  try {
    const client = getLibsqlDb();
    const db = drizzle(client);

    // Run migrations
    await migrate(db as any, {
      migrationsFolder: "./drizzle",
    });

    console.log("✓ All migrations completed successfully");
  } catch (error) {
    console.error("✗ Migration failed:", error);
    throw error;
  }
}

/**
 * Ensure database is initialized - only runs migrations once globally
 * This should be called at application startup, not in individual routes
 */
export async function ensureDbInitialized() {
  if (!dbInitialized) {
    await migrateDb();
    
    // Enable WAL mode for better concurrency and performance
    try {
      const client = getLibsqlDb();
      const result = await client.execute("PRAGMA journal_mode = WAL;");
      console.log("✓ WAL mode enabled:", result.rows[0]);
    } catch (error) {
      console.error("✗ Failed to enable WAL mode:", error);
      // Don't throw - app can still work without WAL mode
    }
    
    dbInitialized = true;
  }
}
