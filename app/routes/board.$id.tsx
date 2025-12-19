import { type MetaFunction } from "react-router";
import invariant from "tiny-invariant";

import { badRequest, notFound } from "../http/bad-request";
import { requireAuthCookie } from "../auth/auth";

import { INTENTS, type ItemMutation } from "./types";
import {
  createColumn,
  updateColumnName,
  updateColumnColor,
  updateColumnExpanded,
  updateColumnOrder,
  deleteColumn,
  getBoardData,
  upsertItem,
  updateBoardName,
  deleteCard,
  getItem,
  getHomeData,
  inviteUserToBoard,
  acceptBoardInvitation,
  declineBoardInvitation,
  updateItemAssignee,
} from "./queries";
import { createOrGetAssignee } from "../utils/assignee";
import Board from "./board/board";
import type { Board as BoardType } from "@prisma/client";
import type { Route } from "./+types/board.$id";
import {
  updateBoardNameSchema,
  itemMutationSchema,
  deleteCardSchema,
  createColumnSchema,
  updateColumnSchema,
  moveColumnSchema,
  deleteColumnSchema,
  moveItemSchema,
  inviteUserSchema,
  acceptInvitationSchema,
  declineInvitationSchema,
  updateItemAssigneeSchema,
  createVirtualAssigneeSchema,
  createAndAssignVirtualAssigneeSchema,
  tryParseFormData,
} from "./validation";
export async function loader({
  request,
  params,
}: {
  request: Request;
  params: Record<string, string>;
}) {
  let accountId = await requireAuthCookie(request);

  invariant(params.id, "Missing board ID");
  let id = Number(params.id);

  let board = await getBoardData(id, accountId);
  if (!board) throw notFound();

  let allBoards = await getHomeData(accountId);

  return { board, allBoards };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [
    {
      title: `${data ? (data as { board: BoardType }).board.name : "Board"} | Trellix`,
    },
  ];
};

export default function BoardPage({ loaderData }: Route.ComponentProps) {
  return <Board board={loaderData.board} />;
}

export async function action({
  request,
  params,
}: {
  request: Request;
  params: Record<string, string>;
}) {
  let accountId = await requireAuthCookie(request);
  let boardId = Number(params.id);
  invariant(boardId, "Missing boardId");

  let formData = await request.formData();
  let intent = formData.get("intent");

  if (!intent) throw badRequest("Missing intent");

  switch (intent) {
    case INTENTS.deleteCard: {
      const result = tryParseFormData(formData, deleteCardSchema);
      if (!result.success) throw badRequest(result.error);
      await deleteCard(result.data.itemId, accountId);
      break;
    }
    case INTENTS.updateBoardName: {
      const result = tryParseFormData(formData, updateBoardNameSchema);
      if (!result.success) throw badRequest(result.error);
      await updateBoardName(boardId, result.data.name, accountId);
      break;
    }
    case INTENTS.moveItem: {
      const result = tryParseFormData(formData, moveItemSchema);
      if (!result.success) throw badRequest(result.error);

      // For move operations, fetch existing item and update only columnId and order
      const existingItem = await getItem(result.data.id, accountId);
      if (!existingItem) throw badRequest("Item not found");

      // Upsert with existing data but new position
      await upsertItem(
        {
          id: existingItem.id,
          columnId: result.data.columnId,
          title: existingItem.title,
          order: result.data.order,
          content: existingItem.content,
          boardId,
        },
        accountId
      );
      break;
    }
    case INTENTS.createItem: {
      const result = tryParseFormData(formData, itemMutationSchema);
      if (!result.success) throw badRequest(result.error);
      // Assign current user as creator when creating new card
      await upsertItem(
        { ...result.data, boardId, createdBy: accountId } as ItemMutation & {
          boardId: number;
          createdBy: string;
        },
        accountId
      );
      break;
    }
    case INTENTS.updateItem: {
      const result = tryParseFormData(formData, itemMutationSchema);
      if (!result.success) throw badRequest(result.error);
      await upsertItem({ ...result.data, boardId }, accountId);
      break;
    }
    case INTENTS.createColumn: {
      const result = tryParseFormData(formData, createColumnSchema);
      if (!result.success) throw badRequest(result.error);
      await createColumn(boardId, result.data.name, result.data.id, accountId);
      break;
    }
    case INTENTS.updateColumn: {
      const result = tryParseFormData(formData, updateColumnSchema);
      if (!result.success) throw badRequest(result.error);

      const { columnId, name, color, isExpanded } = result.data;

      if (name) {
        await updateColumnName(columnId, name, accountId);
      }

      if (color) {
        await updateColumnColor(columnId, color, accountId);
      }

      if (isExpanded !== undefined) {
        const isExpandedBool = isExpanded === "1";
        await updateColumnExpanded(columnId, isExpandedBool, accountId);
      }
      break;
    }
    case INTENTS.moveColumn: {
      const result = tryParseFormData(formData, moveColumnSchema);
      if (!result.success) throw badRequest(result.error);
      await updateColumnOrder(result.data.id, result.data.order, accountId);
      break;
    }
    case INTENTS.deleteColumn: {
      const result = tryParseFormData(formData, deleteColumnSchema);
      if (!result.success) throw badRequest(result.error);
      await deleteColumn(result.data.columnId, boardId, accountId);
      break;
    }
    case INTENTS.inviteUser: {
      const result = tryParseFormData(formData, inviteUserSchema);
      if (!result.success) throw badRequest(result.error);
      // Check that user is owner or admin
      const board = await getBoardData(boardId, accountId);
      if (!board) throw notFound();
      await inviteUserToBoard(
        boardId,
        result.data.email,
        accountId,
        result.data.role
      );
      break;
    }
    case INTENTS.acceptInvitation: {
      const result = tryParseFormData(formData, acceptInvitationSchema);
      if (!result.success) throw badRequest(result.error);
      await acceptBoardInvitation(result.data.invitationId, accountId);
      break;
    }
    case INTENTS.declineInvitation: {
      const result = tryParseFormData(formData, declineInvitationSchema);
      if (!result.success) throw badRequest(result.error);
      await declineBoardInvitation(result.data.invitationId);
      break;
    }
    case INTENTS.updateItemAssignee: {
      const result = tryParseFormData(formData, updateItemAssigneeSchema);
      if (!result.success) throw badRequest(result.error);
      await updateItemAssignee(
        result.data.itemId,
        result.data.assigneeId || null,
        accountId
      );
      break;
    }
    case INTENTS.createVirtualAssignee: {
      const result = tryParseFormData(formData, createVirtualAssigneeSchema);
      if (!result.success) throw badRequest(result.error);
      await createOrGetAssignee(boardId, result.data.name);
      break;
    }
    case INTENTS.createAndAssignVirtualAssignee: {
      const result = tryParseFormData(
        formData,
        createAndAssignVirtualAssigneeSchema
      );
      if (!result.success) throw badRequest(result.error);
      const assignee = await createOrGetAssignee(boardId, result.data.name);
      await updateItemAssignee(result.data.itemId, assignee.id, accountId);
      break;
    }
    default: {
      throw badRequest(`Unknown intent: ${intent}`);
    }
  }

  return { ok: true };
}
