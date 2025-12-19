import { prisma } from "../db/prisma";
import { DEFAULT_COLUMN_COLORS } from "../constants/colors";
import { getBoardTemplate } from "../constants/templates";
import { ensureAssigneeForUser } from "../utils/assignee";

import type { ItemMutation } from "./types";
import type { Prisma } from "@prisma/client";

// Time threshold for editing/deleting comments (15 minutes in milliseconds)
const COMMENT_EDIT_THRESHOLD_MS = 15 * 60 * 1000;

/**
 * Check if user is a member of the board (owner or invited member)
 * With Option B: Owner is also in BoardMember table
 */
export async function isBoardMember(
  boardId: number,
  accountId: string
): Promise<boolean> {
  const member = await prisma.boardMember.findUnique({
    where: { accountId_boardId: { accountId, boardId } },
  });
  return !!member;
}

/**
 * Get board with membership check
 */
export async function getBoardData(
  boardId: number,
  accountId: string
): Promise<Prisma.BoardGetPayload<{
  include: {
    items: {
      include: {
        _count: { select: { comments: true } };
        createdByUser: {
          select: { id: true; firstName: true; lastName: true };
        };
        Assignee: { select: { id: true; name: true; userId: true } };
      };
    };
    columns: { orderBy: { order: "asc" } };
    members: { include: { Account: { select: { id: true; email: true } } } };
    invitations: {
      where: { status: "pending" };
      include: { Account: { select: { email: true } } };
    };
    assignees: {
      select: { id: true; name: true; userId: true };
      orderBy: { name: "asc" };
    };
  };
}> | null> {
  // Check membership
  const isMember = await isBoardMember(boardId, accountId);
  if (!isMember) throw new Error("Unauthorized: Not a board member");

  return prisma.board.findUnique({
    where: { id: boardId },
    include: {
      items: {
        include: {
          _count: {
            select: { comments: true },
          },
          createdByUser: {
            select: { id: true, firstName: true, lastName: true },
          },
          Assignee: {
            select: { id: true, name: true, userId: true },
          },
        },
      },
      columns: { orderBy: { order: "asc" } },
      members: {
        include: { Account: { select: { id: true, email: true } } },
      },
      invitations: {
        where: {
          status: "pending",
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
        include: { Account: { select: { email: true } } },
      },
      assignees: {
        select: { id: true, name: true, userId: true },
        orderBy: { name: "asc" },
      },
    },
  });
}

export async function updateBoardName(
  boardId: number,
  name: string,
  accountId: string
) {
  return prisma.board.update({
    where: { id: boardId, accountId: accountId },
    data: { name },
  });
}

export async function getItem(id: string, accountId: string) {
  return prisma.item.findUnique({
    where: {
      id,
      Board: { accountId },
    },
  });
}

export async function getCardDetail(
  cardId: string,
  boardId: number,
  accountId: string
) {
  return prisma.item.findUnique({
    where: {
      id: cardId,
      Board: { id: boardId, accountId },
    },
    include: {
      Column: true,
    },
  });
}

export function upsertItem(
  mutation: ItemMutation & { boardId: number },
  _accountId: string
) {
  // Touch lastActiveAt on meaningful changes (content/title/column changes)
  const updateData = { ...mutation, lastActiveAt: new Date() };

  return prisma.item.upsert({
    where: {
      id: mutation.id,
      Board: {
        accountId: _accountId,
      },
    },
    create: updateData,
    update: updateData,
  });
}

export async function updateColumnName(
  id: string,
  name: string,
  accountId: string
) {
  return prisma.column.update({
    where: { id, Board: { accountId } },
    data: { name },
  });
}

export async function updateColumnColor(
  id: string,
  color: string,
  accountId: string
) {
  return prisma.column.update({
    where: { id, Board: { accountId } },
    data: { color },
  });
}

export async function updateColumnExpanded(
  id: string,
  isExpanded: boolean,
  accountId: string
) {
  return prisma.column.update({
    where: { id, Board: { accountId } },
    data: { isExpanded },
  });
}

export async function updateColumnOrder(
  id: string,
  order: number,
  accountId: string
) {
  return prisma.column.update({
    where: { id, Board: { accountId } },
    data: { order },
  });
}

export async function createColumn(
  boardId: number,
  name: string,
  id: string,
  accountId: string
) {
  let columnCount = await prisma.column.count({
    where: { boardId, Board: { accountId } },
  });
  return prisma.column.create({
    data: {
      id,
      boardId,
      name,
      order: columnCount + 1,
      isExpanded: true,
    },
  });
}

export async function deleteColumn(
  columnId: string,
  boardId: number,
  _accountId: string
) {
  // Get the column to check if it's default
  const column = await prisma.column.findUnique({
    where: { id: columnId },
  });

  if (!column) {
    throw new Error("Column not found");
  }

  if (column.isDefault) {
    throw new Error("Cannot delete default column");
  }

  // Find the "May be?" column (default column) to move items to
  const mayBeColumn = await prisma.column.findFirst({
    where: {
      boardId,
      isDefault: true,
    },
  });

  if (!mayBeColumn) {
    throw new Error("Default column not found");
  }

  // Move all items from the deleted column to the May be column
  // Touch lastActiveAt since cards are being moved
  await prisma.item.updateMany({
    where: { columnId },
    data: { columnId: mayBeColumn.id, lastActiveAt: new Date() },
  });

  // Delete the column
  return prisma.column.delete({
    where: { id: columnId },
  });
}

/**
 * Update assignment on a card and touch lastActiveAt
 */
export async function updateItemAssignment(
  itemId: string,
  assigneeId: string | null,
  accountId: string
) {
  return prisma.item.update({
    where: {
      id: itemId,
      Board: { accountId },
    },
    data: {
      assigneeId,
      lastActiveAt: new Date(),
    },
  });
}

/**
 * Create a comment on a card and update lastActiveAt
 */
export async function createComment(
  itemId: string,
  content: string,
  createdBy: string,
  accountId: string
) {
  // Verify the card belongs to the account
  const item = await prisma.item.findFirst({
    where: {
      id: itemId,
      Board: { accountId },
    },
  });

  if (!item) {
    throw new Error("Item not found");
  }

  // Create comment and update lastActiveAt
  const [comment] = await prisma.$transaction([
    prisma.comment.create({
      data: {
        content,
        createdBy,
        itemId,
      },
    }),
    prisma.item.update({
      where: { id: itemId },
      data: { lastActiveAt: new Date() },
    }),
  ]);

  return comment;
}

/**
 * Update a comment and touch card's lastActiveAt
 */
export async function updateComment(
  commentId: string,
  content: string,
  accountId: string
) {
  // Verify the comment belongs to a card owned by the account
  const comment = await prisma.comment.findFirst({
    where: {
      id: commentId,
      Item: {
        Board: { accountId },
      },
    },
    include: { Item: true },
  });

  if (!comment) {
    throw new Error("Comment not found");
  }

  // Check if user owns the comment
  if (comment.createdBy !== accountId) {
    throw new Error("You can only edit your own comments");
  }

  // Check if comment is within edit threshold
  const commentAge = Date.now() - comment.createdAt.getTime();
  if (commentAge > COMMENT_EDIT_THRESHOLD_MS) {
    throw new Error(
      "Comments can only be edited within 15 minutes of creation"
    );
  }

  // Update comment and card's lastActiveAt
  const [updatedComment] = await prisma.$transaction([
    prisma.comment.update({
      where: { id: commentId },
      data: { content },
    }),
    prisma.item.update({
      where: { id: comment.itemId },
      data: { lastActiveAt: new Date() },
    }),
  ]);

  return updatedComment;
}

/**
 * Delete a comment and touch card's lastActiveAt
 */
export async function deleteComment(commentId: string, accountId: string) {
  // Verify the comment belongs to a card owned by the account
  const comment = await prisma.comment.findFirst({
    where: {
      id: commentId,
      Item: {
        Board: { accountId },
      },
    },
  });

  if (!comment) {
    throw new Error("Comment not found");
  }

  // Check if user owns the comment
  if (comment.createdBy !== accountId) {
    throw new Error("You can only delete your own comments");
  }

  // Check if comment is within edit threshold
  const commentAge = Date.now() - comment.createdAt.getTime();
  if (commentAge > COMMENT_EDIT_THRESHOLD_MS) {
    throw new Error(
      "Comments can only be deleted within 15 minutes of creation"
    );
  }

  // Delete comment and update card's lastActiveAt
  await prisma.$transaction([
    prisma.comment.delete({
      where: { id: commentId },
    }),
    prisma.item.update({
      where: { id: comment.itemId },
      data: { lastActiveAt: new Date() },
    }),
  ]);

  return { success: true };
}

/**
 * Get all boards for a user (owned or member)
 */
export async function getHomeData(accountId: string) {
  return prisma.board.findMany({
    where: {
      OR: [
        { accountId },
        {
          members: {
            some: {
              accountId,
            },
          },
        },
      ],
    },
    select: {
      id: true,
      name: true,
      color: true,
      accountId: true,
      _count: {
        select: {
          items: true,
          members: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Create a new board with owner in BoardMember table and default columns
 */
export async function createBoard(
  accountId: string,
  name: string,
  color: string,
  templateName?: string
) {
  // Verify account exists before creating board
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { id: true },
  });

  if (!account) {
    throw new Error("Unauthorized: Account not found");
  }

  const board = await prisma.board.create({
    data: {
      name,
      color,
      accountId,
    },
  });

  // Create owner as a board member with role 'owner'
  await prisma.boardMember.create({
    data: {
      boardId: board.id,
      accountId,
      role: "owner",
    },
  });

  // Create default assignee for the owner
  const ownerAccount = await prisma.account.findUnique({
    where: { id: accountId },
    select: { email: true },
  });

  if (ownerAccount?.email) {
    await ensureAssigneeForUser(board.id, accountId, ownerAccount.email);
  }

  // Use template if provided, otherwise use Classic template
  let columnsToCreate: Array<{
    name: string;
    order: number;
    isDefault: boolean;
    color: string;
    shortcut?: string;
    isExpanded?: boolean;
  }> = [];
  if (templateName) {
    const template = getBoardTemplate(templateName);
    if (template) {
      columnsToCreate = template.columns;
    }
  }

  // Fallback to default columns if no template
  if (columnsToCreate.length === 0) {
    columnsToCreate = [
      {
        name: "Not Now",
        order: 1,
        isDefault: false,
        color: DEFAULT_COLUMN_COLORS.notNow,
        isExpanded: true,
      },
      {
        name: "May be?",
        order: 2,
        isDefault: true,
        color: DEFAULT_COLUMN_COLORS.mayBe,
        shortcut: "c",
        isExpanded: true,
      },
      {
        name: "Done",
        order: 3,
        isDefault: false,
        color: DEFAULT_COLUMN_COLORS.done,
        isExpanded: false,
      },
    ];
  }

  for (const col of columnsToCreate) {
    await prisma.column.create({
      data: {
        id: `col-${board.id}-${col.order}`,
        boardId: board.id,
        name: col.name,
        order: col.order,
        isDefault: col.isDefault,
        color: col.color,
        shortcut: col.shortcut || null,
        isExpanded: col.isExpanded ?? true,
      },
    });
  }

  return board;
}

/**
 * Delete a board (owner only)
 */
export async function deleteBoard(boardId: number, accountId: string) {
  // Check if user is owner
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { accountId: true },
  });

  if (board?.accountId !== accountId) {
    throw new Error("Unauthorized: Only owner can delete board");
  }

  return prisma.board.delete({
    where: { id: boardId },
  });
}

/**
 * Delete a card (item) from a board
 */
export async function deleteCard(itemId: string, accountId: string) {
  return prisma.item.delete({
    where: {
      id: itemId,
      Board: { accountId },
    },
  });
}

export async function getProfileData(accountId: string) {
  const [account, assignedCount, createdCount] = await Promise.all([
    prisma.account.findUnique({
      where: { id: accountId },
      select: { email: true, firstName: true, lastName: true },
    }),
    prisma.item.count({
      where: { createdBy: accountId },
    }),
    prisma.item.count({
      where: { createdBy: accountId },
    }),
  ]);

  return {
    email: account?.email || "Unknown",
    firstName: account?.firstName || null,
    lastName: account?.lastName || null,
    assignedCount,
    createdCount,
  };
}

/**
 * Add a board member (only for already-registered users)
 */
export async function addBoardMember(
  boardId: number,
  accountId: string,
  role: string = "editor"
) {
  return prisma.boardMember.create({
    data: {
      boardId,
      accountId,
      role,
    },
  });
}

/**
 * Remove a board member
 */
export async function removeBoardMember(boardId: number, accountId: string) {
  return prisma.boardMember.delete({
    where: {
      accountId_boardId: { accountId, boardId },
    },
  });
}

/**
 * Get all members of a board (excluding owner if not in table)
 */
export async function getBoardMembers(boardId: number) {
  return prisma.boardMember.findMany({
    where: { boardId },
    include: {
      Account: {
        select: { email: true, id: true },
      },
    },
  });
}

/**
 * Send invitation to email to join board
 */
export async function inviteUserToBoard(
  boardId: number,
  email: string,
  invitedBy: string,
  role: string = "editor"
) {
  return prisma.boardInvitation.create({
    data: {
      boardId,
      email,
      invitedBy,
      role,
      status: "pending",
    },
  });
}

/**
 * Accept a board invitation
 */
export async function acceptBoardInvitation(
  invitationId: string,
  userId: string
) {
  const invitation = await prisma.boardInvitation.findUnique({
    where: { id: invitationId },
  });

  if (!invitation) {
    throw new Error("Invitation not found");
  }

  if (invitation.status !== "pending") {
    throw new Error("Invitation already processed");
  }

  // SECURITY: Check if invitation has expired (7 days)
  const invitationAge = Date.now() - invitation.createdAt.getTime();
  const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
  if (invitationAge > sevenDaysInMs) {
    throw new Error("Invitation has expired. Please request a new invitation.");
  }

  // SECURITY: Verify the accepting user owns the invited email
  const acceptingUser = await prisma.account.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!acceptingUser || acceptingUser.email !== invitation.email) {
    throw new Error("Unauthorized: You can only accept invitations sent to your email address");
  }

  // Create board member record
  await prisma.boardMember.create({
    data: {
      boardId: invitation.boardId,
      accountId: userId,
      role: invitation.role,
    },
  });

  // Get or create assignee for the user
  const account = await prisma.account.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (account?.email) {
    await ensureAssigneeForUser(invitation.boardId, userId, account.email);
  }

  // Mark invitation as accepted
  await prisma.boardInvitation.update({
    where: { id: invitationId },
    data: { status: "accepted" },
  });

  return { success: true };
}

/**
 * Decline a board invitation
 */
export async function declineBoardInvitation(invitationId: string) {
  const invitation = await prisma.boardInvitation.findUnique({
    where: { id: invitationId },
  });

  if (!invitation) {
    throw new Error("Invitation not found");
  }

  if (invitation.status !== "pending") {
    throw new Error("Invitation already processed");
  }

  await prisma.boardInvitation.update({
    where: { id: invitationId },
    data: { status: "declined" },
  });

  return { success: true };
}

/**
 * Get all pending invitations for a user (by email)
 */
export async function getPendingInvitationsForUser(email: string) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  return prisma.boardInvitation.findMany({
    where: {
      email,
      status: "pending",
      createdAt: {
        gte: sevenDaysAgo, // Only show invitations from the last 7 days
      },
    },
    include: {
      Board: {
        select: { id: true, name: true, color: true },
      },
      Account: {
        select: { email: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Get all pending invitations for a board
 */
export async function getPendingInvitationsForBoard(boardId: number) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  return prisma.boardInvitation.findMany({
    where: {
      boardId,
      status: "pending",
      createdAt: {
        gte: sevenDaysAgo, // Only show invitations from the last 7 days
      },
    },
    include: {
      Account: {
        select: { email: true },
      },
    },
  });
}

/**
 * Update item assignee
 */
export async function updateItemAssignee(
  itemId: string,
  assigneeId: string | null,
  accountId: string
) {
  // Verify user has access to this item
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: { Board: true },
  });

  if (!item) {
    throw new Error("Item not found");
  }

  const isMember = await isBoardMember(item.boardId, accountId);
  if (!isMember) {
    throw new Error("Unauthorized: Not a board member");
  }

  // Update item with new assignee
  return prisma.item.update({
    where: { id: itemId },
    data: { assigneeId },
    include: {
      Assignee: {
        select: { id: true, name: true, userId: true },
      },
    },
  });
}
