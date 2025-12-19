import crypto from "crypto";

import { prisma } from "../../prisma/client";

export async function accountExists(email: string) {
  let account = await prisma.account.findUnique({
    where: { email: email },
    select: { id: true },
  });

  return Boolean(account);
}

export async function createAccount(
  email: string,
  password: string,
  firstName: string,
  lastName: string
) {
  let salt = crypto.randomBytes(16).toString("hex");
  let hash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, "sha256")
    .toString("hex");

  return prisma.account.create({
    data: {
      email: email,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      Password: { create: { hash, salt } },
    },
  });
}
