import invariant from "tiny-invariant";
import type { ItemMutation } from "../types";
import { itemMutationSchema, formDataToObject } from "../validation";

/**
 * Parse FormData into an ItemMutation using Zod validation
 * @deprecated Use validation.ts schemas directly in board.$id.tsx
 */
export function parseItemMutation(formData: FormData): ItemMutation {
  const obj = formDataToObject(formData);
  return itemMutationSchema.parse(obj);
}
