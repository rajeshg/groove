import { parseWithZod } from "@conform-to/zod/v4";
import { invariantResponse } from "@epic-web/invariant";
import { data } from "react-router";
import { z } from "zod";
import { requireAuthCookie } from "~/auth/auth";
import { deleteColumn } from "~/routes/queries";

const DeleteColumnSchema = z.object({
  columnId: z.string().min(1, "Invalid column ID"),
  boardId: z.string().min(1, "Invalid board ID"),
  redirectTo: z.string().optional(),
});

export async function action({ request }: { request: Request }) {
  const accountId = await requireAuthCookie(request);
  const formData = await request.formData();

  const submission = parseWithZod(formData, { schema: DeleteColumnSchema });
  invariantResponse(submission.status === "success", "Invalid column ID", {
    status: 400,
  });

  const { columnId, boardId } = submission.value;

  await deleteColumn(columnId, boardId, accountId);

  return data({ result: submission.reply() });
}
