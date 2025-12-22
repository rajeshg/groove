/**
 * Color contrast utilities for ensuring readable text on colored backgrounds
 */

/**
 * Convert hex color to RGB values
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Calculate relative luminance of a color
 * Based on WCAG 2.0 formula
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const channel = c / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Get ideal text color (white or black) for maximum contrast on a background color
 */
export function getContrastTextColor(bgColor: string): "white" | "black" {
  const rgb = hexToRgb(bgColor);
  if (!rgb) return "white"; // Default fallback

  const luminance = getLuminance(rgb.r, rgb.g, rgb.b);

  // Use white text for dark backgrounds, black for light backgrounds
  // Threshold at 0.5 (middle luminance)
  return luminance > 0.5 ? "black" : "white";
}
