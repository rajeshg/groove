import { parseWithZod } from "@conform-to/zod/v4";
import { invariantResponse } from "@epic-web/invariant";
import { data } from "react-router";
import { z } from "zod";
import { requireAuthCookie } from "~/auth/auth";
import {
  updateColumnColor,
  updateColumnExpanded,
  updateColumnName,
} from "~/routes/queries";

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
  redirectTo: z.string().optional(),
});

export async function action({ request }: { request: Request }) {
  const accountId = await requireAuthCookie(request);
  const formData = await request.formData();

  const submission = parseWithZod(formData, { schema: UpdateColumnSchema });
  invariantResponse(submission.status === "success", "Invalid column data", {
    status: 400,
  });

  const { columnId, name, color, isExpanded } = submission.value;

  if (name) {
    await updateColumnName(columnId, name, accountId);
  }

  if (color) {
    await updateColumnColor(columnId, color, accountId);
  }

  if (isExpanded !== undefined) {
    const isExpandedBool = isExpanded === "1";
    await updateColumnExpanded(columnId, isExpandedBool, accountId);
  }

  return data({ result: submission.reply() });
}
