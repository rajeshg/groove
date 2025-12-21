import { generateId } from "../utils/id";
import { prisma } from "../../prisma/client";
import { DEFAULT_COLUMN_COLORS } from "../constants/colors";
import { getBoardTemplate } from "../constants/templates";
import { ensureAssigneeForUser } from "../utils/assignee";

import type { Prisma } from "../../prisma/client";

// Time threshold for editing/deleting comments (15 minutes in milliseconds)
const COMMENT_EDIT_THRESHOLD_MS = 15 * 60 * 1000;

/**
 * Check if user is a member of the board (owner or invited member)
 * With Option B: Owner is also in BoardMember table
 */
export async function isBoardMember(
  boardId: string,
  accountId: string
): Promise<boolean> {
  const member = await prisma.boardMember.findUnique({
    where: { accountId_boardId: { accountId, boardId } },
  });
  return !!member;
}

/**
 * Get board with membership check
 * User must be either the board owner or an invited member
 */
export async function getBoardData(
  boardId: string,
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
    members: {
      include: {
        Account: {
          select: { id: true; email: true; firstName: true; lastName: true };
        };
      };
    };
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
  // First fetch board to check if user is owner or member
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { id: true, accountId: true },
  });

  if (!board) return null;

  // Check if user is the owner
  const isOwner = board.accountId === accountId;

  // Check if user is a member
  const isMember = await isBoardMember(boardId, accountId);

  // User must be either owner or member
  if (!isOwner && !isMember) return null;

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
        include: {
          Account: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
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

export async function updateBoard(
  boardId: string,
  data: { name?: string; color?: string },
  accountId: string
) {
  return prisma.board.update({
    where: { id: boardId, accountId: accountId },
    data,
  });
}

export async function getItem(id: string, accountId: string) {
  const item = await prisma.item.findUnique({
    where: { id },
    include: {
      Board: {
        select: { accountId: true },
      },
    },
  });

  // Check if item exists and belongs to user's board
  if (!item || item.Board.accountId !== accountId) {
    return null;
  }

  return item;
}

export async function getCardDetail(
  cardId: string,
  boardId: string,
  accountId: string
) {
  const item = await prisma.item.findUnique({
    where: { id: cardId },
    include: {
      Column: true,
      Board: {
        select: { id: true, accountId: true },
      },
    },
  });

  // Check if item exists and belongs to the correct board and user
  if (
    !item ||
    item.Board.id !== boardId ||
    item.Board.accountId !== accountId
  ) {
    return null;
  }

  return item;
}

export async function upsertItem(
  mutation: {
    id?: string;
    boardId: string;
    columnId: string;
    title: string;
    order: number;
    content?: string | null;
    createdBy?: string;
    intent?: string;
  },
  accountId: string
) {
  const {
    intent: _intent,
    id,
    boardId,
    columnId,
    createdBy,
    ...rest
  } = mutation;

  const baseData: Omit<Prisma.ItemCreateInput, 'id'> = {
    ...rest,
    lastActiveAt: new Date(),
    Board: { connect: { id: boardId } },
    Column: { connect: { id: columnId } },
  };

  if (createdBy) {
    baseData.createdByUser = { connect: { id: createdBy } };
  }

  if (!id) {
    return prisma.item.create({
      data: { ...baseData, id: generateId() },
    });
  }

  // For updates, verify the item exists and belongs to the user's board
  const existingItem = await getItem(id, accountId);
  if (!existingItem) {
    // If item doesn't exist or user doesn't have permission, throw error
    throw new Error("Item not found or access denied");
  }

  // Simple update with just the id
  return prisma.item.update({
    where: { id },
    data: baseData,
  });
}

export async function getColumn(id: string, accountId: string) {
  const column = await prisma.column.findUnique({
    where: { id },
    include: { Board: { include: { members: true } } },
  });

  if (!column) return null;

  const board = column.Board;
  const isOwner = board.accountId === accountId;
  const isMember = board.members.some((m) => m.accountId === accountId);

  if (!isOwner && !isMember) return null;

  return column;
}

export async function updateColumn(
  id: string,
  data: { name?: string; color?: string; isExpanded?: boolean; order?: number },
  accountId: string
) {
  // Simple check: user must be board owner or member
  const column = await prisma.column.findUnique({
    where: { id },
    include: { Board: { include: { members: true } } },
  });

  if (!column) throw new Error("Column not found");

  const board = column.Board;
  const isOwner = board.accountId === accountId;
  const isMember = board.members.some((m) => m.accountId === accountId);

  if (!isOwner && !isMember) throw new Error("Unauthorized");

  return prisma.column.update({
    where: { id },
    data,
  });
}

export async function createColumn(
  boardId: string,
  name: string,
  accountId: string,
  id?: string
) {
  let columnCount = await prisma.column.count({
    where: { boardId, Board: { accountId } },
  });

  return prisma.column.create({
    data: {
      id: id || generateId(), // Use provided ID or generate new one
      Board: { connect: { id: boardId } },
      name,
      order: columnCount + 1,
      isExpanded: true,
    },
  });
}

export async function deleteColumn(
  columnId: string,
  boardId: string,
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
        id: generateId(),
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
      id: generateId(),
      name,
      color,
      accountId,
    },
  });

  // Create owner as a board member with role 'owner'
  await prisma.boardMember.create({
    data: {
      id: generateId(),
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
        id: generateId(),
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
export async function deleteBoard(boardId: string, accountId: string) {
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
  boardId: string,
  accountId: string,
  role: string = "editor"
) {
  return prisma.boardMember.create({
    data: {
      id: generateId(),
      boardId,
      accountId,
      role,
    },
  });
}

/**
 * Remove a board member
 */
export async function removeBoardMember(boardId: string, accountId: string) {
  return prisma.boardMember.delete({
    where: {
      accountId_boardId: { accountId, boardId },
    },
  });
}

/**
 * Get all members of a board (excluding owner if not in table)
 */
export async function getBoardMembers(boardId: string) {
  return prisma.boardMember.findMany({
    where: { boardId },
    include: {
      Account: {
        select: { email: true, id: true, firstName: true, lastName: true },
      },
    },
  });
}

/**
 * Send invitation to email to join board
 */
export async function inviteUserToBoard(
  boardId: string,
  email: string,
  invitedBy: string,
  role: string = "editor"
) {
  return prisma.boardInvitation.create({
    data: {
      id: generateId(),
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
    throw new Error(
      "Unauthorized: You can only accept invitations sent to your email address"
    );
  }

  // Create board member record
  await prisma.boardMember.create({
    data: {
      id: generateId(),
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
export async function getPendingInvitationsForBoard(boardId: string) {
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
