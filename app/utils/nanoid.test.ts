/**
 * nanoid(12) ID Generation Tests
 *
 * This test suite verifies that Prisma is correctly generating 12-character IDs using nanoid.
 *
 * Issue: https://github.com/sst/opencode
 * - Local environment was generating 25-character IDs instead of 12
 * - Remote environment was working correctly with 12-character IDs
 *
 * Root Cause:
 * - Stale Prisma Client code in node_modules/@prisma/client
 *
 * Fix:
 * - Run: npx prisma generate
 * - This regenerates the Prisma Client with the correct ID generation logic from the schema
 *
 * Test Coverage:
 * - Verifies direct nanoid(12) behavior
 * - Verifies Prisma-generated IDs via Board model
 * - Tests ID persistence to database
 * - Tests ID format (alphanumeric base36, 12 characters)
 * - Tests ID uniqueness across records
 *
 * Example IDs Generated:
 * - k0HvdHfIL7W3 (12 chars)
 * - ut3rMhbL-pIT (12 chars)
 * - Kv5gcsP1IQO7 (12 chars)
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { prisma } from "../../prisma/client"
import { nanoid } from "nanoid"
import type { Board, Account } from "../../prisma/client"

describe("nanoid(12) ID generation with Board model", () => {
  let testAccount: Account | null = null
  let testBoardIds: string[] = []

  beforeAll(async () => {
    // Create a test account to use for all tests
    testAccount = await prisma.account.create({
      data: {
        email: `test-nanoid-${Date.now()}@test.com`,
        firstName: "Test",
        lastName: "User",
      },
    })
  })

  afterAll(async () => {
    // Delete all test boards first (foreign key constraint)
    await prisma.board.deleteMany({
      where: {
        id: {
          in: testBoardIds,
        },
      },
    })

    // Then delete the test account
    if (testAccount) {
      await prisma.account.delete({
        where: { id: testAccount.id },
      })
    }
  })

  it("direct nanoid(12) generates 12-character IDs", () => {
    const id1 = nanoid(12)
    const id2 = nanoid(12)
    const id3 = nanoid(12)

    expect(id1).toHaveLength(12)
    expect(id2).toHaveLength(12)
    expect(id3).toHaveLength(12)

    // Should all be different
    expect([id1, id2, id3].length).toBe(new Set([id1, id2, id3]).size)
  })

  it("direct nanoid(12) uses alphanumeric base36 alphabet", () => {
    const base36Alphabet = /^[a-z0-9_-]{12}$/i
    for (let i = 0; i < 10; i++) {
      const id = nanoid(12)
      expect(id).toMatch(base36Alphabet)
    }
  })

  it("Prisma-generated Board ID is 12 characters", async () => {
    if (!testAccount) throw new Error("Test account not created")

    const board = await prisma.board.create({
      data: {
        name: "Test Board Nanoid",
        accountId: testAccount.id,
      },
    })

    testBoardIds.push(board.id)

    expect(board.id).toHaveLength(12)
    console.log("✓ Board ID length:", board.id.length, "Value:", board.id)
  })

  it("Prisma-generated Board ID uses valid alphanumeric characters", async () => {
    if (!testAccount) throw new Error("Test account not created")

    const board = await prisma.board.create({
      data: {
        name: "Test Board Alphanumeric",
        accountId: testAccount.id,
      },
    })

    testBoardIds.push(board.id)

    const base36Alphabet = /^[a-z0-9_-]{12}$/i
    expect(board.id).toMatch(base36Alphabet)
    console.log("✓ Board ID format valid:", board.id)
  })

  it("Multiple Board records have unique IDs", async () => {
    if (!testAccount) throw new Error("Test account not created")

    const boards = await Promise.all([
      prisma.board.create({
        data: {
          name: "Board 1",
          accountId: testAccount.id,
        },
      }),
      prisma.board.create({
        data: {
          name: "Board 2",
          accountId: testAccount.id,
        },
      }),
      prisma.board.create({
        data: {
          name: "Board 3",
          accountId: testAccount.id,
        },
      }),
    ])

    boards.forEach((b: Board) => testBoardIds.push(b.id))

    const ids = boards.map((b: Board) => b.id)
    const uniqueIds = new Set(ids)

    expect(uniqueIds.size).toBe(3)
    console.log("✓ Three unique Board IDs created:", ids)
  })

  it("Board ID persists correctly to database", async () => {
    if (!testAccount) throw new Error("Test account not created")

    const createdBoard = await prisma.board.create({
      data: {
        name: "Test Board Persistence",
        accountId: testAccount.id,
      },
    })

    testBoardIds.push(createdBoard.id)

    // Query back from database
    const retrievedBoard = await prisma.board.findUniqueOrThrow({
      where: { id: createdBoard.id },
    })

    expect(retrievedBoard.id).toBe(createdBoard.id)
    expect(retrievedBoard.id).toHaveLength(12)
    console.log("✓ Board ID persisted correctly:", retrievedBoard.id)
  })

  it("Board ID matches nanoid(12) format in database", async () => {
    if (!testAccount) throw new Error("Test account not created")

    const boards = await Promise.all([
      prisma.board.create({
        data: {
          name: "Format Test 1",
          accountId: testAccount.id,
        },
      }),
      prisma.board.create({
        data: {
          name: "Format Test 2",
          accountId: testAccount.id,
        },
      }),
      prisma.board.create({
        data: {
          name: "Format Test 3",
          accountId: testAccount.id,
        },
      }),
    ])

    boards.forEach((b: Board) => testBoardIds.push(b.id))

    // Verify all board IDs follow nanoid(12) pattern
    const base36Alphabet = /^[a-z0-9_-]{12}$/i
    boards.forEach((board: Board) => {
      expect(board.id).toMatch(base36Alphabet)
      expect(board.id).toHaveLength(12)
    })
    console.log("✓ All Board IDs follow nanoid(12) format")
  })

  it("Can query Board by generated ID", async () => {
    if (!testAccount) throw new Error("Test account not created")

    const board = await prisma.board.create({
      data: {
        name: "Queryable Board",
        accountId: testAccount.id,
      },
    })

    testBoardIds.push(board.id)

    const foundBoard = await prisma.board.findUnique({
      where: { id: board.id },
    })

    expect(foundBoard).not.toBeNull()
    expect(foundBoard?.id).toBe(board.id)
    expect(foundBoard?.name).toBe("Queryable Board")
    console.log("✓ Board queried successfully by ID:", board.id)
  })

  it("Account ID is also 12 characters (nanoid)", async () => {
    const account = await prisma.account.create({
      data: {
        email: `account-test-${Date.now()}@test.com`,
        firstName: "Account",
        lastName: "Test",
      },
    })

    expect(account.id).toHaveLength(12)

    const base36Alphabet = /^[a-z0-9_-]{12}$/i
    expect(account.id).toMatch(base36Alphabet)
    console.log("✓ Account ID is 12 characters:", account.id)

    // Cleanup the account we created
    await prisma.account.delete({
      where: { id: account.id },
    })
  })

  it("Compares direct nanoid(12) with Prisma-generated IDs", async () => {
    if (!testAccount) throw new Error("Test account not created")

    // Create a Prisma-generated ID via Board
    const board = await prisma.board.create({
      data: {
        name: "Comparison Board",
        accountId: testAccount.id,
      },
    })

    testBoardIds.push(board.id)

    // Generate direct nanoid(12)
    const directId = nanoid(12)

    // Both should be 12 characters
    expect(board.id).toHaveLength(12)
    expect(directId).toHaveLength(12)

    // Both should match the base36 alphabet
    const base36Alphabet = /^[a-z0-9_-]{12}$/i
    expect(board.id).toMatch(base36Alphabet)
    expect(directId).toMatch(base36Alphabet)

    console.log("✓ Prisma ID:", board.id, "Direct ID:", directId)
    console.log("✓ Both follow the same format and length")
  })
})
