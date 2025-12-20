import { parseWithZod } from "@conform-to/zod/v4";
import { invariantResponse } from "@epic-web/invariant";
import { data } from "react-router";
import { z } from "zod";
import { requireAuthCookie } from "~/auth/auth";
import { prisma } from "../../../prisma/client";
import { removeBoardMember } from "../queries";
import { getPermissionErrorMessage } from "~/utils/permissions";

const RemoveMemberSchema = z.object({
  boardId: z.string().min(1, "Board ID is required"),
  memberAccountId: z.string().min(1, "Member account ID is required"),
});

export async function action({ request }: { request: Request }) {
  const accountId = await requireAuthCookie(request);
  const formData = await request.formData();

  const submission = parseWithZod(formData, { schema: RemoveMemberSchema });
  invariantResponse(submission.status === "success", "Invalid form data", {
    status: 400,
  });

  const { boardId, memberAccountId } = submission.value;

  // Check if the board exists and the current user is the owner
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { accountId: true },
  });

  invariantResponse(board, "Board not found", { status: 404 });

  const isOwner = board.accountId === accountId;

  // Only owners can remove members
  invariantResponse(isOwner, getPermissionErrorMessage("manageMembers"), {
    status: 403,
  });

  // Cannot remove the owner
  invariantResponse(
    memberAccountId !== board.accountId,
    "Cannot remove the board owner",
    { status: 400 }
  );

  await removeBoardMember(boardId, memberAccountId);

  return data({ result: submission.reply() });
}
