import { createFileRoute } from "@tanstack/react-router";
import {
  getComments,
  createComment,
  deleteComment,
  updateComment,
} from "~/server/actions/boards";
import { getCurrentUserFromRequest } from "~/server/actions/auth";
import { CreateCommentSchema, UpdateCommentSchema } from "~/server/validation";
import { ensureDbInitialized } from "~/server/db/migrations";
import { ZodError } from "zod";

export const Route = createFileRoute("/api/items/$itemId/comments")({
  server: {
    handlers: {
      GET: async ({ params: { itemId } }) => {
        try {
          await ensureDbInitialized();
          const comments = await getComments({ data: { itemId } });
          return Response.json(comments, {
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error(`GET /api/items/${itemId}/comments error:`, error);
          const message =
            error instanceof Error ? error.message : String(error);
          return Response.json(
            { error: `Failed to fetch comments: ${message}` },
            { status: 500 }
          );
        }
      },

      POST: async ({ params: { itemId }, request }) => {
        try {
          await ensureDbInitialized();

          const user = await getCurrentUserFromRequest(request);
          if (!user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }

          const body = await request.json();

          // Validate input
          const validatedData = CreateCommentSchema.parse({
            content: body.content,
          });

          const newComment = await createComment({
            data: {
              accountId: user.id,
              itemId,
              data: validatedData,
            },
          });

          console.log(`Successfully created comment for item ${itemId}`);

          return Response.json(newComment, {
            status: 201,
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          if (error instanceof ZodError) {
            return Response.json(
              {
                error: "Validation failed",
                details: error.errors,
              },
              { status: 400 }
            );
          }
          console.error(`POST /api/items/${itemId}/comments error:`, error);
          const message =
            error instanceof Error ? error.message : String(error);
          return Response.json(
            { error: `Failed to create comment: ${message}` },
            { status: 500 }
          );
        }
      },

      PUT: async ({ params: { itemId }, request }) => {
        try {
          await ensureDbInitialized();

          const user = await getCurrentUserFromRequest(request);
          if (!user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }

          const url = new URL(request.url);
          const commentId = url.searchParams.get("commentId");

          if (!commentId) {
            return Response.json(
              { error: "Missing commentId query parameter" },
              { status: 400 }
            );
          }

          const body = await request.json();

          // Validate input
          const validatedData = UpdateCommentSchema.parse({
            content: body.content,
          });

          await updateComment({
            data: {
              accountId: user.id,
              commentId,
              data: validatedData,
            },
          });

          return Response.json({ success: true });
        } catch (error) {
          if (error instanceof ZodError) {
            return Response.json(
              {
                error: "Validation failed",
                details: error.errors,
              },
              { status: 400 }
            );
          }
          console.error(`PUT /api/items/${itemId}/comments error:`, error);
          if (
            error instanceof Error &&
            error.message.includes("unauthorized")
          ) {
            return Response.json({ error: "Unauthorized" }, { status: 403 });
          }
          const message =
            error instanceof Error ? error.message : String(error);
          return Response.json(
            { error: `Failed to update comment: ${message}` },
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
          const commentId = url.searchParams.get("commentId");

          if (!commentId) {
            return Response.json(
              { error: "Missing commentId query parameter" },
              { status: 400 }
            );
          }

          await deleteComment({
            data: {
              accountId: user.id,
              commentId,
            },
          });

          return Response.json({ success: true });
        } catch (error) {
          console.error(`DELETE /api/items/${itemId}/comments error:`, error);
          if (
            error instanceof Error &&
            error.message.includes("unauthorized")
          ) {
            return Response.json({ error: "Unauthorized" }, { status: 403 });
          }
          return Response.json(
            { error: "Failed to delete comment" },
            { status: 500 }
          );
        }
      },
    },
  },
});
