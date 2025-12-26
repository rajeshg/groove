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
    dbInitialized = true;
  }
}
