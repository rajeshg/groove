import { ensureDbInitialized } from "~/server/db/migrations";

// Global flag to track if server initialization has been called
let serverInitialized = false;

/**
 * Initialize the server on startup
 * This should be called once when the server starts
 * It ensures the database is migrated before any requests are handled
 */
export async function initializeServer() {
  if (serverInitialized) {
    return;
  }

  try {
    console.log("[Server Init] Starting server initialization...");
    await ensureDbInitialized();
    serverInitialized = true;
    console.log("[Server Init] ✓ Server initialization complete");
  } catch (error) {
    console.error("[Server Init] ✗ Server initialization failed:", error);
    // Don't throw - let the app start anyway, migrations might not be needed
    serverInitialized = true;
  }
}

/**
 * Get the server initialization status
 */
export function isServerInitialized() {
  return serverInitialized;
}
