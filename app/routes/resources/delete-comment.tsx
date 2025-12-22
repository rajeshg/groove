import { parseWithZod } from "@conform-to/zod/v4";
import { invariantResponse } from "@epic-web/invariant";
import { data } from "react-router";
import { z } from "zod";
import { optionalString } from "../validation";
import { requireAuthCookie } from "~/auth/auth";
import { deleteComment } from "~/routes/queries.server";

const DeleteCommentSchema = z.object({
  commentId: z.string().min(1, "Invalid comment ID"),
  redirectTo: optionalString(),
});

export async function action({ request }: { request: Request }) {
  const accountId = await requireAuthCookie(request);
  const formData = await request.formData();

  const submission = parseWithZod(formData, {
    schema: DeleteCommentSchema,
    disableAutoCoercion: true,
  });
  invariantResponse(submission.status === "success", "Invalid comment ID", {
    status: 400,
  });

  const { commentId } = submission.value;

  await deleteComment(commentId, accountId);

  return data({ result: submission.reply() });
}
