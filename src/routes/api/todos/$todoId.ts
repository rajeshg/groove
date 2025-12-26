import { createFileRoute } from "@tanstack/react-router";
import { getTodoById, updateTodo, deleteTodo } from "~/server/actions/todos";
import { UpdateTodoSchema } from "~/server/validation";
import { ensureDbInitialized } from "~/server/db/migrations";

export const Route = createFileRoute("/api/todos/$todoId")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        try {
          await ensureDbInitialized();

          const url = new URL(request.url);
          const userId = url.searchParams.get("userId");

          if (!userId) {
            return Response.json(
              { error: "Missing userId query parameter" },
              { status: 400 }
            );
          }

          const todo = await getTodoById({
            data: { userId, todoId: params.todoId },
          });

          if (!todo) {
            return Response.json({ error: "Todo not found" }, { status: 404 });
          }

          return Response.json(todo, {
            headers: {
              "Content-Type": "application/json",
            },
          });
        } catch (error) {
          console.error(`GET /api/todos/${params.todoId} error:`, error);
          return Response.json(
            { error: "Failed to fetch todo" },
            { status: 500 }
          );
        }
      },

      PUT: async ({ params, request }) => {
        try {
          await ensureDbInitialized();

          const url = new URL(request.url);
          const userId = url.searchParams.get("userId");

          if (!userId) {
            return Response.json(
              { error: "Missing userId query parameter" },
              { status: 400 }
            );
          }

          const body = await request.json();

          // Validate input
          const validation = UpdateTodoSchema.safeParse(body);
          if (!validation.success) {
            return Response.json(
              {
                error: "Validation failed",
                details: validation.error.errors,
              },
              { status: 400 }
            );
          }

          const updated = await updateTodo({
            data: { userId, todoId: params.todoId, input: validation.data },
          });

          if (!updated) {
            return Response.json({ error: "Todo not found" }, { status: 404 });
          }

          return Response.json(updated, {
            headers: {
              "Content-Type": "application/json",
            },
          });
        } catch (error) {
          console.error(`PUT /api/todos/${params.todoId} error:`, error);
          if (
            error instanceof Error &&
            error.message.includes("unauthorized")
          ) {
            return Response.json({ error: "Unauthorized" }, { status: 403 });
          }
          return Response.json(
            { error: "Failed to update todo" },
            { status: 500 }
          );
        }
      },

      DELETE: async ({ params, request }) => {
        try {
          await ensureDbInitialized();

          const url = new URL(request.url);
          const userId = url.searchParams.get("userId");

          if (!userId) {
            return Response.json(
              { error: "Missing userId query parameter" },
              { status: 400 }
            );
          }

          await deleteTodo({ data: { userId, todoId: params.todoId } });

          return Response.json(
            { success: true },
            {
              headers: {
                "Content-Type": "application/json",
              },
            }
          );
        } catch (error) {
          console.error(`DELETE /api/todos/${params.todoId} error:`, error);
          if (
            error instanceof Error &&
            error.message.includes("unauthorized")
          ) {
            return Response.json({ error: "Unauthorized" }, { status: 403 });
          }
          return Response.json(
            { error: "Failed to delete todo" },
            { status: 500 }
          );
        }
      },
    },
  },
});
