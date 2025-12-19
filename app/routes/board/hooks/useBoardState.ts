import { useState } from "react";
import { useSubmit } from "react-router";
import { INTENTS } from "../../types";
import type { Column } from "@prisma/client";

interface UseBoardStateOptions {
  columns: Column[];
}

interface UseBoardStateResult {
  expandedColumnIds: Set<string>;
  handleColumnToggle: (columnId: string) => void;
  draggedColumnId: string | null;
  setDraggedColumnId: (id: string | null) => void;
}

/**
 * Manages board UI state including column expand/collapse and drag state
 */
export function useBoardState({
  columns,
}: UseBoardStateOptions): UseBoardStateResult {
  const submit = useSubmit();
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  // Initialize expanded columns from database values immediately (prevents visual shift)
  const [expandedColumnIds, setExpandedColumnIds] = useState<Set<string>>(
    () =>
      new Set(
        columns.filter((col) => col.isExpanded !== false).map((col) => col.id)
      )
  );

  const handleColumnToggle = (columnId: string) => {
    const willBeExpanded = !expandedColumnIds.has(columnId);

    // Update local state immediately for responsive UI
    setExpandedColumnIds((prev) => {
      const updated = new Set(prev);
      if (updated.has(columnId)) {
        updated.delete(columnId);
      } else {
        updated.add(columnId);
      }
      return updated;
    });

    // Update database
    submit(
      {
        intent: INTENTS.updateColumn,
        columnId,
        isExpanded: willBeExpanded ? "1" : "0",
      },
      {
        method: "post",
        navigate: false,
      }
    );
  };

  return {
    expandedColumnIds,
    handleColumnToggle,
    draggedColumnId,
    setDraggedColumnId,
  };
}
