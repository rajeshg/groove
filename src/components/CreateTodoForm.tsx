"use client";

import { useForm } from "@tanstack/react-form";
import { useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Field, FieldError } from "~/components/ui/field";
import { generateId } from "~/lib/id";
import { todoCollection } from "~/db/collections";
import { toast } from "sonner";
import invariant from "tiny-invariant";

function getUserId(userId?: string): string {
  if (userId) return userId;
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("userId") || "demo-user";
}

interface CreateTodoFormProps {
  userId: string;
}

export function CreateTodoForm({ userId }: CreateTodoFormProps) {
  invariant(userId, "userId is required");

  const textInputRef = useRef<HTMLInputElement>(null);
  const [isPending, setIsPending] = useState(false);

  const form = useForm({
    defaultValues: {
      text: "",
      description: "",
      dueDate: "",
    },
    onSubmit: async ({ value }) => {
      const convertToISO = (dateStr: string | null) => {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return null;
        return date.toISOString();
      };

      setIsPending(true);

      try {
        todoCollection.insert({
          id: generateId(),
          text: value.text.trim(),
          description: value.description || null,
          dueDate: convertToISO(value.dueDate),
          completed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          userId: getUserId(userId),
        });

        toast.success("Todo created!");
        form.reset();
      } catch (error) {
        console.error("Mutation failed:", error);
        toast.error("Failed to create todo");
      } finally {
        setTimeout(() => {
          setIsPending(false);
        }, 500);

        // Focus the text input for fast entry
        setTimeout(() => {
          textInputRef.current?.focus();
        }, 0);
      }
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="space-y-3"
    >
      <form.Field
        name="text"
        validators={{
          onChange: ({ value }) => {
            if (!value || value.trim().length === 0) {
              return "Todo text is required";
            }
            if (value.length > 500) {
              return "Todo text must be 500 characters or less";
            }
            return undefined;
          },
          onSubmit: ({ value }) => {
            if (!value || value.trim().length === 0) {
              return "Todo text is required";
            }
            if (value.length > 500) {
              return "Todo text must be 500 characters or less";
            }
            return undefined;
          },
        }}
        children={(field) => {
          const hasError = field.state.meta.errors.length > 0;
          const isInvalid = field.state.meta.isTouched && hasError;
          // Convert string errors to objects with message property
          const errorObjects = field.state.meta.errors.map((err) =>
            typeof err === "string" ? { message: err } : err
          );
          return (
            <Field data-invalid={isInvalid}>
              <Input
                ref={textInputRef}
                id="todo-text"
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                aria-invalid={isInvalid}
                placeholder="What needs to be done?"
                disabled={isPending}
                autoFocus
              />
              {isInvalid && <FieldError errors={errorObjects} />}
            </Field>
          );
        }}
      />

      <form.Field
        name="description"
        children={(field) => {
          const isInvalid =
            field.state.meta.isTouched && !field.state.meta.isValid;
          return (
            <Field data-invalid={isInvalid}>
              <textarea
                id="todo-description"
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                aria-invalid={isInvalid}
                placeholder="Add optional details... (max 2000 characters)"
                disabled={isPending}
                rows={3}
                className="w-full px-3 py-2 text-sm border rounded-md border-input bg-transparent placeholder:text-muted-foreground shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
              />
              {isInvalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          );
        }}
      />

      <form.Field
        name="dueDate"
        children={(field) => (
          <Field>
            <Input
              id="todo-dueDate"
              name={field.name}
              type="datetime-local"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="Due date (optional)"
              disabled={isPending}
              className="w-full"
            />
          </Field>
        )}
      />

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Adding..." : "Add Todo"}
      </Button>
    </form>
  );
}
