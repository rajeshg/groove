import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { generateBase36Id } from "../app/utils/id-generator";

type PrismaGlobal = {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

/**
 * Creates interceptors for auto-injecting Base36 IDs into create and createMany operations
 */
function createIdGenerationInterceptors() {
  return {
    create: ({
      args,
      query,
    }: {
      args: unknown;
      query: (args: unknown) => unknown;
    }) => {
      const argsObj = args as { data?: { id?: string } };
      if (argsObj.data && !argsObj.data.id)
        argsObj.data.id = generateBase36Id();
      return query(args);
    },
    createMany: ({
      args,
      query,
    }: {
      args: unknown;
      query: (args: unknown) => unknown;
    }) => {
      const argsObj = args as { data?: unknown[] };
      if (Array.isArray(argsObj.data)) {
        argsObj.data = argsObj.data.map((item: unknown) =>
          typeof item === "object" &&
          item !== null &&
          !(item as Record<string, unknown>).id
            ? { ...item, id: generateBase36Id() }
            : item
        );
      }
      return query(args);
    },
  };
}

/**
 * Prisma models that need automatic ID generation
 */
const MODELS_WITH_ID_GENERATION = [
  "account",
  "password",
  "board",
  "column",
  "item",
  "comment",
  "assignee",
  "boardMember",
  "boardInvitation",
] as const;

/**
 * Builds query extensions for all models that need ID auto-generation
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildQueryExtensions(): any {
  const extensions: Record<string, unknown> = {};
  for (const model of MODELS_WITH_ID_GENERATION) {
    extensions[model] = createIdGenerationInterceptors();
  }
  return extensions;
}

function createPrismaClient() {
  const adapter = new PrismaLibSql({
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  });

  const client = new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

  // Extend Prisma client to auto-inject Base36 IDs for all models
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (client as any).$extends({
    query: buildQueryExtensions(),
  });
}

const globalForPrisma = globalThis as unknown as PrismaGlobal;

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
