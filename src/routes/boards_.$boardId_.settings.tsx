"use client";

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
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
  inviteUserToBoard,
  getBoardMembers,
  removeBoardMember,
} from "~/server/actions/boards";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/boards_/$boardId_/settings")({
  component: BoardSettings,
  ssr: false,
});

interface BoardMember {
  id: string;
  accountId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  role: string;
}

interface PendingInvitation {
  id: string;
  email: string;
  status: string;
  role: string;
  createdAt: string;
}

function BoardSettings() {
  const { boardId } = Route.useParams();
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
  const [members, setMembers] = useState<BoardMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<
    PendingInvitation[]
  >([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isRemovingMember, setIsRemovingMember] = useState<string | null>(null);

  const isOwner = liveBoard?.accountId === user?.id;

  // Derive current values: user edit takes precedence, otherwise use live data
  const currentBoardName = boardName ?? liveBoard?.name ?? "Untitled Board";
  const currentColor = selectedColor ?? liveBoard?.color ?? "#e0e0e0";

  // Load members when component mounts or board changes
  useEffect(() => {
    if (isOwner && user?.id) {
      loadMembers();
    }
  }, [boardId, isOwner, user?.id]);

  const loadMembers = async () => {
    if (!user?.id) return;
    setIsLoadingMembers(true);
    try {
      const result = await getBoardMembers({
        data: {
          accountId: user.id,
          boardId,
        },
      });
      setMembers(result.members || []);
      setPendingInvitations(result.pendingInvitations || []);
    } catch (error) {
      console.error("Failed to load board members:", error);
      toast.error("Failed to load board members");
    } finally {
      setIsLoadingMembers(false);
    }
  };

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
      // Refresh members list
      await loadMembers();
    } catch (error: any) {
      console.error("Failed to invite user:", error);
      toast.error(error.message || "Failed to send invitation");
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (memberAccountId: string) => {
    if (!user?.id) return;

    setIsRemovingMember(memberAccountId);
    try {
      await removeBoardMember({
        data: {
          accountId: user.id,
          boardId,
          memberAccountId,
        },
      });
      toast.success("Member removed from board");
      // Refresh members list
      await loadMembers();
    } catch (error: any) {
      console.error("Failed to remove member:", error);
      toast.error(error.message || "Failed to remove member");
    } finally {
      setIsRemovingMember(null);
    }
  };

  const getMemberName = (member: BoardMember) => {
    const name =
      member.firstName && member.lastName
        ? `${member.firstName} ${member.lastName}`
        : member.firstName ||
          member.lastName ||
          member.email?.split("@")[0] ||
          "Unknown";
    return name;
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
          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {isLoadingMembers ? (
              <div className="text-xs text-slate-500 dark:text-slate-400 py-4">
                Loading members...
              </div>
            ) : members.length === 0 && pendingInvitations.length === 0 ? (
              <div className="text-xs text-slate-500 dark:text-slate-400 py-4">
                No members yet
              </div>
            ) : (
              <>
                {/* Active Members */}
                {members.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Active Members ({members.length})
                    </div>
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 dark:text-slate-50 truncate">
                            {getMemberName(member)}
                          </p>
                          {member.email && (
                            <p className="text-slate-500 dark:text-slate-400 text-[11px] truncate">
                              {member.email}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                          <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold">
                            {member.role}
                          </span>
                          {isOwner &&
                            member.accountId !== liveBoard?.accountId && (
                              <button
                                onClick={() =>
                                  handleRemoveMember(member.accountId)
                                }
                                disabled={isRemovingMember === member.accountId}
                                className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600 dark:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                title="Remove member"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pending Invitations */}
                {pendingInvitations.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Pending Invitations ({pendingInvitations.length})
                    </div>
                    {pendingInvitations.map((invitation) => (
                      <div
                        key={invitation.id}
                        className="flex items-center justify-between p-2 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg text-xs"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 dark:text-slate-50 truncate">
                            {invitation.email}
                          </p>
                          <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                            Invitation pending
                          </p>
                        </div>
                        <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold flex-shrink-0">
                          {invitation.role}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
