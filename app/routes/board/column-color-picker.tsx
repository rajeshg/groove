import { useState, useRef, useEffect } from "react";
import { useFetcher } from "react-router";
import { COLOR_PRESETS } from "../../constants/colors";
import { INTENTS } from "../types";

interface ColumnColorPickerProps {
  columnId: string;
  columnName: string;
  currentColor: string;
}

export function ColumnColorPicker({
  columnId,
  columnName,
  currentColor,
}: ColumnColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const fetcher = useFetcher();

  // Close picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node)
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
        intent: INTENTS.updateColumn,
        columnId,
        color,
      },
      { method: "post" }
    );
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={pickerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 rounded-lg border-2 border-slate-300 hover:border-slate-400 transition-colors cursor-pointer"
        style={{ backgroundColor: currentColor }}
        title={`Column color: ${columnName}`}
        aria-label={`Change color for column ${columnName}`}
      />

      {isOpen && (
        <div className="absolute top-10 left-0 z-50 bg-white rounded-lg shadow-lg p-3 border border-slate-200">
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
        </div>
      )}
    </div>
  );
}
