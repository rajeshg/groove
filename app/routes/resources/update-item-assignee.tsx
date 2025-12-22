import { parseWithZod } from "@conform-to/zod/v4";
import { invariantResponse } from "@epic-web/invariant";
import { data } from "react-router";
import { z } from "zod";
import { optionalString } from "../validation";
import { requireAuthCookie } from "~/auth/auth";
import { updateItemAssignee } from "~/routes/queries";
import { createOrGetAssignee } from "~/utils/assignee";

const UpdateItemAssigneeSchema = z.object({
  itemId: z.string().min(1, "Invalid item ID"),
  assigneeId: z.string().nullable().optional(),
  boardId: z.string().min(1, "Invalid board ID"),
  // For creating new assignees
  newAssigneeName: optionalString(),
  redirectTo: optionalString(),
});

export async function action({ request }: { request: Request }) {
  const accountId = await requireAuthCookie(request);
  const formData = await request.formData();

  const submission = parseWithZod(formData, {
    schema: UpdateItemAssigneeSchema,
    disableAutoCoercion: true,
  });
  invariantResponse(submission.status === "success", "Invalid assignee data", {
    status: 400,
  });

  const { itemId, assigneeId, boardId, newAssigneeName } = submission.value;

  // If creating a new assignee, create it first
  let finalAssigneeId = assigneeId;

  if (newAssigneeName) {
    const assignee = await createOrGetAssignee(boardId, newAssigneeName);
    finalAssigneeId = assignee.id;
  }

  await updateItemAssignee(itemId, finalAssigneeId || null, accountId);

  return data({ result: submission.reply() });
}
