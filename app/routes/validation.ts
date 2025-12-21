import { z } from "zod";

// Maximum assignee name length: 50 (firstName) + 50 (lastName) + 1 (space) + 9 (dedup buffer) = 110 chars
const MAX_ASSIGNEE_NAME_LENGTH = 110;

// ============================================================================
// Authentication
// ============================================================================

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(50, "First name must be 50 characters or less"),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(50, "Last name must be 50 characters or less"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters")
    .regex(/[^A-Za-z0-9]/, "Password must contain a special character"),
});

export type SignupInput = z.infer<typeof signupSchema>;

// ============================================================================
// Board Operations
// ============================================================================

export const updateBoardSchema = z.object({
  intent: z.literal("updateBoard"),
  boardId: z.string().min(1, "Invalid board ID"),
  name: z
    .string()
    .min(1, "Board name is required")
    .max(255, "Board name is too long")
    .optional(),
  color: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i, "Invalid color format")
    .optional(),
});

export type UpdateBoardInput = z.infer<typeof updateBoardSchema>;

// ============================================================================
// Item/Card Operations
// ============================================================================

export const itemMutationSchema = z.object({
  id: z.string().min(1, "Invalid item ID"),
  columnId: z.string().min(1, "Invalid column ID"),
  title: z
    .string()
    .min(1, "Card title is required")
    .max(255, "Card title is too long"),
  order: z.coerce
    .number("Order must be a number")
    .finite("Order must be a valid number")
    .min(0, "Order cannot be negative"),
  content: z.string().nullable().default(null),
});

export type ItemMutationInput = z.infer<typeof itemMutationSchema>;

export const createItemSchema = z.object({
  intent: z.literal("createItem"),
  columnId: z.string().min(1, "Invalid column ID"),
  title: z
    .string()
    .min(1, "Card title is required")
    .max(255, "Card title is too long"),
  order: z.coerce
    .number("Order must be a number")
    .finite("Order must be a valid number")
    .min(0, "Order cannot be negative"),
  content: z.string().nullable().default(null),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;

export const updateItemSchema = z.object({
  intent: z.literal("updateItem"),
  id: z.string().min(1, "Invalid item ID"),
  columnId: z.string().min(1, "Invalid column ID"),
  title: z
    .string()
    .min(1, "Card title is required")
    .max(255, "Card title is too long"),
  order: z.coerce
    .number("Order must be a number")
    .finite("Order must be a valid number")
    .min(0, "Order cannot be negative"),
  content: z.string().nullable().default(null),
});

export type UpdateItemInput = z.infer<typeof updateItemSchema>;

export const moveItemSchema = z.object({
  intent: z.literal("moveItem"),
  id: z.string().min(1, "Invalid item ID"),
  columnId: z.string().min(1, "Invalid column ID"),
  title: z.string().optional(),
  order: z.coerce
    .number("Order must be a number")
    .finite("Order must be a valid number")
    .min(0, "Order cannot be negative"),
  content: z.string().nullable().default(null),
});

export type MoveItemInput = z.infer<typeof moveItemSchema>;

export const deleteCardSchema = z.object({
  intent: z.literal("deleteCard"),
  itemId: z.string().min(1, "Invalid item ID"),
});

export type DeleteCardInput = z.infer<typeof deleteCardSchema>;

// ============================================================================
// Column Operations
// ============================================================================

export const createColumnSchema = z.object({
  boardId: z.string().min(1, "Board ID is required"),
  name: z
    .string()
    .min(1, "Column name is required")
    .max(255, "Column name is too long"),
  id: z.string().optional(), // Server generates if not provided
});

export type CreateColumnInput = z.infer<typeof createColumnSchema>;

export const updateColumnSchema = z.object({
  intent: z.literal("updateColumn"),
  columnId: z.string().min(1, "Invalid column ID"),
  name: z
    .string()
    .min(1, "Column name is required")
    .max(255, "Column name is too long")
    .optional(),
  color: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i, "Invalid color format")
    .optional(),
  isExpanded: z.enum(["0", "1"]).optional(),
});

export type UpdateColumnInput = z.infer<typeof updateColumnSchema>;

export const moveColumnSchema = z.object({
  intent: z.literal("moveColumn"),
  id: z.string().min(1, "Invalid column ID"),
  order: z.coerce
    .number("Order must be a number")
    .finite("Order must be a valid number")
    .min(0, "Order cannot be negative"),
});

export type MoveColumnInput = z.infer<typeof moveColumnSchema>;

export const deleteColumnSchema = z.object({
  intent: z.literal("deleteColumn"),
  columnId: z.string().min(1, "Invalid column ID"),
});

export type DeleteColumnInput = z.infer<typeof deleteColumnSchema>;

// ============================================================================
// Invitation Operations
// ============================================================================

export const inviteUserSchema = z.object({
  intent: z.literal("inviteUser"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  role: z.enum(["owner", "editor"]).default("editor"),
});

export type InviteUserInput = z.infer<typeof inviteUserSchema>;

// Schema for /invite route (no intent needed - dedicated route)
export const inviteAcceptSchema = z.object({
  invitationId: z.string().min(1, "Invitation ID is required"),
});

export type InviteAcceptInput = z.infer<typeof inviteAcceptSchema>;

// Schema for accepting invitation via resource route (needs intent)
export const acceptInvitationSchema = z.object({
  intent: z.literal("acceptInvitation"),
  invitationId: z.string().min(1, "Invitation ID is required"),
});

export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;

export const declineInvitationSchema = z.object({
  intent: z.literal("declineInvitation"),
  invitationId: z.string().min(1, "Invitation ID is required"),
});

export type DeclineInvitationInput = z.infer<typeof declineInvitationSchema>;

export const updateItemAssigneeSchema = z.object({
  intent: z.literal("updateItemAssignee"),
  itemId: z.string().min(1, "Invalid item ID"),
  assigneeId: z.string().nullable().optional(),
});

export type UpdateItemAssigneeInput = z.infer<typeof updateItemAssigneeSchema>;

export const createVirtualAssigneeSchema = z.object({
  intent: z.literal("createVirtualAssignee"),
  name: z
    .string()
    .min(1, "Assignee name is required")
    .refine(
      (name) => name.length <= MAX_ASSIGNEE_NAME_LENGTH,
      `Assignee name must be ${MAX_ASSIGNEE_NAME_LENGTH} characters or less`
    ),
});

export type CreateVirtualAssigneeInput = z.infer<
  typeof createVirtualAssigneeSchema
>;

export const createAndAssignVirtualAssigneeSchema = z.object({
  intent: z.literal("createAndAssignVirtualAssignee"),
  name: z
    .string()
    .min(1, "Assignee name is required")
    .refine(
      (name) => name.length <= MAX_ASSIGNEE_NAME_LENGTH,
      `Assignee name must be ${MAX_ASSIGNEE_NAME_LENGTH} characters or less`
    ),
  itemId: z.string().min(1, "Invalid item ID"),
});

export type CreateAndAssignVirtualAssigneeInput = z.infer<
  typeof createAndAssignVirtualAssigneeSchema
>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse FormData into an object, handling multiple values and null
 *
 * - Trims string values to remove leading/trailing whitespace
 * - Converts empty strings to null (allows optional field handling)
 * - Preserves non-string values as-is
 */
export function formDataToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    // Trim strings to remove leading/trailing whitespace
    const trimmed = typeof value === "string" ? value.trim() : value;
    // Handle empty strings as null for optional fields
    obj[key] = trimmed === "" ? null : trimmed;
  }
  return obj;
}

/**
 * Safely parse and validate FormData against a Zod schema
 */
export function parseFormData<T extends z.ZodSchema>(
  formData: FormData,
  schema: T
): z.infer<T> {
  const obj = formDataToObject(formData);
  return schema.parse(obj);
}

/**
 * Try to parse FormData and return error message if parsing fails
 */
export function tryParseFormData<T extends z.ZodSchema>(
  formData: FormData,
  schema: T
): { success: true; data: z.infer<T> } | { success: false; error: string } {
  try {
    const obj = formDataToObject(formData);
    const data = schema.parse(obj);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map(
        (e) => `${e.path.join(".")}: ${e.message}`
      );
      return { success: false, error: messages.join("; ") };
    }
    return { success: false, error: "Unknown validation error" };
  }
}
