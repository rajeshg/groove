import { useRef, useState, useEffect } from "react";
import invariant from "tiny-invariant";
import { useFetchers, useLoaderData, useSubmit } from "react-router";

import type { LoaderData } from "../../+types/board.$id";
import { INTENTS, type RenderedItem, CONTENT_TYPES } from "../types";
import { Column } from "./column";
import { NewColumn } from "./new-column";
import { EditableText } from "./components";
import "./columns.css";

// Constants for proportional calculation of collapsed column height
const MAX_VISIBLE_CARDS = 20;
const COLUMN_WIDTH_COLLAPSED = 40; // pixels
const PROGRESS_MAX_HEIGHT = 300; // pixels
const PROGRESS_INCREMENT = PROGRESS_MAX_HEIGHT / MAX_VISIBLE_CARDS; // pixels per card

export function Board() {
  let { board } = useLoaderData<LoaderData>();
  let submit = useSubmit();
  let [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  let [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  let [expandedColumnIds, setExpandedColumnIds] = useState<Set<string>>(
    new Set()
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
      .filter((col) => (col as any).isExpanded !== false)
      .map((col) => col.id);

    setExpandedColumnIds(new Set(expandedFromDB));
    // Also save to localStorage for quick access
    localStorage.setItem(
      `board-${board.id}-expanded`,
      JSON.stringify(expandedFromDB)
    );
  }, []);

  let itemsById = new Map(board.items.map((item) => [item.id, item]));

  let pendingItems = usePendingItems();

  // merge pending items and existing items
  for (const pendingItem of pendingItems) {
    let item = itemsById.get(pendingItem.id);
    let merged: any = item
      ? { ...item, ...pendingItem }
      : { ...pendingItem, boardId: board.id };
    itemsById.set(pendingItem.id, merged);
  }

  // merge pending and existing columns
  let optAddingColumns = usePendingColumns();
  type Column =
    | (typeof board.columns)[number]
    | (typeof optAddingColumns)[number];
  type ColumnWithItems =
    | (Column & { items: typeof board.items })
    | (Column & { items: typeof board.items; order: number });
  let columns = new Map<string, any>();
  for (let column of [...board.columns, ...optAddingColumns]) {
    columns.set(column.id, {
      ...column,
      items: [],
      order: (column as any).order || 0,
    });
  }

  // add items to their columns
  for (const item of itemsById.values()) {
    let columnId = (item as any).columnId;
    let column = columns.get(columnId);
    invariant(column, "missing column");
    column.items.push(item as any);
  }

  // scroll right when new columns are added
  let scrollContainerRef = useRef<HTMLDivElement>(null);
  function scrollRight() {
    invariant(scrollContainerRef.current, "no scroll container");
    scrollContainerRef.current.scrollLeft =
      scrollContainerRef.current.scrollWidth;
  }

  // Get sorted columns for rendering
  const columnArray = [...columns.values()].sort(
    (a, b) => (a.order || 0) - (b.order || 0)
  );

  return (
    <div className="min-h-screen h-full flex flex-col relative bg-white dark:bg-slate-900">
      {/* Top color accent stripe - shows board theme color */}
      <div
        className="h-1 w-full flex-shrink-0"
        style={{ background: board.color }}
      />

      <h1>
        <EditableText
          value={board.name}
          fieldName="name"
          inputClassName="mx-8 my-4 text-2xl font-medium border border-slate-400 rounded-lg py-1 px-2 text-black"
          buttonClassName="mx-8 my-4 text-2xl font-medium block rounded-lg text-left border border-transparent py-1 px-2 text-slate-800"
          buttonLabel={`Edit board "${board.name}" name`}
          inputLabel="Edit board name"
          placeholder="Board name..."
          hiddenFields={{
            intent: INTENTS.updateBoardName,
            id: String(board.id),
          }}
        >
          <></>
        </EditableText>
      </h1>

      {/* Canvas area with creative background color visualization */}
      <div
        className="flex-1 w-full overflow-x-scroll overflow-y-visible relative flex flex-col"
        ref={scrollContainerRef}
      >
        {/* Left color accent bar - vertical stripe showing board color */}
        <div
          className="w-1 flex-shrink-0"
          style={{
            background: board.color,
            opacity: 0.2,
          }}
        />

        {/* Subtle gradient footer below columns - fades board color at bottom */}
        <div
          className="absolute inset-0 pointer-events-none bottom-0 left-0 right-0"
          style={{
            background: `linear-gradient(to bottom, transparent 0%, ${board.color}05 60%, ${board.color}12 100%)`,
          }}
        />

        <div
          className="flex w-max min-h-0 items-start gap-2 px-8 pb-4 pt-4 relative z-10"
          onDragEnd={() => {
            // Reset all drag states when any drag ends
            setDraggedCardId(null);
            setDraggedColumnId(null);
          }}
        >
          {columnArray.map((col) => {
            const isExpanded = expandedColumnIds.has(col.id);

            return (
              <div
                key={col.id}
                className={`transition-all duration-300 ease-out relative ${
                  isExpanded ? "w-[24rem]" : "w-10 h-full"
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
                      color={(col as any).color || "#94a3b8"}
                      isDefault={(col as any).isDefault || false}
                      isExpanded={true}
                      onToggle={() => handleColumnToggle(col.id)}
                      boardName={board.name}
                      boardId={board.id}
                    />
                  </div>
                ) : (
                  // Collapsed column - Fizzy-inspired candy pop look
                  <button
                    onClick={() => handleColumnToggle(col.id)}
                    className="column-collapsed"
                    style={
                      {
                        color: (col as any).color || "#94a3b8",
                        "--collapse-height": `${COLUMN_WIDTH_COLLAPSED + Math.min(col.items.length, MAX_VISIBLE_CARDS) * PROGRESS_INCREMENT}px`,
                      } as any
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
        assignedTo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActiveAt: new Date(),
      };
      return item;
    });
}
