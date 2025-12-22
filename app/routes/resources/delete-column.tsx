import { parseWithZod } from "@conform-to/zod/v4";
import { invariantResponse } from "@epic-web/invariant";
import { redirect } from "react-router";
import { z } from "zod";
import { optionalString } from "../validation";
import { requireAuthCookie } from "~/auth/auth";
import { deleteColumn } from "~/routes/queries.server";

const DeleteColumnSchema = z.object({
  columnId: z.string().min(1, "Invalid column ID"),
  boardId: z.string().min(1, "Invalid board ID"),
  redirectTo: optionalString(),
});

export async function action({ request }: { request: Request }) {
  const accountId = await requireAuthCookie(request);
  const formData = await request.formData();

  const submission = parseWithZod(formData, {
    schema: DeleteColumnSchema,
    disableAutoCoercion: true,
  });
  invariantResponse(submission.status === "success", "Invalid column ID", {
    status: 400,
  });

  const { columnId, boardId, redirectTo } = submission.value;

  await deleteColumn(columnId, boardId, accountId);

  // Redirect to board page or specified redirectTo after deletion
  if (redirectTo) {
    return redirect(redirectTo);
  }

  // Default: redirect to the board page
  return redirect(`/board/${boardId}`);
}
