/**
 * Avatar utility functions for generating initials and consistent colors
 */

/**
 * Get a consistent display name for a user
 * Prefers firstName + lastName if available, falls back to email or ID
 * Gracefully handles deleted/missing users by showing a shortened ID
 */
export function getDisplayName(
  input:
    | {
        firstName?: string | null;
        lastName?: string | null;
        email?: string;
        id?: string;
      }
    | null
    | undefined
): string {
  if (!input) {
    return "Deleted User";
  }

  if (input.firstName && input.lastName) {
    return `${input.firstName} ${input.lastName}`;
  }
  if (input.firstName) {
    return input.firstName;
  }
  if (input.lastName) {
    return input.lastName;
  }
  if (input.email) {
    return input.email;
  }
  if (input.id) {
    // Show shortened ID (first 8 chars) for deleted/orphaned users
    return `User ${input.id.substring(0, 8)}`;
  }
  return "Unknown User";
}

/**
 * Extract initials from name or email string
 * Handles multi-word names by using first letter of each word
 * For emails, extracts the local part and processes as name
 *
 * Examples:
 * - "John Doe" → "JD"
 * - "john.doe@example.com" → "JD" (split by dot)
 * - "Alice Bob Smith" → "AB" (first two words)
 * - "alice_bob_charles" → "AB"
 * - "Single" → "S"
 * - "Rajesh" → "R"
 */
export function getInitials(str: string): string {
  if (!str) return "?";

  // Remove email domain if present
  const localPart = str.split("@")[0];

  // Split by common separators (spaces, dots, underscores, hyphens)
  const parts = localPart.split(/[\s._-]+/).filter((p) => p.length > 0);

  if (parts.length === 0) return "?";

  // If only one part, take first letter (or up to 2 if very short)
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  // If multiple parts, take first letter of first two words
  return parts
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}

/**
 * Generate a consistent color based on a string using a curated palette
 * Uses hash function to ensure same string always gets same color
 * Palette inspired by Fizzy's design system
 */
export function getAvatarColor(str: string): string {
  const colors = [
    "#AF2E1B",
    "#CC6324",
    "#3B4B59",
    "#BFA07A",
    "#ED8008",
    "#ED3F1C",
    "#BF1B1B",
    "#736B1E",
    "#D07B53",
    "#736356",
    "#AD1D1D",
    "#BF7C2A",
    "#C09C6F",
    "#698F9C",
    "#7C956B",
    "#5D618F",
    "#3B3633",
    "#67695E",
  ];

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash = hash & hash; // Keep it within 32-bit
  }
  return colors[Math.abs(hash) % colors.length];
}
