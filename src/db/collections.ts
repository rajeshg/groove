import { createCollection } from "@tanstack/react-db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { QueryClient } from "@tanstack/react-query";
import {
  getTodos,
  createTodo,
  updateTodo,
  deleteTodo,
} from "~/server/actions/todos";
import {
  getBoards,
  createBoard,
  updateBoard,
  deleteBoard,
  getAllColumns,
  createColumn,
  updateColumn,
  deleteColumn,
  getAllItems,
  createItem,
  updateItem,
  deleteItem,
  getAllComments,
  createComment,
  updateComment,
  deleteComment,
  getAllAssignees,
  createOrGetAssignee,
  getAllActivities,
  getPendingInvitationsForUser,
  acceptBoardInvitation as acceptInvitation,
} from "~/server/actions/boards";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 10,
      refetchOnWindowFocus: false,
    },
  },
});

function getUserId(userId?: string): string {
  if (userId) return userId;
  if (typeof window !== "undefined") {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("userId") || "demo-user";
  }
  return "demo-user";
}

function getAccountId(): string {
  // This is a workaround - in a real app, we'd use global auth state
  // For now, we'll try to get it from the API response via getCurrentUser
  if (typeof window !== "undefined") {
    // Store accountId in localStorage when user logs in
    return localStorage.getItem("accountId") || "";
  }
  return "";
}

// ============================================================================
// Todo Collection
// ============================================================================

export const todoCollection = createCollection(
  queryCollectionOptions({
    queryKey: ["todos"],
    queryFn: async ({ queryKey }) => {
      const userId = queryKey[1] as string | undefined;
      return await getTodos({ data: { userId: getUserId(userId) } });
    },
    queryClient,
    getKey: (item: any) => item.id,
    onInsert: async ({ transaction }: any) => {
      const mutation = transaction.mutations[0];
      const modified = mutation.modified;
      const userId = getUserId();

      try {
        await createTodo({
          data: {
            userId,
            input: {
              text: modified.text,
              description: modified.description || "",
              dueDate: modified.dueDate || null,
            },
          },
        });
      } catch (error) {
        console.error("Failed to create todo:", error);
        throw error;
      }
    },
    onUpdate: async ({ transaction }: any) => {
      const { key, changes } = transaction.mutations[0];
      const userId = getUserId();

      const input: any = {};
      if (changes.text !== undefined) input.text = changes.text;
      if (changes.description !== undefined)
        input.description = changes.description;
      if (changes.dueDate !== undefined) input.dueDate = changes.dueDate;
      if (changes.completed !== undefined) input.completed = changes.completed;

      await updateTodo({
        data: {
          userId,
          todoId: key,
          input,
        },
      });
    },
    onDelete: async ({ transaction }: any) => {
      const { key } = transaction.mutations[0];
      const userId = getUserId();

      await deleteTodo({
        data: {
          userId,
          todoId: key,
        },
      });
    },
  })
);

// ============================================================================
// Boards Collection
// ============================================================================

export const boardsCollection = createCollection(
  queryCollectionOptions({
    queryKey: ["boards"],
    queryFn: async () => {
      // Skip on server to prevent SSR hydration errors
      if (typeof window === "undefined") {
        return [];
      }
      const accountId = getAccountId();
      if (!accountId) {
        console.warn("No accountId available for boards query");
        return [];
      }
      return await getBoards({ data: { accountId } });
    },
    queryClient,
    getKey: (item: any) => item.id,
    onInsert: async ({ transaction }: any) => {
      const mutation = transaction.mutations[0];
      const modified = mutation.modified;
      const accountId = getAccountId();

      if (!accountId) {
        throw new Error("Account ID is required");
      }

      const result = await createBoard({
        data: {
          accountId,
          data: {
            name: modified.name,
            color: modified.color || "#3b82f6",
            template: modified.template,
          },
        },
      });
      return result;
    },
    onUpdate: async ({ transaction }: any) => {
      const { key, changes } = transaction.mutations[0];
      const accountId = getAccountId();

      if (!accountId) {
        throw new Error("Account ID is required");
      }

      const result = await updateBoard({
        data: {
          accountId,
          boardId: key,
          data: {
            name: changes.name,
            color: changes.color,
          },
        },
      });
      return result;
    },
    onDelete: async ({ transaction }: any) => {
      const { key } = transaction.mutations[0];
      const accountId = getAccountId();

      if (!accountId) {
        throw new Error("Account ID is required");
      }

      await deleteBoard({
        data: {
          accountId,
          boardId: key,
        },
      });
    },
  })
);

// ============================================================================
// Columns Collection
// ============================================================================

export const columnsCollection = createCollection(
  queryCollectionOptions({
    queryKey: ["columns"],
    queryFn: async () => {
      // Skip on server to prevent SSR hydration errors
      if (typeof window === "undefined") {
        return [];
      }
      const accountId = getAccountId();
      if (!accountId) {
        console.warn("No accountId available for columns query");
        return [];
      }
      // Fetch ALL columns for this account across all boards
      // useLiveQuery will filter by boardId client-side
      return await getAllColumns({ data: { accountId } });
    },
    queryClient,
    getKey: (item: any) => item.id,
    onInsert: async ({ transaction }: any) => {
      const mutation = transaction.mutations[0];
      const modified = mutation.modified;
      const accountId = getAccountId();

      if (!accountId || !modified.boardId) {
        throw new Error("Account ID and Board ID are required");
      }

      const result = await createColumn({
        data: {
          accountId,
          boardId: modified.boardId,
          data: {
            name: modified.name,
            color: modified.color || "#94a3b8",
          },
        },
      });
      return result;
    },
    onUpdate: async ({ transaction }: any) => {
      const { key, changes } = transaction.mutations[0];
      const accountId = getAccountId();

      // Get the current column from the query cache (like items collection does)
      const cachedData = queryClient.getQueryData(["columns"]) as any[];
      const column = cachedData?.find((c: any) => c.id === key);
      const boardId = changes.boardId || column?.boardId;

      if (!accountId || !boardId) {
        const errorMsg = `Account ID (${accountId}) and Board ID (${boardId}) not available for column update`;
        throw new Error(errorMsg);
      }

      const updateData: any = {};
      if (changes.name !== undefined) updateData.name = changes.name;
      if (changes.color !== undefined) updateData.color = changes.color;
      if (changes.order !== undefined) updateData.order = changes.order;
      if (changes.isExpanded !== undefined)
        updateData.isExpanded = changes.isExpanded;

      const result = await updateColumn({
        data: {
          accountId,
          boardId,
          columnId: key,
          data: updateData,
        },
      });
      return result;
    },
    onDelete: async ({ transaction }: any) => {
      const { key } = transaction.mutations[0];
      const accountId = getAccountId();

      // Get the current column from the query cache
      const cachedData = queryClient.getQueryData(["columns"]) as any[];
      const column = cachedData?.find((c: any) => c.id === key);
      const boardId = column?.boardId;

      if (!accountId || !boardId) {
        const errorMsg = `Account ID (${accountId}) and Board ID (${boardId}) not available for column delete`;
        throw new Error(errorMsg);
      }

      await deleteColumn({
        data: {
          accountId,
          boardId,
          columnId: key,
        },
      });
    },
  })
);

// ============================================================================
// Items Collection
// ============================================================================

export const itemsCollection = createCollection(
  queryCollectionOptions({
    queryKey: ["items"],
    queryFn: async () => {
      // Skip on server to prevent SSR hydration errors
      if (typeof window === "undefined") {
        return [];
      }
      const accountId = getAccountId();
      if (!accountId) {
        console.warn("No accountId available for items query");
        return [];
      }
      // Fetch ALL items for this account across all boards
      // useLiveQuery will filter by boardId client-side
      return await getAllItems({ data: { accountId } });
    },
    queryClient,
    getKey: (item: any) => item.id,
    onInsert: async ({ transaction }: any) => {
      const mutation = transaction.mutations[0];
      const modified = mutation.modified;
      const accountId = getAccountId();

      if (!accountId || !modified.boardId || !modified.columnId) {
        throw new Error("Account ID, Board ID, and Column ID are required");
      }

      const result = await createItem({
        data: {
          accountId,
          boardId: modified.boardId,
          columnId: modified.columnId,
          data: {
            title: modified.title,
            content: modified.content || "",
          },
        },
      });
      return result;
    },
    onUpdate: async ({ transaction }: any) => {
      const { key, changes } = transaction.mutations[0];
      const accountId = getAccountId();

      // Get the current item from the query cache
      const cachedData = queryClient.getQueryData(["items"]) as any[];
      const item = cachedData?.find((i: any) => i.id === key);
      const boardId = changes.boardId || item?.boardId;

      if (!accountId || !boardId) {
        const errorMsg = `Account ID (${accountId}) and Board ID (${boardId}) not available for item update`;
        throw new Error(errorMsg);
      }

      const updateData: any = {};
      if (changes.title !== undefined) updateData.title = changes.title;
      if (changes.content !== undefined) updateData.content = changes.content;
      if (changes.order !== undefined) updateData.order = changes.order;
      if (changes.columnId !== undefined)
        updateData.columnId = changes.columnId;
      if (changes.assigneeId !== undefined)
        updateData.assigneeId = changes.assigneeId;

      const result = await updateItem({
        data: {
          accountId,
          boardId,
          itemId: key,
          data: updateData,
        },
      });
      return result;
    },
    onDelete: async ({ transaction }: any) => {
      const { key } = transaction.mutations[0];
      const accountId = getAccountId();

      // Get the current item from the query cache to retrieve boardId
      const cachedData = queryClient.getQueryData(["items"]) as any[];
      const item = cachedData?.find((i: any) => i.id === key);
      const boardId = item?.boardId;

      if (!accountId || !boardId) {
        const errorMsg = `Account ID (${accountId}) and Board ID (${boardId}) not available for item delete`;
        throw new Error(errorMsg);
      }

      await deleteItem({
        data: {
          accountId,
          boardId,
          itemId: key,
        },
      });
    },
  })
);

// ============================================================================
// Comments Collection
// ============================================================================

export const commentsCollection = createCollection(
  queryCollectionOptions({
    queryKey: ["comments"],
    queryFn: async () => {
      // Skip on server to prevent SSR hydration errors
      if (typeof window === "undefined") {
        return [];
      }
      const accountId = getAccountId();
      if (!accountId) {
        console.warn("No accountId available for comments query");
        return [];
      }
      // Fetch ALL comments for this account across all items
      // useLiveQuery will filter by itemId client-side
      return await getAllComments({ data: { accountId } });
    },
    queryClient,
    getKey: (item: any) => item.id,
    onInsert: async ({ transaction }: any) => {
      const mutation = transaction.mutations[0];
      const modified = mutation.modified;
      const accountId = getAccountId();

      if (!accountId || !modified.itemId) {
        throw new Error("Account ID and Item ID are required");
      }

      const result = await createComment({
        data: {
          accountId,
          itemId: modified.itemId,
          data: {
            content: modified.content,
          },
        },
      });

      // Refetch activities collection since new comment activity was created server-side
      await activitiesCollection.utils.refetch();

      return result;
    },
    onUpdate: async ({ transaction }: any) => {
      const { key, changes } = transaction.mutations[0];
      const accountId = getAccountId();

      // Get the current comment from the query cache
      const cachedData = queryClient.getQueryData(["comments"]) as any[];
      const comment = cachedData?.find((c: any) => c.id === key);
      const itemId = changes.itemId || comment?.itemId;

      if (!accountId || !itemId) {
        const errorMsg = `Account ID (${accountId}) and Item ID (${itemId}) not available for comment update`;
        throw new Error(errorMsg);
      }

      const updateData: any = {};
      if (changes.content !== undefined) updateData.content = changes.content;

      const result = await updateComment({
        data: {
          accountId,
          commentId: key,
          data: updateData,
        },
      });

      // Refetch activities collection since comment updated activity was created server-side
      await activitiesCollection.utils.refetch();

      return result;
    },
    onDelete: async ({ transaction }: any) => {
      const { key } = transaction.mutations[0];
      const accountId = getAccountId();

      // Get the current comment from the query cache
      const cachedData = queryClient.getQueryData(["comments"]) as any[];
      const comment = cachedData?.find((c: any) => c.id === key);
      const itemId = comment?.itemId;

      if (!accountId || !itemId) {
        const errorMsg = `Account ID (${accountId}) and Item ID (${itemId}) not available for comment delete`;
        throw new Error(errorMsg);
      }

      await deleteComment({
        data: {
          accountId,
          commentId: key,
        },
      });

      // Refetch activities collection since comment deleted activity was created server-side
      await activitiesCollection.utils.refetch();
    },
  })
);

// ============================================================================
// Assignees Collection
// ============================================================================

export const assigneesCollection = createCollection(
  queryCollectionOptions({
    queryKey: ["assignees"],
    queryFn: async () => {
      // Skip on server to prevent SSR hydration errors
      if (typeof window === "undefined") {
        return [];
      }
      const accountId = getAccountId();
      if (!accountId) {
        console.warn("No accountId available for assignees query");
        return [];
      }
      // Fetch ALL assignees for this account across all boards
      // useLiveQuery will filter by boardId client-side
      return await getAllAssignees({ data: { accountId } });
    },
    queryClient,
    getKey: (item: any) => item.id,
    onInsert: async ({ transaction }: any) => {
      const mutation = transaction.mutations[0];
      const modified = mutation.modified;
      const accountId = getAccountId();

      if (!accountId || !modified.boardId || !modified.name) {
        throw new Error("Account ID, Board ID, and Name are required");
      }

      const result = await createOrGetAssignee({
        data: {
          accountId,
          boardId: modified.boardId,
          name: modified.name,
          userId: modified.userId,
        },
      });
      return result;
    },
    // Note: Assignees don't have update/delete in the current schema
    // They're created via createOrGetAssignee which handles duplicates
  })
);

// ============================================================================
// Activities Collection
// ============================================================================

export const activitiesCollection = createCollection(
  queryCollectionOptions({
    queryKey: ["activities"],
    queryFn: async () => {
      // Skip on server to prevent SSR hydration errors
      if (typeof window === "undefined") {
        return [];
      }
      const accountId = getAccountId();
      if (!accountId) {
        console.warn("No accountId available for activities query");
        return [];
      }
      // Fetch ALL activities for this account across all boards
      // useLiveQuery will filter by itemId client-side
      return await getAllActivities({ data: { accountId } });
    },
    queryClient,
    getKey: (item: any) => item.id,
    // Activities are read-only in the UI, created server-side via mutations
  })
);

// ============================================================================
// Invitations Collection
// ============================================================================

export const invitationsCollection = createCollection(
  queryCollectionOptions({
    queryKey: ["invitations"],
    queryFn: async () => {
      // Skip on server to prevent SSR hydration errors
      if (typeof window === "undefined") {
        return [];
      }
      const accountId = getAccountId();
      if (!accountId) {
        console.warn("No accountId available for invitations query");
        return [];
      }
      // Fetch ALL pending invitations for this account
      return await getPendingInvitationsForUser({ data: { accountId } });
    },
    queryClient,
    getKey: (item: any) => item.id,
    onUpdate: async ({ transaction }: any) => {
      const { key, changes } = transaction.mutations[0];
      const accountId = getAccountId();

      if (!accountId) {
        throw new Error("Account ID is required");
      }

      // For now, only support accepting invitations
      if (changes.status === "accepted") {
        const result = await acceptInvitation({
          data: {
            accountId,
            data: { invitationId: key },
          },
        });
        return result;
      }

      throw new Error("Unsupported invitation update");
    },
  })
);
