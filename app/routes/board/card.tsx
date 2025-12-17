import invariant from "tiny-invariant";
import { useFetcher, useSubmit } from "react-router";
import { useState, useRef, useEffect } from "react";
import { flushSync } from "react-dom";

import { Icon } from "../../icons/icons";

import type { ItemMutation } from "../types";
import { INTENTS, CONTENT_TYPES } from "../types";

interface CardProps {
  title: string;
  content: string | null;
  id: string;
  columnId: string;
  columnColor?: string;
  order: number;
  nextOrder: number;
  previousOrder: number;
  boardName: string;
  boardId: number;
}

export function Card({
  title,
  content,
  id,
  columnId,
  columnColor = "#94a3b8",
  order,
  nextOrder,
  previousOrder,
  boardName,
  boardId,
}: CardProps) {
  let submit = useSubmit();
  let deleteFetcher = useFetcher();
  let editFetcher = useFetcher();

  let [acceptDrop, setAcceptDrop] = useState<"none" | "top" | "bottom">("none");
  let [isDragging, setIsDragging] = useState(false);
  let [editMode, setEditMode] = useState<"none" | "title" | "content">("none");
  let contentInputRef = useRef<HTMLTextAreaElement>(null);
  let titleInputRef = useRef<HTMLInputElement>(null);
  let editContainerRef = useRef<HTMLDivElement>(null);
  let titleDisplayRef = useRef<HTMLHeadingElement>(null);
  let contentDisplayRef = useRef<HTMLDivElement>(null);
  let dragLeaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const submitEdit = (field: "title" | "content") => {
    if (field === "title") {
      const titleValue = titleInputRef.current?.value?.trim() || "";
      if (titleValue === title) return false;
      if (titleValue === "") return false;
      editFetcher.submit(
        {
          intent: INTENTS.updateItem,
          id,
          columnId,
          title: titleValue,
          order: String(order),
          content: content || "",
        },
        { method: "post" }
      );
      return true;
    } else {
      const contentValue = contentInputRef.current?.value || "";
      if (contentValue === (content || "")) return false;
      editFetcher.submit(
        {
          intent: INTENTS.updateItem,
          id,
          columnId,
          title,
          order: String(order),
          content: contentValue,
        },
        { method: "post" }
      );
      return true;
    }
  };

  const handleClickOutside = (e: React.FocusEvent<HTMLDivElement>) => {
    if (editMode !== "none" && editContainerRef.current && !editContainerRef.current.contains(e.relatedTarget as Node)) {
      submitEdit(editMode as "title" | "content");
      setEditMode("none");
    }
  };

  useEffect(() => {
    const handleGlobalDragEnd = () => {
      setAcceptDrop("none");
      setIsDragging(false);
      if (dragLeaveTimeoutRef.current) {
        clearTimeout(dragLeaveTimeoutRef.current);
        dragLeaveTimeoutRef.current = null;
      }
    };

    document.addEventListener('dragend', handleGlobalDragEnd);
    return () => document.removeEventListener('dragend', handleGlobalDragEnd);
  }, []);

  return deleteFetcher.state !== "idle" ? null : (
    <li
      data-card-id={id}
      onDragEnter={(event) => {
        if (event.dataTransfer.types.includes(CONTENT_TYPES.card)) {
          event.preventDefault();
          if (dragLeaveTimeoutRef.current) {
            clearTimeout(dragLeaveTimeoutRef.current);
            dragLeaveTimeoutRef.current = null;
          }
        }
      }}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes(CONTENT_TYPES.card)) {
          event.preventDefault();
          let rect = event.currentTarget.getBoundingClientRect();
          let midpoint = (rect.top + rect.bottom) / 2;
          setAcceptDrop(event.clientY <= midpoint ? "top" : "bottom");
        }
      }}
      onDragLeave={(event) => {
        if (event.dataTransfer.types.includes(CONTENT_TYPES.card)) {
          dragLeaveTimeoutRef.current = setTimeout(() => {
            setAcceptDrop("none");
          }, 10);
        }
      }}
      onDrop={(event) => {
        event.stopPropagation();

        let transfer = JSON.parse(
          event.dataTransfer.getData(CONTENT_TYPES.card)
        );
        invariant(transfer.id, "missing cardId");

        let droppedOrder = acceptDrop === "top" ? previousOrder : nextOrder;
        let moveOrder = (droppedOrder + order) / 2;

        submit(
          {
            intent: INTENTS.moveItem,
            id: transfer.id,
            columnId: columnId,
            order: moveOrder,
          } as unknown as ItemMutation,
          {
            method: "post",
            navigate: false,
            fetcherKey: `card:${transfer.id}`,
          }
        );

        setAcceptDrop("none");
      }}
      className={
        "-mb-[1px] last:mb-0 px-3 py-2 transition-all duration-100 " +
        (acceptDrop === "top"
          ? "pt-4 pb-0 border-t-2 border-t-blue-400"
          : acceptDrop === "bottom"
            ? "pt-0 pb-4 border-b-2 border-b-blue-400"
            : "")
      }
    >
      <div
        draggable
        className={
          "bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded w-full py-2 px-3 relative group hover:shadow-md dark:hover:shadow-lg transition-all duration-150 " +
          (isDragging ? "opacity-60 shadow-lg dark:shadow-xl scale-95" : "shadow-sm dark:shadow-sm")
        }
        onDragStart={(event) => {
          setIsDragging(true);
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData(
            CONTENT_TYPES.card,
            JSON.stringify({ id, title })
          );
        }}
        onDragEnd={() => {
          setIsDragging(false);
          setAcceptDrop("none");
          if (dragLeaveTimeoutRef.current) {
            clearTimeout(dragLeaveTimeoutRef.current);
            dragLeaveTimeoutRef.current = null;
          }
        }}
      >
        {editMode === "title" ? (
          <div ref={editContainerRef} onBlur={handleClickOutside}>
            <input
              ref={titleInputRef}
              type="text"
              defaultValue={title}
              placeholder="Card title..."
              className="block w-full rounded border border-blue-400 dark:border-blue-500 px-2 py-1 text-sm font-semibold text-slate-900 dark:text-slate-50 dark:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  submitEdit("title");
                } else if (e.key === "Escape") {
                  flushSync(() => {
                    setEditMode("none");
                  });
                  titleDisplayRef.current?.focus();
                }
              }}
            />
          </div>
        ) : (
          <h3
            ref={titleDisplayRef}
            onClick={() => setEditMode("title")}
            className="font-semibold text-slate-900 dark:text-slate-50 text-sm mb-1 cursor-text hover:bg-slate-100 dark:hover:bg-slate-600 rounded px-1 py-0.5 transition-colors"
          >
            {title}
          </h3>
         )}

         {/* Board name and ID - similar to board.webp */}
         <div className="text-xs text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1">
           <span className="font-medium">{boardName}</span>
           <span className="text-slate-400 dark:text-slate-500">•</span>
           <span className="font-mono text-slate-500 dark:text-slate-400">{boardId}</span>
         </div>

         {editMode === "content" ? (
          <div ref={editContainerRef} onBlur={handleClickOutside}>
            <textarea
              ref={contentInputRef}
              defaultValue={content || ""}
              placeholder="Add description..."
              className="block w-full rounded border border-blue-400 dark:border-blue-500 px-2 py-1 text-xs text-slate-700 dark:text-slate-200 dark:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={2}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.ctrlKey) {
                  e.preventDefault();
                  submitEdit("content");
                } else if (e.key === "Enter" && e.ctrlKey) {
                  e.preventDefault();
                  const textarea = contentInputRef.current;
                  if (textarea) {
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    const value = textarea.value;
                    textarea.value = value.substring(0, start) + "\n" + value.substring(end);
                    textarea.selectionStart = textarea.selectionEnd = start + 1;
                  }
                } else if (e.key === "Escape") {
                  flushSync(() => {
                    setEditMode("none");
                  });
                  contentDisplayRef.current?.focus();
                }
              }}
            />
          </div>
        ) : (
          <div
            ref={contentDisplayRef}
            onClick={() => setEditMode("content")}
            className="min-h-8 text-xs text-slate-600 dark:text-slate-300 leading-relaxed cursor-text hover:bg-slate-100 dark:hover:bg-slate-600 rounded px-1 py-1 transition-colors whitespace-pre-wrap break-words"
          >
            {content ? (
              content
            ) : (
              <span className="italic text-slate-400 dark:text-slate-500">Click to add description...</span>
            )}
          </div>
        )}

        <deleteFetcher.Form method="post" className="absolute top-2 right-2">
          <input type="hidden" name="intent" value={INTENTS.deleteCard} />
          <input type="hidden" name="itemId" value={id} />
          <button
            aria-label="Delete card"
            className="text-slate-400 dark:text-slate-500 opacity-0 group-hover:opacity-100 hover:text-red-600 dark:hover:text-red-400 transition-all"
            type="submit"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <Icon name="trash" />
          </button>
        </deleteFetcher.Form>
      </div>
    </li>
  );
}
