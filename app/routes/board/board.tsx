import { useRef, useState, useMemo } from "react";
import invariant from "tiny-invariant";
import { useSubmit, Link } from "react-router";

import { INTENTS, CONTENT_TYPES } from "../types";
import type { getBoardData } from "../queries";

import { Column } from "./column";
import { NewColumn } from "./new-column";
import { BoardHeader } from "./board-header";
import { useBoardData } from "./hooks/useBoardData";
import { useBoardState } from "./hooks/useBoardState";
import { useBoardKeyboardShortcuts } from "./hooks/useBoardKeyboardShortcuts";
import { calculateColumnMetrics } from "./utils";
import "./columns.css";

// Note: BOARD_CONSTANTS are available but not currently used in this component

type BoardData = NonNullable<Awaited<ReturnType<typeof getBoardData>>>;

interface BoardProps {
  board: BoardData;
}

export default function Board({ board }: BoardProps) {
  const submit = useSubmit();
  const [searchTerm, setSearchTerm] = useState("");
  const addCardCallbackRef = useRef<(() => void) | null>(null);

  // Use custom hooks for state management
  const {
    expandedColumnIds,
    handleColumnToggle,
    draggedColumnId,
    setDraggedColumnId,
  } = useBoardState({ boardId: board.id, columns: board.columns });

  useBoardKeyboardShortcuts({ columns: board.columns, addCardCallbackRef });

  // Use custom hook for data merging (pending items/columns + search filtering)
  const { columnArray } = useBoardData(board, searchTerm);

  // Memoize column metrics calculations for performance
  const columnMetrics = useMemo(
    () => calculateColumnMetrics(columnArray),
    [columnArray]
  );
  const metricsById = useMemo(
    () => new Map(columnMetrics.map((m) => [m.id, m])),
    [columnMetrics]
  );

  // scroll right when new columns are added
  let scrollContainerRef = useRef<HTMLDivElement>(null);
  function scrollRight() {
    invariant(scrollContainerRef.current, "no scroll container");
    scrollContainerRef.current.scrollLeft =
      scrollContainerRef.current.scrollWidth;
  }

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

      {/* Canvas area - Desktop view (hidden on mobile) */}
      <div
        className="hidden md:flex flex-1 w-full overflow-x-auto relative flex-col"
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
          className="flex w-max min-h-[calc(100vh-120px)] items-stretch gap-2 px-8 pb-10 pt-4 relative z-10"
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
                      color={col.color}
                      isDefault={col.isDefault}
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
                        color: col.color,
                        "--collapse-height": `${metricsById.get(col.id)?.collapseHeight}px`,
                      } as Record<string, unknown>
                    }
                    title={`Click to expand "${col.name}" (${col.items.length} cards)`}
                  >
                    {/* Content - badge and name on top of progress bar */}
                    <div
                      className="column-collapsed-content"
                      style={{
                        height: `${metricsById.get(col.id)?.collapseHeight}px`,
                      }}
                    >
                      {/* Card count badge */}
                      <div className="column-collapsed-count">
                        {metricsById.get(col.id)?.displayCardCount}
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

      {/* Mobile view - Horizontal guitar string cards with proportional gradients */}
      <div className="md:hidden flex-1 overflow-y-auto px-4 py-6">
        <div className="space-y-4">
          {columnArray.map((col) => {
            const metrics = metricsById.get(col.id);
            if (!metrics) return null;

            return (
              <Link
                key={col.id}
                to={`/board/${board.id}/column/${col.id}`}
                className="column-mobile-card block"
                style={
                  {
                    color: col.color,
                    "--card-progress-width": `${metrics.progressPercent}%`,
                  } as Record<string, unknown>
                }
              >
                <div className="column-mobile-card-content">
                  <div className="column-mobile-card-count">
                    {metrics.cardCount > 99 ? "99+" : metrics.cardCount}
                  </div>
                  <div className="column-mobile-card-name">{col.name}</div>
                </div>
                <div className="column-mobile-card-icon">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// These are the inflight columns that are being created, instead of managing
// state ourselves, we just ask Remix for the state
