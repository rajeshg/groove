"use client";

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "~/components/auth/AuthProvider";
import { useLiveQuery } from "@tanstack/react-db";
import { boardsCollection, queryClient } from "~/db/collections";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { LayoutDashboard, ArrowLeft, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { getBoardTemplates } from "~/constants/templates";
import { ColorPicker } from "~/components/ColorPicker";
import { createBoard } from "~/server/actions/boards";

export const Route = createFileRoute("/boards/new")({
  component: NewBoardPage,
});

function NewBoardPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [boardName, setBoardName] = useState("");
  const [selectedColor, setSelectedColor] = useState("#2563eb");
  const [selectedTemplate, setSelectedTemplate] = useState("Default");
  const [isCreating, setIsCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const templates = getBoardTemplates();

  // Fetch all boards for the sidebar
  const { data: boardsData } = useLiveQuery((q) =>
    q.from({ board: boardsCollection })
  );
  const boards = boardsData || [];

  // Check if user is authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      navigate({ to: "/login" });
    }
  }, [user, isLoading, navigate]);

  // Auto-focus input field on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!boardName.trim()) {
      toast.error("Board name is required");
      return;
    }

    if (!user?.id) {
      toast.error("You must be logged in to create a board");
      return;
    }

    setIsCreating(true);

    try {
      // Call server function directly and wait for the server-generated ID
      const newBoard = await createBoard({
        data: {
          accountId: user.id,
          data: {
            name: boardName,
            color: selectedColor,
            template: selectedTemplate,
          },
        },
      });

      // Invalidate boards query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["boards"] });

      toast.success("Board created!");

      // Navigate to the new board using the server-generated ID
      navigate({ to: "/boards/$boardId", params: { boardId: newBoard.id } });
    } catch (err) {
      console.error("Failed to create board:", err);
      toast.error("Failed to create board");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteBoard = (boardId: string, boardName: string) => {
    if (!confirm(`Delete "${boardName}"?`)) return;

    try {
      boardsCollection.delete(boardId);
      toast.success("Board deleted");
    } catch (err) {
      console.error("Failed to delete board:", err);
      toast.error("Failed to delete board");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col items-center overflow-y-auto">
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
        <header className="py-6 px-4 border-b border-slate-100 dark:border-slate-800 mb-0 lg:mb-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-blue-600 rounded text-white">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">
              Create New Board
            </h1>
          </div>
          <Link
            to="/boards"
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Boards</span>
          </Link>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-8 items-start">
          {/* Sidebar: Your Boards */}
          <aside className="lg:col-span-4 xl:col-span-3 order-1 p-4 lg:p-0">
            <Card className="bg-slate-50 dark:bg-slate-900/40 rounded-2xl border-slate-200 dark:border-slate-800 p-5 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg text-slate-900 dark:text-slate-50 flex items-center gap-2">
                  Your Boards
                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded font-black uppercase tracking-widest">
                    {boards.length}
                  </span>
                </h2>
              </div>

              {boards.length === 0 ? (
                <div className="py-10 flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                  <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">
                    No boards found
                  </p>
                </div>
              ) : (
                <nav className="space-y-3">
                  {boards.map((board: any) => (
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
                              style={{ backgroundColor: board.color }}
                            />
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm line-clamp-1 group-hover:text-blue-600 transition-colors">
                              {board.name}
                            </h3>
                          </div>

                          {board.accountId === user.id && (
                            <button
                              className="p-1 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDeleteBoard(board.id, board.name);
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </Link>
                    </div>
                  ))}
                </nav>
              )}
            </Card>
          </aside>

          {/* Main: New Board Form */}
          <main className="lg:col-span-8 xl:col-span-9 order-2 p-4 lg:p-0">
            <Card className="bg-slate-50 dark:bg-slate-900/20 rounded-2xl border-slate-200 dark:border-slate-800 p-6 lg:p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="font-bold text-2xl text-slate-900 dark:text-slate-50 flex items-center gap-3">
                  Start a new board
                  <span className="h-px bg-slate-200 dark:bg-slate-800 flex-1 min-w-[50px] lg:min-w-[200px]" />
                </h2>
              </div>

              <form onSubmit={handleCreateBoard} className="space-y-8">
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                  {/* Left: Form Inputs */}
                  <div className="xl:col-span-4 space-y-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        What's the project name?
                      </Label>
                      <Input
                        ref={inputRef}
                        type="text"
                        placeholder="e.g. Vacation Planning"
                        value={boardName}
                        onChange={(e) => setBoardName(e.target.value)}
                        disabled={isCreating}
                        className="h-12 text-base font-medium rounded-xl border-slate-200 dark:border-slate-700 focus:border-blue-500"
                        required
                      />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        Pick a color
                      </Label>
                      <Card className="p-3 bg-white dark:bg-slate-900 rounded-xl border-slate-200 dark:border-slate-800 shadow-sm">
                        <ColorPicker
                          value={selectedColor}
                          onChange={setSelectedColor}
                        />
                      </Card>
                    </div>

                    <Button
                      type="submit"
                      disabled={isCreating || !boardName.trim()}
                      className="w-full h-12 text-base font-bold rounded-xl shadow-lg shadow-blue-500/20"
                    >
                      {isCreating ? "Creating..." : "Create Project"}
                    </Button>
                  </div>

                  {/* Right: Template Selection */}
                  <div className="xl:col-span-8 space-y-4">
                    <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      Select a workflow template
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
                      {templates.map((template) => (
                        <label
                          key={template.name}
                          className="relative group cursor-pointer"
                        >
                          <input
                            type="radio"
                            name="template"
                            value={template.name}
                            checked={selectedTemplate === template.name}
                            onChange={(e) => {
                              setSelectedTemplate(e.target.value);
                            }}
                            className="sr-only peer"
                            disabled={isCreating}
                          />

                          <div className="h-full p-4 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all peer-checked:ring-2 peer-checked:ring-blue-500 peer-checked:border-blue-500 group-hover:shadow-md">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-bold text-slate-900 dark:text-slate-50">
                                {template.name}
                              </span>
                              {selectedTemplate === template.name ? (
                                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                                  <Check className="w-3.5 h-3.5 text-white" />
                                </div>
                              ) : (
                                <div className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-600" />
                              )}
                            </div>

                            <div className="flex gap-1 mb-2">
                              {template.columns.map((col) => (
                                <div
                                  key={col.name}
                                  className="h-1.5 flex-1 rounded-full opacity-60"
                                  style={{ backgroundColor: col.color }}
                                />
                              ))}
                            </div>
                            <p className="text-[10px] text-slate-400 font-medium truncate">
                              {template.columns.map((c) => c.name).join(" • ")}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </form>
            </Card>
          </main>
        </div>
      </div>
    </div>
  );
}
