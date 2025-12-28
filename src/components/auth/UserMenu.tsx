"use client";

import { useAuth } from "./AuthProvider";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import { toast } from "sonner";
import { useLiveQuery } from "@tanstack/react-db";
import { invitationsCollection } from "~/db/collections";
import { Mail } from "lucide-react";
import { useEffect, useState } from "react";

export function UserMenu() {
  const { user, logout, isLoading } = useAuth();
  const navigate = useNavigate();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Always call useLiveQuery, but result will be empty if not authenticated
  // This follows React's hook rules
  const result = useLiveQuery((q: any) =>
    q.from({ invitation: invitationsCollection })
  );

  const invitationsData = result.data || [];
  // Only show badge if we're on client and user is authenticated
  const pendingCount = isClient && user ? invitationsData.length : 0;

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          onClick={() => navigate({ to: "/login" })}
          className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
        >
          Log in
        </Button>
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      navigate({ to: "/login" });
    } catch {
      toast.error("Failed to logout");
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Invitations Badge */}
      {pendingCount > 0 && (
        <Button
          onClick={() => navigate({ to: "/invitations" })}
          variant="ghost"
          size="sm"
          className="relative h-9 w-9 p-0"
          title={`${pendingCount} pending invitation${pendingCount !== 1 ? "s" : ""}`}
        >
          <Mail className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {pendingCount > 9 ? "9+" : pendingCount}
          </span>
        </Button>
      )}

      <Button
        onClick={handleLogout}
        disabled={isLoading}
        variant="ghost"
        className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
      >
        {isLoading ? "Logging out..." : "Log out"}
      </Button>
    </div>
  );
}
