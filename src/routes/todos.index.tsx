import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CreateTodoForm } from "~/components/CreateTodoForm";
import { TodoList } from "~/components/TodoList";
import { TodoFilters } from "~/components/TodoFilters";
import { Card } from "~/components/ui/card";
import { z } from "zod";

const todoSearchSchema = z.object({
  userId: z.string().optional().default("demo-user"),
});

export const Route = createFileRoute("/todos/")({
  validateSearch: (search: Record<string, unknown>) =>
    todoSearchSchema.parse(search),
  component: TodosIndexComponent,
  ssr: false,
});

function TodosIndexComponent() {
  const { userId } = Route.useSearch();
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");

  return (
    <div className="w-full max-w-3xl mx-auto p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-4xl font-bold tracking-tight">My Todos</h1>
        <p className="text-muted-foreground text-sm">
          Manage your tasks with server-side persistence
        </p>
      </div>

      <Card className="p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Add New Todo</h2>
        <CreateTodoForm userId={userId} />
      </Card>

      <Card className="shadow-sm">
        <div className="p-6 pb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Your Todos</h2>
            <span className="text-sm text-muted-foreground">
              User: <span className="font-mono text-xs">{userId}</span>
            </span>
          </div>

          <TodoFilters activeFilter={filter} onFilterChange={setFilter} />
        </div>

        <div className="px-6 pb-6">
          <TodoList userId={userId} filter={filter} />
        </div>
      </Card>
    </div>
  );
}
