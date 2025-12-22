import { useMatches, Link } from "react-router";
import { useRef, useEffect } from "react";
import { Icon } from "../../icons/icons";
import type { Board } from "../../../prisma/client";

interface BoardHeaderProps {
  searchTerm?: string;
  setSearchTerm?: (term: string) => void;
  title?: string;
}

/**
 * BoardHeader provides a consistent secondary toolbar across the site.
 * It displays the current context (Board Name, Profile, etc.) and a search bar.
 */
export function BoardHeader({
  searchTerm,
  setSearchTerm,
  title: propTitle,
}: BoardHeaderProps) {
  const matches = useMatches();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Handle 'f' key to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger on 'f' key, not when typing in input fields
      if (
        e.key === "f" &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(
          e.target instanceof HTMLDivElement &&
          (e.target as HTMLElement).closest('[role="textbox"]')
        )
      ) {
        if (searchInputRef.current) {
          e.preventDefault();
          e.stopPropagation();
          searchInputRef.current.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Try to find context from matches if not provided via props
  const boardMatch = matches.find((m) => m.id.includes("board.$id"));
  const cardMatch = matches.find((m) => m.id.includes("card.$cardId"));
  const profileMatch = matches.find((m) => m.id.includes("profile"));

  const board =
    (boardMatch?.data as unknown as { board?: Board })?.board ||
    (cardMatch?.data as unknown as { card?: { Board: Board } })?.card?.Board;

  const displayTitle =
    propTitle || (profileMatch ? "MY PROFILE" : board ? board.name : "");

  return (
    <div className="flex-shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md h-16">
      <div className="flex items-center h-full px-4 sm:px-10">
        {/* Left section: Board Actions */}
        <div className="flex-1 flex items-center justify-start min-w-0">
          {board && (
            <Link
              to={`/board/${board.id}/settings`}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white transition-all shadow-sm border border-slate-200 dark:border-slate-700 font-bold group shrink-0"
              title="Board Settings & Members"
            >
              <Icon
                name="cog"
                className="group-hover:rotate-90 transition-transform duration-500"
              />
              <span className="text-xs font-black uppercase tracking-widest hidden sm:inline">
                Settings
              </span>
            </Link>
          )}
        </div>

        {/* Center: Context Title (Centered) */}
        <div className="flex-[2] flex justify-center min-w-0 px-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <h1 className="text-base sm:text-lg font-black text-slate-950 dark:text-slate-50 uppercase tracking-tighter sm:tracking-normal truncate">
              {displayTitle}
            </h1>
          </div>
        </div>

        {/* Right section: Search */}
        <div className="flex-1 flex items-center justify-end min-w-0">
          {setSearchTerm !== undefined && (
            <div className="relative w-full max-w-[120px] sm:max-w-[220px]">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <Icon
                  name="search"
                  size="md"
                  className="scale-90 sm:scale-100"
                />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="SEARCH..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-8 sm:pl-9 pr-7 sm:pr-8 py-1.5 sm:py-2 text-sm sm:text-base font-bold border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-slate-950 dark:text-slate-50 placeholder:text-sm sm:placeholder:text-base placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-inner"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute inset-y-0 right-0 pr-1.5 sm:pr-2 flex items-center text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  <Icon
                    name="plus"
                    size="md"
                    className="rotate-45 scale-75 sm:scale-90"
                  />
                  <span className="sr-only">Clear search</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
