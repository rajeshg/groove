import {
  sqliteTable,
  text,
  integer,
  index,
  real,
} from "drizzle-orm/sqlite-core";

/**
 * Accounts table - user authentication
 */
export const accounts = sqliteTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    firstName: text("firstName"),
    lastName: text("lastName"),
    createdAt: text("createdAt").notNull(),
    updatedAt: text("updatedAt").notNull(),
  },
  (table) => ({
    emailIdx: index("idx_accounts_email").on(table.email),
  })
);

/**
 * Passwords table - password hashes and salts
 */
export const passwords = sqliteTable("passwords", {
  id: text("id").primaryKey(),
  accountId: text("accountId")
    .notNull()
    .unique()
    .references(() => accounts.id, { onDelete: "cascade" }),
  hash: text("hash").notNull(),
  salt: text("salt").notNull(),
});

/**
 * Todos table schema using Drizzle ORM
 */
export const todos = sqliteTable(
  "todos",
  {
    id: text("id").primaryKey(),
    userId: text("userId").notNull(),
    text: text("text").notNull(),
    description: text("description"),
    dueDate: text("dueDate"),
    completed: integer("completed", { mode: "boolean" }).default(false),
    createdAt: text("createdAt").notNull(),
    updatedAt: text("updatedAt").notNull(),
  },
  (table) => ({
    userIdIdx: index("idx_todos_userId").on(table.userId),
    dueDateIdx: index("idx_todos_dueDate").on(table.dueDate),
  })
);

/**
 * Boards table - user kanban boards
 */
export const boards = sqliteTable(
  "boards",
  {
    id: text("id").primaryKey(),
    accountId: text("accountId")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").notNull().default("#e0e0e0"),
    createdAt: text("createdAt").notNull(),
    updatedAt: text("updatedAt").notNull(),
  },
  (table) => ({
    accountIdIdx: index("idx_boards_accountId").on(table.accountId),
  })
);

/**
 * Columns table - columns within boards
 */
export const columns = sqliteTable(
  "columns",
  {
    id: text("id").primaryKey(),
    boardId: text("boardId")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").notNull().default("#94a3b8"),
    order: real("order").notNull().default(0),
    isDefault: integer("isDefault", { mode: "boolean" })
      .notNull()
      .default(false),
    isExpanded: integer("isExpanded", { mode: "boolean" })
      .notNull()
      .default(true),
    shortcut: text("shortcut"),
    createdAt: text("createdAt").notNull(),
    updatedAt: text("updatedAt").notNull(),
  },
  (table) => ({
    boardIdIdx: index("idx_columns_boardId").on(table.boardId),
    orderIdx: index("idx_columns_order").on(table.boardId, table.order),
  })
);

/**
 * Board Members table - tracks who has access to boards
 * Supports both ownership and invited members
 */
export const boardMembers = sqliteTable(
  "boardMembers",
  {
    id: text("id").primaryKey(),
    boardId: text("boardId")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    accountId: text("accountId")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("editor"), // "owner" | "editor"
    createdAt: text("createdAt").notNull(),
  },
  (table) => ({
    boardIdIdx: index("idx_boardMembers_boardId").on(table.boardId),
    accountIdIdx: index("idx_boardMembers_accountId").on(table.accountId),
    uniqueMemberPerBoard: index("idx_boardMembers_unique").on(
      table.boardId,
      table.accountId
    ),
  })
);

/**
 * Board Invitations table - tracks pending/accepted/rejected board invitations
 */
export const boardInvitations = sqliteTable(
  "boardInvitations",
  {
    id: text("id").primaryKey(),
    boardId: text("boardId")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role").notNull().default("editor"), // "owner" | "editor"
    status: text("status").notNull().default("pending"), // "pending" | "accepted" | "rejected"
    invitedBy: text("invitedBy")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    createdAt: text("createdAt").notNull(),
    updatedAt: text("updatedAt").notNull(),
  },
  (table) => ({
    boardIdIdx: index("idx_boardInvitations_boardId").on(table.boardId),
    emailIdx: index("idx_boardInvitations_email").on(table.email),
    statusIdx: index("idx_boardInvitations_status").on(table.status),
    uniqueInvitePerBoard: index("idx_boardInvitations_unique").on(
      table.email,
      table.boardId
    ),
  })
);

/**
 * Assignees table - board-scoped assignees (can be linked to accounts or virtual)
 */
export const assignees = sqliteTable(
  "assignees",
  {
    id: text("id").primaryKey(),
    boardId: text("boardId")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    userId: text("userId").references(() => accounts.id, {
      onDelete: "set null",
    }),
    createdAt: text("createdAt").notNull(),
  },
  (table) => ({
    boardIdIdx: index("idx_assignees_boardId").on(table.boardId),
    userIdIdx: index("idx_assignees_userId").on(table.userId),
    uniqueNamePerBoard: index("idx_assignees_name_boardId").on(
      table.name,
      table.boardId
    ),
  })
);

/**
 * Items table - cards within columns
 */
export const items = sqliteTable(
  "items",
  {
    id: text("id").primaryKey(),
    boardId: text("boardId")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    columnId: text("columnId")
      .notNull()
      .references(() => columns.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: text("content"),
    order: real("order").notNull(),
    createdBy: text("createdBy").references(() => accounts.id, {
      onDelete: "set null",
    }),
    assigneeId: text("assigneeId").references(() => assignees.id, {
      onDelete: "set null",
    }),
    createdAt: text("createdAt").notNull(),
    updatedAt: text("updatedAt").notNull(),
    lastActiveAt: text("lastActiveAt").notNull(),
  },
  (table) => ({
    boardIdIdx: index("idx_items_boardId").on(table.boardId),
    columnIdIdx: index("idx_items_columnId").on(table.columnId),
    orderIdx: index("idx_items_order").on(table.columnId, table.order),
    assigneeIdIdx: index("idx_items_assigneeId").on(table.assigneeId),
  })
);

/**
 * Comments table - comments on items
 */
export const comments = sqliteTable(
  "comments",
  {
    id: text("id").primaryKey(),
    itemId: text("itemId")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    accountId: text("accountId")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdAt: text("createdAt").notNull(),
    updatedAt: text("updatedAt").notNull(),
  },
  (table) => ({
    itemIdIdx: index("idx_comments_itemId").on(table.itemId),
  })
);

/**
 * Activities table - activity feed for boards and items
 */
export const activities = sqliteTable(
  "activities",
  {
    id: text("id").primaryKey(),
    boardId: text("boardId")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    itemId: text("itemId").references(() => items.id, { onDelete: "set null" }),
    accountId: text("accountId").references(() => accounts.id, {
      onDelete: "set null",
    }),
    type: text("type").notNull(), // 'item_created', 'item_moved', 'item_updated', 'comment_added', 'board_updated', etc.
    content: text("content"), // Additional info like "from To Do to Done" or comment snippet
    createdAt: text("createdAt").notNull(),
  },
  (table) => ({
    boardIdIdx: index("idx_activities_boardId").on(table.boardId),
    itemIdIdx: index("idx_activities_itemId").on(table.itemId),
    accountIdIdx: index("idx_activities_accountId").on(table.accountId),
    createdAtIdx: index("idx_activities_createdAt").on(table.createdAt),
  })
);

// Type exports for use throughout the app
export type Todo = typeof todos.$inferSelect;
export type NewTodo = typeof todos.$inferInsert;

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

export type Password = typeof passwords.$inferSelect;
export type NewPassword = typeof passwords.$inferInsert;

export type Board = typeof boards.$inferSelect;
export type NewBoard = typeof boards.$inferInsert;

export type BoardMember = typeof boardMembers.$inferSelect;
export type NewBoardMember = typeof boardMembers.$inferInsert;

export type Column = typeof columns.$inferSelect;
export type NewColumn = typeof columns.$inferInsert;

export type Assignee = typeof assignees.$inferSelect;
export type NewAssignee = typeof assignees.$inferInsert;

export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;

export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;
