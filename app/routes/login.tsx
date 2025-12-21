import { redirect, useNavigation } from "react-router";
import { Form, Link, useSearchParams } from "react-router";
import { useForm, getFormProps, getInputProps } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod/v4";
import type { Route } from "./+types/login";

import { redirectIfLoggedInLoader, setAuthOnResponse } from "../auth/auth";
import { StatusButton } from "../components/status-button";
import { Input, Label } from "../components/input";
import { prisma } from "../../prisma/client";

import { login } from "./login.queries";
import { loginSchema } from "./validation";

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
  return [{ title: "Groove Login" }];
};

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const url = new URL(request.url);
  const invitationId = url.searchParams.get("invitationId");

  const submission = parseWithZod(formData, { schema: loginSchema });

  if (submission.status !== "success") {
    return { result: submission.reply() };
  }

  const userId = await login(submission.value.email, submission.value.password);
  if (userId === false) {
    return {
      result: submission.reply({
        fieldErrors: {
          password: ["Invalid credentials"],
        },
      }),
    };
  }

  // If there's an invitation, redirect to accept it
  const redirectUrl = invitationId ? `/invite?id=${invitationId}` : "/home";
  const response = redirect(redirectUrl);
  return setAuthOnResponse(response, userId);
}

export default function Login({ actionData, loaderData }: Route.ComponentProps) {
  const [searchParams] = useSearchParams();
  const invitationId = searchParams.get("invitationId");
  const hasInvitationContext = !!invitationId;
  const navigation = useNavigation();
  const isSubmitting = navigation.state !== "idle";

  const [form, fields] = useForm({
    lastResult: actionData?.result,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: loginSchema });
    },
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
  });

  return (
    <div className="flex min-h-full flex-1 flex-col mt-20 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2
          id="login-header"
          className="mt-6 text-center text-2xl font-bold leading-9 tracking-tight text-slate-900"
        >
          Log in
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
            Welcome back to Groove
          </p>
        )}
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-[480px]">
        <div className="bg-white px-6 py-12 shadow sm:rounded-lg sm:px-12">
          <Form method="post" {...getFormProps(form)} className="space-y-6">
            <div>
              <Label htmlFor={fields.email.id}>Email address</Label>
              <Input
                {...getInputProps(fields.email, { type: "email" })}
                autoFocus
                autoComplete="email"
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

            <div>
              <StatusButton 
                type="submit"
                status={isSubmitting ? "pending" : "idle"}
                className="w-full"
              >
                Sign in
              </StatusButton>
            </div>
            <div className="text-sm text-slate-500">
              Don't have an account?{" "}
              <Link
                className={`text-blue-600 hover:text-blue-700 underline ${
                  searchParams.get("invitationId") ? "underline" : ""
                }`}
                to={
                  hasInvitationContext
                    ? `/signup?invitationId=${invitationId}`
                    : "/signup"
                }
              >
                Sign up
              </Link>
              .
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
}
