import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../../prisma/client";
import { generateId } from "../utils/id";
import type { Account, Column } from "../../prisma/client";

let testAccount: Account | null = null;
let testColumn: Column | null = null;

beforeAll(async () => {
  testAccount = await prisma.account.create({
    data: {
      id: generateId(),
      email: "validation-integration@test.com",
      firstName: "Validation",
      lastName: "Integration",
    },
  });

  const testBoard = await prisma.board.create({
    data: {
      id: generateId(),
      name: "Test Board",
      accountId: testAccount.id,
    },
  });

  testColumn = await prisma.column.create({
    data: {
      id: generateId(),
      name: "Test Column",
      boardId: testBoard.id,
      order: 1,
    },
  });
});

afterAll(async () => {
  if (testColumn)
    await prisma.column
      .delete({ where: { id: testColumn.id } })
      .catch(() => {});
  if (testAccount) {
    const board = await prisma.board.findFirst({
      where: { accountId: testAccount.id },
    });
    if (board)
      await prisma.board.delete({ where: { id: board.id } }).catch(() => {});
    await prisma.account
      .delete({ where: { id: testAccount.id } })
      .catch(() => {});
  }

  // Clean up test database
  const testDbPath = process.env.TEST_DB_PATH;
  if (testDbPath) {
    try {
      const fs = require("fs");
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
        console.log(`🧹 Test database cleaned up: ${process.env.TEST_DB_NAME}`);
      }
    } catch (error: unknown) {
      console.warn(
        `⚠️  Could not clean up test database: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
});

describe("Validation Integration", () => {
  it("should have test setup working", () => {
    expect(testAccount).toBeDefined();
    expect(testColumn).toBeDefined();
  });
});
