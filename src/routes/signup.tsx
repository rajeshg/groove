import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { SignupForm } from "~/components/auth/SignupForm";
import { useAuth } from "~/components/auth/AuthProvider";
import { Card } from "~/components/ui/card";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

function SignupPage() {
  const { isAuthenticated, isLoading: isInitialLoading } = useAuth();

  // Only show loading during initial auth check, not during signup attempts
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

  // If authenticated, redirect
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
            Create Account
          </h1>
          <p className="text-gray-600">Join us today</p>
        </div>

        <SignupForm
          onSuccess={() => {
            window.location.href = "/";
          }}
        />

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-medium text-indigo-600 hover:text-indigo-700 transition"
            >
              Log in
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
