import * as React from "react";
import { useState, useRef } from "react";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { KanbanCard } from "~/components/KanbanCard";
import {
  Plus,
  Minimize2,
  GripVertical,
  MoreVertical,
  Edit2,
  Trash2,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

const CONTENT_TYPES = {
  card: "application/json+card",
  column: "application/json+column",
};

export interface ColumnItem {
  id: string;
  title: string;
  content?: string;
  order: number;
  assigneeId?: string | null;
  createdBy?: string | null;
  createdByUser?: {
    id: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
  createdAt?: string;
  updatedAt?: string;
  lastActiveAt?: string;
}

export interface KanbanColumnProps {
  id: string;
  name: string;
  color?: string;
  items: ColumnItem[];
  onAddItem: (title: string, content?: string) => void;
  onDeleteItem: (itemId: string) => void;
  onDeleteColumn?: () => void;
  isDeletingColumn?: boolean;
  onRenameColumn?: (newName: string) => void;
  isRenamingColumn?: boolean;
  boardId?: string;
  assignees?: Array<{ id: string; name: string }>;
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
  onColumnDragStart?: (e: React.DragEvent) => void;
  onMoveItem: (itemId: string, targetColumnId: string, order: number) => void;
}

export function KanbanColumn({
  id,
  name,
  color,
  items,
  onAddItem,
  onDeleteItem,
  onDeleteColumn,
  isDeletingColumn = false,
  onRenameColumn,
  isRenamingColumn = false,
  boardId,
  assignees = [],
  isExpanded = true,
  onToggleExpanded,
  onColumnDragStart: _onColumnDragStart,
  onMoveItem: _onMoveItem,
}: KanbanColumnProps) {
  const navigate = useNavigate();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemContent, setNewItemContent] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [editedName, setEditedName] = useState(name);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);

  const titleInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemTitle.trim()) {
      onAddItem(newItemTitle, newItemContent);
      setNewItemTitle("");
      setNewItemContent("");
      // Show success toast
      toast.success("Card added successfully");
      // Keep form open for quick card addition - auto-focus title field using ref
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 0);
    }
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editedName.trim() && editedName !== name && onRenameColumn) {
      onRenameColumn(editedName);
      setIsRenaming(false);
    }
  };

  const sortedItems = [...items].sort((a, b) => a.order - b.order);

  // Calculate collapse height based on card count (like Groove)
  const MAX_VISIBLE_CARDS = 20;
  const COLUMN_WIDTH_COLLAPSED = 48;
  const PROGRESS_MAX_HEIGHT = 300;
  const progressIncrement = PROGRESS_MAX_HEIGHT / MAX_VISIBLE_CARDS;
  const displayCount = Math.min(sortedItems.length, MAX_VISIBLE_CARDS);
  const collapseHeight =
    COLUMN_WIDTH_COLLAPSED + displayCount * progressIncrement;

  // Get contrast text color for the badge using WCAG 2.0 formula
  const getContrastTextColor = (hexColor: string) => {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);

    // Apply gamma correction (WCAG 2.0 formula)
    const [rs, gs, bs] = [r, g, b].map((c) => {
      const channel = c / 255;
      return channel <= 0.03928
        ? channel / 12.92
        : Math.pow((channel + 0.055) / 1.055, 2.4);
    });

    // Calculate relative luminance
    const luminance = 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;

    // Use white text for dark backgrounds, black for light backgrounds
    return luminance > 0.5 ? "#000000" : "#ffffff";
  };

  // Collapsed view
  if (!isExpanded) {
    return (
      <button
        onClick={() => {
          if (onToggleExpanded) {
            onToggleExpanded();
          }
        }}
        className="column-collapsed"
        style={
          {
            color: color || "#94a3b8",
            width: "48px",
            "--collapse-height": `${collapseHeight}px`,
            "--text-color": getContrastTextColor(color || "#94a3b8"),
          } as React.CSSProperties & {
            "--collapse-height": string;
            "--text-color": string;
          }
        }
        title={`Click to expand "${name}" (${sortedItems.length} cards)`}
      >
        {/* Content - badge and name on top of progress bar */}
        <div
          className="column-collapsed-content"
          style={{
            height: `${collapseHeight}px`,
          }}
        >
          {/* Card count badge */}
          <div className="column-collapsed-count">{displayCount}</div>

          {/* Vertical title text */}
          <span className="column-collapsed-title">{name}</span>
        </div>
      </button>
    );
  }

  // Expanded view
  return (
    <div
      className={`flex flex-col h-full rounded-lg p-4 min-w-80 shadow-sm transition-all bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 hover:shadow-md`}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes(CONTENT_TYPES.card)) return;
        e.preventDefault();
        e.stopPropagation();
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) {
          setDragOverItemId(null);
        }
      }}
      onDrop={(e) => {
        if (!e.dataTransfer.types.includes(CONTENT_TYPES.card)) return;
        e.preventDefault();
        e.stopPropagation();

        setDragOverItemId(null);

        try {
          const cardData = JSON.parse(
            e.dataTransfer.getData(CONTENT_TYPES.card)
          );
          const { id: cardId, columnId: sourceColumnId } = cardData;

          if (cardId === dragOverItemId) return;

          let newOrder: number;
          if (dragOverItemId) {
            const targetItem = sortedItems.find((i) => i.id === dragOverItemId);
            if (targetItem) {
              const nextItem =
                sortedItems[
                  sortedItems.findIndex((i) => i.id === dragOverItemId) + 1
                ];
              if (nextItem) {
                newOrder = (targetItem.order + nextItem.order) / 2;
              } else {
                newOrder = targetItem.order + 1;
              }
            } else {
              newOrder = items.length;
            }
          } else {
            newOrder = items.length;
          }
          _onMoveItem(cardId, id, newOrder);

          if (sourceColumnId !== id) {
            toast.success(`Moved to ${name}`, {
              duration: 1500,
              icon: "✓",
            });
          }
        } catch (error) {
          console.error("[KanbanColumn] Error handling card drop:", error);
        }
      }}
    >
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex-shrink-0">
          {isExpanded && (
            <div
              className="cursor-grab active:cursor-grabbing p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
              draggable="true"
              onDragStart={_onColumnDragStart}
              title="Drag to reorder column"
              aria-label="Drag to reorder column"
            >
              <GripVertical size={16} />
            </div>
          )}
        </div>

        <div className="flex-1 flex items-center justify-center gap-2 min-w-0">
          {color && (
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: color }}
            />
          )}
          {isRenaming ? (
            <form onSubmit={handleRenameSubmit} className="flex gap-2">
              <Input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="text-sm font-semibold h-6"
                autoFocus
                disabled={isRenamingColumn}
              />
              <Button
                type="submit"
                size="sm"
                disabled={
                  isRenamingColumn || !editedName.trim() || editedName === name
                }
                className="h-6 px-2"
              >
                Save
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsRenaming(false);
                  setEditedName(name);
                }}
                className="h-6 px-2"
              >
                Cancel
              </Button>
            </form>
          ) : (
            <>
              <h3
                className="font-bold text-sm uppercase tracking-wider text-slate-900 dark:text-slate-50 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                onClick={() => {
                  if (boardId) {
                    navigate({
                      to: "/boards/$boardId/columns/$columnId",
                      params: { boardId, columnId: id },
                    });
                  }
                }}
                title="Click to view column details"
              >
                {name}
              </h3>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {sortedItems.length}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {!isRenaming && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                >
                  <MoreVertical size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsRenaming(true)}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  <span>Rename Column</span>
                </DropdownMenuItem>
                {onToggleExpanded && (
                  <DropdownMenuItem onClick={onToggleExpanded}>
                    <Minimize2 className="mr-2 h-4 w-4" />
                    <span>Collapse Column</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {onDeleteColumn && (
                  <DropdownMenuItem
                    onClick={onDeleteColumn}
                    disabled={isDeletingColumn}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Delete Column</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto min-h-[300px]">
        {sortedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl opacity-50">
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
              No cards here
            </p>
          </div>
        ) : (
          sortedItems.map((item, index) => {
            const assignee = item.assigneeId
              ? assignees.find((a) => a.id === item.assigneeId) || null
              : null;

            return (
              <div
                key={item.id}
                onDragOver={(e) => {
                  if (!e.dataTransfer.types.includes(CONTENT_TYPES.card))
                    return;
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOverItemId(item.id);
                }}
                onDragLeave={(e) => {
                  if (e.currentTarget === e.target) {
                    setDragOverItemId(null);
                  }
                }}
                onDrop={(e) => {
                  if (!e.dataTransfer.types.includes(CONTENT_TYPES.card))
                    return;
                  e.preventDefault();
                  setDragOverItemId(null);

                  try {
                    const cardData = JSON.parse(
                      e.dataTransfer.getData(CONTENT_TYPES.card)
                    );
                    const { id: draggedId, columnId: sourceColumnId } =
                      cardData;

                    if (draggedId === item.id) return;

                    const draggedItem = sortedItems.find(
                      (i) => i.id === draggedId
                    );
                    if (draggedItem) {
                      e.stopPropagation();
                      const draggedIndex = sortedItems.findIndex(
                        (i) => i.id === draggedId
                      );
                      const targetIndex = index;
                      if (draggedIndex === -1) return;

                      let newOrder: number;
                      if (draggedIndex < targetIndex) {
                        const nextItem = sortedItems[targetIndex + 1];
                        if (nextItem) {
                          newOrder = (item.order + nextItem.order) / 2;
                        } else {
                          newOrder = item.order + 1;
                        }
                      } else {
                        const prevItem = sortedItems[targetIndex - 1];
                        if (prevItem) {
                          newOrder = (prevItem.order + item.order) / 2;
                        } else {
                          newOrder = item.order - 1;
                        }
                      }
                      _onMoveItem(draggedId, id, newOrder);
                    } else if (sourceColumnId !== id) {
                      e.stopPropagation();
                      const prevItem = sortedItems[index - 1];
                      let newOrder: number;
                      if (prevItem) {
                        newOrder = (prevItem.order + item.order) / 2;
                      } else {
                        newOrder = item.order - 1;
                      }
                      _onMoveItem(draggedId, id, newOrder);
                      toast.success(`Moved to ${name}`, {
                        duration: 1500,
                        icon: "✓",
                      });
                    }
                  } catch (error) {
                    console.error("[KanbanColumn] Error handling drop:", error);
                  }
                }}
                className={`relative ${dragOverItemId === item.id ? "border-t-2 border-blue-500" : ""}`}
              >
                <KanbanCard
                  id={item.id}
                  title={item.title}
                  content={item.content}
                  order={item.order}
                  onDelete={() => onDeleteItem(item.id)}
                  boardId={boardId}
                  columnId={id}
                  columnName={name}
                  assignee={assignee}
                  createdBy={item.createdBy}
                  createdByUser={item.createdByUser}
                  createdAt={item.createdAt}
                  updatedAt={item.updatedAt}
                  lastActiveAt={item.lastActiveAt}
                  columnColor={color}
                />
              </div>
            );
          })
        )}
      </div>

      {showAddForm ? (
        <Card className="mt-3 p-3 bg-white dark:bg-slate-800">
          <form onSubmit={handleSubmit} className="space-y-2">
            <Input
              ref={titleInputRef}
              type="text"
              placeholder="Card title..."
              value={newItemTitle}
              onChange={(e) => setNewItemTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  setShowAddForm(false);
                  setNewItemTitle("");
                  setNewItemContent("");
                }
              }}
              className="text-sm"
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                type="submit"
                size="sm"
                disabled={!newItemTitle.trim()}
                className="flex-1"
              >
                Add Card
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAddForm(false);
                  setNewItemTitle("");
                  setNewItemContent("");
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <Button
          onClick={() => setShowAddForm(true)}
          variant="outline"
          className="mt-3 w-full justify-start text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
        >
          <Plus size={18} className="mr-2" />
          Add a card
        </Button>
      )}
    </div>
  );
}
