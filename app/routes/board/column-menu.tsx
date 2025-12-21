import { useState, useRef, useEffect } from "react";
import { useFetcher } from "react-router";
import { createPortal } from "react-dom";
import { Icon } from "../../icons/icons";
import { COLOR_PRESETS } from "../../constants/colors";

interface ColumnMenuProps {
  columnId: string;
  columnName: string;
  currentColor: string;
  isDefault: boolean;
  isExpanded: boolean;
  boardId: string;
}

export function ColumnMenu({
  columnId,
  columnName,
  currentColor,
  isDefault,
  isExpanded,
  boardId,
}: ColumnMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const fetcher = useFetcher();

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
        console.log("Closing menu - click outside detected");
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleColorSelect = (color: string) => {
    console.log("Submitting color change:", color);
    fetcher.submit(
      {
        columnId,
        color,
      },
      { method: "post", action: "/resources/update-column" }
    );
    setIsOpen(false);
  };

  const handleDeleteColumn = () => {
    console.log("Submitting delete:", columnId);
    fetcher.submit(
      {
        columnId,
        boardId,
      },
      { method: "post", action: "/resources/delete-column" }
    );
    setIsOpen(false);
    setShowDeleteConfirm(false);
  };

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
            className="fixed z-50 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-3xl shadow-2xl p-4 border border-slate-200 dark:border-slate-700 min-w-56 max-w-72 animate-in fade-in zoom-in-95 duration-200 shadow-blue-500/10"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
            }}
          >
            {/* Color Picker */}
            <div className="pb-4 mb-2 border-b border-slate-100 dark:border-slate-700">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-4 text-center">
                Column Theme
              </p>
              <div className="grid grid-cols-4 gap-3">
                {COLOR_PRESETS.map((preset) => {
                  const selected = currentColor === preset.value;
                  return (
                    <label
                      key={preset.value}
                      className="cursor-pointer relative group"
                      title={preset.name}
                    >
                      <input
                        type="radio"
                        name="column-color"
                        value={preset.value}
                        checked={selected}
                        onChange={() => handleColorSelect(preset.value)}
                        className="sr-only"
                        aria-label={`Select ${preset.name}`}
                      />
                      <span
                        className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all duration-300 ${
                          selected
                            ? "border-blue-500 scale-110 shadow-lg z-10"
                            : "border-transparent hover:scale-105"
                        }`}
                        style={{
                          backgroundColor: preset.value,
                        }}
                      >
                        {selected && (
                          <div className="w-2 h-2 rounded-full bg-white shadow-sm animate-pulse" />
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Delete Option */}
            {!isDefault && (
              <div className="pt-2">
                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    onClick={() => {
                      console.log("Delete button clicked");
                      setShowDeleteConfirm(true);
                    }}
                    disabled={fetcher.state !== "idle"}
                    className="w-full text-xs font-black uppercase tracking-widest text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-between group"
                  >
                    <span>Delete Column</span>
                    <Icon name="trash" className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ) : (
                  <div className="space-y-3 p-2 bg-red-50/50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/30">
                    <p className="text-[10px] font-black uppercase tracking-tight text-red-800 dark:text-red-400">
                      Are you sure?
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleDeleteColumn}
                        disabled={fetcher.state !== "idle"}
                        className="flex-1 px-3 py-2 text-[10px] font-black uppercase tracking-widest bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all shadow-md shadow-red-500/20"
                      >
                        {fetcher.state !== "idle" ? "..." : "Delete"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 px-3 py-2 text-[10px] font-black uppercase tracking-widest bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-all"
                      >
                        No
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
}
