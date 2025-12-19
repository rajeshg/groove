// Re-export all types from the generated Prisma client for convenience
export * from "./generated/client.js"

import { PrismaClient } from "./generated/client.js"
import { PrismaLibSql } from "@prisma/adapter-libsql"

type PrismaGlobal = {
  prisma: PrismaClient
}

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL || "file:/app/prisma/data/data.db"

  const adapter = new PrismaLibSql({
    url: databaseUrl,
  })

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  })
}

const globalForPrisma = globalThis as unknown as PrismaGlobal

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
