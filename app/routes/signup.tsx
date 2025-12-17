import { redirect } from "react-router";
import { Form, Link, useActionData } from "react-router";

import { redirectIfLoggedInLoader, setAuthOnResponse } from "../auth/auth";
import { Label, Input } from "../components/input";
import { Button } from "../components/button";

import { validate } from "./signup.validate";
import { createAccount } from "./signup.queries";

export const loader = redirectIfLoggedInLoader;

export const meta = () => {
  return [{ title: "Trellix Signup" }];
};

export async function action({ request }: { request: Request }) {
  let formData = await request.formData();

  let email = String(formData.get("email") || "");
  let password = String(formData.get("password") || "");

  let errors = await validate(email, password);
  if (errors) {
    return new Response(JSON.stringify({ ok: false, errors }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let user = await createAccount(email, password);
  return setAuthOnResponse(redirect("/home"), user.id);
}

export default function Signup() {
  let actionResult = useActionData<{
    ok?: boolean;
    errors?: { email?: string; password?: string };
  }>();

  return (
    <div className="flex min-h-full flex-1 flex-col mt-20 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2
          id="signup-header"
          className="mt-6 text-center text-2xl font-bold leading-9 tracking-tight text-slate-900"
        >
          Sign up
        </h2>
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
                  actionResult?.errors?.email ? "email-error" : "signup-header"
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="password">
                Password{" "}
                {actionResult?.errors?.password && (
                  <span id="password-error" className="text-red-600 font-semibold">
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

            <Button type="submit">Sign up</Button>

            <div className="text-sm text-slate-500">
              Already have an account?{" "}
              <Link className="text-blue-600 hover:text-blue-700 underline" to="/login">
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
