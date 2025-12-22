import { invariant } from "@epic-web/invariant";
import { useFetcher, useSubmit, useNavigate } from "react-router";
import { useState, useRef, useEffect } from "react";

import { Icon } from "../../icons/icons";
import { CardMeta } from "./card-meta";
import { StatusButton } from "../../components/status-button";

import type { RenderedAssignee } from "../types";
import { CONTENT_TYPES } from "../types";

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
  boardId: string;
  createdBy: string | null;
  createdByUser?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
  assignee: RenderedAssignee | null;
  createdAt: Date;
  lastActiveAt: Date;
  commentCount?: number;
}

export function Card({
  title,
  content: _content,
  id,
  columnId,
  columnColor = "#94a3b8",
  order,
  nextOrder,
  previousOrder,
  boardName,
  boardId: _boardId,
  createdBy,
  createdByUser,
  assignee,
  createdAt,
  lastActiveAt,
  commentCount = 0,
}: CardProps) {
  let submit = useSubmit();
  let deleteFetcher = useFetcher();
  let navigate = useNavigate();

  let [acceptDrop, setAcceptDrop] = useState<"none" | "top" | "bottom">("none");
  let [isDragging, setIsDragging] = useState(false);
  let [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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

  // Hide card when deleting or when delete has completed successfully
  return deleteFetcher.state !== "idle" || deleteFetcher.data ? null : (
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
            id: transfer.id,
            boardId: _boardId,
            columnId: columnId,
            order: moveOrder,
          },
          {
            method: "post",
            action: "/resources/move-card",
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
          "w-full pt-10 pb-4 pr-4 pl-4 relative group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300 " +
          (isDragging ? "opacity-50 scale-95" : "hover:-translate-y-1")
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
          className="absolute top-0 left-0 inline-flex items-center text-white font-black px-3 py-1 text-[9px] gap-2 font-mono uppercase tracking-widest rounded-tl-xl rounded-br-lg shadow-sm"
          style={{
            backgroundColor: columnColor,
            textShadow: "0 1px 1px rgba(0, 0, 0, 0.2)",
          }}
        >
          <span className="opacity-80">#{id.substring(0, 4)}</span>
          <span className="border-l border-white/20 pl-2">{boardName}</span>
        </div>

        {/* Card title - non-editable, click opens detail page */}
        <h3 className="font-bold text-slate-950 dark:text-slate-50 text-base mb-1">
          {title}
        </h3>

        {/* Card metadata section */}
        <CardMeta
          createdBy={createdBy}
          createdByUser={createdByUser || null}
          assignee={assignee}
          createdAt={createdAt}
          lastActiveAt={lastActiveAt}
          columnColor={columnColor}
        />

        {/* Comment count badge */}
        {commentCount > 0 && (
          <div className="flex items-center gap-1 mt-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
              />
            </svg>
            <span>
              {commentCount} {commentCount === 1 ? "comment" : "comments"}
            </span>
          </div>
        )}

        {!showDeleteConfirm ? (
          <button
            aria-label="Delete card"
            className="absolute top-2 right-2 text-slate-400 dark:text-slate-500 opacity-50 group-hover:opacity-100 hover:text-red-600 dark:hover:text-red-400 transition-all"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              event.preventDefault();
              setShowDeleteConfirm(true);
            }}
          >
            <Icon name="trash" />
          </button>
        ) : (
          <div
            className="absolute top-2 right-2 flex gap-1 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-red-200 dark:border-red-800 p-1"
            onClick={(e) => {
              e.stopPropagation();
              // Don't preventDefault here - it blocks form submission!
            }}
          >
            <deleteFetcher.Form
              method="post"
              action="/resources/delete-card"
              onSubmit={(e) => e.stopPropagation()}
            >
              <input type="hidden" name="itemId" value={id} />
              <StatusButton
                aria-label="Confirm delete"
                variant="danger"
                status={deleteFetcher.state !== "idle" ? "pending" : "idle"}
                type="submit"
                className="px-2 py-1 text-[10px]"
              >
                Delete
              </StatusButton>
            </deleteFetcher.Form>
            <button
              aria-label="Cancel delete"
              className="px-2 py-1 text-[10px] font-black uppercase tracking-widest bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 transition-all active:scale-95"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                event.preventDefault();
                setShowDeleteConfirm(false);
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </li>
  );
}
