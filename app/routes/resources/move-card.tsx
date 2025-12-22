import { parseWithZod } from "@conform-to/zod/v4";
import { invariantResponse } from "@epic-web/invariant";
import { data } from "react-router";
import { z } from "zod";
import { optionalString } from "../validation";
import { requireAuthCookie } from "~/auth/auth";
import { prisma } from "../../../prisma/client";
import { getItem } from "~/routes/queries";
import { generateId } from "~/utils/id";

const MoveCardSchema = z.object({
  id: z.string().min(1, "Invalid item ID"),
  boardId: z.string().min(1, "Invalid board ID"),
  columnId: z.string().min(1, "Invalid column ID"),
  order: z.coerce
    .number("Order must be a number")
    .finite("Order must be a valid number")
    .min(0, "Order cannot be negative"),
  redirectTo: optionalString(),
});

export async function action({ request }: { request: Request }) {
  const accountId = await requireAuthCookie(request);
  const formData = await request.formData();

  const submission = parseWithZod(formData, {
    schema: MoveCardSchema,
    disableAutoCoercion: true,
  });
  invariantResponse(submission.status === "success", "Invalid move data", {
    status: 400,
  });

  const { id, columnId, order, boardId } = submission.value;

  // Verify the item exists and user has permission
  const existingItem = await getItem(id, accountId);
  invariantResponse(existingItem, "Card not found", { status: 404 });

  // Only log if the column actually changed
  const isColumnChange = existingItem.columnId !== columnId;

  // Get column names if it's a column change for the activity log
  let activityContent = null;
  if (isColumnChange) {
    const [oldCol, newCol] = await Promise.all([
      prisma.column.findUnique({
        where: { id: existingItem.columnId },
        select: { name: true },
      }),
      prisma.column.findUnique({
        where: { id: columnId },
        select: { name: true },
      }),
    ]);
    if (oldCol && newCol) {
      activityContent = `from ${oldCol.name} to ${newCol.name}`;
    }
  }

  // Update the item and create activity in a transaction
  await prisma.$transaction(async (tx) => {
    await tx.item.update({
      where: { id },
      data: {
        columnId,
        order,
        lastActiveAt: new Date(),
      },
    });

    if (isColumnChange) {
      await tx.activity.create({
        data: {
          id: generateId(),
          type: "card_moved",
          content: activityContent,
          boardId,
          itemId: id,
          userId: accountId,
        },
      });
    }
  });

  return data({ result: submission.reply() });
}
