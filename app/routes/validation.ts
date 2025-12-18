import { z } from "zod";

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

export const updateBoardNameSchema = z.object({
  intent: z.literal("updateBoardName"),
  name: z
    .string()
    .min(1, "Board name is required")
    .max(255, "Board name is too long"),
});

export type UpdateBoardNameInput = z.infer<typeof updateBoardNameSchema>;

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
    .finite("Order must be a valid number"),
  content: z.string().nullable().default(null),
});

export type ItemMutationInput = z.infer<typeof itemMutationSchema>;

export const createItemSchema = z.object({
  intent: z.literal("createItem"),
  ...itemMutationSchema.shape,
});

export type CreateItemInput = z.infer<typeof createItemSchema>;

export const updateItemSchema = z.object({
  intent: z.literal("updateItem"),
  ...itemMutationSchema.shape,
});

export type UpdateItemInput = z.infer<typeof updateItemSchema>;

export const moveItemSchema = z.object({
  intent: z.literal("moveItem"),
  id: z.string().min(1, "Invalid item ID"),
  columnId: z.string().min(1, "Invalid column ID"),
  title: z.string().optional(),
  order: z.coerce
    .number("Order must be a number")
    .finite("Order must be a valid number"),
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
  intent: z.literal("newColumn"),
  name: z
    .string()
    .min(1, "Column name is required")
    .max(255, "Column name is too long"),
  id: z.string().min(1, "Invalid column ID"),
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
    .finite("Order must be a valid number"),
});

export type MoveColumnInput = z.infer<typeof moveColumnSchema>;

export const deleteColumnSchema = z.object({
  intent: z.literal("deleteColumn"),
  columnId: z.string().min(1, "Invalid column ID"),
});

export type DeleteColumnInput = z.infer<typeof deleteColumnSchema>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse FormData into an object, handling multiple values and null
 */
export function formDataToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    // Handle empty strings as null for optional fields
    obj[key] = value === "" ? null : value;
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
