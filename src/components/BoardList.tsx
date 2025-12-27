"use client";

import { useNavigate, Link } from "@tanstack/react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { boardsCollection } from "~/db/collections";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { toast } from "sonner";
import { Trash2, Plus, LayoutDashboard } from "lucide-react";

interface BoardListProps {
  accountId: string;
}

export function BoardList({ accountId }: BoardListProps) {
  const navigate = useNavigate();

  // Live query for boards - shows all boards user has access to (owned + invited)
  // Server already filters via boardMembers join, no need to filter by accountId here
  const { data: boards } = useLiveQuery((q) =>
    q.from({ board: boardsCollection })
  );

  const handleDeleteBoard = (boardId: string, boardName: string) => {
    try {
      boardsCollection.delete(boardId);
      toast.success(`"${boardName}" deleted`);
    } catch (err) {
      toast.error("Failed to delete board");
      console.error(err);
    }
  };

  const filteredBoards = boards ?? [];

  return (
    <div className="flex flex-col items-center pb-12 overflow-x-hidden">
      {/* Background pattern */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: "24px 24px",
        }}
      />

      <div className="w-full max-w-[1600px] px-0 sm:px-4 relative z-10">
        {/* Header */}
        <header className="py-8 px-4 border-b border-slate-100 dark:border-slate-800 mb-8 flex justify-between items-center gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-1.5 bg-blue-600 rounded text-white flex-shrink-0">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50 truncate">
                My Boards
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 truncate">
                Manage and organize your project boards
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate({ to: "/boards/new" })}
            className="flex items-center gap-2 flex-shrink-0"
            size="sm"
          >
            <Plus size={18} />
            <span className="hidden xs:inline">New Board</span>
            <span className="xs:hidden">New</span>
          </Button>
        </header>

        {!filteredBoards || filteredBoards.length === 0 ? (
          <div className="px-4 pb-8">
            <Card className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border-slate-200 dark:border-slate-800">
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                No boards yet
              </p>
              <Button
                onClick={() => navigate({ to: "/boards/new" })}
                className="shadow-lg shadow-blue-500/20"
              >
                Create your first board
              </Button>
            </Card>
          </div>
        ) : (
          <div className="px-4 pb-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredBoards.map((board: any) => (
                <div
                  key={board.id}
                  className="group flex flex-col bg-white dark:bg-slate-900 rounded-xl shadow-sm hover:shadow-md border border-slate-200 dark:border-slate-800 transition-all overflow-hidden"
                >
                  <Link
                    to="/boards/$boardId"
                    params={{ boardId: board.id }}
                    className="p-4 flex flex-col h-full"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2 overflow-hidden flex-1">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: board.color || "#3b82f6" }}
                        />
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm line-clamp-1 group-hover:text-blue-600 transition-colors">
                          {board.name}
                        </h3>
                      </div>

                      {board.accountId === accountId && (
                        <button
                          className="p-1 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteBoard(board.id, board.name);
                          }}
                          title="Delete board"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
