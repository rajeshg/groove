import { useRef, useState } from "react";
import { Link } from "react-router";

interface Board {
  id: number;
  name: string;
}

interface BoardSwitcherProps {
  currentBoardId: number;
  currentBoardName: string;
  allBoards: Board[];
}

export function BoardSwitcher({
  currentBoardId,
  currentBoardName,
  allBoards,
}: BoardSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  const handleClickOutside = (e: React.MouseEvent) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(e.currentTarget as Node)
    ) {
      setIsOpen(false);
    }
  };

  const otherBoards = allBoards.filter((b) => b.id !== currentBoardId);

  return (
    <div
      className="relative"
      ref={dropdownRef}
      onClick={() => setIsOpen(!isOpen)}
    >
      {/* Dropdown button with Fizzy-style design */}
      <button
        className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-900 dark:text-slate-50 font-semibold"
        aria-label="Switch board"
        aria-expanded={isOpen}
      >
        <span className="text-lg">📋</span>
        <span className="text-lg font-bold truncate max-w-xs">
          {currentBoardName}
        </span>
        <span className="text-sm">▼</span>
      </button>

      {/* Dropdown menu */}
      {isOpen && otherBoards.length > 0 && (
        <div className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50 min-w-max">
          <div className="py-1">
            {otherBoards.map((board) => (
              <Link
                key={board.id}
                to={`/board/${board.id}`}
                className="block px-4 py-2 text-sm text-slate-900 dark:text-slate-50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                {board.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
