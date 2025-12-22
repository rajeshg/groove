import { parseWithZod } from "@conform-to/zod/v4";
import { invariantResponse } from "@epic-web/invariant";
import { data, redirect } from "react-router";
import { z } from "zod";
import { optionalString } from "../validation";
import { requireAuthCookie } from "~/auth/auth";
import { updateColumn, getColumn } from "~/routes/queries";
import {
  canUpdateColumnName,
  canUpdateColumnColor,
  canUpdateColumnExpanded,
  getPermissionErrorMessage,
} from "~/utils/permissions";

const UpdateColumnSchema = z.object({
  columnId: z.string().min(1, "Invalid column ID"),
  name: z
    .string()
    .min(1, "Column name is required")
    .max(255, "Column name is too long")
    .optional(),
  color: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i, "Invalid color format")
    .optional(),
  isExpanded: z.enum(["0", "1"]).optional(),
  redirectTo: optionalString(),
});

export async function action({ request }: { request: Request }) {
  const accountId = await requireAuthCookie(request);
  const formData = await request.formData();

  const submission = parseWithZod(formData, {
    schema: UpdateColumnSchema,
    disableAutoCoercion: true,
  });
  if (submission.status !== "success") {
    return data({ result: submission.reply() }, { status: 400 });
  }

  const { columnId, name, color, isExpanded, redirectTo } = submission.value;

  try {
    // Check permissions
    const column = await getColumn(columnId, accountId);
    invariantResponse(column, "Column not found or unauthorized", {
      status: 404,
    });

    const board = column.Board;
    const userRole =
      board.accountId === accountId
        ? "owner"
        : board.members.find((m) => m.accountId === accountId)?.role ===
            "editor"
          ? "editor"
          : null;

    if (name && !canUpdateColumnName(userRole)) {
      invariantResponse(false, getPermissionErrorMessage("updateColumnName"), {
        status: 403,
      });
    }

    if (color && !canUpdateColumnColor(userRole)) {
      invariantResponse(false, getPermissionErrorMessage("updateColumnColor"), {
        status: 403,
      });
    }

    if (isExpanded !== undefined && !canUpdateColumnExpanded(userRole)) {
      invariantResponse(
        false,
        getPermissionErrorMessage("updateColumnExpanded"),
        {
          status: 403,
        }
      );
    }

    const isExpandedBool =
      isExpanded !== undefined ? isExpanded === "1" : undefined;

    await updateColumn(
      columnId,
      { name, color, isExpanded: isExpandedBool },
      accountId
    );

    if (redirectTo) {
      return redirect(redirectTo);
    }

    return data({ result: submission.reply() });
  } catch (error: unknown) {
    console.error("Error updating column:", error);
    if (error instanceof Response) throw error;
    const message =
      error instanceof Error ? error.message : "Failed to update column";
    return data({ error: message }, { status: 500 });
  }
}
