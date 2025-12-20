import { customAlphabet } from "nanoid";

const base36Alphabet = '0123456789abcdefghijklmnopqrstuvwxyz';

/**
 * Generate a high-entropy beautifully formatted ID optimized for mobile typing
 * Format: ab###-cd### (2 letters + 3 numbers, dash, 2 letters + 3 numbers = 11 total)
 * Starts with letters for mobile ease, groups numbers together
 * Provides excellent collision resistance with memorable length
 */
export function generateId(): string {
  // Generate parts: 2 letters + 3 numbers, 2 letters + 3 numbers
  const letters1 = customAlphabet('abcdefghijklmnopqrstuvwxyz', 2)();
  const numbers1 = customAlphabet('0123456789', 3)();
  const letters2 = customAlphabet('abcdefghijklmnopqrstuvwxyz', 2)();
  const numbers2 = customAlphabet('0123456789', 3)();

  return `${letters1}${numbers1}-${letters2}${numbers2}`;
}

/**
 * Generate a plain base36 ID without formatting (for backward compatibility)
 */
export const generatePlainId = customAlphabet(base36Alphabet, 12);

/**
 * Legacy alias for backward compatibility
 * @deprecated Use generateId() instead
 */
export const nanoid = generateId;