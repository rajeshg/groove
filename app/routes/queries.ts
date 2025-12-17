import { prisma } from "../db/prisma";

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
