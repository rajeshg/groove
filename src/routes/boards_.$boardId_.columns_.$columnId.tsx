"use client";

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { eq } from "@tanstack/db";
import { generateId } from "~/lib/id";
import {
  boardsCollection,
  columnsCollection,
  itemsCollection,
} from "~/db/collections";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { ArrowLeft, Settings, Plus, Inbox } from "lucide-react";
import { KanbanCard } from "~/components/KanbanCard";
import { useAuth } from "~/components/auth/AuthProvider";
import { itemsCollection as itemsCol } from "~/db/collections";
import { toast } from "sonner";

export const Route = createFileRoute("/boards_/$boardId_/columns_/$columnId")({
  component: ColumnDetailPage,
});

function ColumnDetailPage() {
  const { boardId, columnId } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showNewCardForm, setShowNewCardForm] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [newCardContent, setNewCardContent] = useState("");
  const [isSubmittingCard, setIsSubmittingCard] = useState(false);

  // Live query for board
  const { data: boardData } = useLiveQuery((q) =>
    q
      .from({ board: boardsCollection })
      .where(({ board }) => eq(board.id, boardId))
  );

  // Live query for column
  const { data: columnData } = useLiveQuery((q) =>
    q
      .from({ column: columnsCollection })
      .where(({ column }) => eq(column.id, columnId))
  );

  // Live query for items in this column
  const { data: itemsData } = useLiveQuery((q) =>
    q
      .from({ item: itemsCollection })
      .where(({ item }) => eq(item.columnId, columnId))
      .orderBy(({ item }) => [{ by: item.order, direction: "asc" }])
  );

  const board = boardData?.[0];
  const column = columnData?.[0];
  const items = (itemsData || []).sort((a: any, b: any) => a.order - b.order);

  if (!board || !column) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-8">
        <Card className="max-w-md mx-auto p-8 text-center">
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Column not found
          </p>
          <Button onClick={() => navigate({ to: "/boards" })}>
            Back to Boards
          </Button>
        </Card>
      </div>
    );
  }

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newCardTitle.trim()) {
      toast.error("Card title is required");
      return;
    }

    if (!user?.id) {
      toast.error("Account ID is required");
      return;
    }

    setIsSubmittingCard(true);

    try {
      const nextOrder =
        items.length === 0
          ? 1
          : Math.max(...items.map((i: any) => i.order)) + 1;

      itemsCol.insert({
        id: generateId(),
        boardId,
        columnId,
        title: newCardTitle,
        content: newCardContent || null,
        order: nextOrder,
        createdBy: user.id,
        assigneeId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      } as any);

      toast.success("Card created!");
      setNewCardTitle("");
      setNewCardContent("");
      setShowNewCardForm(false);
    } catch (err) {
      toast.error("Failed to create card");
      console.error(err);
    } finally {
      setIsSubmittingCard(false);
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm p-3 md:p-4 z-10">
        <div className="max-w-4xl mx-auto">
          {/* Mobile Header */}
          <div className="md:hidden flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  navigate({ to: "/boards/$boardId", params: { boardId } })
                }
                className="flex items-center gap-1 px-2 flex-shrink-0"
              >
                <ArrowLeft size={16} />
              </Button>
              <div
                className="w-3 h-3 rounded-full shadow-sm flex-shrink-0"
                style={{ backgroundColor: column.color || "#94a3b8" }}
              />
              <h2 className="font-black text-slate-950 dark:text-slate-50 text-sm uppercase truncate">
                {column.name}
              </h2>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  navigate({
                    to: "/boards/$boardId/columns/$columnId/settings",
                    params: { boardId, columnId },
                  })
                }
                className="p-2 rounded-lg"
                title="Column Settings"
              >
                <Settings size={16} />
              </Button>
              <div className="flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700">
                <span className="text-sm font-bold text-slate-900 dark:text-slate-50">
                  {items.length}
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Header */}
          <div className="hidden md:grid grid-cols-[auto_1fr_auto] items-center gap-4">
            {/* Left: Back button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                navigate({ to: "/boards/$boardId", params: { boardId } })
              }
              className="flex items-center gap-2"
            >
              <ArrowLeft size={18} />
              Back
            </Button>

            {/* Center: Column name with color */}
            <div className="flex items-center justify-center gap-3">
              <div
                className="w-3 h-3 rounded-full shadow-sm flex-shrink-0"
                style={{ backgroundColor: column.color || "#94a3b8" }}
              />
              <h2 className="font-black text-slate-950 dark:text-slate-50 text-lg uppercase truncate">
                {column.name}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  navigate({
                    to: "/boards/$boardId/columns/$columnId/settings",
                    params: { boardId, columnId },
                  })
                }
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Column Settings"
              >
                <Settings size={18} />
              </Button>
            </div>

            {/* Right: Card count */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700">
              <span className="text-sm font-bold text-slate-900 dark:text-slate-50">
                {items.length}
              </span>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {items.length === 1 ? "card" : "cards"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Add Card Section */}
          <Card className="border-2 border-slate-200 dark:border-slate-800">
            {showNewCardForm ? (
              <form onSubmit={handleCreateCard} className="p-4 space-y-3">
                <input
                  type="text"
                  value={newCardTitle}
                  onChange={(e) => setNewCardTitle(e.target.value)}
                  placeholder="Card title..."
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                  disabled={isSubmittingCard}
                />
                <textarea
                  value={newCardContent}
                  onChange={(e) => setNewCardContent(e.target.value)}
                  placeholder="Card description (optional)..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  disabled={isSubmittingCard}
                />
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSubmittingCard}
                    className="flex-1 w-full"
                  >
                    {isSubmittingCard ? "Adding..." : "Add Card"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowNewCardForm(false);
                      setNewCardTitle("");
                      setNewCardContent("");
                    }}
                    disabled={isSubmittingCard}
                    className="flex-1 w-full"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setShowNewCardForm(true)}
                className="w-full flex items-center gap-2 p-4 text-left font-bold text-slate-900 dark:text-slate-50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors rounded-lg"
              >
                <Plus size={20} />
                <span>Add a card</span>
              </button>
            )}
          </Card>

          {/* Cards List */}
          {items.length === 0 ? (
            <Card className="p-10">
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                <Inbox className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No cards in this column yet</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-2">
              {items.map((item: any) => (
                <KanbanCard
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  content={item.content}
                  boardId={boardId}
                  onDelete={() => {
                    itemsCol.delete(item.id);
                    toast.success("Card deleted");
                  }}
                  assignee={null}
                  createdBy={item.createdBy}
                  createdByUser={
                    item.createdByUser
                      ? {
                          id: item.createdByUser.id || null,
                          firstName: item.createdByUser.firstName || null,
                          lastName: item.createdByUser.lastName || null,
                          email: item.createdByUser.email || null,
                        }
                      : null
                  }
                  createdAt={item.createdAt}
                  updatedAt={item.updatedAt}
                  lastActiveAt={item.lastActiveAt}
                  columnColor={column.color}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
