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

      try {
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
        queryClient.invalidateQueries({ queryKey: ["boards"] });
        return result;
      } catch (error) {
        console.error("Failed to create board:", error);
        throw error;
      }
    },
    onUpdate: async ({ transaction }: any) => {
      const { key, changes } = transaction.mutations[0];
      const accountId = getAccountId();

      if (!accountId) {
        throw new Error("Account ID is required");
      }

      try {
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
        queryClient.invalidateQueries({ queryKey: ["boards"] });
        return result;
      } catch (error) {
        console.error("Failed to update board:", error);
        throw error;
      }
    },
    onDelete: async ({ transaction }: any) => {
      const { key } = transaction.mutations[0];
      const accountId = getAccountId();

      if (!accountId) {
        throw new Error("Account ID is required");
      }

      try {
        await deleteBoard({
          data: {
            accountId,
            boardId: key,
          },
        });
        queryClient.invalidateQueries({ queryKey: ["boards"] });
      } catch (error) {
        console.error("Failed to delete board:", error);
        throw error;
      }
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

      try {
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
        queryClient.invalidateQueries({
          queryKey: ["columns", modified.boardId],
        });
        return result;
      } catch (error) {
        console.error("Failed to create column:", error);
        throw error;
      }
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
        console.error(errorMsg);
        throw new Error(errorMsg);
      }

      const updateData: any = {};
      if (changes.name !== undefined) updateData.name = changes.name;
      if (changes.color !== undefined) updateData.color = changes.color;
      if (changes.order !== undefined) updateData.order = changes.order;
      if (changes.isExpanded !== undefined)
        updateData.isExpanded = changes.isExpanded;

      try {
        const result = await updateColumn({
          data: {
            accountId,
            boardId,
            columnId: key,
            data: updateData,
          },
        });
        queryClient.invalidateQueries({ queryKey: ["columns", boardId] });
        return result;
      } catch (error) {
        console.error("Failed to update column:", error);
        throw error;
      }
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
        console.error(errorMsg);
        throw new Error(errorMsg);
      }

      try {
        const result = await deleteColumn({
          data: {
            accountId,
            boardId,
            columnId: key,
          },
        });
        queryClient.invalidateQueries({ queryKey: ["columns", boardId] });
        queryClient.invalidateQueries({ queryKey: ["items", boardId] });
        queryClient.invalidateQueries({ queryKey: ["activities"] }); // Activities created on delete
        return result;
      } catch (error) {
        console.error("Failed to delete column:", error);
        throw error;
      }
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

      try {
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
        // Server creates activity for item creation - invalidate activities
        queryClient.invalidateQueries({ queryKey: ["activities"] });
        queryClient.invalidateQueries({
          queryKey: ["items", modified.boardId],
        });
        return result;
      } catch (error) {
        console.error("Failed to create item:", error);
        throw error;
      }
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
        console.error(errorMsg);
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

      try {
        const result = await updateItem({
          data: {
            accountId,
            boardId,
            itemId: key,
            data: updateData,
          },
        });

        // Invalidate activities query if this update might have created an activity
        // (column changes, title changes, etc. create activities server-side)
        if (
          changes.columnId !== undefined ||
          changes.title !== undefined ||
          changes.content !== undefined
        ) {
          queryClient.invalidateQueries({ queryKey: ["activities"] });
        }

        // The collection will automatically refetch the query after onUpdate completes
        // This ensures the UI updates across all components using useLiveQuery
        return result;
      } catch (error) {
        console.error("Failed to update item:", error);
        throw error;
      }
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
        console.error(errorMsg);
        throw new Error(errorMsg);
      }

      try {
        await deleteItem({
          data: {
            accountId,
            boardId,
            itemId: key,
          },
        });
        queryClient.invalidateQueries({ queryKey: ["items", boardId] });
        queryClient.invalidateQueries({ queryKey: ["comments"] }); // Comments might be affected
        queryClient.invalidateQueries({ queryKey: ["activities"] }); // Activities created on delete
      } catch (error) {
        console.error("Failed to delete item:", error);
        throw error;
      }
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

      try {
        const result = await createComment({
          data: {
            accountId,
            itemId: modified.itemId,
            data: {
              content: modified.content,
            },
          },
        });
        // Server creates activity for comment - invalidate activities
        queryClient.invalidateQueries({ queryKey: ["activities"] });
        // Force refetch instead of just invalidating
        await queryClient.refetchQueries({
          queryKey: ["comments"],
          type: "active",
        });
        return result;
      } catch (error) {
        console.error("Failed to create comment:", error);
        throw error;
      }
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
        console.error(errorMsg);
        throw new Error(errorMsg);
      }

      const updateData: any = {};
      if (changes.content !== undefined) updateData.content = changes.content;

      try {
        const result = await updateComment({
          data: {
            accountId,
            commentId: key,
            data: updateData,
          },
        });
        queryClient.invalidateQueries({ queryKey: ["comments", itemId] });
        return result;
      } catch (error) {
        console.error("Failed to update comment:", error);
        throw error;
      }
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
        console.error(errorMsg);
        throw new Error(errorMsg);
      }

      try {
        const result = await deleteComment({
          data: {
            accountId,
            commentId: key,
          },
        });
        queryClient.invalidateQueries({ queryKey: ["comments", itemId] });
        queryClient.invalidateQueries({ queryKey: ["activities"] }); // Activities created on delete
        return result;
      } catch (error) {
        console.error("Failed to delete comment:", error);
        throw error;
      }
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

      try {
        const result = await createOrGetAssignee({
          data: {
            accountId,
            boardId: modified.boardId,
            name: modified.name,
            userId: modified.userId,
          },
        });
        // Invalidate with correct query key - collection uses ["assignees"]
        queryClient.invalidateQueries({ queryKey: ["assignees"] });
        return result;
      } catch (error) {
        console.error("Failed to create assignee:", error);
        throw error;
      }
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
