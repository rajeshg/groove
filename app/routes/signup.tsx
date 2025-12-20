import { redirect, useSearchParams, useNavigation } from "react-router";
import { Form, Link, useActionData } from "react-router";

import { redirectIfLoggedInLoader, setAuthOnResponse } from "../auth/auth";
import { Label, Input } from "../components/input";
import { Button } from "../components/button";
import { Icon } from "../icons/icons";

import { createAccount, accountExists } from "./signup.queries";
import { signupSchema, tryParseFormData } from "./validation";
import { sendEmail, emailTemplates } from "~/utils/email.server";
import { acceptBoardInvitation, getPendingInvitationsForUser } from "./queries";

export const loader = redirectIfLoggedInLoader;

export const meta = () => {
  return [{ title: "Groove Signup" }];
};

export async function action({ request }: { request: Request }) {
  let formData = await request.formData();
  const url = new URL(request.url);
  const invitationId = url.searchParams.get("invitationId");

  const result = tryParseFormData(formData, signupSchema);
  if (!result.success) {
    return new Response(
      JSON.stringify({ ok: false, errors: { general: result.error } }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Check if account already exists
  const emailExists = await accountExists(result.data.email);
  if (emailExists) {
    return new Response(
      JSON.stringify({
        ok: false,
        errors: { email: "An account with this email address already exists" },
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  let user = await createAccount(
    result.data.email,
    result.data.password,
    result.data.firstName,
    result.data.lastName
  );

  // Check for and accept any pending invitations for this email
  const pendingInvitations = await getPendingInvitationsForUser(
    result.data.email
  );
  for (const invitation of pendingInvitations) {
    try {
      await acceptBoardInvitation(invitation.id, user.id);
    } catch (error) {
      // Log but don't fail signup if invitation acceptance fails
      console.error(`Failed to accept invitation ${invitation.id}:`, error);
    }
  }

  // Send welcome email
  const template = emailTemplates.welcome(result.data.firstName);
  await sendEmail({
    to: result.data.email,
    subject: template.subject,
    html: template.html,
  });

  // If there's a specific invitation, redirect to accept it
  const redirectUrl = invitationId ? `/invite?id=${invitationId}` : "/home";
  return setAuthOnResponse(redirect(redirectUrl), user.id);
}

export default function Signup() {
  let actionResult = useActionData<{
    ok?: boolean;
    errors?: {
      email?: string;
      password?: string;
      firstName?: string;
      lastName?: string;
    };
  }>();

  const [searchParams] = useSearchParams();
  const invitationId = searchParams.get("invitationId");
  const hasInvitationContext = !!invitationId;

  const navigation = useNavigation();
  const isSubmitting = navigation.state !== "idle";

  return (
    <div className="flex min-h-full flex-1 flex-col mt-20 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2
          id="signup-header"
          className="mt-6 text-center text-2xl font-bold leading-9 tracking-tight text-slate-900"
        >
          Sign up
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          {hasInvitationContext
            ? "Create your account to accept the board invitation"
            : "Join Groove and start collaborating"}
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-[480px]">
        <div className="bg-white px-6 py-12 shadow sm:rounded-lg sm:px-12">
          <Form className="space-y-6" method="post">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">
                  First Name{" "}
                  {actionResult?.errors?.firstName && (
                    <span
                      id="firstName-error"
                      className="text-red-600 font-semibold"
                    >
                      {actionResult.errors.firstName}
                    </span>
                  )}
                </Label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  aria-describedby={
                    actionResult?.errors?.firstName
                      ? "firstName-error"
                      : "signup-header"
                  }
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <Label htmlFor="lastName">
                  Last Name{" "}
                  {actionResult?.errors?.lastName && (
                    <span
                      id="lastName-error"
                      className="text-red-600 font-semibold"
                    >
                      {actionResult.errors.lastName}
                    </span>
                  )}
                </Label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  aria-describedby={
                    actionResult?.errors?.lastName
                      ? "lastName-error"
                      : "signup-header"
                  }
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">
                Email address{" "}
                {actionResult?.errors?.email && (
                  <span id="email-error" className="text-red-600 font-semibold">
                    {actionResult.errors.email}
                  </span>
                )}
              </Label>
              <Input
                autoFocus
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                aria-describedby={
                  actionResult?.errors?.email ? "email-error" : "signup-header"
                }
                required
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Label htmlFor="password">
                Password{" "}
                {actionResult?.errors?.password && (
                  <span
                    id="password-error"
                    className="text-red-600 font-semibold"
                  >
                    {actionResult.errors.password}
                  </span>
                )}
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                aria-describedby="password-error"
                required
                disabled={isSubmitting}
              />
            </div>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Icon name="plus" className="w-4 h-4 animate-spin" />
                  Creating account...
                </span>
              ) : (
                "Sign up"
              )}
            </Button>

            <div className="text-sm text-slate-500">
              Already have an account?{" "}
              <Link
                className={`text-blue-600 hover:text-blue-700 ${
                  hasInvitationContext ? "underline" : ""
                }`}
                to={
                  hasInvitationContext
                    ? `/login?invitationId=${invitationId}`
                    : "/login"
                }
              >
                Log in
              </Link>
              .
            </div>
          </Form>
        </div>
        <div className="mt-8 space-y-2 mx-2">
          <h3 className="font-bold text-slate-900">Privacy Notice</h3>
          <p className="text-slate-700">
            We won't use your email address for anything other than
            authenticating with this demo application. This app doesn't send
            email anyway, so you can put whatever fake email address you want.
          </p>
          <h3 className="font-bold text-slate-900">Terms of Service</h3>
          <p className="text-slate-700">
            This is a demo app, there are no terms of service. Don't be
            surprised if your data dissappears.
          </p>
        </div>
      </div>
    </div>
  );
}
