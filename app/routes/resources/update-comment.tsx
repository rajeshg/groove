import { parseWithZod } from "@conform-to/zod/v4";
import { invariantResponse } from "@epic-web/invariant";
import { data } from "react-router";
import { z } from "zod";
import { requireAuthCookie } from "~/auth/auth";
import { updateComment } from "~/routes/queries";

const UpdateCommentSchema = z.object({
  commentId: z.string().min(1, "Invalid comment ID"),
  content: z
    .string()
    .min(1, "Comment content is required")
    .max(5000, "Comment is too long"),
  redirectTo: z.string().optional(),
});

export async function action({ request }: { request: Request }) {
  const accountId = await requireAuthCookie(request);
  const formData = await request.formData();

  const submission = parseWithZod(formData, { schema: UpdateCommentSchema });
  invariantResponse(submission.status === "success", "Invalid comment data", {
    status: 400,
  });

  const { commentId, content } = submission.value;

  await updateComment(commentId, content, accountId);

  return data({ result: submission.reply() });
}
