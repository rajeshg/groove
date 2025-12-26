import { createFileRoute } from "@tanstack/react-router";
import { getCurrentUserFromRequest } from "~/server/actions/auth";

export const Route = createFileRoute("/api/auth/me")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          // Database is already initialized on server startup
          // No need to call ensureDbInitialized() on every request
          const user = await getCurrentUserFromRequest(request);

          if (!user) {
            return Response.json({ user: null }, { status: 200 });
          }

          return Response.json({ user }, { status: 200 });
        } catch (error) {
          console.error("GET /api/auth/me error:", error);
          const message =
            error instanceof Error ? error.message : String(error);
          return Response.json(
            { error: `Failed to fetch user: ${message}` },
            { status: 500 }
          );
        }
      },
    },
  },
});
