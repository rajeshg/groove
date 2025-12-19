import { prisma } from "../../prisma/client";

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
 * Generate unique assignee name with deduplication
 * Rules:
 * - If name doesn't exist in board, use it as-is
 * - If name exists, append last 4 chars of UUID (8 total)
 */
export async function generateUniqueAssigneeName(
  boardId: string,
  baseName: string
): Promise<string> {
  const normalizedName = baseName.trim();

  // Check if name already exists in this board
  const existing = await prisma.assignee.findUnique({
    where: { name_boardId: { name: normalizedName, boardId } },
  });

  if (!existing) {
    return normalizedName;
  }

  // If exists, append last 4 digits of a UUID
  const uniqueSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${normalizedName} ${uniqueSuffix}`;
}

/**
 * Create or get assignee for a user in a board
 * If assignee already exists (by userId + boardId), return it
 * Otherwise create new assignee linked to the user
 *
 * Prefers using firstName + lastName from Account, falls back to email parsing
 */
export async function ensureAssigneeForUser(
  boardId: string,
  userId: string,
  email: string
): Promise<{
  id: string;
  name: string;
}> {
  const user = await prisma.account.findUnique({
    where: { id: userId },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!user) throw new Error("User not found");

  // Check if assignee already exists for this user in this board
  const existing = await prisma.assignee.findFirst({
    where: { boardId, userId },
  });

  if (existing) {
    return { id: existing.id, name: existing.name };
  }

  // Prefer firstName + lastName if available, otherwise parse from email
  let baseName: string;
  if (user.firstName && user.lastName) {
    baseName = `${user.firstName} ${user.lastName}`;
  } else {
    baseName = parseNameFromEmail(email);
  }

  const uniqueName = await generateUniqueAssigneeName(boardId, baseName);

  const assignee = await prisma.assignee.create({
    data: {
      name: uniqueName,
      boardId,
      userId,
    },
  });

  return { id: assignee.id, name: assignee.name };
}

/**
 * Create assignee without requiring a user (e.g., "Support Team")
 */
export async function createOrGetAssignee(
  boardId: string,
  name: string
): Promise<{
  id: string;
  name: string;
}> {
  const normalizedName = name.trim();

  // Get all assignees for this board and do case-insensitive match in JS
  const allAssignees = await prisma.assignee.findMany({
    where: { boardId },
  });

  const existing = allAssignees.find(
    (a: (typeof allAssignees)[number]) =>
      a.name.toLowerCase() === normalizedName.toLowerCase()
  );

  if (existing) {
    return { id: existing.id, name: existing.name };
  }

  // Create new assignee
  const uniqueName = await generateUniqueAssigneeName(boardId, normalizedName);

  const assignee = await prisma.assignee.create({
    data: {
      name: uniqueName,
      boardId,
    },
  });

  return { id: assignee.id, name: assignee.name };
}

/**
 * Get all assignees for a board
 */
export async function getBoardAssignees(boardId: string) {
  return prisma.assignee.findMany({
    where: { boardId },
    include: { Account: { select: { email: true } } },
    orderBy: { name: "asc" },
  });
}

/**
 * Link an existing assignee to a user account
 * Used when a user joins a board and already has an assignee created for them
 */
export async function linkAssigneeToUser(assigneeId: string, userId: string) {
  return prisma.assignee.update({
    where: { id: assigneeId },
    data: { userId },
  });
}
