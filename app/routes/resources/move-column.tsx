import { parseWithZod } from "@conform-to/zod/v4";
import { invariantResponse } from "@epic-web/invariant";
import { data } from "react-router";
import { z } from "zod";
import { requireAuthCookie } from "~/auth/auth";
import { updateColumn, getColumn } from "~/routes/queries";
import { canMoveColumn, getPermissionErrorMessage } from "~/utils/permissions";

const MoveColumnSchema = z.object({
  id: z.string().min(1, "Invalid column ID"),
  order: z.coerce
    .number("Order must be a number")
    .finite("Order must be a valid number")
    .min(0, "Order cannot be negative"),
  redirectTo: z.string().optional(),
});

export async function action({ request }: { request: Request }) {
  const accountId = await requireAuthCookie(request);
  const formData = await request.formData();

  const submission = parseWithZod(formData, { schema: MoveColumnSchema });
  if (submission.status !== "success") {
    return data({ result: submission.reply() }, { status: 400 });
  }

  const { id, order } = submission.value;

  try {
    // Check permissions
    const column = await getColumn(id, accountId);
    invariantResponse(column, "Column not found or unauthorized", { status: 404 });

    const board = column.Board;
    const userRole =
      board.accountId === accountId
        ? "owner"
        : board.members.find((m) => m.accountId === accountId)?.role === "editor"
          ? "editor"
          : null;

    if (!canMoveColumn(userRole)) {
      invariantResponse(false, getPermissionErrorMessage("moveColumn"), {
        status: 403,
      });
    }

    await updateColumn(id, { order }, accountId);

    return data({ result: submission.reply() });
  } catch (error: unknown) {
    console.error("Error moving column:", error);
    if (error instanceof Response) throw error;
    const message = error instanceof Error ? error.message : "Failed to move column";
    return data({ error: message }, { status: 500 });
  }
}
