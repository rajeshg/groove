import { useState, useRef, useEffect } from "react";
import { Link } from "react-router";
import { createPortal } from "react-dom";
import { Icon } from "../../icons/icons";

interface ColumnMenuProps {
  columnId: string;
  columnName: string;
  isExpanded: boolean;
  boardId: string;
}

export function ColumnMenu({
  columnId,
  columnName,
  isExpanded,
  boardId,
}: ColumnMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Position dropdown when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
      });
    }
  }, [isOpen]);

  // Close menu when clicking outside (but not on portal content)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const portalContent = document.querySelector("[data-column-menu-portal]");
      const target = event.target as Node;

      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        (!portalContent || !portalContent.contains(target))
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Don't show menu button if not expanded
  if (!isExpanded) {
    return null;
  }

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-all text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
        title="Column options"
        aria-label={`Menu for column ${columnName}`}
      >
        <Icon name="dots" size="md" />
      </button>

      {isOpen &&
        createPortal(
          <div
            data-column-menu-portal
            onMouseDown={(e) => e.stopPropagation()}
            className="fixed z-50 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-2xl shadow-2xl p-3 border border-slate-200 dark:border-slate-700 min-w-48 animate-in fade-in zoom-in-95 duration-200 shadow-blue-500/10"
            style={{
              top: dropdownPosition.top,
              left: Math.min(dropdownPosition.left, window.innerWidth - 200),
            }}
          >
            <Link
              to={`/board/${boardId}/column/${columnId}`}
              className="flex items-center justify-between w-full text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 px-3 py-2.5 rounded-xl transition-all group"
              onClick={() => setIsOpen(false)}
            >
              <span>View Details</span>
              <Icon
                name="chevron-right"
                className="group-hover:translate-x-1 transition-transform"
              />
            </Link>
          </div>,
          document.body
        )}
    </>
  );
}
