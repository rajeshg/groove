import { useMatches } from "react-router";
import { Icon } from "../../icons/icons";
import { EditableText } from "./components";
import { INTENTS } from "../types";
import type { Board } from "@prisma/client";

interface BoardHeaderProps {
  searchTerm?: string;
  setSearchTerm?: (term: string) => void;
  title?: string;
}

/**
 * BoardHeader provides a consistent secondary toolbar across the site.
 * It displays the current context (Board Name, Profile, etc.) and a search bar.
 */
export function BoardHeader({ searchTerm, setSearchTerm, title: propTitle }: BoardHeaderProps) {
  const matches = useMatches();
  
  // Try to find context from matches if not provided via props
  const boardMatch = matches.find((m) => m.id.includes("board.$id"));
  const cardMatch = matches.find((m) => m.id.includes("card.$cardId"));
  const profileMatch = matches.find((m) => m.id.includes("profile"));
  
  const board = (boardMatch?.data as unknown as { board?: Board })?.board || (cardMatch?.data as unknown as { card?: { Board: Board } })?.card?.Board;
  
  const displayTitle = propTitle || 
    (profileMatch ? "MY PROFILE" : 
    (board ? board.name : ""));

  const isEditable = !!board && !profileMatch && !cardMatch;

  return (
    <div className="flex-shrink-0 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-8 py-2 flex items-center justify-between gap-4 h-14">
      {/* Left section: Empty placeholder for balance */}
      <div className="flex items-center w-1/4"></div>

      {/* Center: Context Title (Centered) */}
      <div className="flex justify-center flex-1">
        <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-[0.2em]">
          {isEditable ? (
            <EditableText
              value={displayTitle}
              fieldName="name"
              inputClassName="text-sm font-bold border border-slate-400 rounded py-0.5 px-2 text-black dark:text-white dark:bg-slate-700 uppercase text-center"
              buttonClassName="block rounded text-center border border-transparent py-1 px-3 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              buttonLabel={`Edit board "${displayTitle}" name`}
              inputLabel="Edit board name"
              placeholder="Board name..."
              hiddenFields={{
                intent: INTENTS.updateBoardName,
                id: String(board.id),
              }}
            >
              <></>
            </EditableText>
          ) : (
            <span className="py-1 px-3 block">{displayTitle}</span>
          )}
        </h1>
      </div>

      {/* Right section: Search (Only if search props are provided) */}
      <div className="flex items-center justify-end w-1/4">
        {setSearchTerm !== undefined && (
          <div className="relative w-full max-w-[180px]">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
              <Icon name="search" size="md" />
            </div>
            <input
              type="text"
              placeholder="SEARCH"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-8 pr-7 py-1.5 text-[10px] font-bold uppercase tracking-widest border border-slate-200 dark:border-slate-700 rounded-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <Icon name="plus" size="md" className="rotate-45" />
                <span className="sr-only">Clear search</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
