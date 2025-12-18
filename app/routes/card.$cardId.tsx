import { useNavigate, useFetcher, useLoaderData, useParams } from "react-router";
import { useState, useRef } from "react";
import invariant from "tiny-invariant";

import { Textarea } from "../components/textarea";
import { Input } from "../components/input";
import { CardMeta } from "./board/card-meta";
import { BoardHeader } from "./board/board-header";
import { INTENTS, type RenderedComment } from "./types";
import type { Column } from "@prisma/client";

export async function loader({
  request,
  params,
}: {
  request: Request;
  params: Record<string, string>;
}) {
  const { requireAuthCookie } = await import("../auth/auth");
  const { notFound, badRequest } = await import("../http/bad-request");
  const { prisma } = await import("../db/prisma");

  const accountId = await requireAuthCookie(request);
  invariant(params.cardId, "Missing card ID");

  const card = await prisma.item.findUnique({
    where: { id: params.cardId },
    include: {
      Column: true,
      Board: true,
      comments: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!card) throw notFound();
  if (card.Board.accountId !== accountId) throw badRequest("Unauthorized");

  const columns = await prisma.column.findMany({
    where: { boardId: card.Board.id },
    orderBy: { order: "asc" },
  });

  return {
    card,
    boardName: card.Board.name,
    boardId: card.Board.id,
    columns,
    accountId,
  };
}

export default function CardDetail() {
  const { cardId } = useParams();
  const navigate = useNavigate();
  const editFetcher = useFetcher();
  const loaderData = useLoaderData<typeof loader>();

  invariant(cardId, "Missing card ID");
  if (!loaderData || !loaderData.card) return null;

  const { card, boardName, boardId, columns } = loaderData;
  const [editMode, setEditMode] = useState(false);
  const [editTitleMode, setEditTitleMode] = useState(false);
  const contentInputRef = useRef<HTMLTextAreaElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [localContent, setLocalContent] = useState(card.content);
  const [localTitle, setLocalTitle] = useState(card.title);
  const [localColumnId, setLocalColumnId] = useState(card.columnId);

  const currentColumn = columns.find((col: Column) => col.id === localColumnId);
  const columnColor = currentColumn?.color || "#94a3b8";

  const submitContentEdit = () => {
    const val = contentInputRef.current?.value || "";
    if (val === (card.content || "")) return;
    editFetcher.submit(
      { intent: INTENTS.updateItem, id: cardId, columnId: localColumnId, title: localTitle, order: String(card.order), content: val },
      { method: "post", action: `/board/${boardId}` }
    );
    setLocalContent(val);
  };

  const submitTitleEdit = () => {
    const val = titleInputRef.current?.value?.trim() || "";
    if (val === card.title || val === "") return;
    editFetcher.submit(
      { intent: INTENTS.updateItem, id: cardId, columnId: localColumnId, title: val, order: String(card.order), content: localContent || "" },
      { method: "post", action: `/board/${boardId}` }
    );
    setLocalTitle(val);
  };

  const changeColumn = (newColumnId: string) => {
    editFetcher.submit(
      { intent: INTENTS.updateItem, id: cardId, columnId: newColumnId, title: localTitle, order: String(card.order), content: localContent || "" },
      { method: "post", action: `/board/${boardId}` }
    );
    setLocalColumnId(newColumnId);
  };

  const containerBgColor = `color-mix(in srgb, ${columnColor} 33%, #f8fafc)`;
  
  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#f1f5f9] dark:bg-slate-900 text-slate-900 dark:text-slate-50">
      <BoardHeader />
      
      <div className="flex-1 overflow-y-auto px-4 py-8">
        <div className="max-w-[1120px] mx-auto">
          <div className="mb-6 flex justify-center">
            <button
              onClick={() => navigate(-1)}
              className="px-5 py-2.5 text-sm font-semibold rounded-full bg-white text-slate-700 border-2 transition-all shadow-md hover:opacity-90 dark:bg-slate-800 dark:text-slate-200"
              style={{ color: `color-mix(in srgb, ${columnColor} 40%, #1e293b)`, borderColor: columnColor }}
            >
              ← Back to {boardName}
            </button>
          </div>

          <div className="md:grid md:gap-4 relative" style={{ gridTemplateColumns: '48px minmax(0, 1fr) 48px', gridTemplateAreas: '"actions-left card actions-right"' }}>
            <div className="hidden md:block" style={{ gridArea: 'actions-left' }} />
            <div style={{ gridArea: 'card', backgroundColor: containerBgColor }} className="md:rounded-xl md:shadow-xl w-full">
              <article className="bg-white dark:bg-slate-800 md:rounded-lg md:shadow-sm overflow-hidden">
                <div className="p-4 sm:p-6 flex flex-col lg:flex-row gap-4 sm:gap-6 items-start justify-between">
                  <div className="flex-1 flex flex-col gap-4 w-full lg:w-auto lg:min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="inline-block px-2 py-1 text-xs font-bold text-white rounded" style={{ backgroundColor: columnColor }}>
                        No. {card.id.substring(0, 4).toUpperCase()}
                      </span>
                      <span className="text-xs font-semibold uppercase text-slate-600 dark:text-slate-400">{currentColumn?.name}</span>
                    </div>

                    <div>
                      {editTitleMode ? (
                        <div onBlur={() => { submitTitleEdit(); setEditTitleMode(false); }}>
                          <Input ref={titleInputRef} type="text" defaultValue={localTitle} className="block w-full border-2 border-blue-500 bg-white dark:bg-slate-700 px-2 py-1 text-2xl font-bold text-slate-900 dark:text-slate-50 rounded" autoFocus />
                        </div>
                      ) : (
                        <h1 onClick={() => setEditTitleMode(true)} className="text-2xl font-bold cursor-text hover:bg-slate-50 dark:hover:bg-slate-700 rounded px-2 py-1 -mx-2 transition-colors">{localTitle}</h1>
                      )}
                    </div>

                    <div className="flex-1">
                      {editMode ? (
                        <div onBlur={() => { submitContentEdit(); setEditMode(false); }}>
                          <Textarea ref={contentInputRef} defaultValue={localContent || ""} className="block w-full border border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-50 rounded min-h-[200px] md:min-h-[300px]" autoFocus />
                        </div>
                      ) : (
                        <div onClick={() => setEditMode(true)} className="min-h-[200px] md:min-h-[300px] p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded cursor-text hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors whitespace-pre-wrap break-words text-sm">
                          {localContent || <span className="italic text-slate-400">Click to add description...</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col w-full sm:w-auto border border-solid rounded overflow-hidden sm:border-0" style={{ borderColor: columnColor }}>
                    {columns.map((column: Column) => {
                      const isActive = column.id === localColumnId;
                      return (
                        <button key={column.id} onClick={() => changeColumn(column.id)} className="px-3 py-2 text-xs font-semibold uppercase text-left hover:opacity-90 sm:rounded" style={{ backgroundColor: isActive ? column.color : 'transparent', color: isActive ? '#fff' : 'inherit' }}>
                          {column.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="p-4 sm:px-6 border-t border-slate-200 dark:border-slate-700">
                  <CardMeta createdBy={card.createdBy || null} assignedTo={card.assignedTo || null} createdAt={new Date(card.createdAt)} updatedAt={new Date(card.updatedAt)} columnColor={columnColor} />
                </div>

                <div className="p-4 sm:px-6 border-t border-slate-200 dark:border-slate-700">
                  <h3 className="text-sm font-semibold mb-4">Comments</h3>
                  <div className="space-y-4 mb-4">
                    {card.comments?.map((comment: RenderedComment) => (
                      <div key={comment.id} className="flex gap-3 text-sm">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: `hsl(${(comment.createdBy.charCodeAt(0) * 137) % 360}, 70%, 50%)` }}>
                          {comment.createdBy.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="font-medium">{comment.createdBy.substring(0, 8)}...</span>
                            <span className="text-xs text-slate-500">{new Date(comment.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="whitespace-pre-wrap break-words">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            </div>
            <div className="hidden md:block" style={{ gridArea: 'actions-right' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
