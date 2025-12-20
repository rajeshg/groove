import { parseWithZod } from "@conform-to/zod/v4";
import { invariantResponse } from "@epic-web/invariant";
import { data } from "react-router";
import { z } from "zod";
import { requireAuthCookie } from "~/auth/auth";
import { prisma } from "../../../prisma/client";
import { getItem } from "~/routes/queries";

const MoveCardSchema = z.object({
  id: z.string().min(1, "Invalid item ID"),
  boardId: z.string().min(1, "Invalid board ID"),
  columnId: z.string().min(1, "Invalid column ID"),
  order: z.coerce
    .number("Order must be a number")
    .finite("Order must be a valid number")
    .min(0, "Order cannot be negative"),
  redirectTo: z.string().optional(),
});

export async function action({ request }: { request: Request }) {
  const accountId = await requireAuthCookie(request);
  const formData = await request.formData();

  const submission = parseWithZod(formData, { schema: MoveCardSchema });
  invariantResponse(submission.status === "success", "Invalid move data", {
    status: 400,
  });

  const { id, columnId, order } = submission.value;

  // Verify the item exists and user has permission
  const existingItem = await getItem(id, accountId);
  invariantResponse(existingItem, "Card not found", { status: 404 });

  // Update only the columnId, order, and lastActiveAt
  await prisma.item.update({
    where: { id },
    data: {
      columnId,
      order,
      lastActiveAt: new Date(),
    },
  });

  return data({ result: submission.reply() });
}
