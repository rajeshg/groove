import { createFileRoute } from "@tanstack/react-router";
import { updateItem, deleteItem } from "~/server/actions/boards";
import { getCurrentUserFromRequest } from "~/server/actions/auth";
import { ensureDbInitialized } from "~/server/db/migrations";
import { UpdateItemSchema } from "~/server/validation";
import { ZodError } from "zod";

export const Route = createFileRoute("/api/items/$itemId")({
  server: {
    handlers: {
      PUT: async ({ params: { itemId }, request }) => {
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
          const validatedData = UpdateItemSchema.parse({
            title: body.title,
            content: body.content,
            columnId: body.columnId,
            order: body.order,
          });

          const item = await updateItem({
            data: {
              accountId: user.id,
              boardId,
              itemId,
              data: validatedData,
            },
          });

          return Response.json(item, {
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
          console.error(`PUT /api/items/${itemId} error:`, error);
          if (error instanceof Error && error.message.includes("not found")) {
            return Response.json({ error: "Item not found" }, { status: 404 });
          }
          return Response.json(
            { error: "Failed to update item" },
            { status: 500 }
          );
        }
      },

      DELETE: async ({ params: { itemId }, request }) => {
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

          await deleteItem({
            data: {
              accountId: user.id,
              boardId,
              itemId,
            },
          });

          return Response.json(
            { success: true },
            {
              headers: {
                "Content-Type": "application/json",
              },
            }
          );
        } catch (error) {
          console.error(`DELETE /api/items/${itemId} error:`, error);
          if (error instanceof Error && error.message.includes("not found")) {
            return Response.json({ error: "Item not found" }, { status: 404 });
          }
          return Response.json(
            { error: "Failed to delete item" },
            { status: 500 }
          );
        }
      },
    },
  },
});
