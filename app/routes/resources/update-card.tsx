import { parseWithZod } from "@conform-to/zod/v4";
import { invariantResponse } from "@epic-web/invariant";
import { data } from "react-router";
import { z } from "zod";
import { optionalString } from "../validation";
import { requireAuthCookie } from "~/auth/auth";
import { upsertItem } from "~/routes/queries.server";

const UpdateCardSchema = z.object({
  id: z.string().min(1, "Invalid item ID"),
  boardId: z.string().min(1, "Invalid board ID"),
  columnId: z.string().min(1, "Invalid column ID"),
  title: z
    .string()
    .min(1, "Card title is required")
    .max(255, "Card title is too long"),
  order: z.coerce
    .number("Order must be a number")
    .finite("Order must be a valid number")
    .min(0, "Order cannot be negative"),
  content: z.string().nullable().default(null),
  redirectTo: optionalString(),
});

export async function action({ request }: { request: Request }) {
  const accountId = await requireAuthCookie(request);
  const formData = await request.formData();

  const submission = parseWithZod(formData, {
    schema: UpdateCardSchema,
    disableAutoCoercion: true,
  });
  invariantResponse(submission.status === "success", "Invalid card data", {
    status: 400,
  });

  const { boardId, ...cardData } = submission.value;
  await upsertItem({ ...cardData, boardId }, accountId);

  return data({ result: submission.reply() });
}
