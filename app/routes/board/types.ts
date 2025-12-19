import type { Column, Item } from "@prisma/client";
import type { RenderedAssignee } from "../types";

/**
 * A column with its items properly typed
 */
export type BoardColumn = Column & {
  items: Array<Item & { Assignee: RenderedAssignee | null }>;
  order: number;
  color: string;
  isDefault: boolean;
};

/**
 * Column metrics for rendering collapsed/mobile views
 */
export interface ColumnMetrics {
  id: string;
  cardCount: number;
  displayCardCount: number; // Capped at MAX_VISIBLE_CARDS
  progressPercent: number;
  collapseHeight: number;
}
