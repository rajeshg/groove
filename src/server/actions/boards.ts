import { createServerFn } from "@tanstack/react-start";
import { getDb } from "~/server/db/client";
import {
  boards,
  columns,
  items,
  comments,
  accounts,
  assignees,
  boardMembers,
  boardInvitations,
  activities,
} from "~/server/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { z } from "zod";
import { getBoardTemplate } from "~/constants/templates";
import { generateId } from "~/lib/id";
import {
  CreateBoardSchema,
  UpdateBoardSchema,
  CreateColumnSchema,
  UpdateColumnSchema,
  CreateItemSchema,
  UpdateItemSchema,
  CreateCommentSchema,
  UpdateCommentSchema,
  InviteBoardMemberSchema,
  AcceptInvitationSchema,
} from "~/server/validation";
import { sendBoardInvitationEmail } from "~/lib/email";

// ============================================================================
// Board Server Functions
// ============================================================================

/**
 * Get all boards for the current user
 * Includes boards they own AND boards they're invited to
 */
export const getBoards = createServerFn({ method: "GET" })
  .inputValidator(z.object({ accountId: z.string() }))
  .handler(async ({ data: { accountId } }) => {
    const db = getDb();
    const userBoards = await db
      .select({
        id: boards.id,
        accountId: boards.accountId,
        name: boards.name,
        color: boards.color,
        createdAt: boards.createdAt,
        updatedAt: boards.updatedAt,
      })
      .from(boards)
      .innerJoin(boardMembers, eq(boards.id, boardMembers.boardId))
      .where(eq(boardMembers.accountId, accountId))
      .orderBy(boards.createdAt);

    return userBoards;
  });

/**
 * Get all columns across all boards for an account
 * Includes columns from boards the user owns AND boards they're invited to
 */
export const getAllColumns = createServerFn({ method: "GET" })
  .inputValidator(z.object({ accountId: z.string() }))
  .handler(async ({ data: { accountId } }) => {
    const db = getDb();
    // Get all columns for boards this account has access to (via boardMembers)
    const allColumns = await db
      .select({
        id: columns.id,
        boardId: columns.boardId,
        name: columns.name,
        color: columns.color,
        order: columns.order,
        isDefault: columns.isDefault,
        isExpanded: columns.isExpanded,
        shortcut: columns.shortcut,
        createdAt: columns.createdAt,
        updatedAt: columns.updatedAt,
      })
      .from(columns)
      .innerJoin(boardMembers, eq(columns.boardId, boardMembers.boardId))
      .where(eq(boardMembers.accountId, accountId))
      .orderBy(columns.order);

    return allColumns;
  });

/**
 * Get all items across all boards for an account
 * Includes items from boards the user owns AND boards they're invited to
 */
export const getAllItems = createServerFn({ method: "GET" })
  .inputValidator(z.object({ accountId: z.string() }))
  .handler(async ({ data: { accountId } }) => {
    const db = getDb();
    // Get all items for boards this account has access to (via boardMembers)
    // Include creator user data via left join
    const allItems = await db
      .select({
        id: items.id,
        boardId: items.boardId,
        columnId: items.columnId,
        title: items.title,
        content: items.content,
        order: items.order,
        createdBy: items.createdBy,
        assigneeId: items.assigneeId,
        createdAt: items.createdAt,
        updatedAt: items.updatedAt,
        lastActiveAt: items.lastActiveAt,
        // Creator user data (left join in case user was deleted)
        createdByUser: {
          id: accounts.id,
          firstName: accounts.firstName,
          lastName: accounts.lastName,
          email: accounts.email,
        },
      })
      .from(items)
      .innerJoin(boardMembers, eq(items.boardId, boardMembers.boardId))
      .leftJoin(accounts, eq(items.createdBy, accounts.id))
      .where(eq(boardMembers.accountId, accountId))
      .orderBy(items.order);

    return allItems;
  });

/**
 * Get all comments across all items for an account
 * Includes comments from boards the user owns AND boards they're invited to
 */
export const getAllComments = createServerFn({ method: "GET" })
  .inputValidator(z.object({ accountId: z.string() }))
  .handler(async ({ data: { accountId } }) => {
    const db = getDb();
    // Get all comments for items in boards this account has access to (via boardMembers)
    const allComments = await db
      .select({
        id: comments.id,
        itemId: comments.itemId,
        accountId: comments.accountId,
        content: comments.content,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
      })
      .from(comments)
      .innerJoin(items, eq(comments.itemId, items.id))
      .innerJoin(boardMembers, eq(items.boardId, boardMembers.boardId))
      .where(eq(boardMembers.accountId, accountId))
      .orderBy(desc(comments.createdAt));

    return allComments;
  });

/**
 * Get a single board with all its columns and items
 */
export const getBoard = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      accountId: z.string(),
      boardId: z.string(),
    })
  )
  .handler(async ({ data: { accountId, boardId } }) => {
    const db = getDb();

    // Verify ownership
    const board = await db
      .select()
      .from(boards)
      .where(and(eq(boards.id, boardId), eq(boards.accountId, accountId)))
      .limit(1);

    if (!board[0]) {
      throw new Error("Board not found");
    }

    // Get columns
    const boardColumns = await db
      .select()
      .from(columns)
      .where(eq(columns.boardId, boardId))
      .orderBy((c) => c.order);

    // Get items for all columns
    const boardItems = await db
      .select()
      .from(items)
      .where(eq(items.boardId, boardId))
      .orderBy((i) => i.order);

    return {
      board: board[0],
      columns: boardColumns,
      items: boardItems,
    };
  });

/**
 * Create a new board
 */
export const createBoard = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      accountId: z.string(),
      data: CreateBoardSchema,
    })
  )
  .handler(async ({ data: { accountId, data } }) => {
    const db = getDb();
    const boardId = generateId();
    const now = new Date().toISOString();

    const newBoard = {
      id: boardId,
      accountId,
      name: data.name,
      color: data.color,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(boards).values(newBoard);

    // Add board owner as a member with "owner" role
    await db.insert(boardMembers).values({
      id: generateId(),
      boardId,
      accountId,
      role: "owner",
      createdAt: now,
    });

    // Get template columns or use defaults
    let columnsToCreate: Array<{
      name: string;
      color: string;
      order: number;
      isDefault: boolean;
      isExpanded?: boolean;
      shortcut?: string | null;
    }> = [];

    if (data.template) {
      const template = getBoardTemplate(data.template);
      if (template) {
        columnsToCreate = template.columns.map((col) => ({
          name: col.name,
          color: col.color,
          order: col.order,
          isDefault: col.isDefault,
          isExpanded: col.isExpanded,
          shortcut: col.shortcut || null,
        }));
      }
    }

    // Fallback to default columns if no template
    if (columnsToCreate.length === 0) {
      columnsToCreate = [
        {
          name: "Todo",
          color: "red",
          order: 0,
          isDefault: true,
          isExpanded: true,
          shortcut: null,
        },
        {
          name: "In Progress",
          color: "yellow",
          order: 1,
          isDefault: true,
          isExpanded: true,
          shortcut: null,
        },
        {
          name: "Done",
          color: "green",
          order: 2,
          isDefault: true,
          isExpanded: true,
          shortcut: null,
        },
      ];
    }

    for (const col of columnsToCreate) {
      await db.insert(columns).values({
        id: generateId(),
        boardId,
        name: col.name,
        color: col.color,
        order: col.order,
        isDefault: col.isDefault,
        isExpanded: col.isExpanded ?? true,
        shortcut: col.shortcut,
        createdAt: now,
        updatedAt: now,
      });
    }

    return newBoard;
  });

/**
 * Update a board
 */
export const updateBoard = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      accountId: z.string(),
      boardId: z.string(),
      data: UpdateBoardSchema,
    })
  )
  .handler(async ({ data: { accountId, boardId, data } }) => {
    const db = getDb();

    // Verify ownership
    const existing = await db
      .select()
      .from(boards)
      .where(and(eq(boards.id, boardId), eq(boards.accountId, accountId)))
      .limit(1);

    if (!existing[0]) {
      throw new Error("Board not found");
    }

    const now = new Date().toISOString();
    await db
      .update(boards)
      .set({
        ...data,
        updatedAt: now,
      })
      .where(eq(boards.id, boardId));

    const updated = await db
      .select()
      .from(boards)
      .where(eq(boards.id, boardId))
      .limit(1);
    return updated[0];
  });

/**
 * Delete a board
 */
export const deleteBoard = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      accountId: z.string(),
      boardId: z.string(),
    })
  )
  .handler(async ({ data: { accountId, boardId } }) => {
    const db = getDb();

    // Verify ownership
    const existing = await db
      .select()
      .from(boards)
      .where(and(eq(boards.id, boardId), eq(boards.accountId, accountId)))
      .limit(1);

    if (!existing[0]) {
      throw new Error("Board not found");
    }

    // Delete all items, columns and activities
    await db.delete(items).where(eq(items.boardId, boardId));
    await db.delete(columns).where(eq(columns.boardId, boardId));
    await db.delete(activities).where(eq(activities.boardId, boardId));
    await db.delete(boards).where(eq(boards.id, boardId));

    return { success: true };
  });

// ============================================================================
// Board Invitation Server Functions
// ============================================================================

/**
 * Invite a user to a board by email
 * Creates a pending invitation that the user can accept
 */
export const inviteUserToBoard = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      accountId: z.string(),
      boardId: z.string(),
      data: InviteBoardMemberSchema,
    })
  )
  .handler(async ({ data: { accountId, boardId, data } }) => {
    const db = getDb();
    const { email, role } = data;

    // Verify user owns the board
    const board = await db
      .select()
      .from(boards)
      .where(and(eq(boards.id, boardId), eq(boards.accountId, accountId)))
      .limit(1);

    if (!board[0]) {
      throw new Error("Board not found or access denied");
    }

    const boardName = board[0].name;

    // Get inviter's name
    const inviter = await db
      .select({ firstName: accounts.firstName, lastName: accounts.lastName })
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .limit(1);

    if (!inviter[0]) {
      throw new Error("Inviter account not found");
    }

    const inviterName = `${inviter[0].firstName} ${inviter[0].lastName}`;

    // Check for existing invitation
    const existingInvitation = await db
      .select()
      .from(boardInvitations)
      .where(
        and(
          eq(boardInvitations.email, email),
          eq(boardInvitations.boardId, boardId),
          eq(boardInvitations.status, "pending")
        )
      )
      .limit(1);

    if (existingInvitation[0]) {
      throw new Error("An invitation has already been sent to this email");
    }

    // Create invitation
    const now = new Date().toISOString();
    const invitation = {
      id: generateId(),
      boardId,
      email,
      role,
      status: "pending",
      invitedBy: accountId,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(boardInvitations).values(invitation);

    // Send invitation email (fire and forget)
    const baseUrl =
      process.env.APP_URL?.replace(/\/$/, "") || "http://localhost:3000";
    const inviteUrl = `${baseUrl}/invite?id=${invitation.id}`;
    try {
      await sendBoardInvitationEmail(
        invitation.email,
        boardName,
        inviterName,
        inviteUrl
      );
    } catch (emailError) {
      console.error("Failed to send invitation email:", emailError);
      // Don't fail invitation if email fails
    }

    return invitation;
  });

/**
 * Accept a board invitation
 * Adds the user to the board as a member
 */
export const acceptBoardInvitation = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      accountId: z.string(),
      data: AcceptInvitationSchema,
    })
  )
  .handler(async ({ data: { accountId, data } }) => {
    const db = getDb();
    const { invitationId } = data;

    // Get invitation details
    const invitation = await db
      .select()
      .from(boardInvitations)
      .where(eq(boardInvitations.id, invitationId))
      .limit(1);

    if (!invitation[0]) {
      throw new Error("Invitation not found");
    }

    if (invitation[0].status !== "pending") {
      throw new Error("Invitation has already been processed");
    }

    // Check if invitation has expired (7 days)
    const invitationAge =
      Date.now() - new Date(invitation[0].createdAt).getTime();
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
    if (invitationAge > sevenDaysInMs) {
      throw new Error("Invitation has expired");
    }

    // Get user's email
    const user = await db
      .select({ email: accounts.email })
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .limit(1);

    if (!user[0]) {
      throw new Error("User not found");
    }

    // Verify invitation email matches user's email
    if (user[0].email !== invitation[0].email) {
      throw new Error("This invitation was sent to a different email address");
    }

    // Check if user is already a member (race condition protection)
    const existingMember = await db
      .select()
      .from(boardMembers)
      .where(
        and(
          eq(boardMembers.accountId, accountId),
          eq(boardMembers.boardId, invitation[0].boardId)
        )
      )
      .limit(1);

    if (existingMember[0]) {
      // Update invitation status to accepted anyway
      await db
        .update(boardInvitations)
        .set({ status: "accepted", updatedAt: new Date().toISOString() })
        .where(eq(boardInvitations.id, invitationId));

      return { success: true, alreadyMember: true };
    }

    // Add user to board
    const now = new Date().toISOString();
    await db.insert(boardMembers).values({
      id: generateId(),
      boardId: invitation[0].boardId,
      accountId,
      role: invitation[0].role,
      createdAt: now,
    });

    // Update invitation status
    await db
      .update(boardInvitations)
      .set({ status: "accepted", updatedAt: now })
      .where(eq(boardInvitations.id, invitationId));

    return { success: true, boardId: invitation[0].boardId };
  });

/**
 * Get all pending invitations for a board
 */
export const getBoardInvitations = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      accountId: z.string(),
      boardId: z.string(),
    })
  )
  .handler(async ({ data: { accountId, boardId } }) => {
    const db = getDb();

    // Verify user has access to this board
    const boardAccess = await db
      .select({ role: boardMembers.role })
      .from(boardMembers)
      .where(
        and(
          eq(boardMembers.boardId, boardId),
          eq(boardMembers.accountId, accountId)
        )
      )
      .limit(1);

    if (!boardAccess[0]) {
      throw new Error("Board not found or unauthorized");
    }

    // Get all pending invitations
    const invitations = await db
      .select({
        id: boardInvitations.id,
        email: boardInvitations.email,
        role: boardInvitations.role,
        status: boardInvitations.status,
        invitedBy: boardInvitations.invitedBy,
        createdAt: boardInvitations.createdAt,
        inviterName: accounts.firstName,
        inviterLastName: accounts.lastName,
        inviterEmail: accounts.email,
      })
      .from(boardInvitations)
      .innerJoin(accounts, eq(boardInvitations.invitedBy, accounts.id))
      .where(eq(boardInvitations.boardId, boardId))
      .orderBy(desc(boardInvitations.createdAt));

    return invitations.map((inv) => ({
      ...inv,
      inviterFullName:
        inv.inviterName && inv.inviterLastName
          ? `${inv.inviterName} ${inv.inviterLastName}`.trim()
          : inv.inviterName || inv.inviterEmail,
    }));
  });

/**
 * Get invitation details (public - no auth required)
 */
export const getInvitationDetails = createServerFn({ method: "GET" })
  .inputValidator(z.object({ invitationId: z.string() }))
  .handler(async ({ data: { invitationId } }) => {
    const db = getDb();

    // Get invitation with board and inviter details
    const invitation = await db
      .select({
        id: boardInvitations.id,
        boardId: boardInvitations.boardId,
        email: boardInvitations.email,
        role: boardInvitations.role,
        status: boardInvitations.status,
        createdAt: boardInvitations.createdAt,
        boardName: boards.name,
        inviterFirstName: accounts.firstName,
        inviterLastName: accounts.lastName,
        inviterEmail: accounts.email,
      })
      .from(boardInvitations)
      .innerJoin(boards, eq(boardInvitations.boardId, boards.id))
      .innerJoin(accounts, eq(boardInvitations.invitedBy, accounts.id))
      .where(eq(boardInvitations.id, invitationId))
      .limit(1);

    if (!invitation[0]) {
      throw new Error("Invitation not found");
    }

    if (invitation[0].status !== "pending") {
      throw new Error("Invitation has already been processed");
    }

    // Check if invitation has expired (7 days)
    const invitationAge =
      Date.now() - new Date(invitation[0].createdAt).getTime();
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
    if (invitationAge > sevenDaysInMs) {
      throw new Error("Invitation has expired");
    }

    const inviterFullName =
      invitation[0].inviterFirstName && invitation[0].inviterLastName
        ? `${invitation[0].inviterFirstName} ${invitation[0].inviterLastName}`.trim()
        : invitation[0].inviterFirstName || invitation[0].inviterEmail;

    return {
      id: invitation[0].id,
      boardId: invitation[0].boardId,
      email: invitation[0].email,
      role: invitation[0].role,
      boardName: invitation[0].boardName,
      inviterName: inviterFullName,
    };
  });

/**
 * Cancel/delete a pending invitation (owner/inviter only)
 */
export const cancelBoardInvitation = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      accountId: z.string(),
      invitationId: z.string(),
    })
  )
  .handler(async ({ data: { accountId, invitationId } }) => {
    const db = getDb();

    // Get invitation
    const invitation = await db
      .select()
      .from(boardInvitations)
      .where(eq(boardInvitations.id, invitationId))
      .limit(1);

    if (!invitation[0]) {
      throw new Error("Invitation not found");
    }

    // Verify user has permission (must be board owner or the one who sent the invitation)
    const boardAccess = await db
      .select({ role: boardMembers.role })
      .from(boardMembers)
      .where(
        and(
          eq(boardMembers.boardId, invitation[0].boardId),
          eq(boardMembers.accountId, accountId)
        )
      )
      .limit(1);

    if (!boardAccess[0]) {
      throw new Error("Unauthorized");
    }

    if (
      boardAccess[0].role !== "owner" &&
      invitation[0].invitedBy !== accountId
    ) {
      throw new Error(
        "Only board owners or the person who sent the invitation can cancel it"
      );
    }

    // Delete invitation
    await db
      .delete(boardInvitations)
      .where(eq(boardInvitations.id, invitationId));

    return { success: true };
  });

/**
 * Get board with members and invitations (for settings page)
 */
export const getBoardWithMembers = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      accountId: z.string(),
      boardId: z.string(),
    })
  )
  .handler(async ({ data: { accountId, boardId } }) => {
    const db = getDb();

    // Verify user has access to this board
    const boardAccess = await db
      .select({ role: boardMembers.role })
      .from(boardMembers)
      .where(
        and(
          eq(boardMembers.boardId, boardId),
          eq(boardMembers.accountId, accountId)
        )
      )
      .limit(1);

    if (!boardAccess[0]) {
      throw new Error("Board not found or unauthorized");
    }

    // Get board details
    const board = await db
      .select()
      .from(boards)
      .where(eq(boards.id, boardId))
      .limit(1);

    if (!board[0]) {
      throw new Error("Board not found");
    }

    // Get all board members with account details
    const members = await db
      .select({
        id: boardMembers.id,
        boardId: boardMembers.boardId,
        accountId: boardMembers.accountId,
        role: boardMembers.role,
        createdAt: boardMembers.createdAt,
        account: {
          id: accounts.id,
          email: accounts.email,
          firstName: accounts.firstName,
          lastName: accounts.lastName,
        },
      })
      .from(boardMembers)
      .innerJoin(accounts, eq(boardMembers.accountId, accounts.id))
      .where(eq(boardMembers.boardId, boardId));

    // Get pending invitations
    const invitations = await db
      .select()
      .from(boardInvitations)
      .where(
        and(
          eq(boardInvitations.boardId, boardId),
          eq(boardInvitations.status, "pending")
        )
      );

    return {
      board: board[0],
      members,
      invitations,
      currentUserRole: boardAccess[0].role,
    };
  });

/**
 * Remove a member from a board (owner only)
 */
export const removeBoardMember = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      accountId: z.string(),
      boardId: z.string(),
      memberAccountId: z.string(),
    })
  )
  .handler(async ({ data: { accountId, boardId, memberAccountId } }) => {
    const db = getDb();

    // Verify user is board owner
    const boardAccess = await db
      .select({ role: boardMembers.role })
      .from(boardMembers)
      .where(
        and(
          eq(boardMembers.boardId, boardId),
          eq(boardMembers.accountId, accountId)
        )
      )
      .limit(1);

    if (!boardAccess[0]) {
      throw new Error("Board not found or unauthorized");
    }

    if (boardAccess[0].role !== "owner") {
      throw new Error("Only board owners can remove members");
    }

    // Get board details to check ownership
    const board = await db
      .select()
      .from(boards)
      .where(eq(boards.id, boardId))
      .limit(1);

    if (!board[0]) {
      throw new Error("Board not found");
    }

    // Prevent removing the board owner
    if (memberAccountId === board[0].accountId) {
      throw new Error("Cannot remove the board owner");
    }

    // Remove member
    await db
      .delete(boardMembers)
      .where(
        and(
          eq(boardMembers.boardId, boardId),
          eq(boardMembers.accountId, memberAccountId)
        )
      );

    return { success: true };
  });

// ============================================================================
// Column Server Functions
// ============================================================================

/**
 * Create a new column
 */
export const createColumn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      accountId: z.string(),
      boardId: z.string(),
      data: CreateColumnSchema,
    })
  )
  .handler(async ({ data: { accountId, boardId, data } }) => {
    const db = getDb();

    // Verify board ownership via boardMembers
    const boardAccess = await db
      .select()
      .from(boardMembers)
      .where(
        and(
          eq(boardMembers.boardId, boardId),
          eq(boardMembers.accountId, accountId)
        )
      )
      .limit(1);

    if (!boardAccess[0]) {
      throw new Error("Board not found or unauthorized");
    }

    // Get max order
    const maxOrderResult = await db
      .select()
      .from(columns)
      .where(eq(columns.boardId, boardId))
      .orderBy(desc(columns.order))
      .limit(1);

    const nextOrder = (maxOrderResult[0]?.order ?? -1) + 1;
    const now = new Date().toISOString();

    const newColumn = {
      id: generateId(),
      boardId,
      name: data.name,
      color: data.color,
      order: nextOrder,
      isDefault: false,
      isExpanded: true,
      shortcut: null,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(columns).values(newColumn);

    return newColumn;
  });

/**
 * Update column order
 */
export const updateColumnOrder = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      accountId: z.string(),
      boardId: z.string(),
      columnId: z.string(),
      order: z.number(),
    })
  )
  .handler(async ({ data: { accountId, boardId, columnId, order } }) => {
    const db = getDb();

    // Verify board ownership
    const board = await db
      .select()
      .from(boards)
      .where(and(eq(boards.id, boardId), eq(boards.accountId, accountId)))
      .limit(1);

    if (!board[0]) {
      throw new Error("Board not found");
    }

    const now = new Date().toISOString();
    await db
      .update(columns)
      .set({
        order,
        updatedAt: now,
      })
      .where(eq(columns.id, columnId));

    return { success: true };
  });

/**
 * Delete a column
 */
export const deleteColumn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      accountId: z.string(),
      boardId: z.string(),
      columnId: z.string(),
    })
  )
  .handler(async ({ data: { accountId, boardId, columnId } }) => {
    const db = getDb();

    // Verify board ownership
    const board = await db
      .select()
      .from(boards)
      .where(and(eq(boards.id, boardId), eq(boards.accountId, accountId)))
      .limit(1);

    if (!board[0]) {
      throw new Error("Board not found");
    }

    // Get column info before deleting (for activity logging)
    const column = await db
      .select()
      .from(columns)
      .where(eq(columns.id, columnId))
      .limit(1);

    if (!column[0]) {
      throw new Error("Column not found");
    }

    // Count items in this column
    const itemsInColumn = await db
      .select({ id: items.id })
      .from(items)
      .where(eq(items.columnId, columnId));

    const itemCount = itemsInColumn.length;

    // Delete column (items cascade deleted via foreign key constraints)
    await db
      .delete(columns)
      .where(and(eq(columns.id, columnId), eq(columns.boardId, boardId)));

    // Log activity after successful deletion
    await createActivity({
      boardId,
      accountId,
      type: "column_deleted",
      content:
        itemCount > 0
          ? `Column "${column[0].name}" deleted (${itemCount} ${itemCount === 1 ? "item" : "items"} removed)`
          : `Column "${column[0].name}" deleted`,
    });

    return { success: true };
  });

/**
 * Update a column
 */
export const updateColumn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      accountId: z.string(),
      boardId: z.string(),
      columnId: z.string(),
      data: UpdateColumnSchema,
    })
  )
  .handler(async ({ data: { accountId, boardId, columnId, data } }) => {
    const db = getDb();

    // Verify board ownership
    const board = await db
      .select()
      .from(boards)
      .where(and(eq(boards.id, boardId), eq(boards.accountId, accountId)))
      .limit(1);

    if (!board[0]) {
      throw new Error("Board not found");
    }

    const now = new Date().toISOString();
    await db
      .update(columns)
      .set({
        ...data,
        updatedAt: now,
      })
      .where(eq(columns.id, columnId));

    const updated = await db
      .select()
      .from(columns)
      .where(eq(columns.id, columnId))
      .limit(1);
    return updated[0];
  });

// ============================================================================
// Item Server Functions
// ============================================================================

/**
 * Create a new item
 */
export const createItem = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      accountId: z.string(),
      boardId: z.string(),
      columnId: z.string(),
      data: CreateItemSchema,
    })
  )
  .handler(async ({ data: { accountId, boardId, columnId, data } }) => {
    const db = getDb();

    // Verify board ownership
    const board = await db
      .select()
      .from(boards)
      .where(and(eq(boards.id, boardId), eq(boards.accountId, accountId)))
      .limit(1);

    if (!board[0]) {
      throw new Error("Board not found");
    }

    // Get max order for column
    const maxOrderResult = await db
      .select()
      .from(items)
      .where(eq(items.columnId, columnId))
      .orderBy((i) => i.order)
      .limit(1);

    const nextOrder = (maxOrderResult[0]?.order ?? -1) + 1;
    const now = new Date().toISOString();

    const newItem = {
      id: generateId(),
      boardId,
      columnId,
      title: data.title,
      content: data.content,
      order: nextOrder,
      createdBy: accountId,
      createdAt: now,
      updatedAt: now,
      lastActiveAt: now,
    };

    await db.insert(items).values(newItem);

    // Create activity for item creation
    await createActivity({
      boardId,
      itemId: newItem.id,
      accountId,
      type: "item_created",
    });

    return newItem;
  });

/**
 * Update item
 */
export const updateItem = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      accountId: z.string(),
      boardId: z.string(),
      itemId: z.string(),
      data: UpdateItemSchema,
    })
  )
  .handler(async ({ data: { accountId, boardId, itemId, data } }) => {
    const db = getDb();

    // Verify item belongs to user's board
    const item = await db
      .select()
      .from(items)
      .where(and(eq(items.id, itemId), eq(items.boardId, boardId)))
      .limit(1);

    if (!item[0]) {
      throw new Error("Item not found");
    }

    const now = new Date().toISOString();
    await db
      .update(items)
      .set({
        ...data,
        updatedAt: now,
        lastActiveAt: now,
      })
      .where(eq(items.id, itemId));

    const updated = await db
      .select()
      .from(items)
      .where(eq(items.id, itemId))
      .limit(1);
    const updatedItem = updated[0];

    // Create activity based on what was updated
    // Use separate if statements (not else if) so multiple activities can be created
    if (data.title !== undefined && data.title !== item[0].title) {
      await createActivity({
        boardId,
        itemId,
        accountId,
        type: "item_updated",
        content: `Title changed to "${data.title}"`,
      });
    }

    if (data.content !== undefined && data.content !== item[0].content) {
      await createActivity({
        boardId,
        itemId,
        accountId,
        type: "item_updated",
        content: "Description updated",
      });
    }

    if (data.columnId !== undefined && data.columnId !== item[0].columnId) {
      // Get the column name for better activity message
      const column = await db
        .select()
        .from(columns)
        .where(eq(columns.id, data.columnId))
        .limit(1);
      await createActivity({
        boardId,
        itemId,
        accountId,
        type: "item_moved",
        content: `Moved to ${column[0]?.name || data.columnId}`,
      });
    }

    if (
      data.assigneeId !== undefined &&
      data.assigneeId !== item[0].assigneeId
    ) {
      // Get assignee name for better activity message
      if (data.assigneeId) {
        const assignee = await db
          .select()
          .from(assignees)
          .where(eq(assignees.id, data.assigneeId))
          .limit(1);
        await createActivity({
          boardId,
          itemId,
          accountId,
          type: "item_updated",
          content: `Assigned to ${assignee[0]?.name || data.assigneeId}`,
        });
      } else {
        await createActivity({
          boardId,
          itemId,
          accountId,
          type: "item_updated",
          content: "Assignee removed",
        });
      }
    }

    return updatedItem;
  });

/**
 * Delete item
 */
export const deleteItem = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      accountId: z.string(),
      boardId: z.string(),
      itemId: z.string(),
    })
  )
  .handler(async ({ data: { accountId, boardId, itemId } }) => {
    const db = getDb();

    // Verify item belongs to user's board
    const item = await db
      .select()
      .from(items)
      .where(and(eq(items.id, itemId), eq(items.boardId, boardId)))
      .limit(1);

    if (!item[0]) {
      throw new Error("Item not found");
    }

    // Log activity before deleting
    await createActivity({
      boardId,
      itemId,
      accountId,
      type: "item_deleted",
      content: `"${item[0].title}" deleted`,
    });

    await db.delete(items).where(eq(items.id, itemId));

    return { success: true };
  });

// ============================================================================
// Getter Server Functions (for TanStack DB Collections)
// ============================================================================

/**
 * Get all columns for a board
 */
export const getColumns = createServerFn({ method: "GET" })
  .inputValidator(z.object({ boardId: z.string() }))
  .handler(async ({ data: { boardId } }) => {
    const db = getDb();
    const boardColumns = await db
      .select()
      .from(columns)
      .where(eq(columns.boardId, boardId))
      .orderBy((c) => c.order);

    return boardColumns;
  });

/**
 * Get all items for a board
 */
export const getItems = createServerFn({ method: "GET" })
  .inputValidator(z.object({ boardId: z.string() }))
  .handler(async ({ data: { boardId } }) => {
    const db = getDb();
    const boardItems = await db
      .select()
      .from(items)
      .where(eq(items.boardId, boardId))
      .orderBy((i) => i.order);

    return boardItems;
  });

// ============================================================================
// Comment Server Functions
// ============================================================================

/**
 * Get all comments for an item
 */
export const getComments = createServerFn({ method: "GET" })
  .inputValidator(z.object({ itemId: z.string() }))
  .handler(async ({ data: { itemId } }) => {
    try {
      const db = getDb();
      const itemComments = await db
        .select({
          id: comments.id,
          itemId: comments.itemId,
          accountId: comments.accountId,
          content: comments.content,
          createdAt: comments.createdAt,
          updatedAt: comments.updatedAt,
          account: {
            firstName: accounts.firstName,
            lastName: accounts.lastName,
            email: accounts.email,
          },
        })
        .from(comments)
        .where(eq(comments.itemId, itemId))
        .leftJoin(accounts, eq(comments.accountId, accounts.id))
        .orderBy(desc(comments.createdAt));

      return itemComments;
    } catch (error) {
      console.error(`Error in getComments for item ${itemId}:`, error);
      throw error;
    }
  });

/**
 * Create a new comment
 */
export const createComment = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      accountId: z.string(),
      itemId: z.string(),
      data: CreateCommentSchema,
    })
  )
  .handler(async ({ data: { accountId, itemId, data } }) => {
    const db = getDb();
    const now = new Date().toISOString();

    const newComment = {
      id: generateId(),
      itemId,
      accountId,
      content: data.content,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(comments).values(newComment);

    // Create activity for comment
    const item = await db
      .select({ boardId: items.boardId })
      .from(items)
      .where(eq(items.id, itemId))
      .limit(1);
    if (item[0]) {
      await createActivity({
        boardId: item[0].boardId,
        itemId,
        accountId,
        type: "comment_added",
        content:
          data.content.length > 50
            ? `${data.content.substring(0, 50)}...`
            : data.content,
      });
    }

    const inserted = await db
      .select({
        id: comments.id,
        itemId: comments.itemId,
        accountId: comments.accountId,
        content: comments.content,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
        account: {
          firstName: accounts.firstName,
          lastName: accounts.lastName,
          email: accounts.email,
        },
      })
      .from(comments)
      .where(eq(comments.id, newComment.id))
      .leftJoin(accounts, eq(comments.accountId, accounts.id))
      .limit(1);

    return inserted[0] || newComment;
  });

/**
 * Update a comment
 * Comments can only be edited within 15 minutes of creation
 */
export const updateComment = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      accountId: z.string(),
      commentId: z.string(),
      data: UpdateCommentSchema,
    })
  )
  .handler(async ({ data: { accountId, commentId, data } }) => {
    const db = getDb();

    // Verify ownership
    const existing = await db
      .select()
      .from(comments)
      .where(and(eq(comments.id, commentId), eq(comments.accountId, accountId)))
      .limit(1);

    if (!existing[0]) {
      throw new Error("Comment not found or unauthorized");
    }

    // Check if comment is within edit window (15 minutes)
    const createdAt = new Date(existing[0].createdAt);
    const now = new Date();
    const diffInMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
    const EDIT_WINDOW_MINUTES = 15;

    if (diffInMinutes > EDIT_WINDOW_MINUTES) {
      throw new Error(
        `Comments can only be edited within ${EDIT_WINDOW_MINUTES} minutes of creation`
      );
    }

    const nowIso = new Date().toISOString();
    await db
      .update(comments)
      .set({
        content: data.content,
        updatedAt: nowIso,
      })
      .where(eq(comments.id, commentId));

    return { success: true };
  });

/**
 * Delete a comment
 * Comments can only be deleted within 15 minutes of creation
 */
export const deleteComment = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      accountId: z.string(),
      commentId: z.string(),
    })
  )
  .handler(async ({ data: { accountId, commentId } }) => {
    const db = getDb();

    // Verify ownership
    const existing = await db
      .select()
      .from(comments)
      .where(and(eq(comments.id, commentId), eq(comments.accountId, accountId)))
      .limit(1);

    if (!existing[0]) {
      throw new Error("Comment not found or unauthorized");
    }

    // Check if comment is within deletion window (15 minutes)
    const createdAt = new Date(existing[0].createdAt);
    const now = new Date();
    const diffInMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
    const DELETION_WINDOW_MINUTES = 15;

    if (diffInMinutes > DELETION_WINDOW_MINUTES) {
      throw new Error(
        `Comments can only be deleted within ${DELETION_WINDOW_MINUTES} minutes of creation`
      );
    }

    // Get item info before deleting (for activity logging)
    const itemInfo = await db
      .select({
        boardId: items.boardId,
        itemId: items.id,
      })
      .from(items)
      .where(eq(items.id, existing[0].itemId))
      .limit(1);

    await db.delete(comments).where(eq(comments.id, commentId));

    // Log activity after successful deletion
    if (itemInfo[0]) {
      await createActivity({
        boardId: itemInfo[0].boardId,
        itemId: itemInfo[0].itemId,
        accountId,
        type: "comment_deleted",
        content: "Comment removed",
      });
    }

    return { success: true };
  });

// ============================================================================
// Assignee Server Functions
// ============================================================================

/**
 * Get all assignees across all boards the user has access to
 * Includes board members (owner + invited users) + virtual assignees
 */
export const getAllAssignees = createServerFn({ method: "GET" })
  .inputValidator(z.object({ accountId: z.string() }))
  .handler(async ({ data: { accountId } }) => {
    const db = getDb();

    // Get all boards this account has access to (via boardMembers)
    const accessibleBoards = await db
      .select({ boardId: boardMembers.boardId })
      .from(boardMembers)
      .where(eq(boardMembers.accountId, accountId));

    if (accessibleBoards.length === 0) {
      return [];
    }

    const boardIds = accessibleBoards.map((b) => b.boardId);

    // Get all board members across all accessible boards
    const allMembers = await db
      .select({
        accountId: accounts.id,
        name: accounts.firstName,
        lastName: accounts.lastName,
        email: accounts.email,
        boardId: boardMembers.boardId,
        role: boardMembers.role,
      })
      .from(boardMembers)
      .innerJoin(accounts, eq(boardMembers.accountId, accounts.id))
      .where(inArray(boardMembers.boardId, boardIds));

    // Get all virtual assignees
    const allVirtualAssignees = await db
      .select({
        id: assignees.id,
        name: assignees.name,
        userId: assignees.userId,
        boardId: assignees.boardId,
        createdAt: assignees.createdAt,
      })
      .from(assignees)
      .where(inArray(assignees.boardId, boardIds));

    // Format board members to match assignee structure
    const memberAssignees = allMembers.map((member) => ({
      id: `account-${member.accountId}-${member.boardId}`,
      name:
        member.name && member.lastName
          ? `${member.name} ${member.lastName}`.trim()
          : member.name || member.email,
      userId: member.accountId,
      boardId: member.boardId,
      createdAt: new Date().toISOString(),
      isBoardMember: true,
      role: member.role,
    }));

    // Include ALL assignee records (both with and without userId)
    const virtualAssignees = allVirtualAssignees.map((a) => ({
      ...a,
      isBoardMember: false,
    }));

    // Deduplicate: For users with both a board member entry (composite ID) and a real assignee record,
    // prefer the real assignee record to avoid showing duplicate names in the UI
    const assigneeMap = new Map<string, any>();

    // First add all board members (composite IDs)
    for (const member of memberAssignees) {
      const key = `${member.userId}-${member.boardId}`;
      assigneeMap.set(key, member);
    }

    // Then add real assignees - these will override composite IDs for the same user
    for (const assignee of virtualAssignees) {
      if (assignee.userId) {
        // Has userId - this is a real assignee linked to an account
        const key = `${assignee.userId}-${assignee.boardId}`;
        assigneeMap.set(key, assignee); // Override composite ID
      } else {
        // No userId - this is a virtual assignee (e.g., external collaborator)
        // Use a unique key so it doesn't collide
        const key = `virtual-${assignee.id}`;
        assigneeMap.set(key, assignee);
      }
    }

    const allAssignees = Array.from(assigneeMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    return allAssignees;
  });

/**
 * Get all assignees for a board
 * Includes board members (owner + invited users) + virtual assignees
 */
export const getBoardAssignees = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      accountId: z.string(),
      boardId: z.string(),
    })
  )
  .handler(async ({ data: { accountId, boardId } }) => {
    const db = getDb();

    // Verify user has access to this board
    const boardAccess = await db
      .select()
      .from(boardMembers)
      .where(
        and(
          eq(boardMembers.boardId, boardId),
          eq(boardMembers.accountId, accountId)
        )
      )
      .limit(1);

    if (!boardAccess[0]) {
      throw new Error("Board not found or unauthorized");
    }

    // Get all board members (accounts with access to this board)
    const members = await db
      .select({
        id: accounts.id,
        name: accounts.firstName,
        lastName: accounts.lastName,
        email: accounts.email,
        role: boardMembers.role,
      })
      .from(boardMembers)
      .innerJoin(accounts, eq(boardMembers.accountId, accounts.id))
      .where(eq(boardMembers.boardId, boardId));

    // Get all virtual assignees for this board
    const boardAssignees = await db
      .select({
        id: assignees.id,
        name: assignees.name,
        userId: assignees.userId,
        createdAt: assignees.createdAt,
      })
      .from(assignees)
      .where(eq(assignees.boardId, boardId))
      .orderBy(assignees.name);

    // Combine: board members + virtual assignees
    // Format board members to match assignee structure
    const memberAssignees = members.map((member) => ({
      id: `account-${member.id}-${boardId}`, // Composite ID: account-{accountId}-{boardId}
      name:
        member.name && member.lastName
          ? `${member.name} ${member.lastName}`.trim()
          : member.name || member.email,
      userId: member.id,
      boardId,
      createdAt: new Date().toISOString(),
      isBoardMember: true,
      role: member.role,
    }));

    // Include ALL assignee records (both with and without userId)
    const virtualAssignees = boardAssignees.map((a) => ({
      ...a,
      boardId,
      isBoardMember: false,
    }));

    // Deduplicate: For users with both a board member entry (composite ID) and a real assignee record,
    // prefer the real assignee record to avoid showing duplicate names in the UI
    const assigneeMap = new Map<string, any>();

    // First add all board members (composite IDs)
    for (const member of memberAssignees) {
      const key = `${member.userId}-${member.boardId}`;
      assigneeMap.set(key, member);
    }

    // Then add real assignees - these will override composite IDs for the same user
    for (const assignee of virtualAssignees) {
      if (assignee.userId) {
        // Has userId - this is a real assignee linked to an account
        const key = `${assignee.userId}-${assignee.boardId}`;
        assigneeMap.set(key, assignee); // Override composite ID
      } else {
        // No userId - this is a virtual assignee (e.g., external collaborator)
        // Use a unique key so it doesn't collide
        const key = `virtual-${assignee.id}`;
        assigneeMap.set(key, assignee);
      }
    }

    const allAssignees = Array.from(assigneeMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    return allAssignees;
  });

/**
 * Create or get an assignee by name (case-insensitive)
 */
export const createOrGetAssignee = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      accountId: z.string(),
      boardId: z.string(),
      name: z.string().min(1).max(100),
      userId: z.string().optional(),
    })
  )
  .handler(async ({ data: { accountId, boardId, name, userId } }) => {
    const db = getDb();

    // Verify user owns this board
    const board = await db
      .select()
      .from(boards)
      .where(and(eq(boards.id, boardId), eq(boards.accountId, accountId)))
      .limit(1);

    if (!board[0]) {
      throw new Error("Board not found or unauthorized");
    }

    const normalizedName = name.trim();

    // Get all assignees and do case-insensitive match
    const allAssignees = await db
      .select()
      .from(assignees)
      .where(eq(assignees.boardId, boardId));

    const existing = allAssignees.find(
      (a) => a.name.toLowerCase() === normalizedName.toLowerCase()
    );

    if (existing) {
      return existing;
    }

    // Create new assignee
    const now = new Date().toISOString();
    const newAssignee = {
      id: generateId(),
      boardId,
      name: normalizedName,
      userId: userId || null,
      createdAt: now,
    };

    await db.insert(assignees).values(newAssignee);

    return newAssignee;
  });

/**
 * Update item assignee
 */
export const updateItemAssignee = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      accountId: z.string(),
      itemId: z.string(),
      assigneeId: z.string().nullable(),
    })
  )
  .handler(async ({ data: { accountId, itemId, assigneeId } }) => {
    const db = getDb();

    // Verify user has access to this item
    const item = await db
      .select({
        item: items,
        board: boards,
      })
      .from(items)
      .leftJoin(boards, eq(items.boardId, boards.id))
      .where(eq(items.id, itemId))
      .limit(1);

    if (!item[0] || item[0].board?.accountId !== accountId) {
      throw new Error("Item not found or unauthorized");
    }

    const previousAssigneeId = item[0].item.assigneeId;

    // Update item with new assignee
    const now = new Date().toISOString();
    await db
      .update(items)
      .set({
        assigneeId: assigneeId || null,
        lastActiveAt: now,
        updatedAt: now,
      })
      .where(eq(items.id, itemId));

    // Log activity if assignee changed
    if (previousAssigneeId !== assigneeId) {
      if (assigneeId) {
        const assignee = await db
          .select()
          .from(assignees)
          .where(eq(assignees.id, assigneeId))
          .limit(1);
        await createActivity({
          boardId: item[0].item.boardId,
          itemId,
          accountId,
          type: "item_updated",
          content: `Assigned to ${assignee[0]?.name || assigneeId}`,
        });
      } else {
        await createActivity({
          boardId: item[0].item.boardId,
          itemId,
          accountId,
          type: "item_updated",
          content: "Assignee removed",
        });
      }
    }

    return { success: true };
  });

// ============================================================================
// Activity Helper Functions
// ============================================================================

/**
 * Create an activity record for tracking board/item changes
 */
export async function createActivity({
  boardId,
  itemId,
  accountId,
  type,
  content,
}: {
  boardId: string;
  itemId?: string;
  accountId?: string;
  type: string;
  content?: string;
}) {
  const db = getDb();

  const activity = {
    id: generateId(),
    boardId,
    itemId: itemId || null,
    accountId: accountId || null,
    type,
    content: content || null,
    createdAt: new Date().toISOString(),
  };

  await db.insert(activities).values(activity);
  return activity;
}

/**
 * Get all activities for an account
 */
export const getAllActivities = createServerFn({ method: "GET" })
  .inputValidator(z.object({ accountId: z.string() }))
  .handler(async ({ data: { accountId } }) => {
    const db = getDb();

    // Get all boards for this account
    const userBoards = await db
      .select({ id: boards.id })
      .from(boards)
      .where(eq(boards.accountId, accountId));

    const boardIds = userBoards.map((b) => b.id);

    if (boardIds.length === 0) {
      return [];
    }

    // Get activities for all these boards
    const allActivities = await db
      .select({
        id: activities.id,
        boardId: activities.boardId,
        itemId: activities.itemId,
        accountId: activities.accountId,
        type: activities.type,
        content: activities.content,
        createdAt: activities.createdAt,
        user: {
          id: accounts.id,
          firstName: accounts.firstName,
          lastName: accounts.lastName,
        },
      })
      .from(activities)
      .where(inArray(activities.boardId, boardIds))
      .leftJoin(accounts, eq(activities.accountId, accounts.id))
      .orderBy(desc(activities.createdAt));

    return allActivities;
  });

/**
 * Get all activities for an item
 */
export const getItemActivities = createServerFn({ method: "GET" })
  .inputValidator(z.object({ itemId: z.string() }))
  .handler(async ({ data: { itemId } }) => {
    const db = getDb();

    const itemActivities = await db
      .select({
        id: activities.id,
        itemId: activities.itemId,
        accountId: activities.accountId,
        type: activities.type,
        content: activities.content,
        createdAt: activities.createdAt,
        user: {
          id: accounts.id,
          firstName: accounts.firstName,
          lastName: accounts.lastName,
        },
      })
      .from(activities)
      .where(eq(activities.itemId, itemId))
      .leftJoin(accounts, eq(activities.accountId, accounts.id))
      .orderBy(desc(activities.createdAt));

    return itemActivities;
  });
