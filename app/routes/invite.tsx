import { redirect, Link } from "react-router";
import type { Route } from "./+types/invite";
import { requireAuthCookie } from "../auth/auth";
import { acceptBoardInvitation } from "./queries";
import { Icon } from "../icons/icons";
import { prisma } from "../db/prisma";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const invitationId = url.searchParams.get("id");

  if (!invitationId) {
    throw new Response("Invitation ID is required", { status: 400 });
  }

  // First check if user is authenticated
  let userId: string | null = null;
  try {
    userId = await requireAuthCookie(request);
  } catch {
    // User is not authenticated
  }

  if (userId) {
    // User is logged in, try to accept the invitation
    try {
      await acceptBoardInvitation(invitationId, userId);
      // Success - redirect to home with success message
      return redirect("/home?invitationAccepted=true");
    } catch {
      // Invitation might already be accepted (e.g., during signup)
      // Just redirect to home anyway
      return redirect("/home?invitationAccepted=true");
    }
  } else {
    // User is not logged in, get invitation details and check if email has an account
    const invitation = await prisma.boardInvitation.findUnique({
      where: { id: invitationId },
      include: {
        Board: {
          select: { name: true },
        },
      },
    });

    if (!invitation) {
      throw new Response("Invitation not found", { status: 404 });
    }

    if (invitation.status !== "pending") {
      throw new Response("Invitation already processed", { status: 410 }); // Gone
    }

    const existingAccount = await prisma.account.findUnique({
      where: { email: invitation.email },
      select: { id: true },
    });

    return {
      invitationId,
      email: invitation.email,
      boardName: invitation.Board.name,
      hasExistingAccount: !!existingAccount,
    };
  }
}

export default function InvitationPage({ loaderData }: Route.ComponentProps) {
  const { invitationId, email, boardName, hasExistingAccount } = loaderData;

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Icon
            name="mail"
            className="w-8 h-8 text-blue-600 dark:text-blue-400"
          />
        </div>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
          Board Invitation
        </h1>

        <p className="text-slate-600 dark:text-slate-400 mb-4">
          You've been invited to collaborate on{" "}
          <strong className="text-slate-900 dark:text-white">
            {boardName}
          </strong>
          .
        </p>

        <p className="text-slate-600 dark:text-slate-400 mb-8">
          {hasExistingAccount
            ? `We found an account for ${email}. Sign in to accept this invitation.`
            : `To accept this invitation, you'll need to create an account for ${email}.`}
        </p>

        <div className="space-y-4">
          {hasExistingAccount ? (
            <Link
              to={`/login?invitationId=${invitationId}`}
              className="w-full inline-flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Sign In to Accept Invitation
            </Link>
          ) : (
            <Link
              to={`/signup?invitationId=${invitationId}`}
              className="w-full inline-flex items-center justify-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
            >
              Create Account to Accept
            </Link>
          )}
        </div>

        <p className="text-sm text-slate-500 dark:text-slate-400 mt-6">
          Invitations expire after 7 days for security.
        </p>
      </div>
    </div>
  );
}
