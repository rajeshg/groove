import { customAlphabet } from "nanoid";

// Base36 alphabet: 0-9, a-z (36 chars total)
// Using lowercase only to avoid confusion between similar-looking chars
// 12 chars provides ~70 bits of entropy, sufficient for most use cases
const base36Alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
const generateId = customAlphabet(base36Alphabet, 12);

/**
 * Generates a URL-safe Base36 ID (12 characters)
 * Examples: a1b2c3d4e5f6, x9y8z7w6v5u4
 *
 * Benefits:
 * - Short (12 chars vs 36 for UUIDs)
 * - Readable and typeable
 * - Case-insensitive (users can type uppercase)
 * - No special characters (safe for URLs, emails, chat)
 * - Collision-resistant for typical use cases
 */
export function generateBase36Id(): string {
  return generateId();
}
