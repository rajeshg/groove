import { useNavigate, useFetcher, useLoaderData, useParams } from "react-router";
import { useState, useRef, useEffect } from "react";
import { flushSync } from "react-dom";
import invariant from "tiny-invariant";

import { Textarea } from "../components/textarea";
import { Input } from "../components/input";

import { Icon } from "../icons/icons";
import { CardMeta } from "./board/card-meta";
import { INTENTS, type RenderedComment } from "./types";

// Time threshold for editing/deleting comments (15 minutes in milliseconds)
const COMMENT_EDIT_THRESHOLD_MS = 15 * 60 * 1000;

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
      comments: {
        orderBy: { createdAt: 'asc' },
      },
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
    accountId, // Pass accountId for comment creation
  };
}

/**
 * Action handler for card detail page - handles comment operations
 */
export async function action({
  request,
  params,
}: {
  request: Request;
  params: Record<string, string>;
}) {
  const { requireAuthCookie } = await import("../auth/auth");
  const { createComment, updateComment, deleteComment } = await import("./queries");
  const { INTENTS } = await import("./types");
  
  const accountId = await requireAuthCookie(request);
  invariant(params.cardId, "Missing card ID");
  
  const formData = await request.formData();
  const intent = String(formData.get("intent"));
  
  switch (intent) {
    case INTENTS.createComment: {
      const content = String(formData.get("content"));
      if (!content.trim()) {
        return { error: "Comment content is required" };
      }
      await createComment(params.cardId, content, accountId, accountId);
      return { success: true };
    }
    
    case INTENTS.updateComment: {
      const commentId = String(formData.get("commentId"));
      const content = String(formData.get("content"));
      if (!content.trim()) {
        return { error: "Comment content is required" };
      }
      await updateComment(commentId, content, accountId);
      return { success: true };
    }
    
    case INTENTS.deleteComment: {
      const commentId = String(formData.get("commentId"));
      await deleteComment(commentId, accountId);
      return { success: true };
    }
    
    default:
      return { error: "Unknown intent" };
  }
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
  const commentFetcher = useFetcher(); // Separate fetcher for comments
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
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);

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
                        <Input
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
                        <Textarea
                          ref={contentInputRef}
                          defaultValue={localContent || ""}
                          placeholder="Add some notes, context, pictures, or video about this…"
                          className="block w-full border border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none resize-none rounded min-h-[200px] md:min-h-[300px]"
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
                        className="min-h-[200px] md:min-h-[300px] p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded cursor-text hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors text-slate-700 dark:text-slate-200 whitespace-pre-wrap break-words text-sm"
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

              {/* Card Metadata */}
              <div className="p-4 sm:px-6 border-t border-slate-200 dark:border-slate-700">
                <CardMeta
                  createdBy={card.createdBy || null}
                  assignedTo={card.assignedTo || null}
                  createdAt={new Date(card.createdAt)}
                  lastActiveAt={new Date(card.lastActiveAt)}
                  columnColor={columnColor}
                />
              </div>

              {/* Comments Section */}
              <div className="p-4 sm:px-6 border-t border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50 mb-4">Comments</h3>
                
                {/* Comment List */}
                <div className="space-y-4 mb-4">
                  {card.comments && card.comments.length > 0 ? (
                    card.comments.map((comment: RenderedComment) => (
                      <div key={comment.id} className="flex gap-3">
                        <div 
                          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ 
                            backgroundColor: `hsl(${(comment.createdBy.charCodeAt(0) * 137) % 360}, 70%, 50%)`
                          }}
                        >
                          {comment.createdBy.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                            <span className="text-sm font-medium text-slate-900 dark:text-slate-50">
                              {comment.createdBy.substring(0, 8)}...
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {new Date(comment.createdAt).toLocaleDateString()}
                              {new Date(comment.updatedAt).getTime() - new Date(comment.createdAt).getTime() > 1000 && (
                                <span className="ml-1 italic">(edited)</span>
                              )}
                            </span>
                            {loaderData.accountId === comment.createdBy && (() => {
                              const commentAge = Date.now() - new Date(comment.createdAt).getTime();
                              const canEdit = commentAge < COMMENT_EDIT_THRESHOLD_MS;
                              
                              return canEdit ? (
                                <>
                                  <button
                                    onClick={() => setEditingCommentId(comment.id)}
                                    className="text-xs text-blue-500 hover:text-blue-600"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (confirm('Delete this comment?')) {
                                        commentFetcher.submit(
                                          { intent: INTENTS.deleteComment, commentId: comment.id },
                                          { method: 'post' }
                                        );
                                      }
                                    }}
                                    disabled={commentFetcher.state !== "idle"}
                                    className="text-xs text-red-500 hover:text-red-600 disabled:opacity-50"
                                  >
                                    Delete
                                  </button>
                                </>
                              ) : null;
                            })()}
                          </div>
                          {editingCommentId === comment.id ? (
                            <commentFetcher.Form 
                              method="post" 
                              className="mt-2"
                              key={comment.id}
                              onSubmit={() => {
                                // Close edit mode after form submits
                                setTimeout(() => setEditingCommentId(null), 100);
                              }}
                            >
                              <input type="hidden" name="intent" value={INTENTS.updateComment} />
                              <input type="hidden" name="commentId" value={comment.id} />
                              <Textarea
                                name="content"
                                defaultValue={comment.content}
                                className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-50 rounded resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                rows={2}
                                required
                                autoFocus
                              />
                              <div className="flex gap-2 mt-2">
                                <button
                                  type="submit"
                                  disabled={commentFetcher.state !== "idle"}
                                  className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded transition-colors disabled:opacity-50"
                                >
                                  {commentFetcher.state !== "idle" ? "Saving..." : "Save"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingCommentId(null)}
                                  className="px-3 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </commentFetcher.Form>
                          ) : (
                            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words">
                              {comment.content}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400 italic">No comments yet</p>
                  )}
                </div>

                {/* Add Comment Form */}
                <commentFetcher.Form 
                  method="post" 
                  className="flex gap-2"
                  key={commentFetcher.state === "idle" && commentFetcher.data?.success ? Date.now() : undefined}
                >
                  <input type="hidden" name="intent" value={INTENTS.createComment} />
                  <Textarea
                    name="content"
                    placeholder="Add a comment..."
                    className="flex-1 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-50 rounded resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    rows={2}
                    required
                  />
                  <button
                    type="submit"
                    disabled={commentFetcher.state !== "idle"}
                    className="self-end px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded transition-colors disabled:opacity-50"
                  >
                    {commentFetcher.state !== "idle" ? "Posting..." : "Post"}
                  </button>
                </commentFetcher.Form>
              </div>
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
