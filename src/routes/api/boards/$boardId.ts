import { createFileRoute } from "@tanstack/react-router";
import { getBoard, updateBoard, deleteBoard } from "~/server/actions/boards";
import { getCurrentUserFromRequest } from "~/server/actions/auth";
import { ensureDbInitialized } from "~/server/db/migrations";

export const Route = createFileRoute("/api/boards/$boardId")({
  server: {
    handlers: {
      GET: async ({ params: { boardId }, request }) => {
        try {
          await ensureDbInitialized();

          const user = await getCurrentUserFromRequest(request);
          if (!user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }

          const result = await getBoard({
            data: {
              accountId: user.id,
              boardId,
            },
          });

          return Response.json(result, {
            headers: {
              "Content-Type": "application/json",
            },
          });
        } catch (error) {
          console.error("GET /api/boards/:boardId error:", error);
          if (error instanceof Error && error.message.includes("not found")) {
            return Response.json({ error: "Board not found" }, { status: 404 });
          }
          return Response.json(
            { error: "Failed to fetch board" },
            { status: 500 }
          );
        }
      },

      PUT: async ({ params: { boardId }, request }) => {
        try {
          await ensureDbInitialized();

          const user = await getCurrentUserFromRequest(request);
          if (!user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }

          const body = await request.json();

          const board = await updateBoard({
            data: {
              accountId: user.id,
              boardId,
              data: {
                name: body.name,
                color: body.color,
              },
            },
          });

          return Response.json(board, {
            headers: {
              "Content-Type": "application/json",
            },
          });
        } catch (error) {
          console.error("PUT /api/boards/:boardId error:", error);
          if (error instanceof Error && error.message.includes("not found")) {
            return Response.json({ error: "Board not found" }, { status: 404 });
          }
          return Response.json(
            { error: "Failed to update board" },
            { status: 500 }
          );
        }
      },

      DELETE: async ({ params: { boardId }, request }) => {
        try {
          await ensureDbInitialized();

          const user = await getCurrentUserFromRequest(request);
          if (!user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }

          await deleteBoard({
            data: {
              accountId: user.id,
              boardId,
            },
          });

          return Response.json(
            { success: true },
            {
              status: 200,
              headers: {
                "Content-Type": "application/json",
              },
            }
          );
        } catch (error) {
          console.error("DELETE /api/boards/:boardId error:", error);
          if (error instanceof Error && error.message.includes("not found")) {
            return Response.json({ error: "Board not found" }, { status: 404 });
          }
          return Response.json(
            { error: "Failed to delete board" },
            { status: 500 }
          );
        }
      },
    },
  },
});
