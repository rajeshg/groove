import { getDb } from "~/server/db/client";
import { accounts, passwords } from "~/server/db/schema";
import {
  hashPassword,
  verifyPassword,
  generateSalt,
  getAuthFromRequest,
} from "~/server/auth/auth";
import { eq } from "drizzle-orm";
import { generateId } from "~/lib/id";
import { sendWelcomeEmail } from "~/lib/email";

/**
 * Get current user from cookie (can be used in beforeLoad or API routes)
 */
export async function getCurrentUserFromRequest(request: Request) {
  let userId = getAuthFromRequest(request);

  // Fallback for demo/dev mode if cookie is missing
  if (!userId) {
    const url = new URL(request.url);
    userId = url.searchParams.get("userId");
  }

  if (!userId) {
    return null;
  }

  const db = getDb();
  const account = await db
    .select({
      id: accounts.id,
      email: accounts.email,
      firstName: accounts.firstName,
      lastName: accounts.lastName,
    })
    .from(accounts)
    .where(eq(accounts.id, userId))
    .limit(1);

  return account[0] || null;
}

/**
 * Login user - internal function used by API route
 */
export async function loginUserInternal(email: string, password: string) {
  const db = getDb();

  // Find account by email
  const account = await db
    .select()
    .from(accounts)
    .where(eq(accounts.email, email))
    .limit(1);

  if (!account[0]) {
    throw new Error("Invalid email or password");
  }

  // Get password hash
  const passwordRecord = await db
    .select()
    .from(passwords)
    .where(eq(passwords.accountId, account[0].id))
    .limit(1);

  if (!passwordRecord[0]) {
    throw new Error("Invalid email or password");
  }

  // Verify password
  const isValid = verifyPassword(
    password,
    passwordRecord[0].hash,
    passwordRecord[0].salt
  );

  if (!isValid) {
    throw new Error("Invalid email or password");
  }

  return { userId: account[0].id };
}

/**
 * Signup user - internal function used by API route
 */
export async function signupUserInternal(
  email: string,
  password: string,
  firstName: string,
  lastName: string
) {
  const db = getDb();

  // Check if email already exists
  const existing = await db
    .select()
    .from(accounts)
    .where(eq(accounts.email, email))
    .limit(1);

  if (existing[0]) {
    throw new Error("An account with this email already exists");
  }

  // Create account
  const accountId = generateId();
  const now = new Date().toISOString();

  const newAccount = {
    id: accountId,
    email,
    firstName,
    lastName,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(accounts).values(newAccount);

  // Create password
  const salt = generateSalt();
  const hash = hashPassword(password, salt);

  await db.insert(passwords).values({
    id: generateId(),
    accountId,
    hash,
    salt,
  });

  // Send welcome email (fire and forget)
  try {
    await sendWelcomeEmail(email, firstName);
  } catch (emailError) {
    console.error("Failed to send welcome email:", emailError);
    // Don't fail signup if email fails
  }

  return { userId: accountId };
}
