"use client";

import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { eq } from "@tanstack/db";
import {
  boardsCollection,
  columnsCollection,
  itemsCollection,
  assigneesCollection,
} from "~/db/collections";
import { generateId } from "~/lib/id";
import { KanbanBoard } from "~/components/KanbanBoard";
import { InviteBoardModal } from "~/components/InviteBoardModal";
import { CardSearch } from "~/components/CardSearch";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import {
  ArrowLeft,
  Plus,
  UserPlus,
  Settings,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "~/components/auth/AuthProvider";
import { Link } from "@tanstack/react-router";

interface BoardDetailPageProps {
  boardId: string;
}

export function BoardDetailPage({ boardId }: BoardDetailPageProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showNewColumnForm, setShowNewColumnForm] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [deletingColumnId, setDeletingColumnId] = useState<
    string | undefined
  >();
  const [renamingColumnId, setRenamingColumnId] = useState<
    string | undefined
  >();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Live query for the specific board
  const { data: boardData } = useLiveQuery((q) =>
    q
      .from({ board: boardsCollection })
      .where(({ board }) => eq(board.id, boardId))
  );

  // Live query for columns - automatically updates when data changes
  const { data: columnsData } = useLiveQuery((q) =>
    q
      .from({ column: columnsCollection })
      .where(({ column }) => eq(column.boardId, boardId))
      .orderBy(({ column }) => [{ by: column.order, direction: "asc" }])
  );

  // Live query for items - automatically updates when data changes
  const { data: itemsData } = useLiveQuery((q) =>
    q
      .from({ item: itemsCollection })
      .where(({ item }) => eq(item.boardId, boardId))
  );

  // Sort items by order in JavaScript instead of SQL
  const sortedItems = (itemsData || []).sort(
    (a: any, b: any) => a.order - b.order
  );

  // Live query for assignees in this board
  const { data: assigneesData } = useLiveQuery((q) =>
    q.from({ assignee: assigneesCollection })
  );

  const board = boardData?.[0];
  const columns = (columnsData || []).sort(
    (a: any, b: any) => a.order - b.order
  );
  const items = sortedItems;

  // Filter assignees by boardId on the client side
  const assignees = (assigneesData || []).filter(
    (a: any) => a.boardId === boardId
  );

  // Filter items based on search query
  const filteredItems =
    searchQuery.trim() === ""
      ? items
      : items.filter((item: any) => {
          const query = searchQuery.toLowerCase();
          const titleMatch = item.title?.toLowerCase().includes(query) || false;
          const contentMatch =
            item.content?.toLowerCase().includes(query) || false;

          // Get assignee name if exists
          const assignee = assignees.find((a: any) => a.id === item.assigneeId);
          const assigneeMatch =
            assignee?.name?.toLowerCase().includes(query) || false;

          return titleMatch || contentMatch || assigneeMatch;
        });

  if (!board) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <Card className="max-w-md mx-auto p-8 text-center">
          <p className="text-gray-600 mb-4">Board not found</p>
          <Button onClick={() => navigate({ to: "/boards" })}>
            Back to Boards
          </Button>
        </Card>
      </div>
    );
  }

  const handleCreateColumn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newColumnName.trim()) {
      toast.error("Column name is required");
      return;
    }

    if (!user?.id) {
      toast.error("Account ID is required");
      return;
    }

    try {
      // Optimistically create column with TanStack DB
      columnsCollection.insert({
        id: generateId(),
        boardId,
        name: newColumnName,
        color: "#94a3b8",
        order: columns.length,
        isDefault: false,
        isExpanded: true,
        shortcut: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any);

      toast.success("Column created!");
      setNewColumnName("");
      setShowNewColumnForm(false);
    } catch (err) {
      toast.error("Failed to create column");
      console.error(err);
    }
  };

  const handleDeleteColumn = async (columnId: string) => {
    if (!user?.id) {
      toast.error("Account ID is required");
      return;
    }

    setDeletingColumnId(columnId);

    try {
      // Optimistically delete column
      columnsCollection.delete(columnId);
      toast.success("Column deleted");
    } catch (err) {
      toast.error("Failed to delete column");
      console.error(err);
    } finally {
      setDeletingColumnId(undefined);
    }
  };

  const handleRenameColumn = async (columnId: string, newName: string) => {
    if (!user?.id) {
      toast.error("Account ID is required");
      return;
    }

    setRenamingColumnId(columnId);

    try {
      // Optimistically update column name using callback pattern
      columnsCollection.update(columnId, (draft) => {
        draft.name = newName;
      });
      toast.success("Column renamed!");
    } catch (err) {
      toast.error("Failed to rename column");
      console.error(err);
    } finally {
      setRenamingColumnId(undefined);
    }
  };

  const handleMoveItem = async (
    itemId: string,
    targetColumnId: string,
    order: number
  ) => {
    // Find the target column name for feedback
    const item = items.find((i: any) => i.id === itemId);
    const targetColumn = columns.find((c: any) => c.id === targetColumnId);

    // Optimistically update the item using callback pattern
    await itemsCollection.update(itemId, (draft) => {
      draft.columnId = targetColumnId;
      draft.order = order;
    });

    // Show success feedback if moved to a different column
    if (item && targetColumn && item.columnId !== targetColumnId) {
      toast.success(targetColumn.name, {
        duration: 1500,
        icon: "✓",
      });
    }
  };

  const handleAddItem = async (
    columnId: string,
    title: string,
    content?: string
  ) => {
    if (!user?.id) {
      toast.error("Account ID is required");
      return;
    }

    try {
      // Optimistically create item
      const itemsInColumn = items.filter(
        (item: any) => item.columnId === columnId
      );
      itemsCollection.insert({
        id: generateId(),
        boardId,
        columnId,
        title,
        content: content || "",
        order: itemsInColumn.length,
        createdBy: user.id,
        assigneeId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      } as any);

      toast.success("Item created!");
    } catch (err) {
      toast.error("Failed to create item");
      console.error(err);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!user?.id) {
      toast.error("Account ID is required");
      return;
    }

    try {
      // Optimistically delete item
      itemsCollection.delete(itemId);

      toast.success("Item deleted");
    } catch (error) {
      console.error("[Delete] Error:", error);
      toast.error("Failed to delete item");
    }
  };

  const handleToggleExpanded = async (columnId: string) => {
    if (!user?.id) {
      toast.error("Account ID is required");
      return;
    }

    try {
      // Find column and toggle its isExpanded state
      const column = columns.find((c: any) => c.id === columnId);
      if (!column) {
        console.error("[Toggle] Column not found:", columnId);
        return;
      }

      columnsCollection.update(columnId, (draft) => {
        draft.isExpanded = !column.isExpanded;
      });
    } catch (error) {
      console.error("[Toggle] Error:", error);
      toast.error("Failed to toggle column");
    }
  };

  const handleMoveColumn = async (columnId: string, newOrder: number) => {
    if (!user?.id) {
      toast.error("Account ID is required");
      return;
    }

    try {
      columnsCollection.update(columnId, (draft) => {
        draft.order = newOrder;
      });
    } catch (error) {
      console.error("[MoveColumn] Error:", error);
      toast.error("Failed to move column");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 relative">
      {/* Subtle grid pattern background */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: "24px 24px",
        }}
      />

      <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm p-3 sm:p-4 z-10 relative">
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate({ to: "/boards" })}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 flex-shrink-0"
              >
                <ArrowLeft size={18} />
                <span className="hidden sm:inline">Back</span>
              </Button>
              <h1 className="text-base sm:text-2xl font-bold text-slate-900 dark:text-slate-50 truncate">
                {board.name}
              </h1>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <Button
                variant="outline"
                onClick={() => navigate({ to: `/boards/${boardId}/settings` })}
                size="sm"
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3"
                title="Settings"
              >
                <Settings size={18} />
                <span className="hidden sm:inline">Settings</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowInviteModal(true)}
                size="sm"
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3"
                title="Invite"
              >
                <UserPlus size={18} />
                <span className="hidden sm:inline">Invite</span>
              </Button>
              <Button
                onClick={() => setShowNewColumnForm(!showNewColumnForm)}
                size="sm"
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3"
                title="Add Column"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">Add Column</span>
              </Button>
            </div>
          </div>

          {/* Search bar */}
          <div className="w-full">
            <CardSearch onSearchChange={setSearchQuery} />
          </div>
        </div>
      </div>

      {/* Board color indicator bar */}
      <div
        className="h-1 relative z-10"
        style={{ backgroundColor: board.color || "#3b82f6" }}
      />

      {showNewColumnForm && (
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 relative z-10">
          <div className="max-w-7xl mx-auto">
            <form onSubmit={handleCreateColumn} className="space-y-3">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Column Name
              </label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  placeholder="Enter column name..."
                  autoFocus
                  className="flex-1"
                />
                <Button type="submit" disabled={!newColumnName.trim()}>
                  Create
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowNewColumnForm(false);
                    setNewColumnName("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Desktop View - Kanban Board (hidden on mobile) */}
      <div className="hidden md:block p-8 relative z-10">
        {columns.length === 0 ? (
          <div className="max-w-7xl mx-auto">
            <Card className="p-12 text-center bg-white dark:bg-slate-900">
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                No columns yet. Create one to get started.
              </p>
              <Button onClick={() => setShowNewColumnForm(true)}>
                Create your first column
              </Button>
            </Card>
          </div>
        ) : (
          <KanbanBoard
            columns={columns as any}
            items={filteredItems as any}
            onMoveItem={handleMoveItem}
            onMoveColumn={handleMoveColumn}
            onAddItem={handleAddItem}
            onDeleteItem={handleDeleteItem}
            onDeleteColumn={handleDeleteColumn}
            onRenameColumn={handleRenameColumn}
            onToggleExpanded={handleToggleExpanded}
            deletingColumnId={deletingColumnId}
            renamingColumnId={renamingColumnId}
            boardId={boardId}
            assignees={assignees as any}
          />
        )}
      </div>

      {/* Mobile View - Vertical Column Cards (hidden on desktop) */}
      <div className="md:hidden flex-1 overflow-y-auto px-4 py-6 relative z-10">
        {columns.length === 0 ? (
          <Card className="p-8 text-center bg-white dark:bg-slate-900">
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              No columns yet. Create one to get started.
            </p>
            <Button onClick={() => setShowNewColumnForm(true)}>
              Create your first column
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {columns.map((col: any) => {
              const columnItems = filteredItems.filter(
                (item: any) => item.columnId === col.id
              );
              const cardCount = columnItems.length;
              // Calculate progress percent (0-100%) based on card count
              // Max out at 20 cards = 100%, proportional below that
              const progressPercent = Math.min((cardCount / 20) * 100, 100);

              return (
                <div key={col.id} className="relative group">
                  <Link
                    to={`/boards/$boardId/columns/$columnId`}
                    params={{ boardId, columnId: col.id }}
                    className="column-mobile-card block"
                    style={
                      {
                        color: col.color || "#94a3b8",
                        "--card-progress-width": `${progressPercent}%`,
                        "--text-color": "#ffffff",
                      } as React.CSSProperties & { [key: string]: string }
                    }
                  >
                    <div className="column-mobile-card-content">
                      <div className="column-mobile-card-count">
                        {cardCount > 99 ? "99+" : cardCount}
                      </div>
                      <div className="column-mobile-card-name">{col.name}</div>
                    </div>
                    <div className="column-mobile-card-icon">
                      <ChevronRight size={20} />
                    </div>
                  </Link>

                  {/* Settings quick access on mobile cards */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      navigate({
                        to: "/boards/$boardId/columns/$columnId/settings",
                        params: { boardId, columnId: col.id },
                      });
                    }}
                    className="absolute right-12 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 z-20 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Settings size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {user?.id && (
        <InviteBoardModal
          boardId={boardId}
          accountId={user.id}
          open={showInviteModal}
          onOpenChange={setShowInviteModal}
          user={user}
        />
      )}
    </div>
  );
}
