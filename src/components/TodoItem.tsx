"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { Checkbox } from "~/components/ui/checkbox";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { todoCollection } from "~/db/collections";
import { toast } from "sonner";
import type { Todo } from "~/server/db/schema";

interface TodoItemProps {
  todo: Todo;
}

export function TodoItem({ todo }: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false);

  const handleToggle = () => {
    todoCollection.update(todo.id, (draft: any) => {
      draft.completed = !todo.completed;
      draft.updatedAt = new Date().toISOString();
    });
  };

  const handleDelete = () => {
    todoCollection.delete(todo.id);
    toast.success("Todo deleted!");
  };

  const [now] = useState(() => new Date());
  const isOverdue =
    todo.dueDate && !todo.completed && new Date(todo.dueDate) < now;
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return (
      date.toLocaleDateString("en-US") +
      " " +
      date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    );
  };

  const formatToDateTimeLocal = (isoDate: string | null) => {
    if (!isoDate) return "";
    const date = new Date(isoDate);
    const offset = date.getTimezoneOffset() * 60000;
    const localISOTime = new Date(date.getTime() - offset)
      .toISOString()
      .slice(0, 16);
    return localISOTime;
  };

  const form = useForm({
    defaultValues: {
      text: todo.text,
      description: todo.description || "",
      dueDate: formatToDateTimeLocal(todo.dueDate),
    },
    onSubmit: async ({ value }) => {
      const convertToISO = (dateStr: string | null) => {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return null;
        return date.toISOString();
      };

      todoCollection.update(todo.id, (draft: any) => {
        draft.text = value.text.trim();
        draft.description = value.description || null;
        draft.dueDate = convertToISO(value.dueDate);
        draft.updatedAt = new Date().toISOString();
      });

      setIsEditing(false);
      toast.success("Todo updated!");
    },
  });

  return (
    <Card className="p-3 hover:shadow-md transition-shadow">
      {isEditing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="space-y-2"
        >
          <form.Field
            name="text"
            children={(field) => (
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Todo text"
                className="w-full"
              />
            )}
          />
          <form.Field
            name="description"
            children={(field) => (
              <textarea
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Description (optional)"
                rows={2}
                className="w-full px-3 py-2 text-sm border rounded-md border-input bg-transparent placeholder:text-muted-foreground shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              />
            )}
          />
          <form.Field
            name="dueDate"
            children={(field) => (
              <Input
                type="datetime-local"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className="w-full"
              />
            )}
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm">
              Save
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-row items-center gap-3">
          <Checkbox
            checked={todo.completed ?? false}
            onCheckedChange={handleToggle}
            className="h-5 w-5 flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p
              className={`text-sm truncate ${
                todo.completed
                  ? "line-through text-gray-400 dark:text-gray-500"
                  : "text-gray-900 dark:text-gray-100 font-medium"
              }`}
            >
              {todo.text}
            </p>
            {todo.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                {todo.description}
              </p>
            )}
            {todo.dueDate && (
              <p
                className={`text-xs mt-1 ${
                  isOverdue
                    ? "text-red-600 dark:text-red-400 font-medium"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {isOverdue ? "Overdue: " : "Due: "}
                {formatDate(todo.dueDate)}
              </p>
            )}
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-950"
            >
              ✎
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950"
            >
              ×
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
