import { useMatches, Link } from "react-router";
import { useRef, useEffect } from "react";
import { Icon } from "../../icons/icons";
import { EditableText } from "./components";
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

  const isEditable = !!board && !profileMatch && !cardMatch;

  return (
    <div className="flex-shrink-0 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 h-14">
      <div className="grid grid-cols-3 items-center h-full px-4 sm:px-8">
        {/* Left section: Switcher (only on board pages) */}
        <div className="flex items-center">
          {board && (
            <Link
              to={`/board/${board.id}/members`}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors shadow-sm border border-blue-100 dark:border-blue-800"
              title="Manage board members"
            >
              <Icon name="user" />
              <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">
                Invite
              </span>
            </Link>
          )}
        </div>

        {/* Center: Context Title (Centered) */}
        <div className="flex justify-center min-w-0">
          <h1 className="text-[10px] sm:text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-[0.1em] sm:tracking-[0.2em]">
            {isEditable ? (
              <EditableText
                value={displayTitle}
                fieldName="name"
                inputClassName="text-[10px] sm:text-sm font-bold border border-slate-400 rounded py-0.5 px-2 text-black dark:text-white dark:bg-slate-700 uppercase text-center w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                buttonClassName="block rounded text-center border border-transparent py-1 px-2 sm:px-3 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors truncate"
                buttonLabel={`Edit board "${displayTitle}" name`}
                inputLabel="Edit board name"
                placeholder="Board name..."
                action="/resources/update-board-name"
                hiddenFields={{
                  boardId: String(board.id),
                }}
              >
                <></>
              </EditableText>
            ) : (
              <span className="py-1 px-2 sm:px-3 block truncate">
                {displayTitle}
              </span>
            )}
          </h1>
        </div>

        {/* Right section: Search (Only if search props are provided) */}
        <div className="flex items-center justify-end">
          {setSearchTerm !== undefined && (
            <div className="relative w-full max-w-[120px] sm:max-w-[180px]">
              <div className="absolute inset-y-0 left-0 pl-2 sm:pl-2.5 flex items-center pointer-events-none text-slate-400">
                <Icon name="search" size="md" />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="SEARCH"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-7 sm:pl-8 pr-7 py-1.5 text-[9px] sm:text-[10px] font-medium border border-slate-200 dark:border-slate-700 rounded-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute inset-y-0 right-0 pr-1.5 sm:pr-2 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <Icon
                    name="plus"
                    size="md"
                    className="rotate-45 scale-75 sm:scale-100"
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
