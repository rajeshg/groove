import { useEffect } from "react";
import type { Column } from "@prisma/client";

interface UseKeyboardShortcutsOptions {
  columns: Column[];
  addCardCallbackRef: { current: (() => void) | null };
}

/**
 * Manages keyboard shortcuts for the board
 * Currently handles 'c' key to trigger "add card" on the column with shortcut "c"
 */
export function useBoardKeyboardShortcuts({
  columns,
  addCardCallbackRef,
}: UseKeyboardShortcutsOptions): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger on 'c' key, not when typing in input fields
      if (
        e.key === "c" &&
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
        e.preventDefault();
        e.stopPropagation();
        // Find the column with shortcut "c" and trigger its callback
        const shortcutColumn = columns.find((col) => col.shortcut === "c");
        if (shortcutColumn && addCardCallbackRef.current) {
          addCardCallbackRef.current();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [columns, addCardCallbackRef]);
}
