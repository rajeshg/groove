import { useRef, useState, useEffect, useMemo } from "react";
import invariant from "tiny-invariant";
import { useFetchers, useSubmit } from "react-router";

import {
  INTENTS,
  type RenderedItem,
  type RenderedAssignee,
  CONTENT_TYPES,
} from "../types";
import type { Column as ColumnType, Item } from "@prisma/client";
import type { getBoardData } from "../queries";

type ColumnWithItems = ColumnType & {
  items: Array<Item & { Assignee: RenderedAssignee | null }>;
  order: number;
};
import { Column } from "./column";
import { NewColumn } from "./new-column";
import { BoardHeader } from "./board-header";
import "./columns.css";

// Constants for proportional calculation of collapsed column height
const MAX_VISIBLE_CARDS = 20;
const COLUMN_WIDTH_COLLAPSED = 40; // pixels
const PROGRESS_MAX_HEIGHT = 300; // pixels
const PROGRESS_INCREMENT = PROGRESS_MAX_HEIGHT / MAX_VISIBLE_CARDS; // pixels per card

type BoardData = NonNullable<Awaited<ReturnType<typeof getBoardData>>>;

interface BoardProps {
  board: BoardData;
}

export default function Board({ board }: BoardProps) {
  let submit = useSubmit();
  let [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  let [expandedColumnIds, setExpandedColumnIds] = useState<Set<string>>(
    new Set()
  );
  let [searchTerm, setSearchTerm] = useState("");
  let addCardCallbackRef = useRef<(() => void) | null>(null);

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
        `board-${board.id}-expanded`,
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

  // Initialize expanded columns from database on mount
  useEffect(() => {
    const expandedFromDB = board.columns
      .filter((col: ColumnType) => col.isExpanded !== false)
      .map((col: ColumnType) => col.id);

    setExpandedColumnIds(new Set(expandedFromDB));
    // Also save to localStorage for quick access
    localStorage.setItem(
      `board-${board.id}-expanded`,
      JSON.stringify(expandedFromDB)
    );
  }, [board.columns, board.id]);

  // Handle 'c' key to open "add a card" dialog on the column with shortcut "c"
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger on 'c' key, not when typing in input fields
      if (
        e.key === "c" &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(
          e.target instanceof HTMLDivElement &&
          (e.target as HTMLElement).closest('[role="textbox"]')
        )
      ) {
        e.preventDefault();
        e.stopPropagation();
        // Find the column with shortcut "c" and trigger its callback
        const shortcutColumn = board.columns.find(
          (col: ColumnType) => col.shortcut === "c"
        );
        if (shortcutColumn && addCardCallbackRef.current) {
          addCardCallbackRef.current();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [board.columns, addCardCallbackRef]);

  let itemsById = new Map(board.items.map((item: Item) => [item.id, item]));

  let pendingItems = usePendingItems();

  // merge pending items and existing items
  for (const pendingItem of pendingItems) {
    let item = itemsById.get(pendingItem.id);
    let merged = item
      ? ({ ...item, ...pendingItem } as unknown as Item)
      : ({
          ...pendingItem,
          boardId: board.id,
          _count: { comments: 0 },
        } as unknown as Item);
    itemsById.set(pendingItem.id, merged);
  }

  // merge pending and existing columns
  let optAddingColumns = usePendingColumns();
  let columns = new Map<string, unknown>();
  for (let column of [...board.columns, ...optAddingColumns]) {
    columns.set(column.id, {
      ...column,
      items: [],
      order: (column as unknown as { order?: number }).order || 0,
    });
  }

  // add items to their columns
  for (const item of itemsById.values()) {
    let columnId = (item as RenderedItem).columnId;
    let column = columns.get(columnId) as ColumnWithItems;
    invariant(column, "missing column");
    column.items.push(item as Item & { Assignee: RenderedAssignee | null });
  }

  // scroll right when new columns are added
  let scrollContainerRef = useRef<HTMLDivElement>(null);
  function scrollRight() {
    invariant(scrollContainerRef.current, "no scroll container");
    scrollContainerRef.current.scrollLeft =
      scrollContainerRef.current.scrollWidth;
  }

  // Get sorted columns for rendering
  const columnArray = useMemo(() => {
    const sorted = [...(columns as Map<string, ColumnWithItems>).values()].sort(
      (a, b) => (a.order || 0) - (b.order || 0)
    );

    if (!searchTerm) return sorted;

    const lowerSearchTerm = searchTerm.toLowerCase();
    return sorted.map((col) => ({
      ...col,
      items: col.items.filter(
        (item: Item) =>
          item.title.toLowerCase().includes(lowerSearchTerm) ||
          (item.content && item.content.toLowerCase().includes(lowerSearchTerm))
      ),
    }));
  }, [columns, searchTerm]);

  return (
    <div className="flex-1 flex flex-col relative bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 min-h-full">
      {/* Top color accent stripe - high visibility */}
      <div
        className="h-1 w-full flex-shrink-0 sticky top-14 z-50"
        style={{ background: board.color }}
      />

      <div className="sticky top-[60px] z-40 bg-white dark:bg-slate-900 shadow-sm">
        <BoardHeader searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
      </div>

      {/* Canvas area */}
      <div
        className="flex-1 w-full overflow-x-auto relative flex flex-col"
        ref={scrollContainerRef}
      >
        {/* Left color accent bar - spans the whole scrollable height */}
        <div
          className="w-1.5 absolute top-0 bottom-0 left-0"
          style={{
            background: board.color,
            opacity: 0.5,
            zIndex: 0,
          }}
        />

        <div
          className="flex w-max items-stretch gap-2 px-8 pb-10 pt-4 relative z-10"
          onDragEnd={() => {
            // Reset all drag states when any drag ends
            setDraggedColumnId(null);
          }}
        >
          {columnArray.map((col) => {
            const isExpanded = expandedColumnIds.has(col.id);

            return (
              <div
                key={col.id}
                data-column-name={col.name}
                data-expanded={isExpanded ? "true" : "false"}
                className={`transition-all duration-300 ease-out relative self-stretch column-${col.name
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/^-|-$/g, "")} ${
                  isExpanded ? "w-[24rem]" : "w-10"
                } ${draggedColumnId === col.id ? "shadow-xl scale-105 opacity-50" : ""}`}
                title={
                  isExpanded
                    ? "Drag to reorder column"
                    : `Expand ${col.name} (${col.items.length} cards)`
                }
                draggable={isExpanded}
                style={{
                  overflow: isExpanded ? "visible" : "visible",
                }}
              >
                {isExpanded ? (
                  // Expanded column - full width with content
                  <div
                    className="h-full cursor-grab active:cursor-grabbing"
                    draggable="true"
                    onDragStart={(e) => {
                      setDraggedColumnId(col.id);
                      e.dataTransfer!.effectAllowed = "move";
                      e.dataTransfer!.setData(
                        CONTENT_TYPES.column,
                        JSON.stringify({ id: col.id, name: col.name })
                      );
                    }}
                    onDragEnd={() => {
                      setDraggedColumnId(null);
                    }}
                    onDragOver={(e) => {
                      if (e.dataTransfer.types.includes(CONTENT_TYPES.column)) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.dataTransfer.dropEffect = "move";
                      }
                    }}
                    onDrop={(e) => {
                      if (
                        !e.dataTransfer.types.includes(CONTENT_TYPES.column)
                      ) {
                        return;
                      }

                      e.preventDefault();
                      e.stopPropagation();

                      try {
                        const transfer = JSON.parse(
                          e.dataTransfer.getData(CONTENT_TYPES.column)
                        );
                        const draggedId = transfer.id;

                        if (draggedId === col.id) {
                          setDraggedColumnId(null);
                          return;
                        }

                        const draggedCol = columnArray.find(
                          (c) => c.id === draggedId
                        );
                        if (!draggedCol) return;

                        const rect = e.currentTarget.getBoundingClientRect();
                        const isDroppedLeft =
                          e.clientX < rect.left + rect.width / 2;

                        let newOrder: number;
                        if (isDroppedLeft) {
                          const prevCol =
                            columnArray[columnArray.indexOf(col) - 1];
                          if (prevCol) {
                            newOrder =
                              ((prevCol.order || 0) + (col.order || 0)) / 2;
                          } else {
                            newOrder = (col.order || 0) - 1;
                          }
                        } else {
                          const nextCol =
                            columnArray[columnArray.indexOf(col) + 1];
                          if (nextCol) {
                            newOrder =
                              ((col.order || 0) + (nextCol.order || 0)) / 2;
                          } else {
                            newOrder = (col.order || 0) + 1;
                          }
                        }

                        submit(
                          {
                            intent: INTENTS.moveColumn,
                            id: draggedId,
                            order: String(newOrder),
                          },
                          {
                            method: "post",
                            navigate: false,
                            fetcherKey: `column:${draggedId}`,
                          }
                        );

                        setDraggedColumnId(null);
                      } catch (error) {
                        console.error("Error handling column drop:", error);
                      }
                    }}
                  >
                    <Column
                      name={col.name}
                      columnId={col.id}
                      items={col.items}
                      color={
                        (col as unknown as { color?: string }).color ||
                        "#94a3b8"
                      }
                      isDefault={
                        (col as unknown as { isDefault?: boolean }).isDefault ||
                        false
                      }
                      isExpanded={true}
                      onToggle={() => handleColumnToggle(col.id)}
                      boardName={board.name}
                      boardId={board.id}
                      className="h-full"
                      shortcut={col.shortcut || undefined}
                      onAddCardKeydown={
                        col.shortcut === "c"
                          ? (callback) => {
                              addCardCallbackRef.current = callback;
                            }
                          : undefined
                      }
                    />
                  </div>
                ) : (
                  // Collapsed column - Fizzy-inspired candy pop look
                  <button
                    onClick={() => handleColumnToggle(col.id)}
                    className="column-collapsed"
                    style={
                      {
                        color:
                          (col as unknown as { color?: string }).color ||
                          "#94a3b8",
                        "--collapse-height": `${COLUMN_WIDTH_COLLAPSED + Math.min(col.items.length, MAX_VISIBLE_CARDS) * PROGRESS_INCREMENT}px`,
                      } as Record<string, unknown>
                    }
                    title={`Click to expand "${col.name}" (${col.items.length} cards)`}
                  >
                    {/* Content - badge and name on top of progress bar */}
                    <div
                      className="column-collapsed-content"
                      style={{
                        height: `${COLUMN_WIDTH_COLLAPSED + Math.min(col.items.length, MAX_VISIBLE_CARDS) * PROGRESS_INCREMENT}px`,
                      }}
                    >
                      {/* Card count badge */}
                      <div className="column-collapsed-count">
                        {Math.min(col.items.length, MAX_VISIBLE_CARDS)}
                      </div>

                      {/* Vertical title text */}
                      <span className="column-collapsed-title">{col.name}</span>
                    </div>
                  </button>
                )}
              </div>
            );
          })}

          <NewColumn
            boardId={board.id}
            onAdd={scrollRight}
            editInitially={board.columns.length === 0}
          />

          {/* trolling you to add some extra margin to the right of the container with a whole dang div */}
          <div data-lol className="w-8 h-1 flex-shrink-0" />
        </div>
      </div>
    </div>
  );
}

// These are the inflight columns that are being created, instead of managing
// state ourselves, we just ask Remix for the state
function usePendingColumns() {
  type CreateColumnFetcher = ReturnType<typeof useFetchers>[number] & {
    formData: FormData;
  };

  return useFetchers()
    .filter((fetcher): fetcher is CreateColumnFetcher => {
      return fetcher.formData?.get("intent") === INTENTS.createColumn;
    })
    .map((fetcher) => {
      let name = String(fetcher.formData.get("name"));
      let id = String(fetcher.formData.get("id"));
      return { name, id };
    });
}

// These are the inflight items that are being created or moved, instead of
// managing state ourselves, we just ask Remix for the state
function usePendingItems() {
  type PendingItem = ReturnType<typeof useFetchers>[number] & {
    formData: FormData;
  };
  return useFetchers()
    .filter((fetcher): fetcher is PendingItem => {
      if (!fetcher.formData) return false;
      let intent = fetcher.formData.get("intent");
      return intent === INTENTS.createItem || intent === INTENTS.moveItem;
    })
    .map((fetcher) => {
      let columnId = String(fetcher.formData.get("columnId"));
      let title = String(fetcher.formData.get("title"));
      let id = String(fetcher.formData.get("id"));
      let order = Number(fetcher.formData.get("order"));
      let item: RenderedItem = {
        title,
        id,
        order,
        columnId,
        content: null,
        createdBy: null,
        assigneeId: null,
        Assignee: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActiveAt: new Date(),
        boardId: 0,
      };
      return item;
    });
}
