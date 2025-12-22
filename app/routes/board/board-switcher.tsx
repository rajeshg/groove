import { useRef, useState, useEffect, useMemo } from "react";
import { Link } from "react-router";
import { Icon } from "../../icons/icons";

interface Board {
  id: string;
  name: string;
}

interface BoardSwitcherProps {
  currentBoardId?: string;
  allBoards: Board[];
  userId?: string;
}

export function BoardSwitcher({
  currentBoardId,
  allBoards,
  userId: _userId,
}: BoardSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuSearchTerm, setMenuSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const filteredBoards = useMemo(() => {
    return allBoards.filter((board) =>
      board.name.toLowerCase().includes(menuSearchTerm.toLowerCase())
    );
  }, [allBoards, menuSearchTerm]);

  return (
    <div className="relative inline-flex items-center gap-1" ref={dropdownRef}>
      {/* J shortcut badge */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5"
      >
        <div className="flex items-center justify-center w-5 h-5 rounded border border-slate-300 dark:border-slate-600 text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 shadow-sm">
          J
        </div>
        <Icon
          name="chevron-right"
          size="md"
          className={`transition-transform duration-200 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ${
            isOpen ? "rotate-90 text-blue-500" : "rotate-0"
          }`}
        />
      </button>

      {/* Popover Menu - Perfectly matching board-menu.png */}
      {isOpen && (
        <div className="fixed sm:absolute top-16 sm:top-full left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 mt-2 sm:mt-4 w-auto sm:w-[420px] max-h-[85vh] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-2xl z-[100] flex flex-col animate-in fade-in zoom-in-95 duration-200">
          {/* Search Header */}
          <div className="p-5">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                placeholder="Type to jump to a board, person, place, or tag..."
                className="w-full px-4 py-2.5 text-base border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder-slate-400 shadow-sm"
                value={menuSearchTerm}
                onChange={(e) => setMenuSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setIsOpen(false);
                }}
              />
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pb-4">
            {/* Top Grid Actions */}
            <div className="grid grid-cols-3 gap-3 px-5 pt-2 mb-4">
              <MenuActionCard
                icon="home"
                label="Home"
                to="/home"
                active
                onClick={() => setIsOpen(false)}
              />
              <MenuActionCard
                icon="assigned"
                label="Assigned to me"
                to="/me/assigned"
                onClick={() => setIsOpen(false)}
              />
              <MenuActionCard
                icon="added"
                label="Added by me"
                to="/me/created"
                onClick={() => setIsOpen(false)}
              />
            </div>

            {/* BOARDS Section */}
            <MenuSection label="BOARDS">
              <Link
                to="/new-board"
                className="flex items-center gap-3 px-5 py-2 text-sm font-semibold text-blue-600 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <Icon name="plus" size="md" />
                <span>Add a board</span>
              </Link>
              {filteredBoards.map((board) => (
                <Link
                  key={board.id}
                  to={`/board/${board.id}`}
                  className={`flex items-center gap-3 px-5 py-2 text-sm font-semibold transition-colors ${
                    board.id === currentBoardId
                      ? "text-blue-600 bg-blue-50/50 dark:bg-blue-900/20"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  <Icon name="board-icon" size="md" className="opacity-60" />
                  <span className="truncate">{board.name}</span>
                </Link>
              ))}
            </MenuSection>

            {/* PEOPLE Section */}
            <MenuSection label="PEOPLE">
              {currentBoardId ? (
                <Link
                  to={`/board/${currentBoardId}/members`}
                  className="w-full flex items-center gap-3 px-5 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <Icon name="plus" size="md" className="opacity-60" />
                  <span>Invite people</span>
                </Link>
              ) : (
                <Link
                  to="/home"
                  className="w-full flex items-center gap-3 px-5 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <Icon name="plus" size="md" className="opacity-60" />
                  <span>Invite people</span>
                </Link>
              )}
              <Link
                to="/profile"
                className="flex items-center gap-3 px-5 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <Icon name="user" size="md" className="opacity-60" />
                <span className="truncate">My Profile</span>
              </Link>
            </MenuSection>
          </div>
        </div>
      )}
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
  icon: string;
  label: string;
  to: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex flex-col items-center justify-center h-24 rounded-3xl border transition-all duration-300 ${
        active
          ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105 z-10"
          : "bg-slate-50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-white dark:hover:bg-slate-800 hover:-translate-y-1"
      }`}
    >
      <Icon
        name={icon}
        size="xl"
        className={`mb-2 ${active ? "text-white" : ""}`}
      />
      <span
        className={`text-[10px] font-black uppercase tracking-widest text-center leading-tight ${active ? "text-white/90" : ""}`}
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
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="mt-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-5 py-1 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
      >
        <span
          className={`transition-transform duration-200 ${
            isExpanded ? "rotate-0" : "-rotate-90"
          }`}
        >
          ▾
        </span>
        {label}
      </button>
      {isExpanded && <div className="mt-1">{children}</div>}
    </div>
  );
}
