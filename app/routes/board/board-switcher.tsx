import { useRef, useState, useEffect, useMemo } from "react";
import { Link } from "react-router";
import { Icon } from "../../icons/icons";

interface Board {
  id: number;
  name: string;
}

interface BoardSwitcherProps {
  currentBoardId?: number;
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
        <div className="absolute top-full left-0 mt-4 w-[420px] max-h-[85vh] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-2xl z-[100] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
          {/* Search Header */}
          <div className="p-5">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                placeholder="Type to jump to a board, person, place, or tag..."
                className="w-full px-4 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder-slate-400 shadow-sm"
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
             <div className="grid grid-cols-3 gap-3 px-5 mb-4">
               <MenuActionCard icon="home" label="Home" count={1} to="/home" active />
               <MenuActionCard icon="assigned" label="Assigned to me" count={2} to="/me/assigned" />
               <MenuActionCard icon="added" label="Added by me" count={3} to="/me/created" />
             </div>

            {/* BOARDS Section */}
            <MenuSection label="BOARDS">
              <Link
                to="/home"
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
              <button className="w-full flex items-center gap-3 px-5 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <Icon name="plus" size="md" className="opacity-60" />
                <span>Invite people</span>
              </button>
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

          {/* Footer Attribution - matching Fizzy exactly */}
          <div className="px-6 py-6 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex flex-col items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="flex gap-0.5 opacity-40">
                <div className="w-0.5 h-3 bg-blue-500 rounded-full"></div>
                <div className="w-0.5 h-3 bg-red-500 rounded-full"></div>
                <div className="w-0.5 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-0.5 h-3 bg-green-500 rounded-full"></div>
              </div>
              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">
                Trellix™ is designed, built, and backed by OpenCode™
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuActionCard({
  icon,
  label,
  count,
  to,
  active = false,
}: {
  icon: string;
  label: string;
  count: number;
  to: string;
  active?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`relative flex flex-col items-center justify-center h-24 rounded-2xl border transition-all ${
        active
          ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-blue-500/10"
          : "bg-slate-50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-white dark:hover:bg-slate-800"
      }`}
    >
      <div className="absolute top-2 right-2 min-w-[20px] h-[20px] flex items-center justify-center px-1 text-[10px] font-black bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-md border border-slate-200 dark:border-slate-600 shadow-sm">
        {count}
      </div>
      <Icon name={icon} size="xl" className="mb-2" />
      <span className="text-[11px] font-black uppercase tracking-wider text-center leading-tight">
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
