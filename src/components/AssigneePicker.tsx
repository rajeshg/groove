import { useRef, useEffect, useState } from "react";
import { getInitials, getAvatarColor } from "~/utils/avatar";
import { generateId } from "~/lib/id";
import {
  assigneesCollection,
  itemsCollection,
  queryClient,
} from "~/db/collections";
import { createOrGetAssignee } from "~/server/actions/boards";
import { toast } from "sonner";

interface Assignee {
  id: string;
  name: string;
  userId: string | null;
  boardId?: string;
  isBoardMember?: boolean;
  role?: string;
}

interface AssigneePickerProps {
  itemId: string;
  boardId: string;
  currentAssignee: Assignee | null;
  availableAssignees: Assignee[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssigneePicker({
  itemId,
  boardId,
  currentAssignee,
  availableAssignees,
  isOpen,
  onOpenChange,
}: AssigneePickerProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState("");

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

  const handleSelect = async (assigneeId: string | null) => {
    try {
      let finalAssigneeId = assigneeId;

      // If selecting a board member (composite ID like "account-xxx-yyy"),
      // we need to create/get a real assignee record first
      if (assigneeId && assigneeId.startsWith("account-")) {
        // Extract accountId and boardId from composite ID: "account-{accountId}-{boardId}"
        // Format: account-{36 chars UUID}-{36 chars UUID}
        // We need to split at the last hyphen to separate accountId and boardId
        const idPart = assigneeId.substring(8); // Remove "account-" prefix
        const lastHyphenIndex = idPart.lastIndexOf("-");

        if (lastHyphenIndex === -1) {
          console.error(
            "[AssigneePicker] Invalid composite ID format:",
            assigneeId
          );
          toast.error("Invalid assignee ID");
          return;
        }

        // Find the selected assignee to get their userId and name
        const selectedAssignee = availableAssignees.find(
          (a) => a.id === assigneeId
        );

        if (selectedAssignee) {
          // Check if there's already a real assignee record (not starting with "account-")
          // for this userId in this board
          const existingAssignee = availableAssignees.find(
            (a) =>
              a.userId === selectedAssignee.userId &&
              a.boardId === boardId &&
              !a.id.startsWith("account-")
          );

          if (existingAssignee) {
            // Use existing assignee record
            finalAssigneeId = existingAssignee.id;
          } else {
            // Create a new assignee record linked to this account
            // Call server function directly to get the real assignee ID
            const accountId = localStorage.getItem("accountId");
            if (!accountId) {
              toast.error("Not authenticated");
              return;
            }

            const newAssignee = await createOrGetAssignee({
              data: {
                accountId,
                boardId,
                name: selectedAssignee.name,
                userId: selectedAssignee.userId || undefined,
              },
            });

            finalAssigneeId = newAssignee.id;

            // Invalidate assignees cache to refetch
            queryClient.invalidateQueries({ queryKey: ["assignees"] });
          }
        }
      }

      // Update item's assignee using TanStack DB
      itemsCollection.update(itemId, (draft) => {
        draft.assigneeId = finalAssigneeId;
      });

      onOpenChange(false);
      setSearchTerm("");
      toast.success(finalAssigneeId ? "Assignee updated" : "Assignee removed");
    } catch (error) {
      console.error(
        "[AssigneePicker.handleSelect] Failed to update assignee:",
        error
      );
      toast.error("Failed to update assignee");
    }
  };

  const handleCreateVirtualAssignee = async (name: string) => {
    if (!name.trim()) return;

    try {
      // Create or get assignee using TanStack DB
      const newAssigneeId = generateId();

      assigneesCollection.insert({
        id: newAssigneeId,
        boardId,
        name: name.trim(),
        userId: null,
        createdAt: new Date().toISOString(),
      } as any);

      // Update item's assignee
      itemsCollection.update(itemId, (draft) => {
        draft.assigneeId = newAssigneeId;
      });

      setSearchTerm("");
      onOpenChange(false);
      toast.success(`Assigned to ${name.trim()}`);
    } catch (error) {
      console.error("Failed to create assignee:", error);
      toast.error("Failed to create assignee");
    }
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
          title={`Assigned to ${currentAssignee.name} - Click to change`}
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
              className="w-full px-2 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          <ul className="max-h-64 overflow-y-auto">
            {/* Unassign option */}
            <li>
              <button
                onClick={() => handleSelect(null)}
                className={`w-full text-left px-2 py-1.5 text-xs font-semibold transition-colors ${
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
                    className={`w-full text-left px-2 py-1.5 text-xs font-semibold transition-colors ${
                      currentAssignee?.id === assignee.id
                        ? "bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
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
                  className="w-full text-left px-2 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors italic"
                >
                  + Create "{searchTerm}" (Press Enter)
                </button>
              </li>
            ) : (
              <li>
                <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
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
