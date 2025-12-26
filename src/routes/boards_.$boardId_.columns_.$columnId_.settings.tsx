"use client";

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { eq } from "@tanstack/db";
import { boardsCollection, columnsCollection } from "~/db/collections";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { ColorPicker } from "~/components/ColorPicker";
import { ArrowLeft, Trash2, AlertTriangle } from "lucide-react";
import { useAuth } from "~/components/auth/AuthProvider";
import { toast } from "sonner";

export const Route = createFileRoute(
  "/boards_/$boardId_/columns_/$columnId_/settings"
)({
  component: ColumnSettingsPage,
});

function ColumnSettingsPage() {
  const { boardId, columnId } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // State for form edits - null means "not edited yet, use live data"
  const [columnName, setColumnName] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Live query for board
  const { data: boardData } = useLiveQuery((q) =>
    q
      .from({ board: boardsCollection })
      .where(({ board }) => eq(board.id, boardId))
  );

  // Live query for column
  const { data: columnData } = useLiveQuery((q) =>
    q
      .from({ column: columnsCollection })
      .where(({ column }) => eq(column.id, columnId))
  );

  const board = boardData?.[0];
  const column = columnData?.[0];

  // Derive current values: user edit takes precedence, otherwise use live data
  const currentColumnName = columnName ?? column?.name ?? "";
  const currentColor = selectedColor ?? column?.color ?? "#94a3b8";

  if (!board || !column) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-8">
        <Card className="max-w-md mx-auto p-8 text-center">
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Column not found
          </p>
          <Button onClick={() => navigate({ to: "/boards" })}>
            Back to Boards
          </Button>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentColumnName.trim()) {
      toast.error("Column name is required");
      return;
    }

    if (!user?.id) {
      toast.error("Account ID is required");
      return;
    }

    setIsSubmitting(true);

    try {
      // Optimistically update column
      columnsCollection.update(columnId, (draft) => {
        draft.name = currentColumnName.trim();
        draft.color = currentColor;
      });

      toast.success("Column updated!");
      navigate({
        to: "/boards/$boardId/columns/$columnId",
        params: { boardId, columnId },
      });
    } catch (err) {
      toast.error("Failed to update column");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!user?.id) {
      toast.error("Account ID is required");
      return;
    }

    setIsDeleting(true);

    try {
      // Optimistically delete column
      columnsCollection.delete(columnId);
      toast.success("Column deleted");
      navigate({ to: "/boards/$boardId", params: { boardId } });
    } catch (err) {
      toast.error("Failed to delete column");
      console.error(err);
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm p-4 z-10">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                navigate({
                  to: "/boards/$boardId/columns/$columnId",
                  params: { boardId, columnId },
                })
              }
              className="flex items-center gap-2"
            >
              <ArrowLeft size={18} />
              Back
            </Button>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
              Column Settings
            </h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Update Form */}
          <Card className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Column Name */}
              <div className="space-y-2">
                <Label
                  htmlFor="columnName"
                  className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                >
                  Column Name
                </Label>
                <Input
                  id="columnName"
                  type="text"
                  value={currentColumnName}
                  onChange={(e) => setColumnName(e.target.value)}
                  placeholder="Enter column name..."
                  disabled={isSubmitting}
                  autoFocus
                  maxLength={100}
                />
              </div>

              {/* Color Picker */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Color
                </Label>
                <ColorPicker value={currentColor} onChange={setSelectedColor} />
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting || !currentColumnName.trim()}
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Card>

          {/* Delete Section */}
          {!column.isDefault && (
            <Card className="p-6 border-red-200 dark:border-red-900/40">
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400 mb-1">
                    Danger Zone
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Once you delete a column, there is no going back. All cards
                    in this column will also be deleted.
                  </p>
                </div>

                {!showDeleteConfirm ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isDeleting}
                    className="w-full flex items-center justify-between text-red-600 dark:text-red-400 border-red-300 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <span className="font-bold uppercase tracking-wider text-xs">
                      Delete Column
                    </span>
                    <Trash2 size={16} />
                  </Button>
                ) : (
                  <div className="space-y-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-900/40">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-red-900 dark:text-red-100 mb-1">
                          Are you absolutely sure?
                        </p>
                        <p className="text-xs text-red-700 dark:text-red-300">
                          This will permanently delete the column "{column.name}
                          " and all its cards. This action cannot be undone.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="flex-1"
                      >
                        {isDeleting ? "Deleting..." : "Yes, Delete Column"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowDeleteConfirm(false)}
                        disabled={isDeleting}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
