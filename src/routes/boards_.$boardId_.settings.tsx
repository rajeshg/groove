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
import { inviteUserToBoard } from "~/server/actions/boards";
import { toast } from "sonner";

export const Route = createFileRoute("/boards_/$boardId_/settings")({
  component: BoardSettings,
  ssr: false,
});

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

  const isOwner = liveBoard?.accountId === user?.id;

  // Derive current values: user edit takes precedence, otherwise use live data
  const currentBoardName = boardName ?? liveBoard?.name ?? "Untitled Board";
  const currentColor = selectedColor ?? liveBoard?.color ?? "#e0e0e0";

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
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Members will be loaded from API
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
