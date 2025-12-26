"use client";

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { eq } from "@tanstack/db";
import { Modal } from "~/components/Modal";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { ColorPicker } from "~/components/ColorPicker";
import { StatusButton } from "~/components/ui/status-button";
import { useAuth } from "~/components/auth/AuthProvider";
import { boardsCollection } from "~/db/collections";
import {
  getBoardWithMembers,
  inviteUserToBoard,
  removeBoardMember,
} from "~/server/actions/boards";
import { getInitials, getAvatarColor } from "~/utils/avatar";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/boards_/$boardId_/settings")({
  component: BoardSettings,
  loader: async ({ params }) => {
    // Check if we're on the server (SSR)
    if (typeof window === "undefined") {
      // On server, return empty object - we'll fetch on client
      return {
        board: null,
        members: [],
        invitations: [],
        currentUserRole: null,
      };
    }

    const accountId = localStorage.getItem("accountId");
    if (!accountId) {
      throw new Error("Not authenticated");
    }

    const data = await getBoardWithMembers({
      data: { accountId, boardId: params.boardId },
    });

    return data;
  },
});

function BoardSettings() {
  const { boardId } = Route.useParams();
  const loaderData = Route.useLoaderData();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Use live query to get up-to-date board data from collection
  const { data: boardsData } = useLiveQuery((q) =>
    q
      .from({ board: boardsCollection })
      .where(({ board }) => eq(board.id, boardId))
  );
  const liveBoard = boardsData?.[0];

  // State for form edits - use live board data as controlled values
  const [boardName, setBoardName] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  const isOwner =
    loaderData?.currentUserRole === "owner" ||
    liveBoard?.accountId === user?.id;

  // Derive current values: user edit takes precedence, otherwise use live data
  const currentBoardName =
    boardName ?? liveBoard?.name ?? loaderData?.board?.name ?? "Untitled Board";
  const currentColor =
    selectedColor ?? liveBoard?.color ?? loaderData?.board?.color ?? "#e0e0e0";

  const handleSaveBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner || !user?.id) return;

    try {
      boardsCollection.update(boardId, (draft) => {
        draft.name = currentBoardName;
        draft.color = currentColor;
      });
      toast.success("Board settings saved!");
      // Navigate immediately - optimistic update handles the UI
      navigate({ to: `/boards/${boardId}` });
    } catch (error) {
      console.error("Failed to save board settings:", error);
      toast.error("Failed to save board settings");
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner || !user?.id || !inviteEmail) return;

    setIsInviting(true);
    try {
      await inviteUserToBoard({
        data: {
          accountId: user.id,
          boardId,
          data: {
            email: inviteEmail,
            role: "editor",
          },
        },
      });
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
      // Refresh the page to show the new invitation
      navigate({ to: `/boards/${boardId}/settings` });
    } catch (error: any) {
      console.error("Failed to invite user:", error);
      toast.error(error.message || "Failed to send invitation");
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (memberAccountId: string) => {
    if (!isOwner || !user?.id) return;

    setRemovingMemberId(memberAccountId);
    try {
      await removeBoardMember({
        data: {
          accountId: user.id,
          boardId,
          memberAccountId,
        },
      });
      toast.success("Member removed");
      // Refresh the page to show updated members
      navigate({ to: `/boards/${boardId}/settings` });
    } catch (error: any) {
      console.error("Failed to remove member:", error);
      toast.error(error.message || "Failed to remove member");
    } finally {
      setRemovingMemberId(null);
    }
  };

  const getDisplayName = (account: any) => {
    if (account.firstName && account.lastName) {
      return `${account.firstName} ${account.lastName}`.trim();
    }
    return account.firstName || account.email;
  };

  return (
    <Modal title="Board Settings">
      <div className="flex flex-col gap-6">
        {/* General Settings */}
        <form onSubmit={handleSaveBoard} className="space-y-4">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="boardName"
                className="text-[10px] font-black uppercase tracking-widest text-slate-400"
              >
                Board Name
              </Label>
              <Input
                id="boardName"
                type="text"
                value={currentBoardName}
                onChange={(e) => setBoardName(e.target.value)}
                placeholder="Name..."
                disabled={!isOwner}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Color
              </Label>
              <ColorPicker
                value={currentColor}
                onChange={isOwner ? setSelectedColor : () => {}}
              />
            </div>
          </div>

          {isOwner && (
            <div className="flex justify-end pt-2">
              <StatusButton
                type="submit"
                status="idle"
                className="h-9 text-xs px-5 w-auto py-0 leading-none items-center"
              >
                Save Changes
              </StatusButton>
            </div>
          )}
        </form>

        {/* Member Management Section */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-3">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Team Members
          </h3>

          {/* Invite Form (Owner only) */}
          {isOwner && (
            <form
              onSubmit={handleInvite}
              className="flex flex-col sm:flex-row gap-2"
            >
              <div className="flex-1 min-w-0">
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  required
                  className="h-9 text-sm w-full"
                />
              </div>
              <StatusButton
                type="submit"
                status={isInviting ? "pending" : "idle"}
                className="h-9 px-5 text-xs shrink-0 sm:w-auto w-full py-0 leading-none items-center"
              >
                Invite
              </StatusButton>
            </form>
          )}

          {/* Members List */}
          <div className="max-h-[240px] overflow-y-auto space-y-2">
            {(loaderData?.members || []).map((member) => {
              const isCurrentUser = member.accountId === user?.id;
              const isMemberOwner =
                member.accountId ===
                (liveBoard?.accountId || loaderData?.board?.accountId);
              const displayName = getDisplayName(member.account);

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 group border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black shadow-sm shrink-0"
                      style={{ backgroundColor: getAvatarColor(displayName) }}
                    >
                      {getInitials(displayName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <span className="truncate">{displayName}</span>
                        {isCurrentUser && (
                          <span className="text-[9px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded font-black shrink-0">
                            YOU
                          </span>
                        )}
                        {isMemberOwner && (
                          <span className="text-[9px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded font-black shrink-0">
                            OWNER
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {member.account.email}
                      </div>
                    </div>
                  </div>

                  {!isMemberOwner && isOwner && !isCurrentUser && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member.accountId)}
                      disabled={removingMemberId === member.accountId}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100 shrink-0 disabled:opacity-50"
                      title="Remove member"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}

            {/* Pending Invitations */}
            {(loaderData?.invitations || []).map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between p-2.5 rounded-lg border-2 border-dashed border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-900/10"
              >
                <div className="min-w-0 flex items-center gap-2.5 flex-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
                  <div className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                    {invite.email}
                  </div>
                </div>
                <span className="text-[9px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded shrink-0">
                  Pending
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
