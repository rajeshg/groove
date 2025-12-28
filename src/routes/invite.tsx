"use client";

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { useAuth } from "~/components/auth/AuthProvider";
import {
  getInvitationDetails,
  acceptBoardInvitation,
} from "~/server/actions/boards";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { toast } from "sonner";
import { Mail } from "lucide-react";

const inviteSearchSchema = z.object({
  id: z.string().optional(),
});

export const Route = createFileRoute("/invite")({
  component: InvitePage,
  validateSearch: inviteSearchSchema,
});

function InvitePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const search = Route.useSearch();
  const invitationId = search.id || "";
  const [invitation, setInvitation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!invitationId) {
      setError("Invitation ID is required");
      setLoading(false);
      return;
    }

    loadInvitation();
  }, [invitationId]);

  const loadInvitation = async () => {
    try {
      const data = await getInvitationDetails({ data: { invitationId } });
      setInvitation(data);
    } catch (err: any) {
      console.error("[InvitePage] Failed to load invitation:", err);
      setError(err.message || "Failed to load invitation");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!user?.id) {
      toast.error("Please sign in to accept the invitation");
      navigate({ to: "/login" });
      return;
    }

    if (!invitation) return;

    // Check if user email matches invitation email
    if (user.email !== invitation.email) {
      toast.error(
        `This invitation is for ${invitation.email}, but you're signed in as ${user.email}`
      );
      return;
    }

    setAccepting(true);

    try {
      const result = await acceptBoardInvitation({
        data: {
          accountId: user.id,
          data: { invitationId },
        },
      });

      if (result.success) {
        toast.success("Invitation accepted!");
        // Redirect to boards page to avoid state issues
        setTimeout(() => {
          navigate({ to: "/boards" });
        }, 500);
      }
    } catch (err: any) {
      console.error("[InvitePage] Failed to accept invitation:", err);
      toast.error(err.message || "Failed to accept invitation");
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <p className="text-slate-600 dark:text-slate-400">
            Loading invitation...
          </p>
        </Card>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Invitation Error
            </h1>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
          <Button
            onClick={() => navigate({ to: "/boards" })}
            className="w-full"
          >
            Go to Boards
          </Button>
        </Card>
      </div>
    );
  }

  const isCorrectUser = user && user.email === invitation.email;
  const isAuthenticated = !!user;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
            You're Invited!
          </h1>

          <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              <strong className="text-slate-900 dark:text-white">
                {invitation.inviterName}
              </strong>{" "}
              invited you to join
            </p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              {invitation.boardName}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              as an <strong>Editor</strong>
            </p>
          </div>
        </div>

        {!isAuthenticated ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400 text-center mb-4">
              This invitation was sent to{" "}
              <strong className="text-slate-900 dark:text-white">
                {invitation.email}
              </strong>
            </p>
            <Button
              onClick={() => navigate({ to: "/login" })}
              className="w-full"
            >
              Sign In to Continue
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate({ to: "/signup" })}
              className="w-full"
            >
              Create Account
            </Button>
          </div>
        ) : isCorrectUser ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400 text-center mb-4">
              You're signed in as{" "}
              <strong className="text-slate-900 dark:text-white">
                {user.email}
              </strong>
            </p>
            <Button
              onClick={handleAccept}
              disabled={accepting}
              className="w-full"
            >
              {accepting ? "Accepting..." : "Accept Invitation"}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate({ to: "/boards" })}
              className="w-full"
            >
              No thanks, go to boards
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg mb-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                This invitation is for <strong>{invitation.email}</strong>, but
                you're signed in as <strong>{user.email}</strong>.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate({ to: "/logout" })}
              className="w-full"
            >
              Sign Out and Try Again
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate({ to: "/boards" })}
              className="w-full"
            >
              Go to boards instead
            </Button>
          </div>
        )}

        <p className="text-xs text-center text-slate-500 dark:text-slate-400 mt-6">
          This invitation expires 7 days after it was sent
        </p>
      </Card>
    </div>
  );
}
