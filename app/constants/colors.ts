/**
 * Color presets for columns and boards
 * Uses exact Tailwind color values for crisp, high-resolution display
 */

export const DEFAULT_COLUMN_COLORS = {
  notNow: "#cbd5e1", // Slate-300 (Not Now) - light gray
  mayBe: "#ec4899", // Pink-500 (May be?) - vibrant pink
  done: "#06b6d4", // Cyan-500 (Done) - bright cyan
} as const;

export const COLOR_PRESETS = [
  // High-contrast neutrals - Row 1
  { name: "Slate", value: "#64748b" }, // slate-600 (high contrast)
  { name: "Gray", value: "#6b7280" }, // gray-600
  { name: "Zinc", value: "#71717a" }, // zinc-600

  // Vibrant primary colors - Row 2
  { name: "Red", value: "#dc2626" }, // red-600 (sharp, high contrast)
  { name: "Orange", value: "#ea580c" }, // orange-600
  { name: "Amber", value: "#d97706" }, // amber-600
  { name: "Yellow", value: "#ca8a04" }, // yellow-600

  // Cool colors - Row 3
  { name: "Green", value: "#16a34a" }, // green-600
  { name: "Emerald", value: "#059669" }, // emerald-500
  { name: "Teal", value: "#0d9488" }, // teal-600
  { name: "Cyan", value: "#0891b2" }, // cyan-600
  { name: "Blue", value: "#2563eb" }, // blue-600 (standard primary)
] as const;

export type ColorPreset = (typeof COLOR_PRESETS)[number];
