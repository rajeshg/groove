/**
 * Color presets for columns and boards
 * Uses exact Tailwind color values for crisp, high-resolution display
 * All colors chosen for high contrast with white text on collapsed columns
 */

export const DEFAULT_COLUMN_COLORS = {
  notNow: "#475569", // Slate-600 (Not Now) - dark gray (was #cbd5e1 - too light)
  mayBe: "#ec4899", // Pink-500 (May be?) - vibrant pink
  done: "#0891b2", // Cyan-600 (Done) - bright cyan (was #06b6d4)
} as const;

export const COLOR_PRESETS = [
  // Neutrals - Row 1
  { name: "Slate", value: "#475569" }, // slate-600 - dark gray with good contrast
  { name: "Gray", value: "#4b5563" }, // gray-600 - darker gray
  { name: "Stone", value: "#57534e" }, // stone-600 - warm gray

  // Warm colors - Row 2
  { name: "Red", value: "#dc2626" }, // red-600 - sharp, high contrast
  { name: "Orange", value: "#ea580c" }, // orange-600
  { name: "Amber", value: "#d97706" }, // amber-600
  { name: "Yellow", value: "#ca8a04" }, // yellow-600

  // Cool colors - Row 3
  { name: "Green", value: "#16a34a" }, // green-600
  { name: "Emerald", value: "#059669" }, // emerald-600
  { name: "Teal", value: "#0d9488" }, // teal-600
  { name: "Cyan", value: "#0891b2" }, // cyan-600

  // Blue & Purple - Row 4
  { name: "Blue", value: "#2563eb" }, // blue-600 - standard primary
  { name: "Indigo", value: "#4f46e5" }, // indigo-600
  { name: "Violet", value: "#7c3aed" }, // violet-600
  { name: "Purple", value: "#9333ea" }, // purple-600
  { name: "Fuchsia", value: "#c026d3" }, // fuchsia-600
  { name: "Pink", value: "#db2777" }, // pink-600
] as const;

export type ColorPreset = (typeof COLOR_PRESETS)[number];
