import { parseWithZod } from "@conform-to/zod/v4";
import { invariantResponse } from "@epic-web/invariant";
import { data } from "react-router";
import { z } from "zod";
import { requireAuthCookie } from "~/auth/auth";
import { deleteCard, getItem } from "~/routes/queries";

const DeleteCardSchema = z.object({
  itemId: z.string().min(1, "Invalid item ID"),
  redirectTo: z.string().optional(),
});

export async function action({ request }: { request: Request }) {
  const accountId = await requireAuthCookie(request);
  const formData = await request.formData();

  const submission = parseWithZod(formData, { schema: DeleteCardSchema });
  invariantResponse(submission.status === "success", "Invalid card ID", {
    status: 400,
  });

  const { itemId } = submission.value;

  // Check if user can delete this card (must be creator if editor)
  const card = await getItem(itemId, accountId);
  invariantResponse(card, "Card not found", { status: 404 });

  await deleteCard(itemId, accountId);

  return data({ result: submission.reply() });
}
