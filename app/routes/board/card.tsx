import invariant from "tiny-invariant";
import { useFetcher, useSubmit, useNavigate } from "react-router";
import { useState, useRef, useEffect } from "react";

import { Icon } from "../../icons/icons";
import { CardMeta } from "./card-meta";

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
  createdBy: string | null;
  assignedTo: string | null;
  createdAt: Date;
  lastActiveAt: Date;
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
  createdBy,
  assignedTo,
  createdAt,
  lastActiveAt,
}: CardProps) {
  let submit = useSubmit();
  let deleteFetcher = useFetcher();
  let navigate = useNavigate();

  let [acceptDrop, setAcceptDrop] = useState<"none" | "top" | "bottom">("none");
  let [isDragging, setIsDragging] = useState(false);
  let dragLeaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleGlobalDragEnd = () => {
      setAcceptDrop("none");
      setIsDragging(false);
      if (dragLeaveTimeoutRef.current) {
        clearTimeout(dragLeaveTimeoutRef.current);
        dragLeaveTimeoutRef.current = null;
      }
    };

    document.addEventListener("dragend", handleGlobalDragEnd);
    return () => document.removeEventListener("dragend", handleGlobalDragEnd);
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
        "-mb-[1px] last:mb-0 px-2 transition-all duration-100 " +
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
          "w-full pt-8 pb-3 pr-3 pl-3 relative group bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 cursor-pointer hover:shadow-md hover:border-slate-300 dark:hover:border-slate-500 transition-all " +
          (isDragging ? "opacity-50 scale-95" : "")
        }
        onClick={() => {
          // Don't navigate if dragging
          if (isDragging) return;

          // Navigate to detail page
          navigate(`/card/${id}`);
        }}
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
        {/* Card ID badge - absolutely positioned at top-left */}
        <div
          className="absolute top-0 left-0 inline-flex items-center text-white font-semibold px-2 py-1 text-xs gap-2 font-mono uppercase"
          style={{
            backgroundColor: columnColor,
          }}
        >
          <span>{id.substring(0, 4)}</span>
          <span>{boardName}</span>
        </div>

        {/* Card title - non-editable, click opens detail page */}
        <h3 className="font-semibold text-slate-900 dark:text-slate-50 text-sm mb-1">
          {title}
        </h3>

        {/* Card metadata section */}
        <CardMeta
          createdBy={createdBy}
          assignedTo={assignedTo}
          createdAt={createdAt}
          lastActiveAt={lastActiveAt}
          columnColor={columnColor}
        />

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
