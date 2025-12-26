import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { LoginForm } from "~/components/auth/LoginForm";
import { useAuth } from "~/components/auth/AuthProvider";
import { Card } from "~/components/ui/card";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { isAuthenticated, isLoading: isInitialLoading } = useAuth();

  // Only show loading during initial auth check, not during login attempts
  const [hasInitialized, setHasInitialized] = React.useState(false);

  React.useEffect(() => {
    if (!isInitialLoading) {
      setHasInitialized(true);
    }
  }, [isInitialLoading]);

  if (!hasInitialized && isInitialLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // If authenticated, redirect immediately
  if (isAuthenticated) {
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-600">Log in to your account</p>
        </div>

        <LoginForm
          onSuccess={() => {
            window.location.href = "/";
          }}
        />

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="font-medium text-indigo-600 hover:text-indigo-700 transition"
            >
              Sign up
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
