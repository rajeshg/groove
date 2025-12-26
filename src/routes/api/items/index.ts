import { createFileRoute } from "@tanstack/react-router";
import { getItems, createItem } from "~/server/actions/boards";
import { getCurrentUserFromRequest } from "~/server/actions/auth";
import { ensureDbInitialized } from "~/server/db/migrations";
import { CreateItemSchema } from "~/server/validation";
import { ZodError } from "zod";

export const Route = createFileRoute("/api/items/")({
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

          const items = await getItems({ data: { boardId } });

          return Response.json(items, {
            headers: {
              "Content-Type": "application/json",
            },
          });
        } catch (error) {
          console.error("GET /api/items error:", error);
          return Response.json(
            { error: "Failed to fetch items" },
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
          const columnId = url.searchParams.get("columnId");

          if (!boardId || !columnId) {
            return Response.json(
              { error: "Missing boardId or columnId query parameter" },
              { status: 400 }
            );
          }

          const body = await request.json();

          // Validate input against schema
          const validatedData = CreateItemSchema.parse({
            title: body.title,
            content: body.content,
          });

          const item = await createItem({
            data: {
              accountId: user.id,
              boardId,
              columnId,
              data: validatedData,
            },
          });

          return Response.json(item, {
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
          console.error("POST /api/items error:", error);
          return Response.json(
            { error: "Failed to create item" },
            { status: 500 }
          );
        }
      },
    },
  },
});
