import { createFileRoute } from "@tanstack/react-router";
import { loginUserInternal } from "~/server/actions/auth";
import { LoginSchema } from "~/server/auth/validation";
import { setAuthCookie } from "~/server/auth/auth";
import { getDb } from "~/server/db/client";
import { accounts } from "~/server/db/schema";
import { eq } from "drizzle-orm";

export const Route = createFileRoute("/api/auth/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // Database is already initialized on server startup
          const body = await request.json();

          // Validate input
          const validation = LoginSchema.safeParse(body);
          if (!validation.success) {
            return Response.json(
              {
                error: "Validation failed",
                details: validation.error.errors,
              },
              { status: 400 }
            );
          }

          // Login user
          const { userId } = await loginUserInternal(
            validation.data.email,
            validation.data.password
          );

          // Get user data
          const db = getDb();
          const user = await db
            .select({
              id: accounts.id,
              email: accounts.email,
              firstName: accounts.firstName,
              lastName: accounts.lastName,
            })
            .from(accounts)
            .where(eq(accounts.id, userId))
            .limit(1);

          if (!user[0]) {
            return Response.json({ error: "User not found" }, { status: 500 });
          }

          return Response.json(
            { success: true, user: user[0] },
            {
              status: 200,
              headers: {
                "Set-Cookie": setAuthCookie(userId),
                "Content-Type": "application/json",
              },
            }
          );
        } catch (error) {
          console.error("POST /api/auth/login error:", error);

          if (error instanceof Error) {
            if (error.message.includes("Invalid email or password")) {
              return Response.json(
                { error: "Invalid email or password" },
                { status: 401 }
              );
            }
          }

          return Response.json({ error: "Login failed" }, { status: 500 });
        }
      },
    },
  },
});
