import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/logout")({
  component: LogoutPage,
});

function LogoutPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const performLogout = async () => {
      try {
        // Call logout API
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include",
        });

        // Clear localStorage
        if (typeof window !== "undefined") {
          localStorage.removeItem("accountId");
        }

        // Wait a bit for cookies to clear
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Force a full page reload to /login to clear all client state
        window.location.href = "/login";
      } catch (error) {
        console.error("Logout error:", error);
        // Even if logout fails, redirect to login
        window.location.href = "/login";
      }
    };

    performLogout();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-gray-600">Logging out...</p>
      </div>
    </div>
  );
}
