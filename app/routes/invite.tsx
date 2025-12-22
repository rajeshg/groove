import { redirect, Link } from "react-router";
import { useForm, getFormProps, getInputProps } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod/v4";
import type { Route } from "./+types/invite";
import { requireAuthCookie } from "../auth/auth";
import { acceptBoardInvitation } from "./queries";
import { inviteAcceptSchema } from "./validation";
import { Icon } from "../icons/icons";
import { prisma } from "../../prisma/client";
import { Button } from "../components/button";
import { Form } from "react-router";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const invitationId = url.searchParams.get("id");

  if (!invitationId) {
    throw new Response("Invitation ID is required", { status: 400 });
  }

  // Check if user is authenticated
  let userId: string | null = null;
  let userEmail: string | null = null;
  try {
    userId = await requireAuthCookie(request);
    const user = await prisma.account.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    userEmail = user?.email || null;
  } catch {
    // User is not authenticated
  }

  // Get invitation details
  const invitation = await prisma.boardInvitation.findUnique({
    where: { id: invitationId },
    include: {
      Board: {
        select: {
          name: true,
          id: true,
          Account: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
      },
    },
  });

  if (!invitation) {
    throw new Response("Invitation not found", { status: 404 });
  }

  if (invitation.status !== "pending") {
    throw new Response("Invitation already processed", { status: 410 }); // Gone
  }

  // Check if invitation has expired (7 days)
  const invitationAge = Date.now() - invitation.createdAt.getTime();
  const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
  if (invitationAge > sevenDaysInMs) {
    throw new Response("Invitation has expired", { status: 410 });
  }

  // Check if email has an existing account
  const existingAccount = await prisma.account.findUnique({
    where: { email: invitation.email },
    select: { id: true },
  });

  return {
    invitationId,
    email: invitation.email,
    boardName: invitation.Board.name,
    boardId: invitation.Board.id,
    inviterName: invitation.Board.Account.firstName
      ? `${invitation.Board.Account.firstName} ${invitation.Board.Account.lastName || ""}`.trim()
      : invitation.Board.Account.email,
    hasExistingAccount: !!existingAccount,
    isAuthenticated: !!userId,
    userEmail,
    isCorrectUser: userId && userEmail === invitation.email,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const userId = await requireAuthCookie(request);
  const formData = await request.formData();

  const submission = parseWithZod(formData, {
    schema: inviteAcceptSchema,
    disableAutoCoercion: true,
  });

  if (submission.status !== "success") {
    return { result: submission.reply() };
  }

  const { invitationId } = submission.value;

  try {
    await acceptBoardInvitation(invitationId, userId);

    // Get board ID to redirect to it
    const invitation = await prisma.boardInvitation.findUnique({
      where: { id: invitationId },
      select: { boardId: true },
    });

    if (!invitation) {
      return {
        result: submission.reply({
          formErrors: ["Invitation not found"],
        }),
      };
    }

    return redirect(`/board/${invitation.boardId}?invitationAccepted=true`);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to accept invitation";
    return {
      result: submission.reply({
        formErrors: [errorMessage],
      }),
    };
  }
}

export default function InvitationPage({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const {
    invitationId,
    email,
    boardName,
    inviterName,
    hasExistingAccount,
    isAuthenticated,
    userEmail,
    isCorrectUser,
  } = loaderData;

  const [form, fields] = useForm({
    lastResult: actionData?.result,
    onValidate({ formData }) {
      return parseWithZod(formData, {
        schema: inviteAcceptSchema,
        disableAutoCoercion: true,
      });
    },
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Icon
            name="mail"
            className="w-8 h-8 text-blue-600 dark:text-blue-400"
          />
        </div>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4 text-center">
          You're Invited!
        </h1>

        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 mb-6">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
            <strong className="text-slate-900 dark:text-white">
              {inviterName}
            </strong>{" "}
            invited you to join
          </p>
          <p className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            {boardName}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            as an <strong>Editor</strong>
          </p>
        </div>

        {form.errors && form.errors.length > 0 && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">
              {form.errors.join(", ")}
            </p>
          </div>
        )}

        {!isAuthenticated ? (
          // User is not logged in
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
              This invitation was sent to{" "}
              <strong className="text-slate-900 dark:text-white">
                {email}
              </strong>
            </p>

            {hasExistingAccount ? (
              <>
                <Link
                  to={`/login?invitationId=${invitationId}`}
                  className="w-full inline-flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  Sign In to Continue
                </Link>
                <p className="text-xs text-center text-slate-500 dark:text-slate-400">
                  We found an account with this email
                </p>
              </>
            ) : (
              <>
                <Link
                  to={`/signup?invitationId=${invitationId}`}
                  className="w-full inline-flex items-center justify-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                >
                  Create Account to Continue
                </Link>
                <p className="text-xs text-center text-slate-500 dark:text-slate-400">
                  You'll need to create an account first
                </p>
              </>
            )}
          </div>
        ) : isCorrectUser ? (
          // User is logged in with correct email
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400 text-center mb-4">
              You're signed in as{" "}
              <strong className="text-slate-900 dark:text-white">
                {userEmail}
              </strong>
            </p>
            <Form method="post" {...getFormProps(form)} className="space-y-4">
              <input
                {...getInputProps(fields.invitationId, { type: "hidden" })}
                value={invitationId}
              />
              <Button type="submit" className="w-full">
                Accept Invitation
              </Button>
            </Form>
            <Link
              to="/home"
              className="block text-center text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              No thanks, go to home
            </Link>
          </div>
        ) : (
          // User is logged in but with wrong email
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                This invitation is for <strong>{email}</strong>, but you're
                signed in as <strong>{userEmail}</strong>.
              </p>
            </div>
            <Link
              to="/logout"
              className="w-full inline-flex items-center justify-center px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors"
            >
              Sign Out and Try Again
            </Link>
            <Link
              to="/home"
              className="block text-center text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              Go to home instead
            </Link>
          </div>
        )}

        <p className="text-xs text-center text-slate-500 dark:text-slate-400 mt-8">
          This invitation expires 7 days after it was sent
        </p>
      </div>
    </div>
  );
}
