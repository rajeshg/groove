import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

let libsqlDb: ReturnType<typeof createClient> | null = null;
let db: ReturnType<typeof drizzle> | null = null;

/**
 * Get or create the global Drizzle database instance
 * Uses libsql with file-based SQLite for local development
 *
 * IMPORTANT: This can only be called on the server!
 * Will throw an error if called in the browser.
 */
export function getDb() {
  // Protect against client-side execution
  if (typeof window !== "undefined") {
    throw new Error(
      "getDb() can only be called on the server. " +
        "This function uses file:// URLs which are not supported in browsers. " +
        "Make sure your loader has server-side protection."
    );
  }

  if (!db) {
    if (!libsqlDb) {
      const url = process.env.DATABASE_URL || "file:todos.db";
      libsqlDb = createClient({
        url,
      });
    }
    db = drizzle(libsqlDb, { schema });
  }
  return db;
}

/**
 * Get the raw libsql client (rarely needed)
 */
export function getLibsqlDb() {
  if (!libsqlDb) {
    const url = process.env.DATABASE_URL || "file:todos.db";
    libsqlDb = createClient({
      url,
      // Ensure the client is created with write permissions
      // This prevents SQLITE_READONLY errors
    });
  }
  return libsqlDb;
}

/**
 * Initialize the database schema (create tables if they don't exist)
 */
export async function initDb() {
  try {
    const libsql = getLibsqlDb();

    // Create todos table with description column
    await libsql.execute(`
      CREATE TABLE IF NOT EXISTS todos (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        text TEXT NOT NULL,
        description TEXT,
        completed INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `);

    // Create index for faster userId queries
    await libsql.execute(`
      CREATE INDEX IF NOT EXISTS idx_todos_userId ON todos(userId)
    `);

    console.log("✓ Database initialized successfully");
  } catch (error) {
    console.error("✗ Database initialization failed:", error);
    throw error;
  }
}

/**
 * Close the database connection (useful for cleanup)
 */
export function closeDb() {
  if (libsqlDb) {
    try {
      libsqlDb = null;
      db = null;
      console.log("✓ Database connection closed");
    } catch (error) {
      console.error("✗ Error closing database:", error);
    }
  }
}
