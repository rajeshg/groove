import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { invitationsCollection } from "~/db/collections";
import { useAuth } from "~/components/auth/AuthProvider";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { toast } from "sonner";
import {
  acceptBoardInvitation,
  rejectBoardInvitation,
  resendInvitationEmail,
} from "~/server/actions/boards";
import { Mail, Clock, ArrowRight, X, AlertCircle, Send } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/invitations")({
  component: InvitationsPageWrapper,
});

function InvitationsPageWrapper() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Only render the interactive component on client
  if (!isClient) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full p-8">
          <p className="text-slate-600 dark:text-slate-400">
            Loading invitations...
          </p>
        </Card>
      </div>
    );
  }

  return <InvitationsPage />;
}

function InvitationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: invitationsData } = useLiveQuery((q: any) =>
    q.from({ invitation: invitationsCollection })
  );

  const invitations = invitationsData || [];

  const getInvitationStatus = (createdAt: string) => {
    const now = Date.now();
    const invitationAge = now - new Date(createdAt).getTime();
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
    const daysRemaining = Math.ceil(
      (sevenDaysInMs - invitationAge) / (24 * 60 * 60 * 1000)
    );

    return {
      daysRemaining,
      isExpiring: daysRemaining <= 2,
      isExpired: daysRemaining <= 0,
    };
  };

  const handleAccept = async (invitationId: string) => {
    if (!user?.id) {
      toast.error("Please sign in to accept invitations");
      navigate({ to: "/login" });
      return;
    }

    try {
      // Call the server function to accept the invitation
      const result = await acceptBoardInvitation({
        data: {
          accountId: user.id,
          data: { invitationId },
        },
      });

      if (result.success) {
        toast.success("Invitation accepted!");
        // Refetch invitations after accepting
        await invitationsCollection.utils.refetch();

        // Redirect to boards page to avoid state issues
        setTimeout(() => {
          navigate({ to: "/boards" });
        }, 500);
      }
    } catch (error: any) {
      console.error("[InvitationsPage] Failed to accept invitation:", error);
      toast.error(error.message || "Failed to accept invitation");
    }
  };

  const handleReject = async (invitationId: string) => {
    if (!user?.id) {
      toast.error("Please sign in to reject invitations");
      navigate({ to: "/login" });
      return;
    }

    try {
      await rejectBoardInvitation({
        data: {
          accountId: user.id,
          data: { invitationId },
        },
      });

      toast.success("Invitation rejected");
      // Refetch invitations after rejecting
      await invitationsCollection.utils.refetch();
    } catch (error: any) {
      console.error("[InvitationsPage] Failed to reject invitation:", error);
      toast.error(error.message || "Failed to reject invitation");
    }
  };

  const handleResend = async (invitationId: string) => {
    if (!user?.id) {
      toast.error("Please sign in to resend invitations");
      navigate({ to: "/login" });
      return;
    }

    try {
      await resendInvitationEmail({
        data: {
          accountId: user.id,
          data: { invitationId },
        },
      });

      toast.success("Invitation email resent!");
    } catch (error: any) {
      console.error("[InvitationsPage] Failed to resend invitation:", error);
      toast.error(error.message || "Failed to resend invitation email");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <p className="text-slate-600 dark:text-slate-400">
            Please sign in to view invitations
          </p>
          <Button
            onClick={() => navigate({ to: "/login" })}
            className="w-full mt-4"
          >
            Sign In
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Mail className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Pending Invitations
            </h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            You have {invitations.length}{" "}
            {invitations.length === 1 ? "invitation" : "invitations"} waiting
            for you
          </p>
        </div>

        {/* Invitations List */}
        {invitations.length === 0 ? (
          <Card className="p-8 text-center">
            <Mail className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              No pending invitations
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              When someone invites you to a board, it will appear here
            </p>
            <Button
              onClick={() => navigate({ to: "/boards" })}
              variant="outline"
            >
              Go to Boards
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {invitations.map((invitation: any) => {
              const status = getInvitationStatus(invitation.createdAt);

              return (
                <Card
                  key={invitation.id}
                  className={`p-6 hover:shadow-lg transition-shadow ${
                    status.isExpired
                      ? "opacity-50 pointer-events-none"
                      : status.isExpiring
                        ? "border-amber-200 bg-amber-50 dark:border-amber-900/30 dark:bg-amber-900/10"
                        : ""
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    {/* Invitation Details */}
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                          <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900 dark:text-white text-lg">
                            {invitation.boardName}
                          </h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                            Invited by{" "}
                            <span className="font-medium">
                              {invitation.inviterName}
                            </span>
                          </p>
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-500">
                            <Clock className="w-3 h-3" />
                            <span>
                              {new Date(
                                invitation.createdAt
                              ).toLocaleDateString()}
                            </span>
                          </div>

                          {/* Expiration Warning */}
                          {status.isExpired ? (
                            <div className="mt-3 flex items-center gap-2 text-xs text-red-600 dark:text-red-400 font-medium">
                              <AlertCircle className="w-4 h-4" />
                              This invitation has expired
                            </div>
                          ) : status.isExpiring ? (
                            <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
                              <AlertCircle className="w-4 h-4" />
                              Expires in {status.daysRemaining} day
                              {status.daysRemaining !== 1 ? "s" : ""}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {!status.isExpired && (
                      <div className="flex gap-2 flex-wrap sm:flex-col sm:w-auto">
                        <Button
                          onClick={() => handleAccept(invitation.id)}
                          className="flex-1 sm:w-auto"
                        >
                          <ArrowRight className="w-4 h-4 mr-2" />
                          Accept
                        </Button>
                        <Button
                          onClick={() => handleReject(invitation.id)}
                          variant="outline"
                          className="flex-1 sm:w-auto"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                        <Button
                          onClick={() => handleResend(invitation.id)}
                          variant="ghost"
                          size="sm"
                          className="px-3 h-9"
                          title="Resend invitation email"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}

            {/* Go to Boards Link */}
            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
              <Button
                onClick={() => navigate({ to: "/boards" })}
                variant="outline"
                className="w-full"
              >
                Go to My Boards
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
