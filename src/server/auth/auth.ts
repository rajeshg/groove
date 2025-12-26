import crypto from "crypto";

/**
 * Cookie configuration
 */
const COOKIE_NAME = "auth";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

/**
 * Parse auth cookie from request
 */
export function getAuthFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return null;

  const cookies = new Map(
    cookieHeader.split(";").map((c) => {
      const [key, value] = c.trim().split("=");
      return [key, value];
    })
  );

  return cookies.get(COOKIE_NAME) || null;
}

/**
 * Set auth cookie header
 */
export function setAuthCookie(userId: string): string {
  const isProduction = process.env.NODE_ENV === "production";
  return `${COOKIE_NAME}=${userId}; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; SameSite=Lax; Path=/${isProduction ? "; Secure" : ""}`;
}

/**
 * Clear auth cookie header
 */
export function clearAuthCookie(): string {
  const isProduction = process.env.NODE_ENV === "production";
  return `${COOKIE_NAME}=; Max-Age=0; HttpOnly; SameSite=Lax; Path=/${isProduction ? "; Secure" : ""}; Expires=${new Date(0).toUTCString()}`;
}

/**
 * Hash password with salt using PBKDF2
 */
export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, "sha256").toString("hex");
}

/**
 * Verify password against hash
 */
export function verifyPassword(
  password: string,
  hash: string,
  salt: string
): boolean {
  const hashedInput = hashPassword(password, salt);
  return hashedInput === hash;
}

/**
 * Generate random salt for password hashing
 */
export function generateSalt(): string {
  return crypto.randomBytes(16).toString("hex");
}
