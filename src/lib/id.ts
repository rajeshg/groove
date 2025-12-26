/**
 * Custom ID generator for Groove
 *
 * Generates short, user-friendly IDs in the format xxxx-xxxx
 * Alphabet excludes ambiguous characters: 0, 1, l, o, I
 */

const ALPHABET = "23456789abcdefghijkmnopqrstuvwxyz";
const SEGMENT_LENGTH = 4;

/**
 * Generates a random string of a given length using the Groove alphabet
 */
function generateSegment(length: number): string {
  let result = "";
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);

  for (let i = 0; i < length; i++) {
    result += ALPHABET[randomValues[i] % ALPHABET.length];
  }

  return result;
}

/**
 * Generates a short ID like 'mp92-xl01'
 */
export function generateId(): string {
  return `${generateSegment(SEGMENT_LENGTH)}-${generateSegment(SEGMENT_LENGTH)}`;
}
