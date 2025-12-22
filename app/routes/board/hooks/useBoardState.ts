import { useState, useMemo } from "react";
import { useSubmit } from "react-router";
import { INTENTS } from "../../types";
import type { Column } from "../../../../prisma/client";

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

  // Store optimistic overrides (temporary UI state before server confirms)
  const [optimisticOverrides, setOptimisticOverrides] = useState<
    Map<string, boolean>
  >(new Map());

  // Derive expanded state from server data + optimistic overrides
  const expandedColumnIds = useMemo(() => {
    const expanded = new Set<string>();
    columns.forEach((col) => {
      // Check if there's an optimistic override for this column
      const hasOverride = optimisticOverrides.has(col.id);
      const isExpanded = hasOverride
        ? optimisticOverrides.get(col.id)!
        : col.isExpanded !== false;

      if (isExpanded) {
        expanded.add(col.id);
      }
    });
    return expanded;
  }, [columns, optimisticOverrides]);

  const handleColumnToggle = (columnId: string) => {
    const willBeExpanded = !expandedColumnIds.has(columnId);

    // Add optimistic override for instant UI feedback
    setOptimisticOverrides((prev) => {
      const updated = new Map(prev);
      updated.set(columnId, willBeExpanded);
      return updated;
    });

    // Update database - React Router will revalidate and update server state
    submit(
      {
        intent: INTENTS.updateColumn,
        columnId,
        isExpanded: willBeExpanded ? "1" : "0",
      },
      {
        method: "post",
        action: "/resources/update-column",
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
