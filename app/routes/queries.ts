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
          },
          {
            name: "May be?",
            color: DEFAULT_COLUMN_COLORS.mayBe,
            order: 2,
            id: `col-maybe-${Date.now()}-2`,
          },
          {
            name: "Done",
            color: DEFAULT_COLUMN_COLORS.done,
            order: 3,
            id: `col-done-${Date.now()}-3`,
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

export function upsertItem(
  mutation: ItemMutation & { boardId: number },
  accountId: string
) {
  return prisma.item.upsert({
    where: {
      id: mutation.id,
      Board: {
        accountId,
      },
    },
    create: mutation,
    update: mutation,
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
    },
  });
}
