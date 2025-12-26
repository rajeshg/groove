import { createFileRoute } from "@tanstack/react-router";
import { getBoards, createBoard } from "~/server/actions/boards";
import { getCurrentUserFromRequest } from "~/server/actions/auth";
import { ensureDbInitialized } from "~/server/db/migrations";
import { CreateBoardSchema } from "~/server/validation";
import { ZodError } from "zod";

export const Route = createFileRoute("/api/boards/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await ensureDbInitialized();

          const user = await getCurrentUserFromRequest(request);
          if (!user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }

          const boards = await getBoards({ data: { accountId: user.id } });

          return Response.json(boards, {
            headers: {
              "Content-Type": "application/json",
            },
          });
        } catch (error) {
          console.error("GET /api/boards error:", error);
          return Response.json(
            { error: "Failed to fetch boards" },
            { status: 500 }
          );
        }
      },

      POST: async ({ request }) => {
        try {
          await ensureDbInitialized();

          const user = await getCurrentUserFromRequest(request);
          if (!user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }

          const body = await request.json();

          // Validate input against schema
          const validatedData = CreateBoardSchema.parse({
            name: body.name,
            color: body.color,
            template: body.template,
          });

          const board = await createBoard({
            data: {
              accountId: user.id,
              data: validatedData,
            },
          });

          return Response.json(board, {
            status: 201,
            headers: {
              "Content-Type": "application/json",
            },
          });
        } catch (error) {
          if (error instanceof ZodError) {
            return Response.json(
              {
                error: "Validation failed",
                details: error.errors.map((e) => ({
                  field: e.path.join("."),
                  message: e.message,
                })),
              },
              { status: 400 }
            );
          }
          console.error("POST /api/boards error:", error);
          return Response.json(
            { error: "Failed to create board" },
            { status: 500 }
          );
        }
      },
    },
  },
});
