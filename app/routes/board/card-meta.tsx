import { useMemo, useEffect, useState } from "react";

interface CardMetaProps {
  createdBy: string | null;
  assignedTo: string | null;
  createdAt: Date;
  updatedAt?: Date;
  lastActiveAt?: Date;
  columnColor?: string;
}

/**
 * Calculate relative time from a date (e.g., "2 days ago", "today")
 */
function getRelativeTime(date: Date | string): string {
  let dateObj: Date;
  
  if (date instanceof Date) {
    dateObj = date;
  } else if (typeof date === 'string') {
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
 * Extract initials from email or name string
 */
function getInitials(str: string): string {
  if (!str) return "?";
  const parts = str.split("@")[0].split(/[._-]/);
  return parts
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}

/**
 * Generate a consistent color based on a string - using Fizzy's exact color palette
 */
function getAvatarColor(str: string): string {
  const colors = [
    "#AF2E1B", "#CC6324", "#3B4B59", "#BFA07A", "#ED8008", "#ED3F1C", 
    "#BF1B1B", "#736B1E", "#D07B53", "#736356", "#AD1D1D", "#BF7C2A", 
    "#C09C6F", "#698F9C", "#7C956B", "#5D618F", "#3B3633", "#67695E"
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash = hash & hash; 
  }
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Avatar component
 */
function Avatar({ label, bgColor }: { label: string; bgColor?: string }) {
  const initials = getInitials(label);
  const color = bgColor || getAvatarColor(label);

  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 shadow-sm"
      style={{ backgroundColor: color }}
      title={label}
    >
      {initials}
    </div>
  );
}

export function CardMeta({
  createdBy,
  assignedTo,
  createdAt,
  updatedAt,
  lastActiveAt,
  columnColor,
}: CardMetaProps) {
  const [tick, setTick] = useState(0);
  
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
  const createdByName = useMemo(
    () => (createdBy ? createdBy.split("@")[0] : null),
    [createdBy]
  );
  const assignedToName = useMemo(
    () => (assignedTo ? assignedTo.split("@")[0] : null),
    [assignedTo]
  );

  const createdAtDate = createdAt instanceof Date ? createdAt : new Date(createdAt);
  const lastActiveAtDate = effectiveLastActive instanceof Date ? effectiveLastActive : new Date(effectiveLastActive);
  const hasUpdate = lastActiveAtDate.getTime() > createdAtDate.getTime() + 1000;

  return (
    <div className="mt-4 pt-3">
      <div 
        className="grid text-[12px] uppercase font-medium w-fit"
        style={{
          gridTemplateColumns: 'auto auto 1fr auto',
          gridTemplateAreas: `
            "avatars-author text-added text-updated avatars-assignees"
            "avatars-author text-author text-assignees avatars-assignees"
          `,
          color: 'rgb(100 116 139)',
          alignItems: 'stretch',
        }}
      >
        <div 
          className="row-span-2 flex items-center mr-[1.25ch]" 
          style={{ gridArea: 'avatars-author' }}
        >
          {createdBy ? (
            <Avatar label={createdBy} bgColor={columnColor} />
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-600" />
          )}
        </div>
        
        <span 
          className="whitespace-nowrap border-r border-b border-slate-200 dark:border-slate-700 pr-[1ch] pb-[0.75ch] flex items-center"
          style={{ gridArea: 'text-added', lineHeight: 1 }}
        >
          ADDED <span className="font-black ml-1">{createdTimeText}</span>
        </span>
        
        <span 
          className="whitespace-nowrap border-b border-slate-200 dark:border-slate-700 pl-[1ch] pb-[0.75ch] text-right flex items-center justify-end"
          style={{ gridArea: 'text-updated', lineHeight: 1 }}
        >
          {hasUpdate ? (
            <>
              <span className="inline-block mr-1 text-[9px] opacity-70">🔄</span>
              <span className="font-black">{lastActiveTimeText}</span>
            </>
          ) : (
            <span className="opacity-0">.</span>
          )}
        </span>
        
        <span 
          className="whitespace-nowrap border-r border-slate-200 dark:border-slate-700 pr-[1ch] pt-[0.75ch] capitalize text-slate-600 dark:text-slate-400 flex items-center"
          style={{ gridArea: 'text-author', lineHeight: 1 }}
        >
          {createdByName || 'Unknown'}
        </span>
        
        <span 
          className="whitespace-nowrap pl-[1ch] pt-[0.75ch] text-right capitalize text-slate-600 dark:text-slate-400 flex items-center justify-end"
          style={{ gridArea: 'text-assignees', lineHeight: 1 }}
        >
          {assignedTo ? (
            <>
              <span className="mr-1">→</span>
              {assignedToName}
            </>
          ) : (
            <span className="opacity-0">.</span>
          )}
        </span>
        
        <div 
          className="row-span-2 flex items-center ml-[1.25ch]" 
          style={{ gridArea: 'avatars-assignees' }}
        >
          {assignedTo ? (
            <Avatar label={assignedTo} />
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
