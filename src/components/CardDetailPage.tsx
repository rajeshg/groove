import { useState } from "react";
import { useParams, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { eq } from "@tanstack/db";
import { generateId } from "~/lib/id";
import {
  boardsCollection,
  columnsCollection,
  itemsCollection,
  commentsCollection,
  assigneesCollection,
  activitiesCollection,
} from "~/db/collections";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Card } from "~/components/ui/card";
import {
  ArrowLeft,
  Save,
  X,
  MessageSquare,
  Send,
  Trash2,
  Edit2,
  Check,
} from "lucide-react";
import { useAuth } from "~/components/auth/AuthProvider";
import { toast } from "sonner";
import { CardMeta } from "~/components/CardMeta";

interface CardDetailPageProps {
  boardId?: string;
  cardId?: string;
}

export function CardDetailPage({
  boardId: propBoardId,
  cardId: propCardId,
}: CardDetailPageProps) {
  const params = useParams({ from: "/boards_/$boardId_/cards_/$cardId" }) as {
    boardId: string;
    cardId: string;
  };

  const navigate = useNavigate();
  const { user } = useAuth();
  const boardId = propBoardId || params.boardId;
  const cardId = propCardId || params.cardId;

  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState("");
  const [isDeletingCard, setIsDeletingCard] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Live query for the specific item (card)
  const { data: cardData } = useLiveQuery((q) =>
    q.from({ item: itemsCollection }).where(({ item }) => eq(item.id, cardId))
  );

  // Live query for the board to get its color
  const { data: boardData } = useLiveQuery((q) =>
    q
      .from({ board: boardsCollection })
      .where(({ board }) => eq(board.id, boardId))
  );

  // Live query for all columns in this board
  const { data: columnsData } = useLiveQuery((q) =>
    q
      .from({ column: columnsCollection })
      .where(({ column }) => eq(column.boardId, boardId))
      .orderBy(({ column }) => [{ by: column.order, direction: "asc" }])
  );

  // Live query for comments on this item
  const { data: commentsData } = useLiveQuery((q) =>
    q
      .from({ comment: commentsCollection })
      .where(({ comment }) => eq(comment.itemId, cardId))
  );

  // Live query for assignees in this board
  // Note: Assignees collection uses queryKey ["assignees", boardId]
  const { data: assigneesData } = useLiveQuery((q) =>
    q.from({ assignee: assigneesCollection })
  );

  // Live query for activities on this item - automatically updates when activities change
  const { data: activitiesData } = useLiveQuery((q) =>
    q
      .from({ activity: activitiesCollection })
      .where(({ activity }) => eq(activity.itemId, cardId))
  );

  const card = cardData?.[0];
  const board = boardData?.[0];
  const columns = (columnsData || []).sort(
    (a: any, b: any) => a.order - b.order
  );
  const comments = commentsData || [];
  // Sort activities by createdAt in reverse chronological order (newest first)
  const activities = (activitiesData || []).sort(
    (a: any, b: any) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  // Filter assignees by boardId on the client side
  const assignees = (assigneesData || []).filter(
    (a: any) => a.boardId === boardId
  );

  // Find current assignee
  const currentAssignee = card?.assigneeId
    ? assignees.find((a: any) => a.id === card.assigneeId) || null
    : null;

  // Initialize edit fields when card data loads
  if (card && !editTitle && !isEditing) {
    setEditTitle(card.title);
    setEditContent(card.content || "");
  }

  const column = columns.find((col: any) => col.id === card?.columnId);

  const handleSave = async () => {
    if (!editTitle.trim()) {
      toast.error("Card title is required");
      return;
    }

    if (!user || !card) {
      toast.error("Not authenticated");
      return;
    }

    try {
      setIsSaving(true);

      // Optimistically update item with TanStack DB
      itemsCollection.update(cardId, (draft) => {
        draft.title = editTitle.trim();
        draft.content = editContent.trim() || "";
      });

      setIsEditing(false);
      toast.success("Card updated successfully");
    } catch (err) {
      console.error("Failed to save card:", err);
      toast.error(err instanceof Error ? err.message : "Failed to save card");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangeColumn = async (newColumnId: string) => {
    if (!user || !cardId) {
      toast.error("Not authenticated - please log in again");
      return;
    }

    try {
      // Optimistically update column
      itemsCollection.update(cardId, (draft) => {
        draft.columnId = newColumnId;
      });

      toast.success("Card moved");
    } catch (err) {
      console.error("Failed to change column:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to change column"
      );
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !user || !cardId) return;

    try {
      setIsSubmittingComment(true);

      // Optimistically create comment
      commentsCollection.insert({
        id: generateId(),
        itemId: cardId,
        accountId: user.id,
        content: newComment.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any);

      setNewComment("");
      toast.success("Comment added");
    } catch (err) {
      console.error("Failed to add comment:", err);
      toast.error(err instanceof Error ? err.message : "Failed to add comment");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user || !cardId) return;

    try {
      commentsCollection.delete(commentId);
      toast.success("Comment deleted");
    } catch (err) {
      console.error("Failed to delete comment:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to delete comment"
      );
    }
  };

  const handleDeleteCard = async () => {
    if (!user || !cardId) {
      toast.error("Not authenticated");
      return;
    }

    try {
      setIsDeletingCard(true);
      itemsCollection.delete(cardId);
      toast.success("Card deleted successfully");

      // Navigate back to board after deletion
      setTimeout(() => {
        navigate({ to: `/boards/${boardId}` });
      }, 500);
    } catch (err) {
      console.error("Failed to delete card:", err);
      toast.error(err instanceof Error ? err.message : "Failed to delete card");
      setShowDeleteConfirm(false);
    } finally {
      setIsDeletingCard(false);
    }
  };

  const handleEditComment = (commentId: string, currentContent: string) => {
    setEditingCommentId(commentId);
    setEditCommentContent(currentContent);
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditCommentContent("");
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!editCommentContent.trim() || !user || !cardId) return;

    try {
      commentsCollection.update(commentId, (draft) => {
        draft.content = editCommentContent.trim();
      });

      setEditingCommentId(null);
      setEditCommentContent("");
      toast.success("Comment updated");
    } catch (err) {
      console.error("Failed to update comment:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to update comment"
      );
    }
  };

  const handleCancel = () => {
    if (isEditing && card) {
      setEditTitle(card.title);
      setEditContent(card.content || "");
      setIsEditing(false);
    } else {
      navigate({ to: `/boards/${boardId}` });
    }
  };

  // Helper to check if a comment can be edited/deleted (within 15 minutes)
  const canEditComment = (createdAt: string): boolean => {
    const createdTime = new Date(createdAt).getTime();
    const now = new Date().getTime();
    const diffInMinutes = (now - createdTime) / (1000 * 60);
    return diffInMinutes <= 15;
  };

  // Helper to check if a comment can be deleted (within 15 minutes)
  const canDeleteComment = (createdAt: string): boolean => {
    return canEditComment(createdAt); // Same 15-minute window for both
  };

  if (!card) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const getColumnColor = (color: string): string => {
    // If it's already a hex code, return it directly
    if (color.startsWith("#")) {
      return color;
    }

    // Otherwise, map color names to hex codes
    const colorMap: Record<string, string> = {
      blue: "#3b82f6",
      green: "#10b981",
      red: "#ef4444",
      yellow: "#f59e0b",
      purple: "#a855f7",
      pink: "#ec4899",
      cyan: "#06b6d4",
      slate: "#64748b",
      gray: "#6b7280",
    };
    return colorMap[color] || "#6b7280";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Board color indicator bar */}
      {board && (
        <div
          className="h-1 sticky top-0 z-20"
          style={{ backgroundColor: board.color || "#3b82f6" }}
        />
      )}

      <div className="p-3 md:p-6">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-4 md:mb-6 flex items-center justify-between gap-2">
            <Button
              onClick={handleCancel}
              variant="ghost"
              size="sm"
              className="gap-1 md:gap-2"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Back to Board</span>
              <span className="sm:hidden">Back</span>
            </Button>
            {!isEditing && (
              <div className="flex gap-2">
                <Button onClick={() => setIsEditing(true)} size="sm">
                  Edit
                </Button>
                {showDeleteConfirm ? (
                  <div className="flex gap-2">
                    <Button
                      onClick={handleDeleteCard}
                      disabled={isDeletingCard}
                      variant="destructive"
                      size="sm"
                    >
                      {isDeletingCard ? "Deleting..." : "Confirm Delete"}
                    </Button>
                    <Button
                      onClick={() => setShowDeleteConfirm(false)}
                      variant="outline"
                      size="sm"
                      disabled={isDeletingCard}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => setShowDeleteConfirm(true)}
                    variant="destructive"
                    size="sm"
                    className="gap-1"
                  >
                    <Trash2 size={16} />
                    <span className="hidden sm:inline">Delete</span>
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Card Details with Column Selector */}
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Main Card Content */}
            <Card className="flex-1 p-4 md:p-8">
              {/* Board & Column Info */}
              <div className="mb-4 md:mb-6 pb-4 md:pb-6 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-4">
                  {column && (
                    <>
                      <span
                        className="inline-block px-2 md:px-3 py-1 text-[10px] font-bold text-white rounded-lg shadow-sm"
                        style={{
                          backgroundColor: getColumnColor(column.color),
                        }}
                      >
                        NO. {card.id.substring(0, 4).toUpperCase()}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                        {column.name}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {isEditing ? (
                // Edit Mode
                <div className="space-y-4 md:space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Title
                    </label>
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        // Submit on Enter, Ctrl/Cmd+Enter, or Ctrl/Cmd+S
                        if (
                          e.key === "Enter" ||
                          ((e.ctrlKey || e.metaKey) &&
                            (e.key === "Enter" || e.key === "s"))
                        ) {
                          e.preventDefault();
                          handleSave();
                        }
                      }}
                      placeholder="Card title"
                      className="text-base md:text-lg"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Description
                    </label>
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      onKeyDown={(e) => {
                        // Allow Shift+Enter for newlines, but Enter alone or Ctrl/Cmd+Enter to save
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSave();
                        } else if (
                          (e.ctrlKey || e.metaKey) &&
                          e.key === "Enter"
                        ) {
                          e.preventDefault();
                          handleSave();
                        }
                      }}
                      placeholder="Add a description..."
                      rows={6}
                    />
                  </div>

                  {/* Metadata */}
                  <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div>
                      Created: {new Date(card.createdAt).toLocaleString()}
                    </div>
                    <div>
                      Updated: {new Date(card.updatedAt).toLocaleString()}
                    </div>
                  </div>

                  {/* Edit Actions */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <Button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="gap-2 flex-1 w-full"
                    >
                      <Save size={16} />
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button
                      onClick={handleCancel}
                      variant="outline"
                      disabled={isSaving}
                      className="flex-1 w-full"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                // View Mode
                <div className="space-y-4 md:space-y-6">
                  <div>
                    <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-50 break-words">
                      {card.title}
                    </h1>
                  </div>

                  {card.content && (
                    <div>
                      <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                        Description
                      </h2>
                      <div className="prose prose-sm max-w-none text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words">
                        {card.content}
                      </div>
                    </div>
                  )}

                  {!card.content && (
                    <div className="text-slate-400 dark:text-slate-500 italic text-sm">
                      No description
                    </div>
                  )}

                  {/* Card Metadata with assignee picker */}
                  <CardMeta
                    createdBy={card.createdBy}
                    createdByUser={
                      card.createdByUser
                        ? {
                            id: card.createdByUser.id || null,
                            firstName: card.createdByUser.firstName || null,
                            lastName: card.createdByUser.lastName || null,
                            email: card.createdByUser.email || null,
                          }
                        : null
                    }
                    assignee={
                      currentAssignee
                        ? {
                            id: currentAssignee.id,
                            name: currentAssignee.name,
                            userId: currentAssignee.userId || null,
                          }
                        : null
                    }
                    createdAt={card.createdAt}
                    updatedAt={card.updatedAt}
                    lastActiveAt={card.lastActiveAt}
                    columnColor={
                      column ? getColumnColor(column.color) : undefined
                    }
                    itemId={cardId}
                    boardId={boardId}
                    availableAssignees={assignees as any}
                    isCardDetail={true}
                  />

                  {/* Comments Section */}
                  <div className="pt-6 md:pt-8 mt-6 md:mt-8 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-4 md:mb-6">
                      <MessageSquare
                        size={18}
                        className="text-slate-500 dark:text-slate-400"
                      />
                      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                        Comments
                      </h2>
                      <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full text-xs font-medium">
                        {comments.length}
                      </span>
                    </div>

                    {/* Add Comment */}
                    <div className="flex gap-3 mb-8">
                      <div className="flex-1">
                        <Textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          onKeyDown={(e) => {
                            // Submit on Ctrl/Cmd+Enter
                            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                              e.preventDefault();
                              if (newComment.trim()) {
                                handleAddComment();
                              }
                            }
                          }}
                          placeholder="Write a comment..."
                          className="min-h-[80px] text-sm"
                        />
                      </div>
                      <div className="flex flex-col justify-end">
                        <Button
                          onClick={handleAddComment}
                          disabled={isSubmittingComment || !newComment.trim()}
                          size="sm"
                          className="gap-2"
                        >
                          <Send size={14} />
                          {isSubmittingComment ? "..." : "Send"}
                        </Button>
                      </div>
                    </div>

                    {/* Comments List */}
                    <div className="space-y-6">
                      {comments.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm italic">
                          No comments yet. Be the first to say something!
                        </div>
                      ) : (
                        comments.map((comment: any) => (
                          <div key={comment.id} className="group flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300 text-xs font-bold shrink-0">
                              {comment.accountId?.[0] || "?"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <div className="text-sm font-medium text-slate-900 dark:text-slate-50 truncate">
                                  User {comment.accountId?.substring(0, 8)}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                    {new Date(
                                      comment.createdAt
                                    ).toLocaleString()}
                                  </span>
                                  {user?.id === comment.accountId && (
                                    <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                      {editingCommentId === comment.id ? (
                                        <button
                                          onClick={() =>
                                            handleSaveEdit(comment.id)
                                          }
                                          className="text-green-600 hover:text-green-700 transition-colors"
                                          title="Save edit"
                                        >
                                          <Check size={12} />
                                        </button>
                                      ) : (
                                        canEditComment(comment.createdAt) && (
                                          <button
                                            onClick={() =>
                                              handleEditComment(
                                                comment.id,
                                                comment.content
                                              )
                                            }
                                            className="text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                            title="Edit comment"
                                          >
                                            <Edit2 size={12} />
                                          </button>
                                        )
                                      )}
                                      {editingCommentId === comment.id ? (
                                        <button
                                          onClick={handleCancelEdit}
                                          className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                          title="Cancel edit"
                                        >
                                          <X size={12} />
                                        </button>
                                      ) : (
                                        canDeleteComment(comment.createdAt) && (
                                          <button
                                            onClick={() =>
                                              handleDeleteComment(comment.id)
                                            }
                                            className="text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                            title="Delete comment"
                                          >
                                            <Trash2 size={12} />
                                          </button>
                                        )
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {editingCommentId === comment.id ? (
                                <Textarea
                                  value={editCommentContent}
                                  onChange={(e) =>
                                    setEditCommentContent(e.target.value)
                                  }
                                  className="text-sm min-h-[60px] mt-1"
                                  autoFocus
                                />
                              ) : (
                                <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words">
                                  {comment.content}
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Activity Feed */}
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-6 mt-6">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 mb-4 flex items-center gap-2">
                        <MessageSquare size={16} />
                        Activity
                      </h3>
                      <div className="space-y-4 max-h-64 overflow-y-auto">
                        {!activities || activities.length === 0 ? (
                          <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-sm italic">
                            No activity yet
                          </div>
                        ) : (
                          activities.map((activity: any) => (
                            <div
                              key={activity.id}
                              className="flex gap-3 text-xs"
                            >
                              <div className="flex-shrink-0 w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black uppercase text-slate-500">
                                {activity.user?.firstName?.[0] ||
                                  activity.user?.lastName?.[0] ||
                                  "?"}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-slate-700 dark:text-slate-300">
                                  <span className="font-bold text-slate-900 dark:text-white">
                                    {activity.user?.firstName ||
                                      activity.user?.lastName ||
                                      "System"}
                                  </span>{" "}
                                  {activity.type
                                    .replace("item_", "")
                                    .replace("_", " ")}
                                </p>
                                {activity.content && (
                                  <p className="text-slate-500 dark:text-slate-400 italic text-[10px] truncate">
                                    {activity.content}
                                  </p>
                                )}
                                <span className="text-[10px] text-slate-400">
                                  {new Date(
                                    activity.createdAt
                                  ).toLocaleTimeString(undefined, {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Column Selector Sidebar */}
            {!isEditing && (
              <Card className="lg:w-56 p-4 space-y-6">
                {/* Status Section */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3">
                    Status
                  </h3>
                  <div className="space-y-1">
                    {columns.map((col: any) => {
                      const isActive = col.id === card.columnId;
                      return (
                        <button
                          key={col.id}
                          onClick={() => handleChangeColumn(col.id)}
                          className="w-full px-3 py-2 text-xs font-semibold text-left rounded-lg transition-all hover:bg-slate-100 dark:hover:bg-slate-800"
                          style={{
                            backgroundColor: isActive
                              ? getColumnColor(col.color)
                              : undefined,
                            color: isActive ? "#fff" : undefined,
                          }}
                        >
                          {col.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
