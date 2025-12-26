import { useState } from "react";
import { KanbanColumn } from "~/components/KanbanColumn";
import { toast } from "sonner";

const CONTENT_TYPES = {
  card: "application/json+card",
  column: "application/json+column",
};

export interface BoardColumn {
  id: string;
  name: string;
  color?: string;
  order: number;
  isExpanded?: boolean;
}

export interface BoardItem {
  id: string;
  title: string;
  content?: string;
  columnId: string;
  order: number;
  assigneeId?: string | null;
}

export interface KanbanBoardProps {
  columns: BoardColumn[];
  items: BoardItem[];
  onMoveItem: (itemId: string, targetColumnId: string, order: number) => void;
  onMoveColumn?: (columnId: string, newOrder: number) => void;
  onAddItem: (columnId: string, title: string, content?: string) => void;
  onDeleteItem: (itemId: string) => void;
  onDeleteColumn?: (columnId: string) => void;
  onRenameColumn?: (columnId: string, newName: string) => void;
  onToggleExpanded?: (columnId: string) => void;
  deletingColumnId?: string;
  renamingColumnId?: string;
  boardId?: string;
  assignees?: Array<{ id: string; name: string }>;
}

export function KanbanBoard({
  columns,
  items,
  onMoveItem,
  onMoveColumn: _onMoveColumn,
  onAddItem,
  onDeleteItem,
  onDeleteColumn,
  onRenameColumn,
  onToggleExpanded,
  deletingColumnId,
  renamingColumnId,
  boardId,
  assignees = [],
}: KanbanBoardProps) {
  // Track drag state for column reordering
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<"left" | "right" | null>(
    null
  );

  const sortedColumns = [...columns].sort((a, b) => a.order - b.order);

  const handleColumnDragStart = (e: React.DragEvent, columnId: string) => {
    setDraggedColumnId(columnId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData(
      CONTENT_TYPES.column,
      JSON.stringify({ id: columnId })
    );
  };

  const handleColumnDragEnd = () => {
    setDraggedColumnId(null);
    setDragOverColumnId(null);
    setDropPosition(null);
  };

  const handleColumnDragOver = (e: React.DragEvent, columnId: string) => {
    // Handle both column and card drags
    if (
      !e.dataTransfer.types.includes(CONTENT_TYPES.column) &&
      !e.dataTransfer.types.includes(CONTENT_TYPES.card)
    )
      return;

    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";

    // If it's a card, just show glow effect
    if (e.dataTransfer.types.includes(CONTENT_TYPES.card)) {
      setDragOverColumnId(columnId);
      return;
    }

    // If it's a column, calculate left/right position
    const rect = e.currentTarget.getBoundingClientRect();
    const isHoveringLeft = e.clientX < rect.left + rect.width / 2;

    setDragOverColumnId(columnId);
    setDropPosition(isHoveringLeft ? "left" : "right");
  };

  const handleColumnDragLeave = (e: React.DragEvent) => {
    if (
      e.currentTarget === e.target ||
      !e.currentTarget.contains(e.relatedTarget as Node)
    ) {
      setDragOverColumnId(null);
      setDropPosition(null);
    }
  };

  const handleColumnDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    e.stopPropagation();

    setDragOverColumnId(null);
    setDropPosition(null);

    // Handle card drop
    if (e.dataTransfer.types.includes(CONTENT_TYPES.card)) {
      try {
        const cardData = JSON.parse(e.dataTransfer.getData(CONTENT_TYPES.card));
        const { id: cardId, columnId: sourceColumnId } = cardData;

        if (sourceColumnId === targetColumnId) return; // Same column, handled by column

        const newOrder = items.filter(
          (item) => item.columnId === targetColumnId
        ).length;
        onMoveItem(cardId, targetColumnId, newOrder);

        const targetCol = columns.find((c) => c.id === targetColumnId);
        if (targetCol && sourceColumnId !== targetColumnId) {
          toast.success(targetCol.name, {
            duration: 1500,
            icon: "✓",
          });
        }
      } catch (error) {
        console.error("[KanbanBoard] Error handling card drop:", error);
      }
      return;
    }

    // Handle column drop
    if (!e.dataTransfer.types.includes(CONTENT_TYPES.column)) return;

    try {
      const transfer = JSON.parse(e.dataTransfer.getData(CONTENT_TYPES.column));
      const draggedId = transfer.id;

      if (draggedId === targetColumnId || !_onMoveColumn) return;

      const draggedCol = columns.find((c) => c.id === draggedId);
      const targetCol = columns.find((c) => c.id === targetColumnId);

      if (!draggedCol || !targetCol) return;

      // Calculate new order based on drop position
      const isDroppedLeft = dropPosition === "left";
      const targetIndex = sortedColumns.findIndex(
        (c) => c.id === targetColumnId
      );

      let newOrder: number;
      if (isDroppedLeft) {
        const prevCol = sortedColumns[targetIndex - 1];
        if (prevCol) {
          newOrder = ((prevCol.order || 0) + (targetCol.order || 0)) / 2;
        } else {
          newOrder = (targetCol.order || 0) - 1;
        }
      } else {
        const nextCol = sortedColumns[targetIndex + 1];
        if (nextCol) {
          newOrder = ((targetCol.order || 0) + (nextCol.order || 0)) / 2;
        } else {
          newOrder = (targetCol.order || 0) + 1;
        }
      }

      _onMoveColumn(draggedId, newOrder);

      toast.success("Column reordered", {
        duration: 1500,
        icon: "↔️",
      });
    } catch (error) {
      console.error("[KanbanBoard] Error handling column drop:", error);
    }
  };

  return (
    <div
      className="flex gap-4 overflow-x-auto py-4 px-2"
      onDragEnd={handleColumnDragEnd}
    >
      {sortedColumns.map((column) => (
        <div
          key={column.id}
          className="relative"
          onDragOver={(e) => handleColumnDragOver(e, column.id)}
          onDragLeave={handleColumnDragLeave}
          onDrop={(e) => handleColumnDrop(e, column.id)}
        >
          {/* Left visual indicator line */}
          {dragOverColumnId === column.id && dropPosition === "left" && (
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 z-50 rounded-l pointer-events-none" />
          )}

          {/* Right visual indicator line */}
          {dragOverColumnId === column.id && dropPosition === "right" && (
            <div className="absolute right-0 top-0 bottom-0 w-1 bg-blue-500 z-50 rounded-r pointer-events-none" />
          )}

          {/* Glow effect when dragging over column */}
          {dragOverColumnId === column.id && draggedColumnId && (
            <div className="absolute inset-0 bg-blue-500/5 rounded-lg pointer-events-none transition-opacity" />
          )}

          <KanbanColumn
            id={column.id}
            name={column.name}
            color={column.color}
            items={items.filter((item) => item.columnId === column.id)}
            onAddItem={(title, content) => onAddItem(column.id, title, content)}
            onDeleteItem={(itemId) => onDeleteItem(itemId)}
            onDeleteColumn={
              onDeleteColumn ? () => onDeleteColumn(column.id) : undefined
            }
            onRenameColumn={
              onRenameColumn
                ? (newName) => onRenameColumn(column.id, newName)
                : undefined
            }
            isDeletingColumn={deletingColumnId === column.id}
            isRenamingColumn={renamingColumnId === column.id}
            boardId={boardId}
            assignees={assignees}
            isExpanded={column.isExpanded !== false}
            onToggleExpanded={
              onToggleExpanded ? () => onToggleExpanded(column.id) : undefined
            }
            onColumnDragStart={(e) => handleColumnDragStart(e, column.id)}
            onMoveItem={onMoveItem}
          />
        </div>
      ))}
    </div>
  );
}
