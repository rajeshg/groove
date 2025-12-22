import { useState, useRef, useEffect } from "react";
import { useFetcher } from "react-router";
import { createPortal } from "react-dom";
import { COLOR_PRESETS } from "../../constants/colors";

interface ColumnColorPickerProps {
  columnId: string;
  columnName: string;
  currentColor: string;
  onColorChange?: () => void;
}

export function ColumnColorPicker({
  columnId,
  columnName,
  currentColor,
}: ColumnColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fetcher = useFetcher();

  // Position dropdown when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 176; // Approximate width: 4 cols * 32px + gaps + padding
      const viewportWidth = window.innerWidth;

      // Check if dropdown would overflow on the right
      const wouldOverflowRight = rect.left + dropdownWidth > viewportWidth;

      // Position dropdown
      let left = rect.left;
      if (wouldOverflowRight) {
        // Align to right edge of button instead
        left = rect.right - dropdownWidth;
        // Ensure it doesn't go off the left edge
        left = Math.max(8, left);
      }

      setDropdownPosition({
        top: rect.bottom + 4,
        left: left,
      });
    }
  }, [isOpen]);

  // Close picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
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

  const handleColorSelect = (color: string) => {
    fetcher.submit(
      {
        columnId,
        color,
      },
      {
        method: "post",
        action: "/resources/update-column",
      }
    );
    setIsOpen(false);
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 rounded-lg border-2 border-slate-300 hover:border-slate-400 transition-colors cursor-pointer"
        style={{ backgroundColor: currentColor }}
        title={`Column color: ${columnName}`}
        aria-label={`Change color for column ${columnName}`}
      />

      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-50 bg-white rounded-lg shadow-lg p-3 border border-slate-200"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
            }}
          >
            <p className="text-xs font-semibold text-slate-700 mb-2 text-center">
              Colors
            </p>
            <div className="grid grid-cols-4 gap-2">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handleColorSelect(preset.value)}
                  className={`w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 ${
                    currentColor === preset.value
                      ? "border-slate-900 ring-2 ring-slate-900 ring-offset-1"
                      : "border-slate-300 hover:border-slate-400"
                  }`}
                  style={{ backgroundColor: preset.value }}
                  title={preset.name}
                  aria-label={`Select ${preset.name}`}
                />
              ))}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
