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
import {
  canCreateColumn,
  canDeleteColumn,
  canUpdateColumnColor,
  canMoveColumn,
  canUpdateBoardName,
  canManageMembers,
  assertBoardAccess,
  getPermissionErrorMessage,
  type UserRole,
} from "../utils/permissions";
import Board from "./board/board";
import type { Board as BoardType } from "@prisma/client";
import type { Route } from "./+types/board.$id";
import { sendEmail, emailTemplates } from "~/utils/email.server";
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
  let id = params.id;

  let board = await getBoardData(id, accountId);
  if (!board) throw notFound();

  // Check if user has access to this board
  assertBoardAccess(board, accountId);

  let allBoards = await getHomeData(accountId);

  return { board, allBoards };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [
    {
      title: `${data ? (data as { board: BoardType }).board.name : "Board"} | Groove`,
    },
  ];
};

export default function BoardPage({ loaderData }: Route.ComponentProps) {
  return <Board board={loaderData.board} />;
}

/**
 * Get the current user's role in a board
 * Returns "owner" if user is board owner, "editor" if they're a member, null if not a member
 */
function getUserBoardRole(board: unknown, accountId: string): UserRole | null {
  interface BoardLike {
    accountId: string;
    members: Array<{ role?: string; accountId: string }>;
  }

  function isBoardLike(value: unknown): value is BoardLike {
    return (
      typeof value === "object" &&
      value !== null &&
      "accountId" in value &&
      "members" in value &&
      Array.isArray((value as unknown as BoardLike).members)
    );
  }

  if (!isBoardLike(board)) {
    return null;
  }

  // Owner has full permissions
  if (board.accountId === accountId) {
    return "owner";
  }

  // Check if user is a member
  const member = board.members.find((m) => m.accountId === accountId);
  if (member?.role === "editor" || member?.role === "admin") {
    return "editor"; // Editors have limited permissions
  }

  return null; // Not a member
}

export async function action({
  request,
  params,
}: {
  request: Request;
  params: Record<string, string>;
}) {
  let accountId = await requireAuthCookie(request);
  let boardId = params.id;
  invariant(boardId, "Missing boardId");

  // Get board data for permission checks
  const board = await getBoardData(boardId, accountId);
  if (!board) throw notFound();

  const userRole = getUserBoardRole(board, accountId);

  let formData = await request.formData();
  let intent = formData.get("intent");

  if (!intent) throw badRequest("Missing intent");

  switch (intent) {
    case INTENTS.deleteCard: {
      const result = tryParseFormData(formData, deleteCardSchema);
      if (!result.success) throw badRequest(result.error);

      // Check if editor can delete this card (must be creator)
      if (userRole === "editor") {
        const card = await getItem(result.data.itemId, accountId);
        if (!card || card.createdBy !== accountId) {
          throw badRequest(getPermissionErrorMessage("deleteCard"));
        }
      }

      await deleteCard(result.data.itemId, accountId);
      break;
    }

    case INTENTS.updateBoardName: {
      if (!canUpdateBoardName(userRole)) {
        throw badRequest(getPermissionErrorMessage("updateBoardName"));
      }
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
          boardId: string;
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
      if (!canCreateColumn(userRole)) {
        throw badRequest(getPermissionErrorMessage("createColumn"));
      }
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
        if (!canUpdateColumnColor(userRole)) {
          throw badRequest(getPermissionErrorMessage("updateColumnColor"));
        }
        await updateColumnColor(columnId, color, accountId);
      }

      if (isExpanded !== undefined) {
        const isExpandedBool = isExpanded === "1";
        await updateColumnExpanded(columnId, isExpandedBool, accountId);
      }
      break;
    }

    case INTENTS.moveColumn: {
      if (!canMoveColumn(userRole)) {
        throw badRequest(getPermissionErrorMessage("moveColumn"));
      }
      const result = tryParseFormData(formData, moveColumnSchema);
      if (!result.success) throw badRequest(result.error);
      await updateColumnOrder(result.data.id, result.data.order, accountId);
      break;
    }

    case INTENTS.deleteColumn: {
      if (!canDeleteColumn(userRole)) {
        throw badRequest(getPermissionErrorMessage("deleteColumn"));
      }
      const result = tryParseFormData(formData, deleteColumnSchema);
      if (!result.success) throw badRequest(result.error);
      await deleteColumn(result.data.columnId, boardId, accountId);
      break;
    }

    case INTENTS.inviteUser: {
      if (!canManageMembers(userRole)) {
        throw badRequest(getPermissionErrorMessage("manageMembers"));
      }
      const result = tryParseFormData(formData, inviteUserSchema);
      if (!result.success) throw badRequest(result.error);

      const invitation = await inviteUserToBoard(
        boardId,
        result.data.email,
        accountId,
        "editor" // Always invite as editor in simplified model
      );

      // Send invitation email
      const template = emailTemplates.invitation(
        board.name,
        "A team member",
        invitation.id
      );
      await sendEmail({
        to: result.data.email,
        subject: template.subject,
        html: template.html,
      });
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
