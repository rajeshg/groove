import { z } from "zod";

/**
 * Schema for creating a new todo (input validation)
 */
export const CreateTodoSchema = z.object({
  text: z
    .string()
    .min(1, "Todo text is required")
    .max(500, "Todo text must be 500 characters or less"),
  description: z
    .string()
    .max(2000, "Description must be 2000 characters or less")
    .default(""),
  dueDate: z.string().datetime().nullable().optional(),
});

export type CreateTodoInput = z.infer<typeof CreateTodoSchema>;

/**
 * Schema for updating an existing todo (input validation)
 */
export const UpdateTodoSchema = z.object({
  text: z
    .string()
    .min(1, "Todo text is required")
    .max(500, "Todo text must be 500 characters or less")
    .optional(),
  description: z
    .string()
    .max(2000, "Description must be 2000 characters or less")
    .nullable()
    .optional(),
  dueDate: z.string().datetime().nullable().optional(),
  completed: z.boolean().optional(),
});

export type UpdateTodoInput = z.infer<typeof UpdateTodoSchema>;

/**
 * Schema for todo response from API
 */
export const TodoResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  text: z.string(),
  description: z.string().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  completed: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type TodoResponse = z.infer<typeof TodoResponseSchema>;

// ============================================================================
// Board Validation Schemas
// ============================================================================

/**
 * Schema for creating a new board
 */
export const CreateBoardSchema = z.object({
  name: z
    .string()
    .min(1, "Board name is required")
    .max(100, "Board name must be 100 characters or less"),
  color: z.string().optional().default("#3b82f6"),
  template: z.string().optional(),
});

export type CreateBoardInput = z.infer<typeof CreateBoardSchema>;

/**
 * Schema for updating an existing board
 */
export const UpdateBoardSchema = CreateBoardSchema.partial();

export type UpdateBoardInput = z.infer<typeof UpdateBoardSchema>;

/**
 * Schema for board response from API
 */
export const BoardResponseSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  name: z.string(),
  color: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type BoardResponse = z.infer<typeof BoardResponseSchema>;

// ============================================================================
// Column Validation Schemas
// ============================================================================

/**
 * Schema for creating a new column
 */
export const CreateColumnSchema = z.object({
  name: z
    .string()
    .min(1, "Column name is required")
    .max(100, "Column name must be 100 characters or less"),
  color: z.string().optional().default("#94a3b8"),
});

export type CreateColumnInput = z.infer<typeof CreateColumnSchema>;

/**
 * Schema for updating an existing column
 */
export const UpdateColumnSchema = CreateColumnSchema.partial().extend({
  isExpanded: z.boolean().optional(),
  order: z.number().optional(),
});

export type UpdateColumnInput = z.infer<typeof UpdateColumnSchema>;

/**
 * Schema for column response from API
 */
export const ColumnResponseSchema = z.object({
  id: z.string(),
  boardId: z.string(),
  name: z.string(),
  color: z.string(),
  order: z.number(),
  isDefault: z.boolean(),
  isExpanded: z.boolean(),
  shortcut: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ColumnResponse = z.infer<typeof ColumnResponseSchema>;

// ============================================================================
// Item (Card) Validation Schemas
// ============================================================================

/**
 * Schema for creating a new item/card
 */
export const CreateItemSchema = z.object({
  title: z
    .string()
    .min(1, "Card title is required")
    .max(500, "Card title must be 500 characters or less"),
  content: z
    .string()
    .max(5000, "Card content must be 5000 characters or less")
    .optional()
    .default(""),
});

export type CreateItemInput = z.infer<typeof CreateItemSchema>;

/**
 * Schema for updating an existing item/card
 */
export const UpdateItemSchema = CreateItemSchema.partial().extend({
  order: z.number().optional(),
  columnId: z.string().optional(),
  assigneeId: z.string().nullable().optional(),
});

export type UpdateItemInput = z.infer<typeof UpdateItemSchema>;

/**
 * Schema for item/card response from API
 */
export const ItemResponseSchema = z.object({
  id: z.string(),
  boardId: z.string(),
  columnId: z.string(),
  title: z.string(),
  content: z.string(),
  order: z.number(),
  createdBy: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastActiveAt: z.string().datetime(),
});

export type ItemResponse = z.infer<typeof ItemResponseSchema>;

// ============================================================================
// Comment Validation Schemas
// ============================================================================

/**
 * Schema for creating a new comment
 */
export const CreateCommentSchema = z.object({
  content: z
    .string()
    .min(1, "Comment content is required")
    .max(2000, "Comment content must be 2000 characters or less"),
});

export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;

/**
 * Schema for updating an existing comment
 */
export const UpdateCommentSchema = CreateCommentSchema;

export type UpdateCommentInput = z.infer<typeof UpdateCommentSchema>;

/**
 * Schema for comment response from API
 */
export const CommentResponseSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  accountId: z.string(),
  content: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  account: z
    .object({
      firstName: z.string().nullable(),
      lastName: z.string().nullable(),
      email: z.string(),
    })
    .optional(),
});

export type CommentResponse = z.infer<typeof CommentResponseSchema>;

// ============================================================================
// Board Invitation Validation Schemas
// ============================================================================

/**
 * Schema for inviting a user to a board
 */
export const InviteBoardMemberSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  role: z.enum(["owner", "editor"]).default("editor"),
});

export type InviteBoardMemberInput = z.infer<typeof InviteBoardMemberSchema>;

/**
 * Schema for accepting a board invitation
 */
export const AcceptInvitationSchema = z.object({
  invitationId: z.string(),
});

export type AcceptInvitationInput = z.infer<typeof AcceptInvitationSchema>;

/**
 * Schema for board invitation response
 */
export const BoardInvitationResponseSchema = z.object({
  id: z.string(),
  boardId: z.string(),
  email: z.string().email(),
  role: z.string(),
  status: z.string(),
  invitedBy: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type BoardInvitationResponse = z.infer<
  typeof BoardInvitationResponseSchema
>;
