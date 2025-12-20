import { parseWithZod } from "@conform-to/zod/v4";
import { invariantResponse } from "@epic-web/invariant";
import { data } from "react-router";
import { z } from "zod";
import { requireAuthCookie } from "~/auth/auth";
import { inviteUserToBoard, getBoardData } from "~/routes/queries";
import {
  canManageMembers,
  getPermissionErrorMessage,
} from "~/utils/permissions";
import { sendEmail, emailTemplates } from "~/utils/email.server";

const InviteUserSchema = z.object({
  boardId: z.string().min(1, "Invalid board ID"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  role: z.enum(["owner", "editor"]).default("editor"),
  redirectTo: z.string().optional(),
});

export async function action({ request }: { request: Request }) {
  const accountId = await requireAuthCookie(request);
  const formData = await request.formData();

  const submission = parseWithZod(formData, { schema: InviteUserSchema });
  invariantResponse(
    submission.status === "success",
    "Invalid invitation data",
    { status: 400 }
  );

  const { boardId, email } = submission.value;

  // Check permissions
  const board = await getBoardData(boardId, accountId);
  invariantResponse(board, "Board not found", { status: 404 });

  const userRole =
    board.accountId === accountId
      ? "owner"
      : board.members.find((m) => m.accountId === accountId)?.role === "editor"
        ? "editor"
        : null;

  if (!canManageMembers(userRole)) {
    invariantResponse(false, getPermissionErrorMessage("manageMembers"), {
      status: 403,
    });
  }

  const invitation = await inviteUserToBoard(
    boardId,
    email,
    accountId,
    "editor" // Always invite as editor in simplified model
  );

  // Send invitation email
  const template = emailTemplates.invitation(
    board.name,
    "A team member",
    invitation.id
  );
  await sendEmail({
    to: email,
    subject: template.subject,
    html: template.html,
  });

  return data({ result: submission.reply({ resetForm: true }) });
}
