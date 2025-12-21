/**
 * Centralized permission gates for simplified role-based access control
 *
 * Roles:
 * - "owner": Full permissions (create/edit/delete everything, manage members)
 * - "editor": Limited permissions (create/edit cards, edit column names, assign items)
 */

import { forbidden } from "../http/bad-request";

export type UserRole = "owner" | "editor";

interface BoardLike {
  accountId: string;
  members?: Array<{ accountId: string }>;
}

/**
 * Type guard to check if unknown value is a board-like object
 */
function isBoardLike(value: unknown): value is BoardLike {
  return (
    typeof value === "object" &&
    value !== null &&
    "accountId" in value &&
    typeof (value as BoardLike).accountId === "string"
  );
}

/**
 * Check if user has any access to a board (owner or member)
 */
export function hasBoardAccess(board: unknown, accountId: string): boolean {
  if (!isBoardLike(board)) {
    return false;
  }

  // Owner has access
  if (board.accountId === accountId) {
    return true;
  }

  // Check if user is a member
  const member = board.members?.find((m) => m.accountId === accountId);

  return !!member;
}

/**
 * Invariant check for board access - throws 403 if user doesn't have access
 * User must be either the board owner or an invited member
 */
export function assertBoardAccess(
  board: unknown,
  accountId: string,
  message: string = "You don't have access to this board"
): void {
  if (!hasBoardAccess(board, accountId)) {
    throw forbidden(message);
  }
}

/**
 * Check if user can create columns
 */
export function canCreateColumn(role: UserRole | null | undefined): boolean {
  return role === "owner";
}

/**
 * Check if user can delete columns
 */
export function canDeleteColumn(role: UserRole | null | undefined): boolean {
  return role === "owner";
}

/**
 * Check if user can update column names
 */
export function canUpdateColumnName(
  role: UserRole | null | undefined
): boolean {
  return role === "owner" || role === "editor";
}

/**
 * Check if user can update column colors
 */
export function canUpdateColumnColor(
  role: UserRole | null | undefined
): boolean {
  return role === "owner";
}

/**
 * Check if user can update column expanded state
 */
export function canUpdateColumnExpanded(
  role: UserRole | null | undefined
): boolean {
  return role === "owner" || role === "editor";
}

/**
 * Check if user can move columns
 */
export function canMoveColumn(role: UserRole | null | undefined): boolean {
  return role === "owner";
}

/**
 * Check if user can create cards
 */
export function canCreateCard(role: UserRole | null | undefined): boolean {
  return role === "owner" || role === "editor";
}

/**
 * Check if user can update cards
 */
export function canUpdateCard(role: UserRole | null | undefined): boolean {
  return role === "owner" || role === "editor";
}

/**
 * Check if user can delete cards (editors can only delete their own)
 */
export function canDeleteCard(
  role: UserRole | null | undefined,
  isCardCreator: boolean = true
): boolean {
  if (role === "owner") return true;
  if (role === "editor") return isCardCreator;
  return false;
}

/**
 * Check if user can move cards
 */
export function canMoveCard(role: UserRole | null | undefined): boolean {
  return role === "owner" || role === "editor";
}

/**
 * Check if user can update board (name and color)
 */
export function canUpdateBoard(role: UserRole | null | undefined): boolean {
  return role === "owner";
}

/**
 * Check if user can delete board
 */
export function canDeleteBoard(role: UserRole | null | undefined): boolean {
  return role === "owner";
}

/**
 * Check if user can manage members (invite, remove, change roles)
 */
export function canManageMembers(role: UserRole | null | undefined): boolean {
  return role === "owner";
}

/**
 * Check if user can update item assignees
 */
export function canUpdateItemAssignee(
  role: UserRole | null | undefined
): boolean {
  return role === "owner" || role === "editor";
}

/**
 * Get error message for permission denial
 */
export function getPermissionErrorMessage(action: string): string {
  const actions: Record<string, string> = {
    createColumn: "Only board owners can add columns",
    deleteColumn: "Only board owners can delete columns",
    updateColumnColor: "Only board owners can change column colors",
    moveColumn: "Only board owners can reorder columns",
    deleteBoard: "Only board owners can delete the board",
    manageMembers: "Only board owners can manage members",
    deleteCard: "You can only delete your own cards",
    updateBoard: "Only board owners can update board settings",
  };

  return actions[action] || "You don't have permission to perform this action";
}
