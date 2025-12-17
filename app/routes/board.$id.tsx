import { type MetaFunction } from "react-router";
import invariant from "tiny-invariant";

import { badRequest, notFound } from "../http/bad-request";
import { requireAuthCookie } from "../auth/auth";

import { parseItemMutation } from "./board/utils";
import { INTENTS } from "./types";
import {
  createColumn,
  updateColumnName,
  updateColumnColor,
  getBoardData,
  upsertItem,
  updateBoardName,
  deleteCard,
} from "./queries";
import { Board } from "./board/board";

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
      let id = String(formData.get("itemId") || "");
      await deleteCard(id, accountId);
      break;
    }
    case INTENTS.updateBoardName: {
      let name = String(formData.get("name") || "");
      invariant(name, "Missing name");
      await updateBoardName(boardId, name, accountId);
      break;
    }
    case INTENTS.moveItem:
    case INTENTS.createItem:
    case INTENTS.updateItem: {
      let mutation = parseItemMutation(formData);
      await upsertItem({ ...mutation, boardId }, accountId);
      break;
    }
    case INTENTS.createColumn: {
      let { name, id } = Object.fromEntries(formData);
      invariant(name, "Missing name");
      invariant(id, "Missing id");
      await createColumn(boardId, String(name), String(id), accountId);
      break;
    }
    case INTENTS.updateColumn: {
      let { name, columnId, color } = Object.fromEntries(formData);
      if (!columnId) throw badRequest("Missing columnId");
      
      if (name && String(name).trim()) {
        await updateColumnName(String(columnId), String(name), accountId);
      }
      
      if (color) {
        await updateColumnColor(String(columnId), String(color), accountId);
      }
      break;
    }
    default: {
      throw badRequest(`Unknown intent: ${intent}`);
    }
  }

  return { ok: true };
}
