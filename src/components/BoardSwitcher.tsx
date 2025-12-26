"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  ChevronRight,
  Plus,
  Home,
  User,
  LayoutDashboard,
  Search,
} from "lucide-react";
import { Kbd } from "~/components/ui/kbd";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import { cn } from "~/lib/utils";

interface Board {
  id: string;
  name: string;
}

interface BoardSwitcherProps {
  currentBoardId?: string;
  allBoards: Board[];
  isLoading?: boolean;
}

export function BoardSwitcher({
  currentBoardId,
  allBoards,
  isLoading,
}: BoardSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuSearchTerm, setMenuSearchTerm] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();

  // Close menu when location changes
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Global "j" key listener to open menu
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      if (event.key.toLowerCase() === "j") {
        event.preventDefault();
        setIsOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const timeoutId = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen]);

  const filteredBoards = useMemo(() => {
    return allBoards.filter((board) =>
      board.name.toLowerCase().includes(menuSearchTerm.toLowerCase())
    );
  }, [allBoards, menuSearchTerm]);

  if (isLoading && !isOpen) {
    return (
      <div className="flex items-center gap-1.5 h-full px-1">
        <Skeleton className="hidden sm:inline-flex w-5 h-5 rounded" />
        <Skeleton className="w-4 h-4 rounded-full" />
      </div>
    );
  }

  return (
    <div className="inline-flex items-center h-full">
      {/* J shortcut badge */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 group h-full px-1"
      >
        <Kbd className="hidden sm:inline-flex text-[10px] font-bold">J</Kbd>
        <ChevronRight
          size={16}
          className={cn(
            "transition-transform duration-200 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200",
            isOpen ? "rotate-90 text-blue-500" : "rotate-0"
          )}
        />
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="p-0 border-none bg-white dark:bg-slate-800 shadow-2xl rounded-[32px] sm:max-w-[480px] overflow-hidden sm:top-20 sm:translate-y-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Jump to</DialogTitle>
            <DialogDescription>
              Search for boards or navigate to other pages
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col h-[80vh] sm:h-auto max-h-[600px]">
            {/* Search Header */}
            <div className="p-5 pb-2">
              <div className="relative group">
                <Search
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors"
                />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Jump to board..."
                  className="w-full pl-11 pr-4 py-3 text-base border-2 border-slate-100 dark:border-slate-700/50 rounded-2xl bg-slate-50 dark:bg-slate-900/50 focus:outline-none focus:ring-0 focus:border-blue-500 transition-all placeholder-slate-400 dark:placeholder-slate-500 font-medium"
                  value={menuSearchTerm}
                  onChange={(e) => setMenuSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-5 pb-6 pt-2 custom-scrollbar">
              {/* Top Grid Actions */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <MenuActionCard
                  icon={<Home size={22} />}
                  label="Home"
                  to="/"
                  active={location.pathname === "/"}
                  onClick={() => setIsOpen(false)}
                />
                <MenuActionCard
                  icon={<LayoutDashboard size={22} />}
                  label="Boards"
                  to="/boards"
                  active={location.pathname === "/boards"}
                  onClick={() => setIsOpen(false)}
                />
                <MenuActionCard
                  icon={<User size={22} />}
                  label="Profile"
                  to="/profile"
                  active={location.pathname === "/profile"}
                  onClick={() => setIsOpen(false)}
                />
              </div>

              {/* BOARDS Section */}
              <MenuSection label="Recent Boards">
                <Link
                  to="/boards/new"
                  className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors mb-1"
                  onClick={() => setIsOpen(false)}
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                    <Plus size={18} />
                  </div>
                  <span>Create new board</span>
                </Link>

                <div className="space-y-1 mt-2">
                  {filteredBoards.length > 0 ? (
                    filteredBoards.map((board) => (
                      <Link
                        key={board.id}
                        to="/boards/$boardId"
                        params={{ boardId: board.id }}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-all group",
                          board.id === currentBoardId
                            ? "text-blue-600 bg-blue-50 dark:bg-blue-900/30"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                        )}
                        onClick={() => setIsOpen(false)}
                      >
                        <div
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110",
                            board.id === currentBoardId
                              ? "bg-blue-100 dark:bg-blue-900/40"
                              : "bg-slate-100 dark:bg-slate-800"
                          )}
                        >
                          <LayoutDashboard size={16} className="opacity-70" />
                        </div>
                        <span className="truncate flex-1">{board.name}</span>
                        {board.id === currentBoardId && (
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                        )}
                      </Link>
                    ))
                  ) : (
                    <div className="py-8 text-center">
                      <p className="text-sm text-slate-400 dark:text-slate-500">
                        No boards found
                      </p>
                    </div>
                  )}
                </div>
              </MenuSection>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MenuActionCard({
  icon,
  label,
  to,
  active = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  to: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center h-24 rounded-2xl border-2 transition-all duration-300",
        active
          ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/25 scale-105 z-10"
          : "bg-slate-50 dark:bg-slate-900/40 border-transparent text-slate-600 dark:text-slate-400 hover:border-blue-500/50 dark:hover:border-blue-500/50 hover:bg-white dark:hover:bg-slate-800 hover:-translate-y-1"
      )}
    >
      <div
        className={cn(
          "mb-2",
          active ? "text-white" : "text-slate-400 dark:text-slate-500"
        )}
      >
        {icon}
      </div>
      <span
        className={cn(
          "text-[10px] font-black uppercase tracking-wider text-center leading-tight",
          active ? "text-white" : "text-slate-500 dark:text-slate-400"
        )}
      >
        {label}
      </span>
    </Link>
  );
}

function MenuSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-2">
      <div className="px-4 py-2 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
        {label}
      </div>
      <div className="mt-1">{children}</div>
    </div>
  );
}
