import { z } from "zod";

// ============================================================================
// TanStack DB Schemas for Groove Kanban
// ============================================================================
//
// These schemas define the structure and validation rules for all collection types.
// They are designed to work with TanStack DB's type system.
//
// KEY PATTERNS:
//
// 1. Date Transformations
//    Schemas transform ISO strings from API to Date objects.
//    Uses z.union([z.string(), z.date()]) to accept both forms.
//    Why? Because TanStack DB mutations may pass already-transformed dates.
//    When sending to API, convert back: date instanceof Date ? date.toISOString() : date
//
// 2. Type Inference
//    Use z.infer<typeof schema> to get TypeScript types throughout the app
//    Example: type Todo = z.infer<typeof todoSchema>
//
// 3. Validation (Future Integration)
//    Optional: Validate API responses with schema.parse(response)
//    Error handling: catch (error) { if (error instanceof ZodError) {...} }
//
// BENEFITS:
// - Type safety throughout data flow
// - Runtime validation of API responses
// - Automatic ISO string to Date transformation
// - Full IDE autocomplete support
// - Self-documenting code

const dateTransform = z
  .union([z.string(), z.date()])
  .transform((val) => (typeof val === "string" ? new Date(val) : val));

// ============================================================================
// Todo Schema
// ============================================================================

export const todoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  text: z.string().min(1, "Text is required"),
  description: z.string().optional().nullable(),
  dueDate: z
    .union([z.string(), z.date(), z.null()])
    .transform((val) => {
      if (val === null) return null;
      return typeof val === "string" ? new Date(val) : val;
    })
    .nullable()
    .optional(),
  completed: z.boolean().default(false),
  createdAt: dateTransform,
  updatedAt: dateTransform,
});

export type Todo = z.infer<typeof todoSchema>;

// ============================================================================
// Board Schema
// ============================================================================

export const boardSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  name: z.string().min(1, "Board name is required"),
  color: z.string(),
  createdAt: dateTransform,
  updatedAt: dateTransform,
});

export type Board = z.infer<typeof boardSchema>;

// ============================================================================
// Column Schema
// ============================================================================

export const columnSchema = z.object({
  id: z.string(),
  boardId: z.string(),
  name: z.string().min(1, "Column name is required"),
  color: z.string(),
  order: z.number().default(0),
  isDefault: z.boolean().optional().default(false),
  isExpanded: z.boolean().optional().default(true),
  shortcut: z.string().optional().nullable(),
  createdAt: dateTransform,
  updatedAt: dateTransform,
});

export type Column = z.infer<typeof columnSchema>;

// ============================================================================
// Item Schema
// ============================================================================

export const itemSchema = z.object({
  id: z.string(),
  boardId: z.string(),
  columnId: z.string(),
  title: z.string().min(1, "Item title is required"),
  content: z.string().optional().nullable(),
  order: z.number().default(0),
  createdBy: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  createdAt: dateTransform,
  updatedAt: dateTransform,
  lastActiveAt: dateTransform,
});

export type Item = z.infer<typeof itemSchema>;

// ============================================================================
// Comment Schema
// ============================================================================

export const commentSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  accountId: z.string(),
  content: z.string().min(1, "Comment cannot be empty"),
  createdAt: dateTransform,
  updatedAt: dateTransform,
  account: z
    .object({
      id: z.string(),
      email: z.string(),
      firstName: z.string().optional().nullable(),
      lastName: z.string().optional().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
    })
    .optional()
    .nullable(),
});

export type Comment = z.infer<typeof commentSchema>;

// ============================================================================
// Assignee Schema
// ============================================================================

export const assigneeSchema = z.object({
  id: z.string(),
  boardId: z.string(),
  name: z.string().min(1, "Assignee name is required"),
  userId: z.string().optional().nullable(),
  createdAt: dateTransform,
});

export type Assignee = z.infer<typeof assigneeSchema>;

// ============================================================================
// Activity Schema
// ============================================================================

export const activitySchema = z.object({
  id: z.string(),
  boardId: z.string(),
  itemId: z.string().optional().nullable(),
  accountId: z.string().optional().nullable(),
  type: z.string(),
  content: z.string().optional().nullable(),
  createdAt: dateTransform,
});

export type Activity = z.infer<typeof activitySchema>;
