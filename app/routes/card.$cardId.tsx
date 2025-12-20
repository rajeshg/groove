import { useNavigate, useFetcher, useParams } from "react-router";
import { useState, useRef } from "react";
import { invariant } from "@epic-web/invariant";

import { CardDescriptionEditor } from "../components/CardDescriptionEditor";
import { Input } from "../components/input";
import { CardMeta } from "./board/card-meta";
import { BoardHeader } from "./board/board-header";
import { EditableComment } from "./board/components";
import { INTENTS, type RenderedComment } from "./types";
import type { Column } from "../../prisma/client";
import { getInitials, getAvatarColor, getDisplayName } from "../utils/avatar";
import type { Route } from "./+types/card.$cardId";

import { requireAuthCookie } from "../auth/auth";
import { notFound, badRequest } from "../http/bad-request";
import { prisma } from "../../prisma/client";
import { assertBoardAccess } from "../utils/permissions";
import { updateComment, deleteComment, createComment } from "./queries";

export async function loader({
  request,
  params,
}: {
  request: Request;
  params: Record<string, string>;
}) {
  const accountId = await requireAuthCookie(request);
  invariant(params.cardId, "Missing card ID");

  const card = await prisma.item.findUnique({
    where: { id: params.cardId },
    include: {
      Column: true,
      Board: {
        include: {
          members: true,
        },
      },
      Assignee: { select: { id: true, name: true, userId: true } },
      createdByUser: {
        select: { id: true, firstName: true, lastName: true },
      },
      comments: {
        include: {
          createdByUser: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!card) throw notFound();

  // Check if user has access to this board (owner or member)
  assertBoardAccess(card.Board as unknown, accountId);

  const columns = await prisma.column.findMany({
    where: { boardId: card.Board.id },
    orderBy: { order: "asc" },
  });

  const assignees = await prisma.assignee.findMany({
    where: { boardId: card.Board.id },
    select: { id: true, name: true, userId: true },
    orderBy: { name: "asc" },
  });

  return {
    card,
    boardName: card.Board.name,
    boardId: card.Board.id,
    columns,
    accountId,
    assignees,
  };
}

export async function action({
  request,
  params,
}: {
  request: Request;
  params: Record<string, string>;
}) {
  const accountId = await requireAuthCookie(request);
  const cardId = params.cardId;
  invariant(cardId, "Missing card ID");

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === INTENTS.createComment) {
    const content = formData.get("content");
    if (!content || typeof content !== "string" || !content.trim()) {
      throw badRequest("Comment content is required");
    }
    await createComment(cardId, content, accountId, accountId);
  } else if (intent === INTENTS.updateComment) {
    const commentId = formData.get("commentId");
    const content = formData.get("content");
    if (!commentId || typeof commentId !== "string") {
      throw badRequest("Missing comment ID");
    }
    if (!content || typeof content !== "string" || !content.trim()) {
      throw badRequest("Comment content is required");
    }
    await updateComment(commentId, content, accountId);
  } else if (intent === INTENTS.deleteComment) {
    const commentId = formData.get("commentId");
    if (!commentId || typeof commentId !== "string") {
      throw badRequest("Missing comment ID");
    }
    await deleteComment(commentId, accountId);
  }

  return { success: true };
}

export default function CardDetail({ loaderData }: Route.ComponentProps) {
  const { cardId } = useParams();
  const navigate = useNavigate();
  const editFetcher = useFetcher();
  const commentFetcher = useFetcher();

  invariant(cardId, "Missing card ID");
  if (!loaderData || !loaderData.card) return null;

  const { card, boardName, boardId, columns, assignees } = loaderData;
  const [editMode, setEditMode] = useState(false);
  const [editTitleMode, setEditTitleMode] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [localContent, setLocalContent] = useState(card.content);
  const [localTitle, setLocalTitle] = useState(card.title);
  const [localColumnId, setLocalColumnId] = useState(card.columnId);
  const [commentInput, setCommentInput] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);

  const currentColumn = columns.find((col: Column) => col.id === localColumnId);
  const columnColor = currentColumn?.color || "#94a3b8";

  const submitContentEdit = (newContent: string) => {
    if (newContent === (card.content || "")) {
      return true; // No changes, just return true to exit edit mode
    }
    editFetcher.submit(
      {
        intent: INTENTS.updateItem,
        id: cardId,
        columnId: localColumnId,
        title: localTitle,
        order: String(card.order),
        content: newContent,
      },
      { method: "post", action: `/board/${boardId}` }
    );
    setLocalContent(newContent);
    return true;
  };

  const submitTitleEdit = () => {
    const val = titleInputRef.current?.value?.trim() || "";
    if (val === card.title || val === "") return;
    editFetcher.submit(
      {
        intent: INTENTS.updateItem,
        id: cardId,
        columnId: localColumnId,
        title: val,
        order: String(card.order),
        content: localContent || "",
      },
      { method: "post", action: `/board/${boardId}` }
    );
    setLocalTitle(val);
  };

  const changeColumn = (newColumnId: string) => {
    const actionUrl = `/board/${boardId}`;
    console.log('🔍 Debug - changeColumn:', {
      cardId,
      newColumnId,
      boardId,
      actionUrl,
      localTitle,
      cardOrder: card.order
    });

    editFetcher.submit(
      {
        intent: INTENTS.updateItem,
        id: cardId,
        columnId: newColumnId,
        title: localTitle,
        order: String(card.order),
        content: localContent || "",
      },
      { method: "post", action: actionUrl }
    );
    setLocalColumnId(newColumnId);
  };

  const containerBgColor = `color-mix(in srgb, ${columnColor} 33%, #f8fafc)`;

  // Helper function to check if a comment is editable (within 15 minutes)
  const isCommentEditable = (createdAt: Date) => {
    const FIFTEEN_MINUTES = 15 * 60 * 1000;
    return Date.now() - new Date(createdAt).getTime() < FIFTEEN_MINUTES;
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#f1f5f9] dark:bg-slate-900 text-slate-900 dark:text-slate-50">
      <BoardHeader />

      <div className="flex-1 overflow-y-auto px-4 py-8">
        <div className="max-w-[1120px] mx-auto">
          <div className="mb-6 flex justify-center">
            <button
              onClick={() => navigate(-1)}
              className="px-5 py-2.5 text-sm font-semibold rounded-full bg-white text-slate-700 border-2 transition-all shadow-md hover:opacity-90 dark:bg-slate-800 dark:text-slate-200"
              style={{
                color: `color-mix(in srgb, ${columnColor} 40%, #1e293b)`,
                borderColor: columnColor,
              }}
            >
              ← Back to {boardName}
            </button>
          </div>

          <div
            className="md:grid md:gap-4 relative"
            style={{
              gridTemplateColumns: "48px minmax(0, 1fr) 48px",
              gridTemplateAreas: '"actions-left card actions-right"',
            }}
          >
            <div
              className="hidden md:block"
              style={{ gridArea: "actions-left" }}
            />
            <div
              style={{ gridArea: "card", backgroundColor: containerBgColor }}
              className="md:rounded-xl md:shadow-xl w-full"
            >
              <article className="bg-white dark:bg-slate-800 md:rounded-lg md:shadow-sm overflow-hidden">
                <div className="p-4 sm:p-6 flex flex-col lg:flex-row gap-4 sm:gap-6 items-start justify-between">
                  <div className="flex-1 flex flex-col gap-4 w-full lg:w-auto lg:min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block px-2 py-1 text-xs font-bold text-white rounded"
                        style={{ backgroundColor: columnColor }}
                      >
                        No. {card.id.substring(0, 4).toUpperCase()}
                      </span>
                      <span className="text-xs font-semibold uppercase text-slate-600 dark:text-slate-400">
                        {currentColumn?.name}
                      </span>
                    </div>

                    <div>
                      {editTitleMode ? (
                        <div
                          onBlur={() => {
                            submitTitleEdit();
                            setEditTitleMode(false);
                          }}
                        >
                          <Input
                            ref={titleInputRef}
                            type="text"
                            defaultValue={localTitle}
                            className="block w-full border-2 border-blue-500 bg-white dark:bg-slate-700 px-2 py-1 text-2xl font-bold text-slate-900 dark:text-slate-50 rounded"
                            autoFocus
                          />
                        </div>
                      ) : (
                        <h1
                          onClick={() => setEditTitleMode(true)}
                          className="text-2xl font-bold cursor-text hover:bg-slate-50 dark:hover:bg-slate-700 rounded px-2 py-1 -mx-2 transition-colors"
                        >
                          {localTitle}
                        </h1>
                      )}
                    </div>

                    <div className="flex-1">
                      {editMode ? (
                        <div>
                          <CardDescriptionEditor
                            content={localContent || ""}
                            onChange={setLocalContent}
                            onBlur={(finalContent) => {
                              submitContentEdit(finalContent);
                              setEditMode(false);
                            }}
                            autoFocus
                          />
                          <button
                            onClick={() => {
                              submitContentEdit(localContent || "");
                              setEditMode(false);
                            }}
                            className="mt-3 px-4 py-2 bg-blue-500 text-white rounded text-sm font-medium hover:bg-blue-600 transition"
                          >
                            Done
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => setEditMode(true)}
                          className="min-h-[200px] md:min-h-[300px] p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded cursor-text hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors text-sm prose dark:prose-invert prose-sm max-w-none prose-headings:font-bold prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-p:text-sm prose-p:leading-6 prose-p:m-0 prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:underline prose-strong:font-semibold prose-code:bg-slate-100 dark:prose-code:bg-slate-600 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-pre:bg-slate-800 dark:prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-pre:p-3 prose-pre:rounded prose-blockquote:border-l-4 prose-blockquote:border-slate-300 dark:prose-blockquote:border-slate-600 prose-blockquote:pl-4 prose-blockquote:text-slate-600 dark:prose-blockquote:text-slate-400 prose-ul:list-disc prose-ul:pl-5 prose-ol:list-decimal prose-ol:pl-5 prose-li:my-1 prose-img:rounded prose-img:max-w-full"
                        >
                          {localContent ? (
                            <div
                              dangerouslySetInnerHTML={{ __html: localContent }}
                            />
                          ) : (
                            <span className="italic text-slate-400">
                              Click to add description...
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    className="flex flex-col w-full sm:w-auto border border-solid rounded overflow-hidden sm:border-0"
                    style={{ borderColor: columnColor }}
                  >
                    {columns.map((column: Column) => {
                      const isActive = column.id === localColumnId;
                      return (
                        <button
                          key={column.id}
                          onClick={() => changeColumn(column.id)}
                          className="px-3 py-2 text-xs font-semibold uppercase text-left hover:opacity-90 sm:rounded"
                          style={{
                            backgroundColor: isActive
                              ? column.color
                              : "transparent",
                            color: isActive ? "#fff" : "inherit",
                          }}
                        >
                          {column.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="p-4 sm:px-6 border-t border-slate-200 dark:border-slate-700">
                  <CardMeta
                    createdBy={card.createdBy || null}
                    createdByUser={card.createdByUser || null}
                    assignee={card.Assignee}
                    createdAt={new Date(card.createdAt)}
                    updatedAt={new Date(card.updatedAt)}
                    columnColor={columnColor}
                    itemId={cardId}
                    boardId={boardId}
                    availableAssignees={assignees}
                    isCardDetail={true}
                  />
                </div>

                <div className="p-4 sm:px-6 border-t border-slate-200 dark:border-slate-700">
                  <h3 className="text-sm font-semibold mb-4">Comments</h3>
                  <div className="space-y-4 mb-4">
                    {card.comments?.map((comment: RenderedComment) => {
                      const canEdit =
                        isCommentEditable(comment.createdAt) &&
                        comment.createdBy === loaderData.accountId;
                      const isEditing = editingCommentId === comment.id;
                      const displayName = comment.createdByUser
                        ? getDisplayName(comment.createdByUser)
                        : comment.createdBy
                          ? `User ${comment.createdBy.substring(0, 8)}`
                          : "Unknown User";
                      return (
                        <div key={comment.id} className="flex gap-3 text-sm">
                          <div
                            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                            style={{
                              backgroundColor: getAvatarColor(displayName),
                            }}
                          >
                            {getInitials(displayName)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-baseline gap-2 mb-1">
                              <span className="font-medium">{displayName}</span>
                              <span className="text-xs text-slate-500">
                                {new Date(
                                  comment.createdAt
                                ).toLocaleDateString()}
                              </span>
                            </div>
                            {isEditing ? (
                              <EditableComment
                                value={comment.content}
                                onSubmit={(newContent) => {
                                  commentFetcher.submit(
                                    {
                                      intent: INTENTS.updateComment,
                                      commentId: comment.id,
                                      content: newContent,
                                    },
                                    { method: "post" }
                                  );
                                  setEditingCommentId(null);
                                }}
                                onCancel={() => setEditingCommentId(null)}
                              />
                            ) : (
                              <>
                                <p className="whitespace-pre-wrap break-words mb-2">
                                  {comment.content}
                                </p>
                                {canEdit && (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => {
                                        setEditingCommentId(comment.id);
                                      }}
                                      className="text-xs text-blue-500 hover:text-blue-700 font-medium"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => {
                                        commentFetcher.submit(
                                          {
                                            intent: INTENTS.deleteComment,
                                            commentId: comment.id,
                                          },
                                          { method: "post" }
                                        );
                                      }}
                                      className="text-xs text-red-500 hover:text-red-700 font-medium"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <commentFetcher.Form method="post" className="flex gap-2">
                    <input
                      type="hidden"
                      name="intent"
                      value={INTENTS.createComment}
                    />
                    <Input
                      type="text"
                      name="content"
                      placeholder="Add a comment..."
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      className="flex-1 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && commentInput.trim()) {
                          commentFetcher.submit(
                            {
                              intent: INTENTS.createComment,
                              content: commentInput,
                            },
                            { method: "post" }
                          );
                          setCommentInput("");
                        }
                      }}
                    />
                    <button
                      type="submit"
                      disabled={
                        !commentInput.trim() ||
                        commentFetcher.state === "submitting"
                      }
                      className="px-3 py-1 text-sm font-medium rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      onClick={(e) => {
                        if (commentInput.trim()) {
                          commentFetcher.submit(
                            {
                              intent: INTENTS.createComment,
                              content: commentInput,
                            },
                            { method: "post" }
                          );
                          setCommentInput("");
                        } else {
                          e.preventDefault();
                        }
                      }}
                    >
                      Post
                    </button>
                  </commentFetcher.Form>
                </div>
              </article>
            </div>
            <div
              className="hidden md:block"
              style={{ gridArea: "actions-right" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
