import { useNavigate, useFetcher, useLoaderData, useParams } from "react-router";
import { useState, useRef } from "react";
import { flushSync } from "react-dom";
import invariant from "tiny-invariant";

import { Icon } from "../icons/icons";
import { CardMeta } from "./board/card-meta";
import { INTENTS } from "./types";

/**
 * Loader for card detail route - fetches card data on the server
 * Route: /card/$cardId
 */
export async function loader({
  request,
  params,
}: {
  request: Request;
  params: Record<string, string>;
}) {
  // Dynamically import server-only modules
  const { requireAuthCookie } = await import("../auth/auth");
  const { notFound, badRequest } = await import("../http/bad-request");
  const { prisma } = await import("../db/prisma");

  const accountId = await requireAuthCookie(request);
  invariant(params.cardId, "Missing card ID");

  const cardId = params.cardId;

  // Get all items to find the card and its board
  const card = await prisma.item.findUnique({
    where: { id: cardId },
    include: {
      Column: true,
      Board: true,
    },
  });

  if (!card) throw notFound();
  if (card.Board.accountId !== accountId) throw badRequest("Unauthorized");

  // Get all columns for this board to display status buttons
  const columns = await prisma.column.findMany({
    where: { boardId: card.Board.id },
    orderBy: { order: "asc" },
  });

  return {
    card,
    boardName: card.Board.name,
    boardId: card.Board.id,
    columns,
  };
}

/**
 * Card detail modal/page for viewing and editing card description
 * Based on Fizzy's card detail design from editpage1.png
 * Route: /card/$cardId
 */
export default function CardDetail() {
  const { cardId } = useParams();
  const navigate = useNavigate();
  const editFetcher = useFetcher();
  const loaderData = useLoaderData();

  invariant(cardId, "Missing card ID");

  // Handle null case when loader data is not yet available
  if (!loaderData || !loaderData.card) {
    return null;
  }

  const { card, boardName, boardId, columns } = loaderData;

  const [editMode, setEditMode] = useState(false);
  const [editTitleMode, setEditTitleMode] = useState(false);
  const contentInputRef = useRef<HTMLTextAreaElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [localContent, setLocalContent] = useState(card.content);
  const [localTitle, setLocalTitle] = useState(card.title);
  const [localColumnId, setLocalColumnId] = useState(card.columnId);

  const currentColumn = columns.find((col: any) => col.id === localColumnId);
  const columnColor = currentColumn?.color || "#94a3b8";

  const submitContentEdit = () => {
    const contentValue = contentInputRef.current?.value || "";
    if (contentValue === (card.content || "")) return false;

    editFetcher.submit(
      {
        intent: INTENTS.updateItem,
        id: cardId,
        columnId: localColumnId,
        title: localTitle,
        order: String(card.order),
        content: contentValue,
      },
      { method: "post", action: `/board/${boardId}` }
    );

    // Update local state
    setLocalContent(contentValue);
    return true;
  };

  const submitTitleEdit = () => {
    const titleValue = titleInputRef.current?.value?.trim() || "";
    if (titleValue === card.title) return false;
    if (titleValue === "") return false;

    editFetcher.submit(
      {
        intent: INTENTS.updateItem,
        id: cardId,
        columnId: localColumnId,
        title: titleValue,
        order: String(card.order),
        content: localContent || "",
      },
      { method: "post", action: `/board/${boardId}` }
    );

    // Update local state
    setLocalTitle(titleValue);
    return true;
  };

  const changeColumn = (newColumnId: string) => {
    editFetcher.submit(
      {
        intent: INTENTS.updateItem,
        id: cardId,
        columnId: newColumnId,
        title: localTitle,
        order: String(card.order),
        content: localContent || "",
      },
      { method: "post", action: `/board/${boardId}` }
    );

    // Update local state
    setLocalColumnId(newColumnId);
  };

  const handleContentClickOutside = (e: React.FocusEvent<HTMLDivElement>) => {
    if (editMode && contentInputRef.current && !contentInputRef.current.contains(e.relatedTarget as Node)) {
      submitContentEdit();
      setEditMode(false);
    }
  };

  const handleTitleClickOutside = (e: React.FocusEvent<HTMLDivElement>) => {
    if (editTitleMode && titleInputRef.current && !titleInputRef.current.contains(e.relatedTarget as Node)) {
      submitTitleEdit();
      setEditTitleMode(false);
    }
  };

  // CSS color-mix to blend card color with canvas background (Fizzy pattern)
  const containerBgColor = `color-mix(in srgb, ${columnColor} 33%, #f8fafc)`;
  
  return (
    <div 
      className="min-h-screen"
      style={{
        backgroundColor: '#f1f5f9'
      }}
    >
      {/* Mobile: full width, Desktop: centered with max-width */}
      <div className="min-h-screen md:py-8 md:px-4">
        <div className="md:max-w-[1120px] md:mx-auto min-h-screen md:min-h-0">
          {/* Back button - top on mobile, above card on desktop */}
          <div 
            className="sticky top-0 z-20 md:relative md:mb-6"
            style={{ 
              backgroundColor: '#f1f5f9'
            }}
          >
            <div className="md:hidden px-4 py-3 border-b border-slate-200 bg-white">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-sm font-semibold transition-all"
                style={{ 
                  color: `color-mix(in srgb, ${columnColor} 40%, #1e293b)`
                }}
              >
                <span className="text-lg">←</span> Back to {boardName}
              </button>
            </div>
            <div className="hidden md:flex md:items-center md:justify-center">
              <button
                onClick={() => navigate(-1)}
                className="px-5 py-2.5 text-sm font-semibold rounded-full hover:opacity-90 transition-all shadow-md"
                style={{ 
                  backgroundColor: '#ffffff',
                  color: `color-mix(in srgb, ${columnColor} 40%, #1e293b)`,
                  border: `2px solid ${columnColor}`
                }}
              >
                ← Back to {boardName}
              </button>
            </div>
          </div>

          {/* Desktop: Grid layout with actions, Mobile: Simple container */}
          <div className="md:grid md:gap-4 relative"
            style={{
              gridTemplateColumns: '48px minmax(0, 1fr) 48px',
              gridTemplateAreas: '"actions-left card actions-right"'
            }}
          >
            {/* Left actions placeholder - desktop only */}
            <div className="hidden md:block" style={{ gridArea: 'actions-left' }} />

            {/* Main card content */}
            <div 
              style={{ 
                gridArea: 'card',
                backgroundColor: containerBgColor
              }}
              className="md:rounded-xl md:shadow-xl w-full"
            >
              <article className="bg-white dark:bg-slate-800 md:rounded-lg md:shadow-sm">
                {/* Card body - flexbox with content left, stages right */}
                <div className="p-4 sm:p-6 md:px-6 md:pt-6 md:pb-6 flex flex-col lg:flex-row gap-4 sm:gap-6 items-start justify-between">
                {/* Main content area */}
                <div className="flex-1 flex flex-col gap-4 w-full lg:w-auto lg:min-w-0">
                  {/* Card badge and column name - at the top */}
                  <div className="flex items-center gap-2">
                    <span 
                      className="inline-block px-2 py-1 text-xs font-bold text-white rounded" 
                      style={{ backgroundColor: columnColor }}
                    >
                      No. {card.id.substring(0, 4).toUpperCase()}
                    </span>
                    <span className="text-xs font-semibold uppercase text-slate-600 dark:text-slate-400">
                      {currentColumn?.name || 'Unknown'}
                    </span>
                  </div>

                  {/* Card Title */}
                  <div>
                    {editTitleMode ? (
                      <div onBlur={handleTitleClickOutside}>
                        <input
                          ref={titleInputRef}
                          type="text"
                          defaultValue={localTitle}
                          placeholder="Name it…"
                          className="block w-full border-2 border-blue-500 bg-white dark:bg-slate-700 px-2 py-1 text-2xl font-bold text-slate-900 dark:text-slate-50 focus:border-blue-500 focus:outline-none rounded"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              submitTitleEdit();
                              setEditTitleMode(false);
                            } else if (e.key === "Escape") {
                              flushSync(() => {
                                setEditTitleMode(false);
                              });
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <h1 
                        onClick={() => setEditTitleMode(true)}
                        className="text-2xl font-bold text-slate-900 dark:text-slate-50 cursor-text hover:bg-slate-50 dark:hover:bg-slate-700 rounded px-2 py-1 -mx-2 transition-colors"
                        style={{
                          fontSize: 'clamp(1rem, 6vw, 1.5rem)'
                        }}
                      >
                        {localTitle}
                      </h1>
                    )}
                  </div>

                  {/* Description */}
                  <div className="flex-1">
                    {editMode ? (
                      <div onBlur={handleContentClickOutside}>
                        <textarea
                          ref={contentInputRef}
                          defaultValue={localContent || ""}
                          placeholder="Add some notes, context, pictures, or video about this…"
                          className="block w-full border border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none resize-none rounded min-h-[50vh] md:min-h-[300px]"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Escape") {
                              flushSync(() => {
                                setEditMode(false);
                              });
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <div
                        onClick={() => setEditMode(true)}
                        className="min-h-[50vh] md:min-h-[300px] p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded cursor-text hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors text-slate-700 dark:text-slate-200 whitespace-pre-wrap break-words text-sm"
                      >
                        {localContent ? (
                          localContent
                        ) : (
                          <span className="italic text-slate-400 dark:text-slate-500">Click to add description...</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Stages/Column switcher - right sidebar */}
                <div 
                  className="flex flex-col sm:border-0 border border-solid rounded overflow-hidden sm:rounded-none w-full sm:w-auto"
                  style={{
                    maxWidth: '100%',
                    fontSize: 'var(--text-small, 0.875rem)',
                    borderColor: columnColor,
                    '--max-width-sm': '32ch'
                  } as React.CSSProperties & { '--max-width-sm': string }}
                >
                  {columns.map((column: any) => {
                    const isActive = column.id === localColumnId;
                    return (
                      <button
                        key={column.id}
                        onClick={() => changeColumn(column.id)}
                        className="px-3 py-2 text-xs font-semibold uppercase transition-all text-left hover:opacity-90 sm:rounded"
                        style={{
                          backgroundColor: isActive ? column.color : 'transparent',
                          color: isActive ? '#fff' : 'inherit',
                          borderRadius: '0em',
                          width: '100%',
                          justifyContent: 'flex-start'
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) {
                            const target = e.currentTarget;
                            target.style.backgroundColor = `color-mix(in srgb, ${column.color} 15%, transparent)`;
                            target.style.color = column.color;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) {
                            const target = e.currentTarget;
                            target.style.backgroundColor = 'transparent';
                            target.style.color = 'inherit';
                          }
                        }}
                      >
                        {column.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Card footer - metadata */}
              <footer className="p-4 sm:px-6 sm:pb-6">
                <CardMeta
                  createdBy={card.createdBy || null}
                  assignedTo={card.assignedTo || null}
                  createdAt={new Date(card.createdAt)}
                  lastActiveAt={new Date(card.lastActiveAt)}
                  columnColor={columnColor}
                />
              </footer>
            </article>
          </div>

          {/* Right actions placeholder - desktop only */}
          <div className="hidden md:block" style={{ gridArea: 'actions-right' }} />
        </div>
      </div>
    </div>
  </div>
  );
}
