import { useState, useEffect } from "react";
import { useSubmit } from "react-router";
import { INTENTS } from "../../types";
import type { Column } from "@prisma/client";

interface UseBoardStateOptions {
  boardId: number;
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
  boardId,
  columns,
}: UseBoardStateOptions): UseBoardStateResult {
  const submit = useSubmit();
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  const [expandedColumnIds, setExpandedColumnIds] = useState<Set<string>>(
    new Set()
  );

  // Initialize expanded columns from database on mount
  useEffect(() => {
    const expandedFromDB = columns
      .filter((col) => col.isExpanded !== false)
      .map((col) => col.id);

    setExpandedColumnIds(new Set(expandedFromDB));
    // Also save to localStorage for quick access
    localStorage.setItem(
      `board-${boardId}-expanded`,
      JSON.stringify(expandedFromDB)
    );
  }, [columns, boardId]);

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
      // Save to localStorage
      localStorage.setItem(
        `board-${boardId}-expanded`,
        JSON.stringify(Array.from(updated))
      );
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
