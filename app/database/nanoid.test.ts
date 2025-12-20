import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { prisma } from "../../prisma/client"
import { generateId } from "../utils/id"
import type { Board, Account } from "../../prisma/client"

describe("ID generation with Board model", { timeout: 30000 }, () => {
  let testAccount: Account | null = null
  let testBoardIds: string[] = []

  beforeAll(async () => {
    testAccount = await prisma.account.create({
      data: {
        id: generateId(),
        email: "test-nanoid@test.com",
        firstName: "Test",
        lastName: "User",
      },
    })
  })

  afterAll(async () => {
    // Clean up boards first
    for (const boardId of testBoardIds) {
      await prisma.board.delete({ where: { id: boardId } }).catch(() => {})
    }
    if (testAccount) {
      await prisma.account.delete({ where: { id: testAccount.id } }).catch(() => {})
    }
  })

//  it("generateId() generates beautiful 11-character IDs", () => {
//    const { generateId } = require("./id")
//    const id1 = generateId()
//    const id2 = generateId()
//    const id3 = generateId()
//
//    expect(id1).toHaveLength(11) // ab###-cd### format
//    expect(id2).toHaveLength(11)
//    expect(id3).toHaveLength(11)
//
//    // Check format: 2 letters + 3 numbers, dash, 2 letters + 3 numbers
//    const formatRegex = /^[a-z]{2}\d{3}-[a-z]{2}\d{3}$/
//    expect(id1).toMatch(formatRegex)
//    expect(id2).toMatch(formatRegex)
//    expect(id3).toMatch(formatRegex)
//
//    // All should be different
//    expect(id1).not.toBe(id2)
//    expect(id1).not.toBe(id3)
//    expect(id2).not.toBe(id3)
//
//    console.log("✓ Beautiful IDs:", id1, id2, id3)
//  })

  it("Prisma-generated Board ID follows beautiful format", async () => {
    if (!testAccount) throw new Error("Test account not created")

    const board = await prisma.board.create({
      data: {
        id: generateId(),
        name: "Test Board Beautiful ID",
        accountId: testAccount.id,
      },
    })

    testBoardIds.push(board.id)

    expect(board.id).toHaveLength(11) // ab###-cd### format
    expect(board.id).toMatch(/^[a-z]{2}\d{3}-[a-z]{2}\d{3}$/)
    console.log("✓ Board ID beautiful format:", board.id)
  })
})
