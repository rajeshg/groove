import { createFileRoute } from "@tanstack/react-router";
import { clearAuthCookie } from "~/server/auth/auth";

export const Route = createFileRoute("/api/auth/logout")({
  server: {
    handlers: {
      POST: async () => {
        try {
          // Database is already initialized on server startup
          return Response.json(
            { success: true },
            {
              status: 200,
              headers: {
                "Set-Cookie": clearAuthCookie(),
                "Content-Type": "application/json",
              },
            }
          );
        } catch (error) {
          console.error("POST /api/auth/logout error:", error);
          return Response.json({ error: "Logout failed" }, { status: 500 });
        }
      },
    },
  },
});
