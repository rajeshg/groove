import { createFileRoute } from "@tanstack/react-router";
import { getColumns, createColumn } from "~/server/actions/boards";
import { getCurrentUserFromRequest } from "~/server/actions/auth";
import { ensureDbInitialized } from "~/server/db/migrations";
import { CreateColumnSchema } from "~/server/validation";
import { ZodError } from "zod";

export const Route = createFileRoute("/api/columns/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await ensureDbInitialized();

          const user = await getCurrentUserFromRequest(request);
          if (!user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }

          const url = new URL(request.url);
          const boardId = url.searchParams.get("boardId");

          if (!boardId) {
            return Response.json(
              { error: "Missing boardId query parameter" },
              { status: 400 }
            );
          }

          const columns = await getColumns({ data: { boardId } });

          return Response.json(columns, {
            headers: {
              "Content-Type": "application/json",
            },
          });
        } catch (error) {
          console.error("GET /api/columns error:", error);
          return Response.json(
            { error: "Failed to fetch columns" },
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

          const url = new URL(request.url);
          const boardId = url.searchParams.get("boardId");

          if (!boardId) {
            return Response.json(
              { error: "Missing boardId query parameter" },
              { status: 400 }
            );
          }

          const body = await request.json();

          // Validate input against schema
          const validatedData = CreateColumnSchema.parse({
            name: body.name,
            color: body.color,
          });

          const column = await createColumn({
            data: {
              accountId: user.id,
              boardId,
              data: validatedData,
            },
          });

          return Response.json(column, {
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
          console.error("POST /api/columns error:", error);
          return Response.json(
            { error: "Failed to create column" },
            { status: 500 }
          );
        }
      },
    },
  },
});
