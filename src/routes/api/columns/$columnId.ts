import { createFileRoute } from "@tanstack/react-router";
import { updateColumnOrder } from "~/server/actions/boards";
import { getCurrentUserFromRequest } from "~/server/actions/auth";
import { getDb } from "~/server/db/client";
import { columns as columnsTable } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";
import { ensureDbInitialized } from "~/server/db/migrations";

export const Route = createFileRoute("/api/columns/$columnId")({
  server: {
    handlers: {
      PUT: async ({ params: { columnId }, request }) => {
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

          // If updating order, use the server function
          if (body.order !== undefined) {
            await updateColumnOrder({
              data: {
                accountId: user.id,
                boardId,
                columnId,
                order: body.order,
              },
            });
          }

          // Get updated column
          const db = getDb();
          const updated = await db
            .select()
            .from(columnsTable)
            .where(eq(columnsTable.id, columnId))
            .limit(1);

          if (!updated[0]) {
            return Response.json(
              { error: "Column not found" },
              { status: 404 }
            );
          }

          return Response.json(updated[0], {
            headers: {
              "Content-Type": "application/json",
            },
          });
        } catch (error) {
          console.error(`PUT /api/columns/${columnId} error:`, error);
          if (error instanceof Error && error.message.includes("not found")) {
            return Response.json(
              { error: "Column not found" },
              { status: 404 }
            );
          }
          return Response.json(
            { error: "Failed to update column" },
            { status: 500 }
          );
        }
      },

      DELETE: async ({ params: { columnId }, request }) => {
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

          const db = getDb();

          // Verify column belongs to user's board
          const column = await db
            .select()
            .from(columnsTable)
            .where(
              and(
                eq(columnsTable.id, columnId),
                eq(columnsTable.boardId, boardId)
              )
            )
            .limit(1);

          if (!column[0]) {
            return Response.json(
              { error: "Column not found" },
              { status: 404 }
            );
          }

          // Delete column (items cascade deleted)
          await db.delete(columnsTable).where(eq(columnsTable.id, columnId));

          return Response.json(
            { success: true },
            {
              headers: {
                "Content-Type": "application/json",
              },
            }
          );
        } catch (error) {
          console.error(`DELETE /api/columns/${columnId} error:`, error);
          if (error instanceof Error && error.message.includes("not found")) {
            return Response.json(
              { error: "Column not found" },
              { status: 404 }
            );
          }
          return Response.json(
            { error: "Failed to delete column" },
            { status: 500 }
          );
        }
      },
    },
  },
});
