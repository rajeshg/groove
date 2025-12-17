import { useState, useRef, useEffect } from "react";
import { useFetcher } from "react-router";
import { createPortal } from "react-dom";
import { COLOR_PRESETS } from "../../constants/colors";
import { INTENTS } from "../types";

interface ColumnMenuProps {
  columnId: string;
  columnName: string;
  currentColor: string;
  isDefault: boolean;
  isExpanded: boolean;
}

export function ColumnMenu({
  columnId,
  columnName,
  currentColor,
  isDefault,
  isExpanded,
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
       const portalContent = document.querySelector('[data-column-menu-portal]');
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
        intent: INTENTS.updateColumn,
        columnId,
        color,
      },
      { method: "post" }
    );
    setIsOpen(false);
  };

  const handleDeleteColumn = () => {
    console.log("Submitting delete:", columnId);
    fetcher.submit(
      {
        intent: INTENTS.deleteColumn,
        columnId,
      },
      { method: "post" }
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
        className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        title="Column options"
        aria-label={`Menu for column ${columnName}`}
      >
        <span className="text-lg">⋯</span>
      </button>

       {isOpen && createPortal(
         <div
           data-column-menu-portal
           onMouseDown={(e) => e.stopPropagation()}
            className="fixed z-50 bg-white dark:bg-slate-800 rounded-lg shadow-lg p-2 border border-slate-200 dark:border-slate-700 min-w-48 max-w-64"
           style={{
             top: dropdownPosition.top,
             left: dropdownPosition.left,
           }}
         >
          {/* Color Picker */}
          <div className="p-2 border-b border-slate-200 dark:border-slate-700">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 text-center">
              Column Color
            </p>
            <div className="grid grid-cols-4 gap-2 justify-center">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => {
                    console.log("Color button clicked:", preset.value);
                    handleColorSelect(preset.value);
                  }}
                  className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 hover:shadow-lg ${
                    currentColor === preset.value
                      ? "border-slate-900 dark:border-white ring-2 ring-slate-900 dark:ring-white ring-offset-1 shadow-md"
                      : "border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500"
                  }`}
                  style={{ 
                    backgroundColor: preset.value,
                    imageRendering: 'crisp-edges',
                    WebkitFontSmoothing: 'none',
                    MozOsxFontSmoothing: 'grayscale'
                  }}
                  title={preset.name}
                  aria-label={`Select ${preset.name}`}
                />
              ))}
            </div>
          </div>

           {/* Delete Option */}
           {!isDefault && (
             <div className="p-2">
               {!showDeleteConfirm ? (
                 <button
                   type="button"
                   onClick={() => {
                     console.log("Delete button clicked");
                     setShowDeleteConfirm(true);
                   }}
                   className="w-full text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-2 rounded transition-colors text-left"
                 >
                   Delete Column
                 </button>
              ) : (
                 <div className="space-y-2">
                   <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                     Delete "<span className="font-medium">{columnName}</span>"?
                   </p>
                   <p className="text-xs text-slate-600 dark:text-slate-400">
                     All cards will move to "May be?" column.
                   </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        console.log("Confirm delete clicked");
                        handleDeleteColumn();
                      }}
                      className="flex-1 px-2 py-1 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        console.log("Cancel delete clicked");
                        setShowDeleteConfirm(false);
                      }}
                      className="flex-1 px-2 py-1 text-sm font-medium bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-50 rounded hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                    >
                      Cancel
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
