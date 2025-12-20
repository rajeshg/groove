import { parseWithZod } from "@conform-to/zod/v4";
import { invariantResponse } from "@epic-web/invariant";
import { data } from "react-router";
import { z } from "zod";

import { requireAuthCookie } from "~/auth/auth";
import { createColumn } from "~/routes/queries";

// Schema for creating a new column (without intent field since it's implicit)
const NewColumnSchema = z.object({
  boardId: z.string().min(1, "Board ID is required"),
  id: z.string().min(1, "Column ID is required"),
  name: z
    .string()
    .min(1, "Column name is required")
    .max(255, "Column name is too long"),
  redirectTo: z.string().optional(), // For progressive enhancement
});

export async function action({ request }: { request: Request }) {
  const accountId = await requireAuthCookie(request);
  const formData = await request.formData();

  const submission = parseWithZod(formData, {
    schema: NewColumnSchema,
  });

  invariantResponse(
    submission.status === "success",
    "Invalid form submission",
    { status: 400 }
  );

  const { boardId, id, name, redirectTo } = submission.value;

  // Create the column
  await createColumn(boardId, name, id, accountId);

  // Support progressive enhancement
  if (redirectTo) {
    return data(
      { result: submission.reply({ resetForm: true }) },
      {
        headers: {
          Location: redirectTo,
        },
      }
    );
  }

  return data({ result: submission.reply({ resetForm: true }) });
}
