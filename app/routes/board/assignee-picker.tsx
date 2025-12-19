import { useRef, useEffect, useState } from "react";
import { useFetcher, useRevalidator } from "react-router";
import { INTENTS } from "../types";
import { getInitials, getAvatarColor } from "../../utils/avatar";
import type { RenderedAssignee } from "../types";

interface AssigneePickerProps {
  itemId: string;
  boardId: string;
  currentAssignee: RenderedAssignee | null;
  availableAssignees: RenderedAssignee[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  action?: string;
}

export function AssigneePicker({
  itemId,
  boardId,
  currentAssignee,
  availableAssignees,
  isOpen,
  onOpenChange,
  action,
}: AssigneePickerProps) {
  const fetcher = useFetcher();
  const revalidator = useRevalidator();
  const menuRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Revalidate when fetcher completes successfully
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) {
      // Give a small delay to ensure DB is consistent
      const timeout = setTimeout(() => {
        revalidator.revalidate();
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [fetcher.state, fetcher.data, revalidator]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onOpenChange(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, onOpenChange]);

  const filteredAssignees = availableAssignees.filter((assignee) =>
    assignee.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (assigneeId: string | null) => {
    const submitOptions: { method: "post"; action?: string } = {
      method: "post",
    };
    if (action) {
      submitOptions.action = action;
    }

    // Build form data with proper null handling
    const formData = new FormData();
    formData.append("intent", INTENTS.updateItemAssignee);
    formData.append("itemId", itemId);
    if (assigneeId) {
      formData.append("assigneeId", assigneeId);
    }
    // For null assignee (unassigned), we don't append it, which will be treated as null by the schema

    fetcher.submit(formData, submitOptions);

    // Close menu immediately for responsive UX
    onOpenChange(false);
    setSearchTerm("");
  };

  const handleCreateVirtualAssignee = (name: string) => {
    if (!name.trim()) return;

    fetcher.submit(
      {
        intent: INTENTS.createAndAssignVirtualAssignee,
        name: name.trim(),
        itemId,
      },
      { method: "post", action: `/board/${boardId}` }
    );

    setSearchTerm("");
    onOpenChange(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      {currentAssignee ? (
        <button
          onClick={() => onOpenChange(!isOpen)}
          className="inline-flex items-center justify-center w-8 h-8 rounded-full transition-transform hover:scale-110"
          style={{
            backgroundColor: getAvatarColor(currentAssignee.name),
          }}
          title="Click to change assignee"
        >
          <span className="text-white text-xs font-bold">
            {getInitials(currentAssignee.name)}
          </span>
        </button>
      ) : (
        <button
          onClick={() => onOpenChange(!isOpen)}
          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors text-xs text-slate-600 dark:text-slate-400 border-2 border-dashed border-slate-300 dark:border-slate-600"
          title="Assign to team member"
        >
          +
        </button>
      )}

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-50">
          <div className="p-2">
            <input
              type="text"
              placeholder="Search or type name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  searchTerm.trim() &&
                  filteredAssignees.length === 0
                ) {
                  handleCreateVirtualAssignee(searchTerm);
                }
              }}
              className="w-full px-3 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          <ul className="max-h-64 overflow-y-auto">
            {/* Unassign option */}
            <li>
              <button
                onClick={() => handleSelect(null)}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  !currentAssignee
                    ? "bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                Unassigned
              </button>
            </li>

            {/* Assignee options */}
            {filteredAssignees.length > 0 ? (
              filteredAssignees.map((assignee) => (
                <li key={assignee.id}>
                  <button
                    onClick={() => handleSelect(assignee.id)}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      currentAssignee?.id === assignee.id
                        ? "bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0"
                        style={{
                          backgroundColor: getAvatarColor(assignee.name),
                        }}
                      >
                        {getInitials(assignee.name)}
                      </div>
                      <span className="flex-1 truncate">{assignee.name}</span>
                    </div>
                  </button>
                </li>
              ))
            ) : searchTerm.trim() ? (
              <li>
                <button
                  onClick={() => handleCreateVirtualAssignee(searchTerm)}
                  className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors italic"
                >
                  + Create "{searchTerm}" (Press Enter)
                </button>
              </li>
            ) : (
              <li>
                <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
                  No assignees found
                </div>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
