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
    <div className="flex-shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md h-16">
      <div className="grid grid-cols-3 items-center h-full px-4 sm:px-10">
        {/* Left section: Switcher (only on board pages) */}
        <div className="flex items-center">
          {board && (
            <Link
              to={`/board/${board.id}/members`}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white transition-all shadow-sm border border-slate-200 dark:border-slate-700 font-bold group"
              title="Manage board members"
            >
              <Icon name="user" className="group-hover:scale-110 transition-transform" />
              <span className="text-xs font-black uppercase tracking-widest hidden sm:inline">
                Invite
              </span>
            </Link>
          )}
        </div>

        {/* Center: Context Title (Centered) */}
        <div className="flex justify-center min-w-0">
          <h1 className="text-base sm:text-lg font-black text-slate-950 dark:text-slate-50 uppercase tracking-tighter sm:tracking-normal">
            {isEditable ? (
              <EditableText
                value={displayTitle}
                fieldName="name"
                inputClassName="text-base sm:text-lg font-black border-2 border-blue-500 dark:border-blue-400 rounded-lg py-1 px-3 text-black dark:text-white dark:bg-slate-800 uppercase text-center w-full focus:outline-none shadow-lg transition-all"
                buttonClassName="block rounded-lg text-center border border-transparent py-1.5 px-4 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all truncate group"
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
              <span className="py-1.5 px-4 block truncate">
                {displayTitle}
              </span>
            )}
          </h1>
        </div>

        {/* Right section: Search (Only if search props are provided) */}
        <div className="flex items-center justify-end">
          {setSearchTerm !== undefined && (
            <div className="relative w-full max-w-[140px] sm:max-w-[220px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <Icon name="search" size="md" />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="SEARCH..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-9 pr-8 py-2 text-xs sm:text-sm font-bold border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-slate-950 dark:text-slate-50 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-inner"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute inset-y-0 right-0 pr-1.5 sm:pr-2 flex items-center text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
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
