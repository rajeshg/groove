/**
 * Color presets for columns and boards
 * Includes default presets and a curated list for user selection
 */

export const DEFAULT_COLUMN_COLORS = {
  notNow: "#cbd5e1", // Slate-200 (Not Now)
  mayBe: "#ec4899", // Pink-500 (May be?)
  done: "#06b6d4", // Cyan-500 (Done)
} as const;

export const COLOR_PRESETS = [
  // Grays
  { name: "Slate", value: "#94a3b8" },
  { name: "Gray", value: "#9ca3af" },
  { name: "Zinc", value: "#a1a1aa" },
  
  // Blues
  { name: "Blue", value: "#3b82f6" },
  { name: "Sky", value: "#0ea5e9" },
  { name: "Cyan", value: "#06b6d4" },
  
  // Greens
  { name: "Green", value: "#10b981" },
  { name: "Emerald", value: "#059669" },
  { name: "Teal", value: "#14b8a6" },
  
  // Purples
  { name: "Purple", value: "#a855f7" },
  { name: "Violet", value: "#7c3aed" },
  { name: "Indigo", value: "#6366f1" },
  
  // Pinks & Reds
  { name: "Pink", value: "#ec4899" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Red", value: "#ef4444" },
  
  // Oranges & Yellows
  { name: "Amber", value: "#f59e0b" },
  { name: "Orange", value: "#f97316" },
  { name: "Yellow", value: "#eab308" },
  
  // Lime & others
  { name: "Lime", value: "#84cc16" },
  { name: "Fuchsia", value: "#d946ef" },
] as const;

export type ColorPreset = (typeof COLOR_PRESETS)[number];
