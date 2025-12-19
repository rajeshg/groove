import type { ItemMutation } from "../types";
import { itemMutationSchema, formDataToObject } from "../validation";
import type { BoardColumn, ColumnMetrics } from "./types";

/**
 * Parse FormData into an ItemMutation using Zod validation
 * @deprecated Use validation.ts schemas directly in board.$id.tsx
 */
export function parseItemMutation(formData: FormData): ItemMutation {
  const obj = formDataToObject(formData);
  return itemMutationSchema.parse(obj);
}

/**
 * Constants for board visualization
 */
export const BOARD_CONSTANTS = {
  MAX_VISIBLE_CARDS: 20,
  COLUMN_WIDTH_COLLAPSED: 40, // pixels
  PROGRESS_MAX_HEIGHT: 300, // pixels
  MOBILE_BASE_WIDTH: 10, // percentage
  MOBILE_MAX_ADDITIONAL_WIDTH: 90, // percentage
} as const;

/**
 * Calculate progress height for collapsed column
 */
export function calculateCollapseHeight(cardCount: number): number {
  const { MAX_VISIBLE_CARDS, COLUMN_WIDTH_COLLAPSED, PROGRESS_MAX_HEIGHT } =
    BOARD_CONSTANTS;
  const progressIncrement = PROGRESS_MAX_HEIGHT / MAX_VISIBLE_CARDS;
  const displayCount = Math.min(cardCount, MAX_VISIBLE_CARDS);
  return COLUMN_WIDTH_COLLAPSED + displayCount * progressIncrement;
}

/**
 * Calculate progress percentage for mobile view
 */
export function calculateProgressPercent(cardCount: number): number {
  const { MAX_VISIBLE_CARDS, MOBILE_BASE_WIDTH, MOBILE_MAX_ADDITIONAL_WIDTH } =
    BOARD_CONSTANTS;
  const displayCount = Math.min(cardCount, MAX_VISIBLE_CARDS);
  return (
    MOBILE_BASE_WIDTH +
    (displayCount / MAX_VISIBLE_CARDS) * MOBILE_MAX_ADDITIONAL_WIDTH
  );
}

/**
 * Calculate metrics for all columns (useful for memoization)
 */
export function calculateColumnMetrics(
  columns: BoardColumn[]
): ColumnMetrics[] {
  return columns.map((col) => {
    const cardCount = col.items.length;
    const displayCardCount = Math.min(cardCount, BOARD_CONSTANTS.MAX_VISIBLE_CARDS);
    return {
      id: col.id,
      cardCount,
      displayCardCount,
      progressPercent: calculateProgressPercent(cardCount),
      collapseHeight: calculateCollapseHeight(cardCount),
    };
  });
}
