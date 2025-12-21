// Re-export all types from the generated Prisma client for convenience
export * from "./generated/client.js";

import { PrismaClient } from "./generated/client.js";
import { PrismaLibSql } from "@prisma/adapter-libsql";

type PrismaGlobal = {
  prisma: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  const databaseUrl =
    process.env.DATABASE_URL || "file:./prisma/data/data.db";

  const adapter = new PrismaLibSql({
    url: databaseUrl,
  });

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as PrismaGlobal;

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Global flag to ensure database initialization happens only once
let databaseInitialized = false;

// Initialize WAL mode for better database performance
export async function initializeDatabase(): Promise<void> {
  if (databaseInitialized) return;
  databaseInitialized = true;

  try {
    // Enable WAL mode for better concurrent read/write performance
    await prisma.$queryRaw`PRAGMA journal_mode=WAL`;
    console.log("✅ SQLite WAL mode enabled");

    // Verify WAL mode is active
    const result = await prisma.$queryRaw<{ journal_mode: string }[]>`PRAGMA journal_mode`;
    const mode = result[0]?.journal_mode;
    if (mode === 'wal') {
      console.log("✅ WAL mode verified as active");
    } else {
      console.log(`ℹ️ Journal mode is: ${mode}`);
    }
  } catch (error) {
    console.warn("⚠️ Failed to enable WAL mode:", error);
  }
}
