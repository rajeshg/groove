import { type MetaFunction } from "react-router";
import invariant from "tiny-invariant";
import { z } from "zod";

import { badRequest, notFound } from "../http/bad-request";
import { requireAuthCookie } from "../auth/auth";

import { INTENTS } from "./types";
import {
  createColumn,
  updateColumnName,
  updateColumnColor,
  updateColumnOrder,
  getBoardData,
  upsertItem,
  updateBoardName,
  deleteCard,
} from "./queries";
import { Board } from "./board/board";
import {
  updateBoardNameSchema,
  itemMutationSchema,
  deleteCardSchema,
  createColumnSchema,
  updateColumnSchema,
  moveColumnSchema,
  tryParseFormData,
  formDataToObject,
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

  return { board };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [
    {
      title: `${data ? (data as any).board.name : "Board"} | Trellix`,
    },
  ];
};

export { Board as default };

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
    case INTENTS.moveItem:
    case INTENTS.createItem:
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

      const { columnId, name, color } = result.data;

      if (name) {
        await updateColumnName(columnId, name, accountId);
      }

      if (color) {
        await updateColumnColor(columnId, color, accountId);
      }
      break;
    }
    case INTENTS.moveColumn: {
      const result = tryParseFormData(formData, moveColumnSchema);
      if (!result.success) throw badRequest(result.error);
      await updateColumnOrder(result.data.id, result.data.order, accountId);
      break;
    }
    default: {
      throw badRequest(`Unknown intent: ${intent}`);
    }
  }

  return { ok: true };
}
