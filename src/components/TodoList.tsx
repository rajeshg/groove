"use client";

import { useLiveQuery } from "@tanstack/react-db";
import { eq } from "@tanstack/db";
import { TodoItem } from "./TodoItem";
import { Card } from "~/components/ui/card";
import { todoCollection } from "~/db/collections";

interface TodoListProps {
  userId: string;
  filter?: "all" | "active" | "completed";
}

export function TodoList({ userId, filter = "all" }: TodoListProps) {
  const { data: todos } = useLiveQuery((q) =>
    q
      .from({ todo: todoCollection })
      .where(({ todo }) => eq(todo.userId, userId))
  );

  const filteredTodos =
    todos?.filter((todo: any) => {
      if (filter === "active") return !todo.completed;
      if (filter === "completed") return todo.completed;
      return true;
    }) ?? [];

  if (filteredTodos.length === 0) {
    return (
      <Card className="p-8 text-center text-gray-500">
        <p>
          {filter === "active"
            ? "No active todos"
            : filter === "completed"
              ? "No completed todos"
              : "No todos yet. Create one to get started!"}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {filteredTodos.map((todo: any) => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </div>
  );
}
