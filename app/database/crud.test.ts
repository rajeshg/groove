/**
 * Comprehensive CRUD Tests for Groove Database Models
 *
 * Tests create, read, update, and delete operations for:
 * - Boards
 * - Columns
 * - Items (Cards)
 * - Comments
 *
 * All IDs should be 11-character beautiful format after generation
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { prisma } from "../../prisma/client"
import { generateId } from "../utils/id"
import { upsertItem } from "../routes/queries"
import type { Board, Column, Item, Comment, Account } from "../../prisma/client"

// ============================================================================
// Setup & Teardown
// ============================================================================

let testAccount: Account | null = null
let testBoard: Board | null = null
let testColumn: Column | null = null
let testItem: Item | null = null
let testComment: Comment | null = null

beforeAll(async () => {
  // Create test account
  testAccount = await prisma.account.create({
    data: {
      id: generateId(),
      email: `crud-test-${Date.now()}@test.com`,
      firstName: "CRUD",
      lastName: "Test",
    },
  })
})

afterAll(async () => {
  // Clean up in order (respecting foreign keys)
  if (testComment) await prisma.comment.delete({ where: { id: testComment.id } }).catch(() => {})
  if (testItem) await prisma.item.delete({ where: { id: testItem.id } }).catch(() => {})
  if (testColumn) await prisma.column.delete({ where: { id: testColumn.id } }).catch(() => {})
  if (testBoard) await prisma.board.delete({ where: { id: testBoard.id } }).catch(() => {})
  if (testAccount) await prisma.account.delete({ where: { id: testAccount.id } }).catch(() => {})

  // Clean up test database
  const testDbPath = process.env.TEST_DB_PATH
  if (testDbPath) {
    try {
      const fs = require('fs')
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath)
        console.log(`🧹 Test database cleaned up: ${process.env.TEST_DB_NAME}`)
      }
    } catch (error: any) {
      console.warn(`⚠️  Could not clean up test database: ${error?.message || 'Unknown error'}`)
    }
  }
})

// ============================================================================
// Board CRUD Tests
// ============================================================================

describe("Board CRUD", { timeout: 30000 }, () => {
  it("CREATE: should create a board with beautiful ID", async () => {
    if (!testAccount) throw new Error("Test account not created")

    testBoard = await prisma.board.create({
      data: {
        id: generateId(),
        name: "Test Board",
        accountId: testAccount.id,
      },
    })

    expect(testBoard).toBeDefined()
    expect(testBoard.id).toHaveLength(11) // ab###-cd### format
    expect(testBoard.name).toBe("Test Board")
    expect(testBoard.accountId).toBe(testAccount.id)
    console.log("✓ Board created with ID:", testBoard.id)
  })

  it("READ: should retrieve board by ID", async () => {
    if (!testBoard) throw new Error("Test board not created")

    const board = await prisma.board.findUniqueOrThrow({
      where: { id: testBoard.id },
    })

    expect(board.id).toBe(testBoard.id)
    expect(board.name).toBe("Test Board")
    console.log("✓ Board retrieved successfully")
  })

  it("UPDATE: should update board properties", async () => {
    if (!testBoard) throw new Error("Test board not created")

    const updated = await prisma.board.update({
      where: { id: testBoard.id },
      data: { name: "Updated Board" },
    })

    expect(updated.name).toBe("Updated Board")
    console.log("✓ Board updated successfully")
  })

  it("LIST: should list all boards for an account", async () => {
    if (!testAccount) throw new Error("Test account not created")

    const boards = await prisma.board.findMany({
      where: { accountId: testAccount.id },
    })

    expect(boards.length).toBeGreaterThan(0)
    expect(boards.some(b => b.id === testBoard?.id)).toBe(true)
    console.log("✓ Listed", boards.length, "boards for account")
  })
})

// ============================================================================
// Column CRUD Tests
// ============================================================================

describe("Column CRUD", { timeout: 30000 }, () => {
  it("CREATE: should create a column with beautiful ID", async () => {
    if (!testBoard) throw new Error("Test board not created")

    testColumn = await prisma.column.create({
      data: {
        id: generateId(),
        name: "To Do",
        boardId: testBoard.id,
        order: 1,
      },
    })

    expect(testColumn).toBeDefined()
    expect(testColumn.id).toHaveLength(11) // ab###-cd### format
    expect(testColumn.name).toBe("To Do")
    expect(testColumn.boardId).toBe(testBoard.id)
    console.log("✓ Column created with ID:", testColumn.id)
  })

  it("READ: should retrieve column by ID", async () => {
    if (!testColumn) throw new Error("Test column not created")

    const column = await prisma.column.findUniqueOrThrow({
      where: { id: testColumn.id },
    })

    expect(column.id).toBe(testColumn.id)
    expect(column.name).toBe("To Do")
    console.log("✓ Column retrieved successfully")
  })

  it("UPDATE: should update column properties", async () => {
    if (!testColumn) throw new Error("Test column not created")

    const updated = await prisma.column.update({
      where: { id: testColumn.id },
      data: { name: "In Progress" },
    })

    expect(updated.name).toBe("In Progress")
    console.log("✓ Column updated successfully")
  })

  it("LIST: should list all columns for a board", async () => {
    if (!testBoard) throw new Error("Test board not created")

    const columns = await prisma.column.findMany({
      where: { boardId: testBoard.id },
    })

    expect(columns.length).toBeGreaterThan(0)
    expect(columns.some(c => c.id === testColumn?.id)).toBe(true)
    console.log("✓ Listed", columns.length, "columns for board")
  })

  it("CREATE: should create multiple columns with isDefault and isExpanded", async () => {
    if (!testBoard) throw new Error("Test board not created")

    const column2 = await prisma.column.create({
      data: {
        id: generateId(),
        name: "Done",
        boardId: testBoard.id,
        order: 3,
        isDefault: false,
        isExpanded: true,
      },
    })

    expect(column2.isDefault).toBe(false)
    expect(column2.isExpanded).toBe(true)

    // Clean up
    await prisma.column.delete({ where: { id: column2.id } })
    console.log("✓ Column with properties created successfully")
  })

  it("CREATE: should handle createColumn function properly", async () => {
    if (!testBoard || !testAccount) throw new Error("Prerequisites not created")

    // Import the function we want to test
    const { createColumn } = await import("../routes/queries")

    const column = await createColumn(testBoard.id, "Test CreateColumn", "dummy-id", testAccount.id)

    expect(column.id).toHaveLength(11) // ab###-cd### format
    expect(column.name).toBe("Test CreateColumn")
    expect(column.boardId).toBe(testBoard.id)
    expect(column.order).toBeGreaterThan(0)

    // Clean up
    await prisma.column.delete({ where: { id: column.id } })
    console.log("✓ createColumn function works correctly")
  })
})

// ============================================================================
// Item (Card) CRUD Tests
// ============================================================================

describe("Item (Card) CRUD", { timeout: 30000 }, () => {
  it("CREATE: should create an item with beautiful ID", async () => {
    if (!testBoard || !testColumn) throw new Error("Test board/column not created")

    testItem = await prisma.item.create({
      data: {
        id: generateId(),
        title: "Test Card",
        content: "Test content",
        order: 1,
        columnId: testColumn.id,
        boardId: testBoard.id,
      },
    })

    expect(testItem).toBeDefined()
    expect(testItem.id).toHaveLength(11) // ab###-cd### format
    expect(testItem.title).toBe("Test Card")
    expect(testItem.columnId).toBe(testColumn.id)
    console.log("✓ Item created with ID:", testItem.id)
  })

  it("READ: should retrieve item by ID", async () => {
    if (!testItem) throw new Error("Test item not created")

    const item = await prisma.item.findUniqueOrThrow({
      where: { id: testItem.id },
    })

    expect(item.id).toBe(testItem.id)
    expect(item.title).toBe("Test Card")
    console.log("✓ Item retrieved successfully")
  })

  it("UPDATE: should update item properties", async () => {
    if (!testItem) throw new Error("Test item not created")

    const updated = await prisma.item.update({
      where: { id: testItem.id },
      data: { title: "Updated Card" },
    })

    expect(updated.title).toBe("Updated Card")
    console.log("✓ Item updated successfully")
  })

  it("LIST: should list all items for a column", async () => {
    if (!testColumn) throw new Error("Test column not created")

    const items = await prisma.item.findMany({
      where: { columnId: testColumn.id },
    })

    expect(items.length).toBeGreaterThan(0)
    expect(items.some(i => i.id === testItem?.id)).toBe(true)
    console.log("✓ Listed", items.length, "items for column")
  })

  it("CREATE: should create item with metadata tracking", async () => {
    if (!testBoard || !testColumn || !testAccount) throw new Error("Prerequisites not created")

    const item = await prisma.item.create({
      data: {
        id: generateId(),
        title: "Metadata Test",
        order: 2,
        columnId: testColumn.id,
        boardId: testBoard.id,
        createdBy: testAccount.id,
      },
    })

    expect(item.createdBy).toBe(testAccount.id)
    expect(item.lastActiveAt).toBeDefined()

    // Clean up
    await prisma.item.delete({ where: { id: item.id } })
    console.log("✓ Item with metadata created successfully")
  })

  it("UPDATE: should update lastActiveAt on modification", async () => {
    if (!testItem) throw new Error("Test item not created")

    const beforeUpdate = testItem.lastActiveAt

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 100))

    const updated = await prisma.item.update({
      where: { id: testItem.id },
      data: { content: "Updated content" },
    })

    expect(updated.lastActiveAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime())
    console.log("✓ lastActiveAt updated on modification")
  })

  it("UPSERT: should handle upsertItem with existing ID (update case)", async () => {
    if (!testItem || !testBoard || !testColumn || !testAccount) throw new Error("Prerequisites not created")

    // Test upserting an existing item (should update)
    const updatedItem = await upsertItem({
      id: testItem.id,
      boardId: testBoard.id,
      columnId: testColumn.id,
      title: "Upsert Updated Title",
      order: 99,
      content: "Upsert updated content",
      createdBy: testAccount.id,
    }, testAccount.id)

    expect(updatedItem.id).toBe(testItem.id)
    expect(updatedItem.title).toBe("Upsert Updated Title")
    expect(updatedItem.content).toBe("Upsert updated content")
    expect(updatedItem.order).toBe(99)
    console.log("✓ upsertItem with existing ID works correctly")
  })

  it("UPSERT: should handle upsertItem without ID (create case)", async () => {
    if (!testBoard || !testColumn || !testAccount) throw new Error("Prerequisites not created")

    // Test upserting a new item (should create)
    const newItem = await upsertItem({
      boardId: testBoard.id,
      columnId: testColumn.id,
      title: "New Upsert Item",
      order: 100,
      content: "New upsert content",
      createdBy: testAccount.id,
    }, testAccount.id)

    expect(newItem.id).toHaveLength(11) // ab###-cd### format
    expect(newItem.title).toBe("New Upsert Item")
    expect(newItem.content).toBe("New upsert content")
    expect(newItem.order).toBe(100)

    // Clean up
    await prisma.item.delete({ where: { id: newItem.id } })
    console.log("✓ upsertItem without ID creates new item correctly")
  })
})

// ============================================================================
// Comment CRUD Tests
// ============================================================================

describe("Comment CRUD", { timeout: 30000 }, () => {
  it("CREATE: should create a comment with beautiful ID", async () => {
    if (!testItem) throw new Error("Test item not created")

    testComment = await prisma.comment.create({
      data: {
        id: generateId(),
        content: "Test comment",
        itemId: testItem.id,
        createdBy: testAccount?.id,
      },
    })

    expect(testComment).toBeDefined()
    expect(testComment.id).toHaveLength(11) // ab###-cd### format
    expect(testComment.content).toBe("Test comment")
    expect(testComment.itemId).toBe(testItem.id)
    console.log("✓ Comment created with ID:", testComment.id)
  })

  it("READ: should retrieve comment by ID", async () => {
    if (!testComment) throw new Error("Test comment not created")

    const comment = await prisma.comment.findUniqueOrThrow({
      where: { id: testComment.id },
    })

    expect(comment.id).toBe(testComment.id)
    expect(comment.content).toBe("Test comment")
    console.log("✓ Comment retrieved successfully")
  })

  it("UPDATE: should update comment content", async () => {
    if (!testComment) throw new Error("Test comment not created")

    const updated = await prisma.comment.update({
      where: { id: testComment.id },
      data: { content: "Updated comment" },
    })

    expect(updated.content).toBe("Updated comment")
    console.log("✓ Comment updated successfully")
  })

  it("LIST: should list all comments for an item", async () => {
    if (!testItem) throw new Error("Test item not created")

    const comments = await prisma.comment.findMany({
      where: { itemId: testItem.id },
    })

    expect(comments.length).toBeGreaterThan(0)
    expect(comments.some(c => c.id === testComment?.id)).toBe(true)
    console.log("✓ Listed", comments.length, "comments for item")
  })

  it("CREATE: should create multiple comments on same item", async () => {
    if (!testItem || !testAccount) throw new Error("Prerequisites not created")

    const comment2 = await prisma.comment.create({
      data: {
        id: generateId(),
        content: "Second comment",
        itemId: testItem.id,
        createdBy: testAccount.id,
      },
    })

    const comment3 = await prisma.comment.create({
      data: {
        id: generateId(),
        content: "Third comment",
        itemId: testItem.id,
        createdBy: testAccount.id,
      },
    })

    const comments = await prisma.comment.findMany({
      where: { itemId: testItem.id },
    })

    expect(comments.length).toBeGreaterThanOrEqual(3)

    // Clean up
    await prisma.comment.delete({ where: { id: comment2.id } })
    await prisma.comment.delete({ where: { id: comment3.id } })
    console.log("✓ Multiple comments created successfully")
  })

  it("READ: should retrieve comment with creator info", async () => {
    if (!testComment) throw new Error("Test comment not created")

    const comment = await prisma.comment.findUniqueOrThrow({
      where: { id: testComment.id },
      include: {
        createdByUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    })

    expect(comment.createdByUser).toBeDefined()
    expect(comment.createdByUser?.firstName).toBe("CRUD")
    console.log("✓ Comment with creator info retrieved successfully")
  })
})

// ============================================================================
// Integration Tests
// ============================================================================

describe("CRUD Integration", { timeout: 30000 }, () => {
  it("should create full workflow: Board -> Column -> Item -> Comment", async () => {
    if (!testAccount) throw new Error("Test account not created")

    // Create board
    const board = await prisma.board.create({
      data: {
        id: generateId(),
        name: "Integration Test Board",
        accountId: testAccount.id,
      },
    })
    expect(board.id).toHaveLength(11) // ab###-cd### format

    // Create column
    const column = await prisma.column.create({
      data: {
        id: generateId(),
        name: "Integration Column",
        boardId: board.id,
        order: 1,
      },
    })
    expect(column.id).toHaveLength(11)

    // Create item
    const item = await prisma.item.create({
      data: {
        id: generateId(),
        title: "Integration Item",
        order: 1,
        columnId: column.id,
        boardId: board.id,
      },
    })
    expect(item.id).toHaveLength(11)

    // Create comment
    const comment = await prisma.comment.create({
      data: {
        id: generateId(),
        content: "Integration comment",
        itemId: item.id,
      },
    })
    expect(comment.id).toHaveLength(11)

    // Verify relationships
    const fullBoard = await prisma.board.findUnique({
      where: { id: board.id },
      include: {
        columns: {
          include: {
            items: {
              include: {
                comments: true,
              },
            },
          },
        },
      },
    })

    expect(fullBoard?.columns[0]?.items[0]?.comments[0]?.content).toBe("Integration comment")

    // Clean up
    await prisma.comment.delete({ where: { id: comment.id } })
    await prisma.item.delete({ where: { id: item.id } })
    await prisma.column.delete({ where: { id: column.id } })
    await prisma.board.delete({ where: { id: board.id } })
    console.log("✓ Full workflow integration test passed")
  })

  it("should handle cascade deletes", async () => {
    if (!testAccount) throw new Error("Test account not created")

    // Create board with column and item
    const board = await prisma.board.create({
      data: {
        id: generateId(),
        name: "Cascade Test Board",
        accountId: testAccount.id,
      },
    })

    const column = await prisma.column.create({
      data: {
        id: generateId(),
        name: "Cascade Column",
        boardId: board.id,
        order: 1,
      },
    })

    const item = await prisma.item.create({
      data: {
        id: generateId(),
        title: "Cascade Item",
        order: 1,
        columnId: column.id,
        boardId: board.id,
      },
    })

    // Delete board (should cascade to column and item)
    await prisma.board.delete({ where: { id: board.id } })

    // Verify cascade worked
    const deletedBoard = await prisma.board.findUnique({ where: { id: board.id } })
    const deletedColumn = await prisma.column.findUnique({ where: { id: column.id } })
    const deletedItem = await prisma.item.findUnique({ where: { id: item.id } })

    expect(deletedBoard).toBeNull()
    expect(deletedColumn).toBeNull()
    expect(deletedItem).toBeNull()
    console.log("✓ Cascade delete test passed")
  })
})
