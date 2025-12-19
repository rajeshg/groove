import { redirect } from "react-router";
import { Form, Link, useActionData, useSearchParams } from "react-router";

import { redirectIfLoggedInLoader, setAuthOnResponse } from "../auth/auth";
import { Button } from "../components/button";
import { Input, Label } from "../components/input";

import { login } from "./login.queries";
import { loginSchema, tryParseFormData } from "./validation";

export const loader = redirectIfLoggedInLoader;

export const meta = () => {
  return [{ title: "Groove Login" }];
};

export async function action({ request }: { request: Request }) {
  let formData = await request.formData();
  const url = new URL(request.url);
  const invitationId = url.searchParams.get("invitationId");

  const result = tryParseFormData(formData, loginSchema);
  if (!result.success) {
    return new Response(
      JSON.stringify({ ok: false, errors: { general: result.error } }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  let userId = await login(result.data.email, result.data.password);
  if (userId === false) {
    return new Response(
      JSON.stringify({
        ok: false,
        errors: { password: "Invalid credentials" },
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // If there's an invitation, redirect to accept it
  const redirectUrl = invitationId ? `/invite?id=${invitationId}` : "/home";
  let response = redirect(redirectUrl);
  return setAuthOnResponse(response, userId);
}

export default function Login() {
  let actionResult = useActionData<{
    ok?: boolean;
    errors?: { email?: string; password?: string };
  }>();

  const [searchParams] = useSearchParams();
  const invitationId = searchParams.get("invitationId");
  const hasInvitationContext = !!invitationId;

  return (
    <div className="flex min-h-full flex-1 flex-col mt-20 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2
          id="login-header"
          className="mt-6 text-center text-2xl font-bold leading-9 tracking-tight text-slate-900"
        >
          Log in
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          {hasInvitationContext
            ? "Sign in to accept your board invitation"
            : "Welcome back to Groove"}
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-[480px]">
        <div className="bg-white px-6 py-12 shadow sm:rounded-lg sm:px-12">
          <Form className="space-y-6" method="post">
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
                  actionResult?.errors?.email ? "email-error" : "login-header"
                }
                required
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
              />
            </div>

            <div>
              <Button type="submit">Sign in</Button>
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
