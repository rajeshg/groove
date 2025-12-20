import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { prisma } from "../../prisma/client"
import { generateId } from "../utils/id"

let testAccount: any = null
let testColumn: any = null

beforeAll(async () => {
  testAccount = await prisma.account.create({
    data: {
      id: generateId(),
      email: "validation-integration@test.com",
      firstName: "Validation",
      lastName: "Integration",
    },
  })

  const testBoard = await prisma.board.create({
    data: {
      id: generateId(),
      name: "Test Board",
      accountId: testAccount.id,
    },
  })

  testColumn = await prisma.column.create({
    data: {
      id: generateId(),
      name: "Test Column", 
      boardId: testBoard.id,
      order: 1,
    },
  })
})

afterAll(async () => {
  if (testColumn) await prisma.column.delete({ where: { id: testColumn.id } })
  if (testAccount) {
    const board = await prisma.board.findFirst({ where: { accountId: testAccount.id } })
    if (board) await prisma.board.delete({ where: { id: board.id } })
    await prisma.account.delete({ where: { id: testAccount.id } })
  }
})

describe("Validation Integration", () => {
  it("should have test setup working", () => {
    expect(testAccount).toBeDefined()
    expect(testColumn).toBeDefined()
  })
})
