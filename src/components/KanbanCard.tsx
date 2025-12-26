import { useCallback, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Card } from "~/components/ui/card";
import { Trash2 } from "lucide-react";
import { CardMeta } from "~/components/CardMeta";

const CONTENT_TYPES = {
  card: "application/json+card",
  column: "application/json+column",
};

export interface KanbanCardProps {
  id: string;
  title: string;
  content?: string;
  onDelete: () => void;
  boardId?: string;
  columnId?: string;
  columnName?: string;
  order?: number;
  assignee?: {
    id: string;
    name: string;
    userId?: string | null;
  } | null;
  createdBy?: string | null;
  createdByUser?: {
    id: string | null;
    firstName: string | null;
    lastName: string | null;
    email?: string | null;
  } | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  lastActiveAt?: Date | string;
  columnColor?: string;
}

export function KanbanCard({
  id,
  title,
  content,
  onDelete,
  boardId,
  columnId,
  columnName = "",
  order = 0,
  assignee,
  createdBy,
  createdByUser,
  createdAt,
  updatedAt,
  lastActiveAt,
  columnColor = "#94a3b8",
}: KanbanCardProps) {
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);

  const handleCardClick = (e: React.MouseEvent) => {
    if (isDragging) {
      return;
    }

    e.stopPropagation();
    if (boardId) {
      navigate({ to: `/boards/${boardId}/cards/${id}` });
    }
  };

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onDelete();
    },
    [id, onDelete]
  );

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData(
      CONTENT_TYPES.card,
      JSON.stringify({
        id,
        columnId,
        order,
        title,
      })
    );
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <div
      draggable="true"
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className="relative group"
    >
      <Card
        className={`pt-8 pb-4 px-4 bg-white dark:bg-slate-800 hover:shadow-md transition-shadow relative overflow-hidden ${
          isDragging ? "opacity-50 scale-95" : "opacity-100"
        }`}
      >
        {/* Card ID Badge - absolutely positioned at top-left */}
        <div
          className="absolute top-0 left-0 inline-flex items-center text-white font-black px-3 py-1 text-[9px] gap-2 font-mono uppercase tracking-widest rounded-br-lg shadow-sm cursor-grab active:cursor-grabbing"
          style={{
            backgroundColor: columnColor,
            textShadow: "0 1px 1px rgba(0, 0, 0, 0.2)",
          }}
        >
          <span className="opacity-80">#{id.substring(0, 4)}</span>
          {columnName && (
            <>
              <span className="border-l border-white/20 pl-2">
                {columnName}
              </span>
            </>
          )}
        </div>

        <div className="flex items-start justify-between gap-2">
          <div
            className="flex-1 cursor-pointer select-none"
            onClick={handleCardClick}
          >
            <h4 className="font-medium text-slate-900 dark:text-slate-100 text-sm leading-tight hover:text-blue-600 transition-colors">
              {title}
            </h4>
            {content && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
                {content}
              </p>
            )}

            {/* Card Metadata */}
            {createdAt && (
              <CardMeta
                createdBy={createdBy || null}
                createdByUser={createdByUser || null}
                assignee={
                  assignee
                    ? {
                        id: assignee.id,
                        name: assignee.name,
                        userId: assignee.userId || null,
                      }
                    : null
                }
                createdAt={createdAt}
                updatedAt={updatedAt}
                lastActiveAt={lastActiveAt}
                columnColor={columnColor}
                isCardDetail={false}
              />
            )}
          </div>
          <button
            type="button"
            onClick={handleDelete}
            className="p-1 text-slate-400 hover:text-red-600 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex-shrink-0 z-50 pointer-events-auto"
            title="Delete card"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </Card>
    </div>
  );
}
