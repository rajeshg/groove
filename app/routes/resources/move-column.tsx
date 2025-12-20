import { parseWithZod } from "@conform-to/zod/v4";
import { invariantResponse } from "@epic-web/invariant";
import { data } from "react-router";
import { z } from "zod";
import { requireAuthCookie } from "~/auth/auth";
import { updateColumnOrder } from "~/routes/queries";

const MoveColumnSchema = z.object({
  id: z.string().min(1, "Invalid column ID"),
  order: z.coerce
    .number("Order must be a number")
    .finite("Order must be a valid number")
    .min(0, "Order cannot be negative"),
  redirectTo: z.string().optional(),
});

export async function action({ request }: { request: Request }) {
  const accountId = await requireAuthCookie(request);
  const formData = await request.formData();

  const submission = parseWithZod(formData, { schema: MoveColumnSchema });
  invariantResponse(submission.status === "success", "Invalid move data", {
    status: 400,
  });

  const { id, order } = submission.value;

  await updateColumnOrder(id, order, accountId);

  return data({ result: submission.reply() });
}
