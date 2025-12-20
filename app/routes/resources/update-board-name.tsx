import { parseWithZod } from "@conform-to/zod/v4";
import { invariantResponse } from "@epic-web/invariant";
import { data } from "react-router";
import { z } from "zod";
import { requireAuthCookie } from "~/auth/auth";
import { updateBoardName, getBoardData } from "~/routes/queries";
import {
  canUpdateBoardName,
  getPermissionErrorMessage,
} from "~/utils/permissions";

const UpdateBoardNameSchema = z.object({
  boardId: z.string().min(1, "Invalid board ID"),
  name: z
    .string()
    .min(1, "Board name is required")
    .max(255, "Board name is too long"),
  redirectTo: z.string().optional(),
});

export async function action({ request }: { request: Request }) {
  const accountId = await requireAuthCookie(request);
  const formData = await request.formData();

  const submission = parseWithZod(formData, { schema: UpdateBoardNameSchema });
  invariantResponse(submission.status === "success", "Invalid board data", {
    status: 400,
  });

  const { boardId, name } = submission.value;

  // Check permissions
  const board = await getBoardData(boardId, accountId);
  invariantResponse(board, "Board not found", { status: 404 });

  const userRole =
    board.accountId === accountId
      ? "owner"
      : board.members.find((m) => m.accountId === accountId)?.role === "editor"
        ? "editor"
        : null;

  if (!canUpdateBoardName(userRole)) {
    invariantResponse(false, getPermissionErrorMessage("updateBoardName"), {
      status: 403,
    });
  }

  await updateBoardName(boardId, name, accountId);

  return data({ result: submission.reply() });
}
