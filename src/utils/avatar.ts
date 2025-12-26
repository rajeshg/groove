/**
 * Avatar utility functions for generating initials and consistent colors
 * Based on Groove's avatar system
 */

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

  // If only one part, take first letter
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
 * Palette inspired by Groove's design system
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

/**
 * Extract first and last names from email or full name
 * Examples: "john.doe@example.com" -> "John Doe"
 *          "john doe" -> "John Doe"
 */
export function parseNameFromEmail(email: string): string {
  const withoutEmail = email.split("@")[0];
  const parts = withoutEmail.split(/[._-]/);

  return parts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Get display name from firstName, lastName, or email
 * Priority: firstName + lastName > firstName > lastName > email
 */
export function getDisplayName({
  firstName,
  lastName,
  email,
}: {
  firstName?: string | null;
  lastName?: string | null;
  email: string;
}): string {
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }
  if (firstName) {
    return firstName;
  }
  if (lastName) {
    return lastName;
  }
  return parseNameFromEmail(email);
}
