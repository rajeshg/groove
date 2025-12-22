import { parseWithZod } from "@conform-to/zod/v4";
import { invariantResponse } from "@epic-web/invariant";
import { data } from "react-router";
import { z } from "zod";
import { optionalString } from "../validation";

import { requireAuthCookie } from "~/auth/auth";
import { upsertItem } from "~/routes/queries.server";

// Schema for creating a new card (without intent field since it's implicit)
const NewCardSchema = z.object({
  boardId: z.string().min(1, "Board ID is required"),
  columnId: z.string().min(1, "Column ID is required"),
  title: z
    .string()
    .min(1, "Card title is required")
    .max(255, "Card title is too long"),
  order: z.coerce
    .number("Order must be a number")
    .finite("Order must be a valid number")
    .min(0, "Order cannot be negative"),
  content: z.string().nullable().optional().default(null),
  redirectTo: optionalString(), // For progressive enhancement
});

export async function action({ request }: { request: Request }) {
  const accountId = await requireAuthCookie(request);
  const formData = await request.formData();

  const submission = parseWithZod(formData, {
    schema: NewCardSchema,
    disableAutoCoercion: true,
  });

  invariantResponse(
    submission.status === "success",
    "Invalid form submission",
    { status: 400 }
  );

  const { boardId, columnId, title, order, content, redirectTo } =
    submission.value;

  // Create the card
  await upsertItem(
    {
      columnId,
      title,
      order,
      content: content || null,
      boardId,
      createdBy: accountId,
    },
    accountId
  );

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
