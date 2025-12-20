import { redirect, useSearchParams, useNavigation } from "react-router";
import { Form, Link } from "react-router";
import { useForm, getFormProps, getInputProps } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod/v4";
import type { Route } from "./+types/signup";

import { redirectIfLoggedInLoader, setAuthOnResponse } from "../auth/auth";
import { Label, Input } from "../components/input";
import { Button } from "../components/button";
import { Icon } from "../icons/icons";
import { prisma } from "../../prisma/client";

import { createAccount, accountExists } from "./signup.queries";
import { signupSchema } from "./validation";
import { sendEmail, emailTemplates } from "~/utils/email.server";

export async function loader({ request }: Route.LoaderArgs) {
  // If user is already logged in, redirect them
  await redirectIfLoggedInLoader({ request });
  
  // Check if there's an invitation
  const url = new URL(request.url);
  const invitationId = url.searchParams.get("invitationId");
  
  if (invitationId) {
    // Fetch invitation details to show context
    const invitation = await prisma.boardInvitation.findUnique({
      where: { id: invitationId },
      select: {
        Board: {
          select: {
            name: true,
            Account: {
              select: { firstName: true, lastName: true }
            }
          }
        },
        status: true,
      }
    });
    
    if (invitation && invitation.status === "pending") {
      return {
        boardName: invitation.Board.name,
        inviterName: invitation.Board.Account.firstName 
          ? `${invitation.Board.Account.firstName} ${invitation.Board.Account.lastName || ""}`.trim()
          : "A team member"
      };
    }
  }
  
  return { boardName: null, inviterName: null };
}

export const meta = () => {
  return [{ title: "Groove Signup" }];
};

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const url = new URL(request.url);
  const invitationId = url.searchParams.get("invitationId");

  const submission = parseWithZod(formData, { schema: signupSchema });

  if (submission.status !== "success") {
    return { result: submission.reply() };
  }

  // Check if account already exists
  const emailExists = await accountExists(submission.value.email);
  if (emailExists) {
    return {
      result: submission.reply({
        fieldErrors: {
          email: ["An account with this email address already exists"],
        },
      }),
    };
  }

  const user = await createAccount(
    submission.value.email,
    submission.value.password,
    submission.value.firstName,
    submission.value.lastName
  );

  // Send welcome email
  const template = emailTemplates.welcome(submission.value.firstName);
  await sendEmail({
    to: submission.value.email,
    subject: template.subject,
    html: template.html,
  });

  // If there's a specific invitation, redirect to accept it
  // Otherwise go to home
  const redirectUrl = invitationId ? `/invite?id=${invitationId}` : "/home";
  return setAuthOnResponse(redirect(redirectUrl), user.id);
}

export default function Signup({ actionData, loaderData }: Route.ComponentProps) {
  const [searchParams] = useSearchParams();
  const invitationId = searchParams.get("invitationId");
  const hasInvitationContext = !!invitationId;

  const navigation = useNavigation();
  const isSubmitting = navigation.state !== "idle";

  const [form, fields] = useForm({
    lastResult: actionData?.result,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: signupSchema });
    },
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
  });

  return (
    <div className="flex min-h-full flex-1 flex-col mt-20 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2
          id="signup-header"
          className="mt-6 text-center text-2xl font-bold leading-9 tracking-tight text-slate-900"
        >
          Sign up
        </h2>
        {hasInvitationContext && loaderData.boardName ? (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900 text-center">
              <strong>{loaderData.inviterName}</strong> invited you to join{" "}
              <strong>{loaderData.boardName}</strong>
            </p>
          </div>
        ) : (
          <p className="mt-2 text-center text-sm text-slate-600">
            Join Groove and start collaborating
          </p>
        )}
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-[480px]">
        <div className="bg-white px-6 py-12 shadow sm:rounded-lg sm:px-12">
          <Form method="post" {...getFormProps(form)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor={fields.firstName.id}>First Name</Label>
                <Input
                  {...getInputProps(fields.firstName, { type: "text" })}
                  autoComplete="given-name"
                  disabled={isSubmitting}
                />
                {fields.firstName.errors && (
                  <div
                    id={fields.firstName.errorId}
                    className="text-red-600 font-semibold text-sm mt-1"
                  >
                    {fields.firstName.errors}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor={fields.lastName.id}>Last Name</Label>
                <Input
                  {...getInputProps(fields.lastName, { type: "text" })}
                  autoComplete="family-name"
                  disabled={isSubmitting}
                />
                {fields.lastName.errors && (
                  <div
                    id={fields.lastName.errorId}
                    className="text-red-600 font-semibold text-sm mt-1"
                  >
                    {fields.lastName.errors}
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor={fields.email.id}>Email address</Label>
              <Input
                {...getInputProps(fields.email, { type: "email" })}
                autoFocus
                autoComplete="email"
                disabled={isSubmitting}
              />
              {fields.email.errors && (
                <div
                  id={fields.email.errorId}
                  className="text-red-600 font-semibold text-sm mt-1"
                >
                  {fields.email.errors}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor={fields.password.id}>Password</Label>
              <Input
                {...getInputProps(fields.password, { type: "password" })}
                autoComplete="current-password"
                disabled={isSubmitting}
              />
              {fields.password.errors && (
                <div
                  id={fields.password.errorId}
                  className="text-red-600 font-semibold text-sm mt-1"
                >
                  {fields.password.errors}
                </div>
              )}
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
