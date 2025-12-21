import { useForm, getFormProps, getInputProps } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod/v4";
import { Form, useActionData, useLoaderData, useNavigation, useFetcher } from "react-router";
import { z } from "zod";
import { Modal } from "~/components/Modal";
import { Input, Label } from "~/components/input";
import { ColorPicker } from "~/components/ColorPicker";
import { StatusButton } from "~/components/status-button";
import { requireAuthCookie } from "~/auth/auth";
import { getBoardData } from "~/routes/queries";
import { assertBoardAccess } from "~/utils/permissions";
import { useState } from "react";
import { Icon } from "~/icons/icons";

const ColumnSettingsSchema = z.object({
  name: z
    .string()
    .min(1, "Column name is required")
    .max(255, "Column name is too long"),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, "Invalid color format"),
});

export async function loader({
  request,
  params,
}: {
  request: Request;
  params: { id: string; columnId: string };
}) {
  const accountId = await requireAuthCookie(request);
  const boardId = params.id;
  const columnId = params.columnId;
  const board = await getBoardData(boardId, accountId);

  if (!board) {
    throw new Response("Not Found", { status: 404 });
  }

  assertBoardAccess(board, accountId);

  const column = board.columns.find((col) => col.id === columnId);
  if (!column) {
    throw new Response("Column Not Found", { status: 404 });
  }

  return { board, column };
}

export default function ColumnSettings() {
  const { board, column } = useLoaderData<typeof loader>();
  const actionData = useActionData<{ result: unknown; error?: string }>();
  const navigation = useNavigation();
  const deleteFetcher = useFetcher();
  const [selectedColor, setSelectedColor] = useState(column.color || "#94a3b8");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [form, fields] = useForm({
    lastResult: actionData?.result as never,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: ColumnSettingsSchema });
    },
    defaultValue: {
      name: column.name,
      color: column.color,
    },
    shouldRevalidate: "onBlur",
  });

  const isSubmitting = navigation.state === "submitting" || (navigation.state === "loading" && navigation.formData?.get("columnId") === column.id);
  const isDeleting = deleteFetcher.state !== "idle";

  return (
    <Modal title="Column Settings">
      <div className="flex flex-col gap-6">
        <Form
          method="post"
          action="/resources/update-column"
          {...getFormProps(form)}
          className="space-y-4"
        >
          {actionData?.error && (
            <div className="p-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              {actionData.error}
            </div>
          )}
          <input type="hidden" name="columnId" value={column.id} />
          <input type="hidden" name="redirectTo" value={`/board/${board.id}`} />
          <input type="hidden" name="color" value={selectedColor} />

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor={fields.name.id} className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Column Name
              </Label>
              <Input
                {...getInputProps(fields.name, { type: "text" })}
                placeholder="Name..."
                disabled={isSubmitting}
                autoFocus
                className="h-9 text-sm"
              />
              {fields.name.errors && (
                <div className="text-red-600 font-semibold text-[10px]">
                  {fields.name.errors}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Color
              </Label>
              <ColorPicker
                value={selectedColor}
                onChange={setSelectedColor}
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <StatusButton 
              type="submit" 
              status={isSubmitting ? "pending" : "idle"}
              className="h-9 text-xs px-5 w-auto py-0 leading-none items-center"
            >
              Save Changes
            </StatusButton>
          </div>
        </Form>

        {/* Delete Column Section */}
        {!column.isDefault && (
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Danger Zone</h3>
            
            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting}
                className="w-full flex items-center justify-between px-4 py-3 text-xs font-black uppercase tracking-widest text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-all disabled:opacity-50 border border-red-200 dark:border-red-900/40"
              >
                <span>Delete Column</span>
                <Icon name="trash" size="sm" />
              </button>
            ) : (
              <div className="space-y-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-900/40">
                <div className="flex items-start gap-2">
                  <Icon name="alert" size="md" className="text-red-600 dark:text-red-400 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-red-900 dark:text-red-100 mb-1">
                      Are you sure?
                    </p>
                    <p className="text-[10px] text-red-700 dark:text-red-300">
                      This will permanently delete this column and all its cards.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <deleteFetcher.Form method="post" action="/resources/delete-column" className="flex-1">
                    <input type="hidden" name="columnId" value={column.id} />
                    <input type="hidden" name="boardId" value={board.id} />
                    <StatusButton
                      type="submit"
                      variant="danger"
                      status={isDeleting ? "pending" : "idle"}
                      className="w-full h-auto py-2 text-[10px]"
                    >
                      Delete
                    </StatusButton>
                  </deleteFetcher.Form>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
