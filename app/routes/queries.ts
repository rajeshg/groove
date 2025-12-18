import { prisma } from "../db/prisma";
import { DEFAULT_COLUMN_COLORS } from "../constants/colors";

import type { ItemMutation } from "./types";

export async function deleteBoard(boardId: number, accountId: string) {
  return prisma.board.delete({
    where: { id: boardId, accountId },
  });
}

export async function createBoard(userId: string, name: string, color: string) {
  return prisma.board.create({
    data: {
      name,
      color,
      Account: {
        connect: {
          id: userId,
        },
      },
      columns: {
        create: [
          {
            name: "Not Now",
            color: DEFAULT_COLUMN_COLORS.notNow,
            order: 1,
            id: `col-not-now-${Date.now()}-1`,
            isDefault: true,
          },
          {
            name: "May be?",
            color: DEFAULT_COLUMN_COLORS.mayBe,
            order: 2,
            id: `col-maybe-${Date.now()}-2`,
            isDefault: true,
          },
          {
            name: "Done",
            color: DEFAULT_COLUMN_COLORS.done,
            order: 3,
            id: `col-done-${Date.now()}-3`,
            isDefault: true,
          },
        ],
      },
    },
  });
}

export async function getHomeData(userId: string) {
  return prisma.board.findMany({
    where: {
      accountId: userId,
    },
  });
}

// Board detail queries
export function deleteCard(id: string, accountId: string) {
  return prisma.item.delete({ where: { id, Board: { accountId } } });
}

export async function getBoardData(boardId: number, accountId: string) {
  return prisma.board.findUnique({
    where: {
      id: boardId,
      accountId: accountId,
    },
    include: {
      items: true,
      columns: { orderBy: { order: "asc" } },
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
  accountId: string
) {
  // Touch lastActiveAt on meaningful changes (content/title/column changes)
  const updateData = { ...mutation, lastActiveAt: new Date() };
  
  return prisma.item.upsert({
    where: {
      id: mutation.id,
      Board: {
        accountId,
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
  accountId: string
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
  assignedTo: string | null,
  accountId: string
) {
  return prisma.item.update({
    where: {
      id: itemId,
      Board: { accountId },
    },
    data: {
      assignedTo,
      lastActiveAt: new Date(),
    },
  });
}
