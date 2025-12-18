import { useFetcher, Link } from "react-router";
import type { Route } from "./+types/board.$id.members";
import invariant from "tiny-invariant";

import { requireAuthCookie } from "../auth/auth";
import { prisma } from "../db/prisma";
import { badRequest, notFound } from "../http/bad-request";
import { Icon } from "../icons/icons";
import { BoardHeader } from "./board/board-header";
import { Button } from "../components/button";
import { LabeledInput } from "../components/input";
import { INTENTS } from "./types";
import { getBoardData, inviteUserToBoard, removeBoardMember } from "./queries";
import { getDisplayName, getInitials, getAvatarColor } from "../utils/avatar";
import { inviteUserSchema, tryParseFormData } from "./validation";

export async function loader(args: Route.LoaderArgs) {
  const { request, params } = args;
  const accountId = await requireAuthCookie(request);
  const boardId = Number(params.id);
  invariant(boardId, "Missing board ID");

  const board = await getBoardData(boardId, accountId);
  if (!board) throw notFound();

  // Get current user's role in this board
  const currentUserMember = board.members.find(
    (m) => m.accountId === accountId
  );
  const isOwner = board.accountId === accountId;
  const isAdmin = currentUserMember?.role === "admin" || isOwner;

  return {
    board,
    accountId,
    isAdmin,
    isOwner,
  };
}

export async function action({
  request,
  params,
}: {
  request: Request;
  params: Record<string, string>;
}) {
  const accountId = await requireAuthCookie(request);
  const boardId = Number(params.id);
  invariant(boardId, "Missing board ID");

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === INTENTS.inviteUser) {
    const result = tryParseFormData(formData, inviteUserSchema);
    if (!result.success) throw badRequest(result.error);

    await inviteUserToBoard(
      boardId,
      result.data.email,
      accountId,
      result.data.role || "editor"
    );
    return { ok: true };
  }

  if (intent === "removeMember") {
    const memberAccountId = formData.get("memberAccountId") as string;
    if (!memberAccountId) throw badRequest("Missing member account ID");

    // Check if the board exists and the current user is an admin/owner
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: { accountId: true },
    });

    if (!board) throw notFound();

    const isOwner = board.accountId === accountId;
    const currentUserMember = await prisma.boardMember.findUnique({
      where: { accountId_boardId: { accountId, boardId } },
    });

    if (!isOwner && currentUserMember?.role !== "admin") {
      throw badRequest("Unauthorized: Only admins can remove members");
    }

    // Cannot remove the owner
    if (memberAccountId === board.accountId) {
      throw badRequest("Cannot remove the board owner");
    }

    await removeBoardMember(boardId, memberAccountId);
    return { ok: true };
  }

  return badRequest("Invalid intent");
}

export default function BoardMembers({ loaderData }: Route.ComponentProps) {
  const { board, accountId, isAdmin } = loaderData;
  const fetcher = useFetcher();
  const inviteFetcher = useFetcher();

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50">
      <BoardHeader title={`MEMBERS - ${board.name}`} />

      <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col items-center">
        <div className="w-full max-w-4xl">
          <div className="mb-6 flex items-center justify-between">
            <Link
              to={`/board/${board.id}`}
              className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
            >
              <Icon name="chevron-right" className="rotate-180" />
              Back to Board
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            {/* Left/Middle: Members List */}
            <div className="md:col-span-2 space-y-6">
              <section className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <Icon name="user" />
                    Board Members ({board.members.length})
                  </h2>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {board.members.map((member) => {
                    const isCurrentUser = member.Account.id === accountId;
                    const isOwner = member.Account.id === board.accountId;
                    const displayName = getDisplayName(member.Account);

                    return (
                      <div
                        key={member.id}
                        className="p-4 flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-sm"
                            style={{
                              backgroundColor: getAvatarColor(displayName),
                            }}
                          >
                            {getInitials(displayName)}
                          </div>
                          <div>
                            <div className="font-bold flex items-center gap-2">
                              {displayName}
                              {isCurrentUser && (
                                <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                  You
                                </span>
                              )}
                              {isOwner && (
                                <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded uppercase tracking-tighter font-black">
                                  Owner
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {member.Account.email} •{" "}
                              <span className="capitalize">{member.role}</span>
                            </div>
                          </div>
                        </div>

                        {isAdmin && !isOwner && !isCurrentUser && (
                          <fetcher.Form method="post">
                            <input
                              type="hidden"
                              name="intent"
                              value="removeMember"
                            />
                            <input
                              type="hidden"
                              name="memberAccountId"
                              value={member.Account.id}
                            />
                            <button
                              type="submit"
                              className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-600 transition-all"
                              title="Remove from board"
                            >
                              <Icon name="trash" />
                            </button>
                          </fetcher.Form>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              {board.invitations.length > 0 && (
                <section className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Icon name="plus" />
                      Pending Invitations ({board.invitations.length})
                    </h2>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-700">
                    {board.invitations.map((invite) => (
                      <div
                        key={invite.id}
                        className="p-4 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-slate-700 dark:text-slate-300">
                            {invite.email}
                          </div>
                          <div className="text-xs text-slate-500">
                            Invited as{" "}
                            <span className="capitalize">{invite.role}</span>
                          </div>
                        </div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-full">
                          Pending
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Right Side: Invite Form */}
            {isAdmin && (
              <div className="space-y-6 sticky top-8">
                <section className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                  <h2 className="text-xl font-black mb-6 uppercase tracking-tighter">
                    Invite People
                  </h2>

                  <inviteFetcher.Form method="post">
                    <input
                      type="hidden"
                      name="intent"
                      value={INTENTS.inviteUser}
                    />

                    <div className="space-y-4">
                      <LabeledInput
                        label="Email Address"
                        name="email"
                        type="email"
                        placeholder="colleague@example.com"
                        required
                      />

                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                          Role
                        </label>
                        <select
                          name="role"
                          className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                          defaultValue="editor"
                        >
                          <option value="editor">
                            Editor (Can edit cards)
                          </option>
                          <option value="admin">
                            Admin (Can manage members)
                          </option>
                          <option value="viewer">Viewer (Read-only)</option>
                        </select>
                      </div>

                      <Button
                        type="submit"
                        className="w-full py-3 mt-4"
                        disabled={inviteFetcher.state !== "idle"}
                      >
                        {inviteFetcher.state !== "idle"
                          ? "Sending..."
                          : "Send Invitation"}
                      </Button>
                    </div>
                  </inviteFetcher.Form>

                  <p className="mt-6 text-[11px] text-slate-500 dark:text-slate-400 text-center italic">
                    They'll see the invitation in their main menu when they log
                    in.
                  </p>
                </section>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
