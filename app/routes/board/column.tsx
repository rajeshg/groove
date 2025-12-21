import { useState, useRef, useEffect } from "react";
import { useSubmit, Link } from "react-router";
import { invariant } from "@epic-web/invariant";

import { Icon } from "../../icons/icons";

import { type ItemMutation, type RenderedItem, CONTENT_TYPES } from "../types";
import { NewCard } from "./new-card";
import { flushSync } from "react-dom";
import { Card } from "./card";
// EditableText is unused in this file. Import removed to satisfy lint rules

interface ColumnProps {
  name: string;
  columnId: string;
  items: RenderedItem[];
  color?: string;
  isDefault?: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
  boardName: string; // Board name for cards
  boardId: string; // Board ID number for cards
  className?: string;
  onAddCardKeydown?: (callback: () => void) => void;
  shortcut?: string;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}

export function Column({
  name,
  columnId,
  items,
  color = "#94a3b8",
  isDefault: _isDefault = false,
  isExpanded = true,
  onToggle,
  boardName,
  boardId,
  className = "",
  onAddCardKeydown,
  shortcut,
  onDragStart,
  onDragEnd,
}: ColumnProps) {
  let submit = useSubmit();

  let [acceptDrop, setAcceptDrop] = useState(false);
  let [edit, setEdit] = useState(false);
  let listRef = useRef<HTMLUListElement>(null);

  // Register the add card callback when the column mounts
  useEffect(() => {
    if (onAddCardKeydown && isExpanded) {
      onAddCardKeydown(() => {
        flushSync(() => {
          setEdit(true);
        });
        scrollList();
      });
    }
  }, [onAddCardKeydown, isExpanded]);

  function scrollList() {
    invariant(listRef.current, "List ref is required");
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }

  return (
    <div
      className={
        `flex-shrink-0 flex flex-col w-[24rem] box-border rounded-2xl transition-all duration-200 bg-slate-100/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md ${className} ` +
        (acceptDrop
          ? `ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900`
          : ``)
      }
      data-column-id={columnId}
      onDragOver={(event) => {
        // Only accept card drops, not column drops
        if (event.dataTransfer.types.includes(CONTENT_TYPES.card)) {
          if (items.length === 0) {
            event.preventDefault();
            setAcceptDrop(true);
          }
        }
        // Ignore column drops on the empty column drop zone
      }}
      onDragLeave={() => {
        setAcceptDrop(false);
      }}
      onDrop={(event) => {
        // Only handle card drops
        if (!event.dataTransfer.types.includes(CONTENT_TYPES.card)) {
          return;
        }

        let transfer = JSON.parse(
          event.dataTransfer.getData(CONTENT_TYPES.card)
        );
        invariant(transfer.id, "missing transfer.id");
        invariant(transfer.title, "missing transfer.title");

        let mutation: ItemMutation = {
          order: 1,
          columnId: columnId,
          id: transfer.id,
          title: transfer.title,
          content: null,
        };

        submit(
          {
            id: transfer.id,
            boardId: boardId,
            columnId: columnId,
            order: mutation.order,
          },
          {
            method: "post",
            action: "/resources/move-card",
            navigate: false,
            // use the same fetcher instance for any mutations on this card so
            // that interruptions cancel the earlier request and revalidation
            fetcherKey: `card:${transfer.id}`,
          }
        );

        setAcceptDrop(false);
      }}
    >
      <div
        className="px-4 py-4 border-b-2 bg-slate-100/50 dark:bg-slate-900/50 rounded-t-2xl"
        style={{ borderColor: color }}
      >
        <div className="flex items-center justify-between gap-3">
          {/* Drag handle - only this area is draggable */}
          {isExpanded && onDragStart && (
            <div
              className="cursor-grab active:cursor-grabbing p-1.5 -ml-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
              draggable="true"
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              title="Drag to reorder column"
              aria-label="Drag to reorder column"
            >
              <Icon name="grip-vertical" size="md" />
            </div>
          )}

          {isExpanded ? (
            <h2 className="flex-1 text-center py-1 px-2 font-black text-slate-900 dark:text-slate-50 text-xs uppercase tracking-widest">
              {name}
            </h2>
          ) : (
            <button
              onClick={onToggle}
              className="flex items-center justify-center gap-2 flex-1 text-center p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors uppercase"
              title={`Expand column: ${name} (${items.length} cards)`}
            >
              <Icon name="chevron-right" />
              <span className="font-black text-slate-900 dark:text-slate-50 text-xs truncate">
                {name}
              </span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                {items.length}
              </span>
            </button>
          )}
          {isExpanded && (
            <div className="flex items-center gap-1">
              {/* Collapse button */}
              <button
                onClick={onToggle}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-slate-500"
                title="Collapse column"
                aria-label="Collapse column"
              >
                <Icon name="shrink" size="md" />
              </button>

              {/* View Column Details Link */}
              <Link
                to={`/board/${boardId}/column/${columnId}`}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-all text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 group"
                title="View column details"
                aria-label={`View details for ${name}`}
              >
                <Icon name="chevron-right" size="md" className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {edit ? (
        <NewCard
          columnId={columnId}
          nextOrder={items.length === 0 ? 1 : items[items.length - 1].order + 1}
          onAddCard={() => scrollList()}
          onComplete={() => setEdit(false)}
        />
      ) : (
        <div className="p-3 flex items-center justify-between gap-2 group/add">
          <button
            type="button"
            onClick={() => {
              flushSync(() => {
                setEdit(true);
              });
              scrollList();
            }}
            className="flex items-center gap-2 rounded-xl text-left flex-1 p-3 font-black text-slate-400 dark:text-slate-500 hover:bg-white dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 hover:shadow-sm transition-all text-[10px] uppercase tracking-widest"
            data-add-card-button
          >
            <Icon name="plus" className="group-hover/add:scale-110 transition-transform" />
            Add a card
          </button>
          {shortcut && (
            <div className="flex items-center justify-center w-5 h-5 rounded border border-slate-200 dark:border-slate-800 text-[9px] font-black text-slate-400 dark:text-slate-600 bg-white dark:bg-slate-900 shadow-sm uppercase">
              {shortcut}
            </div>
          )}
        </div>
      )}

      <ul
        ref={listRef}
        className="flex flex-col gap-y-3 flex-grow min-h-[100px] px-2 py-3 overflow-y-auto custom-scrollbar"
      >
        {items
          .sort((a, b) => a.order - b.order)
          .map((item, index, sortedItems) => {
            const previousOrder = index > 0 ? sortedItems[index - 1].order : 0;
            const nextOrder =
              index < sortedItems.length - 1
                ? sortedItems[index + 1].order
                : item.order + 1;

            return (
              <Card
                key={item.id}
                title={item.title}
                content={item.content}
                id={item.id}
                order={item.order}
                nextOrder={nextOrder}
                previousOrder={previousOrder}
                columnId={columnId}
                columnColor={color}
                boardName={boardName}
                boardId={boardId}
                createdBy={item.createdBy}
                createdByUser={item.createdByUser || null}
                assignee={item.Assignee}
                createdAt={item.createdAt}
                lastActiveAt={item.lastActiveAt}
                commentCount={
                  (item as unknown as { _count?: { comments: number } })._count
                    ?.comments
                }
              />
            );
          })}
      </ul>

      {items.length === 0 && !edit && (
        <div
          className={`py-12 text-center transition-all duration-200 bg-slate-100/30 dark:bg-slate-900/30 rounded-b-2xl`}
        >
          <div
            className={`text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-600`}
          >
            Empty Column
          </div>
        </div>
      )}
    </div>
  );
}
