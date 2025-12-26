import { createServerFn } from "@tanstack/react-start";
import { getDb } from "~/server/db/client";
import { todos } from "~/server/db/schema";
import { CreateTodoSchema, UpdateTodoSchema } from "~/server/validation";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { generateId } from "~/lib/id";

// ============================================================================
// Server Functions (Isomorphic - callable from client or server)
// ============================================================================

/**
 * Get all todos for a specific user
 */
export const getTodos = createServerFn({ method: "GET" })
  .inputValidator(z.object({ userId: z.string() }))
  .handler(async ({ data: { userId } }) => {
    const db = getDb();
    const userTodos = await db
      .select()
      .from(todos)
      .where(eq(todos.userId, userId))
      .orderBy((t) => t.createdAt);

    return userTodos;
  });

/**
 * Get a single todo by ID (with ownership check)
 */
export const getTodoById = createServerFn({ method: "GET" })
  .inputValidator(z.object({ userId: z.string(), todoId: z.string() }))
  .handler(async ({ data: { userId, todoId } }) => {
    const db = getDb();
    const todo = await db
      .select()
      .from(todos)
      .where(and(eq(todos.id, todoId), eq(todos.userId, userId)))
      .limit(1);

    return todo[0] || null;
  });

/**
 * Create a new todo
 */
export const createTodo = createServerFn({ method: "POST" })
  .inputValidator(z.object({ userId: z.string(), input: CreateTodoSchema }))
  .handler(async ({ data: { userId, input } }) => {
    const db = getDb();
    const id = generateId();
    const now = new Date().toISOString();

    const newTodo = {
      id,
      userId,
      text: input.text,
      description: input.description || null,
      dueDate: input.dueDate || null,
      completed: false,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(todos).values(newTodo);

    return newTodo;
  });

/**
 * Update an existing todo (with ownership check)
 */
export const updateTodo = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      userId: z.string(),
      todoId: z.string(),
      input: UpdateTodoSchema,
    })
  )
  .handler(async ({ data: { userId, todoId, input } }) => {
    const db = getDb();

    // Verify ownership
    const existing = await getTodoById({ data: { userId, todoId } });
    if (!existing) {
      throw new Error("Todo not found or unauthorized");
    }

    const now = new Date().toISOString();
    const updates: Record<string, any> = {
      updatedAt: now,
    };

    if (input.text !== undefined) {
      updates.text = input.text;
    }
    if (input.description !== undefined) {
      updates.description = input.description;
    }
    if (input.dueDate !== undefined) {
      updates.dueDate = input.dueDate;
    }
    if (input.completed !== undefined) {
      updates.completed = input.completed;
    }

    await db
      .update(todos)
      .set(updates)
      .where(and(eq(todos.id, todoId), eq(todos.userId, userId)));

    return getTodoById({ data: { userId, todoId } });
  });

/**
 * Delete a todo (with ownership check)
 */
export const deleteTodo = createServerFn({ method: "POST" })
  .inputValidator(z.object({ userId: z.string(), todoId: z.string() }))
  .handler(async ({ data: { userId, todoId } }) => {
    const db = getDb();

    // Verify ownership
    const existing = await getTodoById({ data: { userId, todoId } });
    if (!existing) {
      throw new Error("Todo not found or unauthorized");
    }

    await db
      .delete(todos)
      .where(and(eq(todos.id, todoId), eq(todos.userId, userId)));

    return { success: true };
  });
