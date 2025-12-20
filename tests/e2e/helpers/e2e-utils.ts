import { faker } from "@faker-js/faker"
import { prisma } from "../../../prisma/client"
import { generateId } from "../../../app/utils/id"
import crypto from "crypto"

/**
 * Generate a random email for testing
 */
export function generateTestEmail() {
  return faker.internet.email().toLowerCase()
}

/**
 * Generate test user data
 */
export function generateTestUser() {
  return {
    email: generateTestEmail(),
    password: faker.internet.password({ length: 12 }) + "!A1",
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
  }
}

/**
 * Hash password (same logic as in login.queries.ts)
 */
export function hashPassword(password: string, salt: string) {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, "sha256").toString("hex")
}

/**
 * Create a test account directly in database
 */
export async function createTestAccount(userData?: {
  email?: string
  password?: string
  firstName?: string
  lastName?: string
}) {
  const data = {
    email: userData?.email || generateTestEmail(),
    password: userData?.password || faker.internet.password({ length: 12 }) + "!A1",
    firstName: userData?.firstName || faker.person.firstName(),
    lastName: userData?.lastName || faker.person.lastName(),
  }

  const salt = crypto.randomBytes(16).toString("hex")
  const hash = hashPassword(data.password, salt)

  const account = await prisma.account.create({
    data: {
      id: generateId(),
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      Password: {
        create: {
          id: generateId(),
          salt: salt,
          hash: hash,
        },
      },
    },
  })

  return { account, plainPassword: data.password }
}

/**
 * Create a test board for an account
 */
export async function createTestBoard(accountId: string, name?: string, createMultipleColumns = false) {
  const columnsData = createMultipleColumns
    ? [
        {
          id: generateId(),
          name: "Todo",
          order: 1,
          color: "#94a3b8",
        },
        {
          id: generateId(),
          name: "In Progress",
          order: 2,
          color: "#f59e0b",
        },
        {
          id: generateId(),
          name: "Done",
          order: 3,
          color: "#10b981",
        },
      ]
    : [
        {
          id: generateId(),
          name: "Todo",
          order: 1,
          color: "#94a3b8",
        },
      ]

  const board = await prisma.board.create({
    data: {
      id: generateId(),
      name: name || faker.company.name() + " Board",
      color: "#3b82f6",
      accountId: accountId,
      columns: {
        create: columnsData,
      },
      members: {
        create: {
          id: generateId(),
          accountId: accountId,
          role: "owner",
        },
      },
    },
    include: {
      columns: true,
    },
  })

  return board
}

/**
 * Create a board invitation
 */
export async function createTestInvitation(
  boardId: string,
  email: string,
  invitedBy: string
) {
  const invitation = await prisma.boardInvitation.create({
    data: {
      id: generateId(),
      email,
      role: "editor",
      boardId,
      invitedBy,
      status: "pending",
    },
  })

  return invitation
}

/**
 * Cleanup test data
 */
export async function cleanupTestData(accountIds: string[]) {
  if (accountIds.length === 0) return

  // Get emails of accounts to clean up invitations sent to them
  const accounts = await prisma.account.findMany({
    where: { id: { in: accountIds } },
    select: { email: true },
  })
  const emails = accounts.map((a) => a.email)

  // Delete in proper order to avoid foreign key constraints
  // Schema has RESTRICT on Board.accountId, BoardInvitation.invitedBy, and Password.accountId

  // 1. Delete all board invitations related to these accounts
  await prisma.boardInvitation.deleteMany({
    where: {
      OR: [
        { invitedBy: { in: accountIds } }, // Invitations created by these accounts
        { email: { in: emails } }, // Invitations sent to these emails
      ],
    },
  })

  // 2. Delete board memberships for these accounts
  await prisma.boardMember.deleteMany({
    where: {
      accountId: { in: accountIds },
    },
  })

  // 3. Delete boards owned by these accounts (cascade will handle columns, items, comments, assignees)
  await prisma.board.deleteMany({
    where: {
      accountId: { in: accountIds },
    },
  })

  // 4. Delete passwords (has RESTRICT on accountId)
  await prisma.password.deleteMany({
    where: {
      accountId: { in: accountIds },
    },
  })

  // 5. Finally delete accounts
  await prisma.account.deleteMany({
    where: {
      id: { in: accountIds },
    },
  })
}
