import { useForm, getFormProps, getInputProps } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod/v4";
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
  useFetcher,
} from "react-router";
import { z } from "zod";
import { Modal } from "~/components/Modal";
import { Input, Label } from "~/components/input";
import { ColorPicker } from "~/components/ColorPicker";
import { StatusButton } from "~/components/status-button";
import { requireAuthCookie } from "~/auth/auth";
import { getBoardData } from "~/routes/queries.server";
import { assertBoardAccess } from "~/utils/permissions";
import { useState } from "react";
import { Icon } from "~/icons/icons";
import { getDisplayName, getAvatarColor, getInitials } from "~/utils/avatar";

const BoardSettingsSchema = z.object({
  name: z
    .string()
    .min(1, "Board name is required")
    .max(255, "Board name is too long"),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, "Invalid color format"),
});

export async function loader({
  request,
  params,
}: {
  request: Request;
  params: { id: string };
}) {
  const accountId = await requireAuthCookie(request);
  const boardId = params.id;
  const board = await getBoardData(boardId, accountId);

  if (!board) {
    throw new Response("Not Found", { status: 404 });
  }

  assertBoardAccess(board, accountId);
  const isOwner = board.accountId === accountId;

  return { board, accountId, isOwner };
}

export default function BoardSettings() {
  const { board, accountId, isOwner } = useLoaderData<typeof loader>();
  const actionData = useActionData<{ result: unknown; error?: string }>();
  const navigation = useNavigation();
  const removeMemberFetcher = useFetcher();
  const inviteFetcher = useFetcher();

  const [selectedColor, setSelectedColor] = useState(board.color || "#e0e0e0");

  const [form, fields] = useForm({
    lastResult: actionData?.result as never,
    onValidate({ formData }) {
      return parseWithZod(formData, {
        schema: BoardSettingsSchema,
        disableAutoCoercion: true,
      });
    },
    defaultValue: {
      name: board.name,
      color: board.color,
    },
    shouldRevalidate: "onBlur",
  });

  const isSubmitting =
    navigation.state === "submitting" ||
    (navigation.state === "loading" &&
      navigation.formData?.get("boardId") === board.id);

  return (
    <Modal title="Board Settings">
      <div className="flex flex-col gap-6">
        {/* General Settings */}
        <Form
          method="post"
          action="/resources/update-board"
          {...getFormProps(form)}
          className="space-y-4"
        >
          {actionData?.error && (
            <div className="p-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              {actionData.error}
            </div>
          )}
          <input type="hidden" name="boardId" value={board.id} />
          <input type="hidden" name="redirectTo" value={`/board/${board.id}`} />
          <input type="hidden" name="color" value={selectedColor} />

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label
                htmlFor={fields.name.id}
                className="text-[10px] font-black uppercase tracking-widest text-slate-400"
              >
                Board Name
              </Label>
              <Input
                {...getInputProps(fields.name, { type: "text" })}
                placeholder="Name..."
                disabled={isSubmitting || !isOwner}
                className="h-9 text-sm"
              />
              {fields.name.errors && fields.name.errors.length > 0 && (
                <div className="text-red-600 font-semibold text-[10px]">
                  {fields.name.errors[0]}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Color
              </Label>
              <ColorPicker value={selectedColor} onChange={setSelectedColor} />
            </div>
          </div>

          {isOwner && (
            <div className="flex justify-end pt-2">
              <StatusButton
                type="submit"
                status={isSubmitting ? "pending" : "idle"}
                className="h-9 text-xs px-5 w-auto py-0 leading-none items-center"
              >
                Save Changes
              </StatusButton>
            </div>
          )}
        </Form>

        {/* Member Management Section */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-3">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Team Members
          </h3>

          {/* Invite Form (Owner only) */}
          {isOwner && (
            <inviteFetcher.Form
              method="post"
              action="/resources/invite-user"
              className="flex flex-col sm:flex-row gap-2"
            >
              <input type="hidden" name="boardId" value={board.id} />
              <div className="flex-1 min-w-0">
                <Input
                  name="email"
                  type="email"
                  placeholder="colleague@example.com"
                  required
                  className="h-9 text-sm w-full"
                />
              </div>
              <StatusButton
                type="submit"
                status={inviteFetcher.state !== "idle" ? "pending" : "idle"}
                className="h-9 px-5 text-xs shrink-0 sm:w-auto w-full py-0 leading-none items-center"
              >
                Invite
              </StatusButton>
            </inviteFetcher.Form>
          )}

          {/* Members List */}
          <div className="max-h-[240px] overflow-y-auto space-y-2">
            {board.members.map((member) => {
              const isCurrentUser = member.Account.id === accountId;
              const isMemberOwner = member.Account.id === board.accountId;
              const displayName = getDisplayName(member.Account);

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
                        {member.Account.email}
                      </div>
                    </div>
                  </div>

                  {!isMemberOwner && isOwner && !isCurrentUser && (
                    <removeMemberFetcher.Form
                      method="post"
                      action="/resources/remove-member"
                    >
                      <input type="hidden" name="boardId" value={board.id} />
                      <input
                        type="hidden"
                        name="memberAccountId"
                        value={member.Account.id}
                      />
                      <button
                        type="submit"
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100 shrink-0"
                        title="Remove member"
                      >
                        <Icon name="trash" size="sm" />
                      </button>
                    </removeMemberFetcher.Form>
                  )}
                </div>
              );
            })}

            {/* Pending Invitations */}
            {board.invitations.map((invite) => (
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
