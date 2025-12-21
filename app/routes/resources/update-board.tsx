import { parseWithZod } from "@conform-to/zod/v4";
import { invariantResponse } from "@epic-web/invariant";
import { data, redirect } from "react-router";
import { z } from "zod";
import { requireAuthCookie } from "~/auth/auth";
import { updateBoard, getBoardData } from "~/routes/queries";
import {
  canUpdateBoard,
  getPermissionErrorMessage,
} from "~/utils/permissions";

const UpdateBoardSchema = z.object({
  boardId: z.string().min(1, "Invalid board ID"),
  name: z
    .string()
    .min(1, "Board name is required")
    .max(255, "Board name is too long")
    .optional(),
  color: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i, "Invalid color format")
    .optional(),
  redirectTo: z.string().optional(),
});

export async function action({ request }: { request: Request }) {
  const accountId = await requireAuthCookie(request);
  const formData = await request.formData();

  const submission = parseWithZod(formData, { schema: UpdateBoardSchema });
  if (submission.status !== "success") {
    return data({ result: submission.reply() }, { status: 400 });
  }

  const { boardId, name, color, redirectTo } = submission.value;

  try {
    // Check permissions
    const board = await getBoardData(boardId, accountId);
    invariantResponse(board, "Board not found or unauthorized", { status: 404 });

    const userRole =
      board.accountId === accountId
        ? "owner"
        : board.members.find((m) => m.accountId === accountId)?.role === "editor"
          ? "editor"
          : null;

    if (!canUpdateBoard(userRole)) {
      invariantResponse(false, getPermissionErrorMessage("updateBoard"), {
        status: 403,
      });
    }

    await updateBoard(boardId, { name, color }, accountId);

    if (redirectTo) {
      return redirect(redirectTo);
    }

    return data({ result: submission.reply() });
  } catch (error: unknown) {
    console.error("Error updating board:", error);
    if (error instanceof Response) throw error;
    const message = error instanceof Error ? error.message : "Failed to update board";
    return data({ error: message }, { status: 500 });
  }
}
