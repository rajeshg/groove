import { createFileRoute } from "@tanstack/react-router";
import { getTodos, createTodo } from "~/server/actions/todos";
import { CreateTodoSchema } from "~/server/validation";
import { ensureDbInitialized } from "~/server/db/migrations";

export const Route = createFileRoute("/api/todos/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
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

          const todos = await getTodos({ data: { userId } });

          return Response.json(todos, {
            headers: {
              "Content-Type": "application/json",
            },
          });
        } catch (error) {
          console.error("GET /api/todos error:", error);
          return Response.json(
            { error: "Failed to fetch todos" },
            { status: 500 }
          );
        }
      },

      POST: async ({ request }) => {
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
          const validation = CreateTodoSchema.safeParse(body);
          if (!validation.success) {
            return Response.json(
              {
                error: "Validation failed",
                details: validation.error.errors,
              },
              { status: 400 }
            );
          }

          const newTodo = await createTodo({
            data: { userId, input: validation.data },
          });

          return Response.json(newTodo, {
            status: 201,
            headers: {
              "Content-Type": "application/json",
            },
          });
        } catch (error) {
          console.error("POST /api/todos error:", error);
          return Response.json(
            { error: "Failed to create todo" },
            { status: 500 }
          );
        }
      },
    },
  },
});
