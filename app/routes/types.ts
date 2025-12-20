import type { Assignee } from "../../prisma/client";

export type RenderedAssignee = Pick<Assignee, "id" | "name"> & {
  userId: string | null;
};

export interface RenderedItem {
  id: string;
  title: string;
  order: number;
  content: string | null;
  columnId: string;
  createdBy: string | null;
  createdByUser?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
  assigneeId: string | null;
  Assignee: RenderedAssignee | null;
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date;
  boardId: string;
  comments?: RenderedComment[];
}

export interface RenderedComment {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  createdByUser?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
}

export const CONTENT_TYPES = {
  card: "application/remix-card",
  column: "application/remix-column",
};

export const INTENTS = {
  createColumn: "newColumn" as const,
  updateColumn: "updateColumn" as const,
  deleteColumn: "deleteColumn" as const,
  createItem: "createItem" as const,
  updateItem: "updateItem" as const,
  moveItem: "moveItem" as const,
  moveColumn: "moveColumn" as const,
  deleteBoard: "deleteBoard" as const,
  createBoard: "createBoard" as const,
  deleteCard: "deleteCard" as const,
  createComment: "createComment" as const,
  updateComment: "updateComment" as const,
  deleteComment: "deleteComment" as const,
};

export const ItemMutationFields = {
  id: { type: String, name: "id" },
  columnId: { type: String, name: "columnId" },
  order: { type: Number, name: "order" },
  title: { type: String, name: "title" },
  content: { type: String, name: "content" },
} as const;

export type ItemMutation = MutationFromFields<typeof ItemMutationFields>;

////////////////////////////////////////////////////////////////////////////////
// Bonkers TypeScript
type ConstructorToType<T> = T extends typeof String
  ? string
  : T extends typeof Number
    ? number
    : never;

export type MutationFromFields<
  T extends Record<string, { type: typeof String | typeof Number }>,
> = {
  [K in keyof T]: K extends "content"
    ? string | null
    : ConstructorToType<T[K]["type"]>;
};
