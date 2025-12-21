import { useMemo, useEffect, useState } from "react";
import { AssigneePicker } from "./assignee-picker";
import {
  getInitials,
  getAvatarColor,
  getDisplayName,
} from "../../utils/avatar";
import type { RenderedAssignee } from "../types";

interface CardMetaProps {
  createdBy: string | null;
  createdByUser?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
  assignee: { id: string; name: string; userId: string | null } | null;
  createdAt: Date;
  updatedAt?: Date;
  lastActiveAt?: Date;
  columnColor?: string;
  itemId?: string;
  boardId?: string;
  availableAssignees?: RenderedAssignee[];
  isCardDetail?: boolean;
}

/**
 * Calculate relative time from a date (e.g., "2 days ago", "today")
 */
function getRelativeTime(date: Date | string): string {
  let dateObj: Date;

  if (date instanceof Date) {
    dateObj = date;
  } else if (typeof date === "string") {
    dateObj = new Date(date);
  } else {
    return "UNKNOWN";
  }

  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return "TODAY";
  } else if (diffDays === 1) {
    return "1 DAY AGO";
  } else {
    return `${diffDays} DAYS AGO`;
  }
}

/**
 * Avatar component
 */
function Avatar({ label, bgColor }: { label: string; bgColor?: string }) {
  const initials = getInitials(label);
  const color = bgColor || getAvatarColor(label);

  return (
    <div
      className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black text-white flex-shrink-0 shadow-sm transition-transform hover:scale-110"
      style={{ backgroundColor: color }}
      title={label}
    >
      {initials}
    </div>
  );
}

export function CardMeta({
  createdBy,
  createdByUser,
  assignee,
  createdAt,
  updatedAt,
  lastActiveAt,
  columnColor,
  itemId,
  boardId,
  availableAssignees = [],
  isCardDetail = false,
}: CardMetaProps) {
  const [tick, setTick] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick((tick) => tick + 1);
    }, 30000);

    return () => clearInterval(timer);
  }, []);

  const effectiveLastActive = lastActiveAt || updatedAt || createdAt;

  const createdTimeText = useMemo(
    () => getRelativeTime(createdAt),
    [createdAt, tick]
  );
  const lastActiveTimeText = useMemo(
    () => getRelativeTime(effectiveLastActive),
    [effectiveLastActive, tick]
  );
  const createdByName = useMemo(() => {
    if (createdByUser) {
      return getDisplayName(createdByUser);
    }
    // If createdBy ID exists but user was deleted, show minimal info
    if (createdBy) {
      return `User ${createdBy.substring(0, 8)}`;
    }
    return null;
  }, [createdByUser, createdBy]);
  const assigneeName = useMemo(() => {
    if (!assignee) return null;
    // Fallback: if name is missing or looks like a UUID, show "Unknown"
    if (!assignee.name || assignee.name.match(/^[0-9a-f-]{36}$/i)) {
      return "Unknown";
    }
    return assignee.name;
  }, [assignee]);

  const createdAtDate =
    createdAt instanceof Date ? createdAt : new Date(createdAt);
  const lastActiveAtDate =
    effectiveLastActive instanceof Date
      ? effectiveLastActive
      : new Date(effectiveLastActive);
  const hasUpdate = lastActiveAtDate.getTime() > createdAtDate.getTime() + 1000;

  return (
    <div className="mt-3 pt-3">
      <div
        className="grid text-[10px] uppercase font-black tracking-tight"
        style={{
          gridTemplateColumns: "40px 1fr 1fr 40px",
          gridTemplateAreas: `
            "avatars-author text-added text-updated avatars-assignees"
            "avatars-author text-author text-assignees avatars-assignees"
          `,
          color: "rgb(100 116 139)",
          alignItems: "stretch",
          width: "100%",
        }}
      >
        <div
          className="row-span-2 flex items-center pr-3"
          style={{ gridArea: "avatars-author" }}
        >
          {createdByName ? (
            <Avatar label={createdByName} bgColor={columnColor} />
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-600" />
          )}
        </div>

        <span
          className="whitespace-nowrap border-r border-b border-slate-300 dark:border-slate-700 pr-3 pb-[0.75ch] flex items-center min-w-0"
          style={{ gridArea: "text-added", lineHeight: 1 }}
        >
          <span className="truncate">
            ADDED <span className="font-black ml-1">{createdTimeText}</span>
          </span>
        </span>

        <span
          className="whitespace-nowrap border-b border-slate-300 dark:border-slate-700 pl-3 pb-[0.75ch] text-right flex items-center justify-end min-w-0"
          style={{ gridArea: "text-updated", lineHeight: 1 }}
        >
          {hasUpdate ? (
            <span className="truncate">
              <span className="inline-block mr-1 text-[9px] opacity-70">
                🔄
              </span>
              <span className="font-black">{lastActiveTimeText}</span>
            </span>
          ) : (
            <span className="opacity-0">.</span>
          )}
        </span>

        <span
          className="whitespace-nowrap border-r border-slate-300 dark:border-slate-700 pr-3 pt-[0.75ch] capitalize text-slate-700 dark:text-slate-300 font-bold flex items-center min-w-0"
          style={{ gridArea: "text-author", lineHeight: 1 }}
          title={createdByName || "Unknown"}
        >
          <span className="truncate">{createdByName || "Unknown"}</span>
        </span>

        <span
          className="whitespace-nowrap pl-3 pt-[0.75ch] text-right capitalize text-slate-700 dark:text-slate-300 font-bold flex items-center justify-end min-w-0"
          style={{ gridArea: "text-assignees", lineHeight: 1 }}
          title={assignee ? `→ ${assigneeName}` : undefined}
        >
          {assignee ? (
            <span className="truncate">
              <span className="mr-1">→</span>
              {assigneeName}
            </span>
          ) : (
            <span className="opacity-0">.</span>
          )}
        </span>

        <div
          className="row-span-2 flex items-center pl-3 gap-1"
          style={{ gridArea: "avatars-assignees" }}
        >
          {isCardDetail && itemId && boardId ? (
            <AssigneePicker
              itemId={itemId}
              boardId={boardId}
              currentAssignee={assignee}
              availableAssignees={availableAssignees}
              isOpen={pickerOpen}
              onOpenChange={setPickerOpen}
            />
          ) : assignee ? (
            <Avatar label={assignee.name} />
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs text-slate-400 border-2 border-dashed border-slate-300 dark:border-slate-600">
              +
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
