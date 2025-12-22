import { useRef } from "react";
import { invariant } from "@epic-web/invariant";
import { useFetcher, useParams } from "react-router";
import { useForm, getFormProps } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod/v4";
import { z } from "zod";
import { optionalString } from "../validation";

import { ItemMutationFields } from "../types";
import { CancelButton } from "./components";
import { StatusButton } from "../../components/status-button";
import { Textarea } from "../../components/textarea";

// Client-side validation schema (matches server schema)
const NewCardSchema = z.object({
  boardId: z.string().min(1, "Board ID is required"),
  columnId: z.string().min(1, "Column ID is required"),
  title: z
    .string()
    .min(1, "Card title is required")
    .max(255, "Card title is too long"),
  order: z.coerce
    .number("Order must be a number")
    .finite("Order must be a valid number")
    .min(0, "Order cannot be negative"),
  content: z.string().nullable().optional().default(null),
  redirectTo: optionalString(),
});

export function NewCard({
  columnId,
  nextOrder,
  onComplete,
}: {
  columnId: string;
  nextOrder: number;
  onComplete: () => void;
}) {
  let buttonRef = useRef<HTMLButtonElement>(null);
  let fetcher = useFetcher();
  let params = useParams();

  // Use Conform for form state management and auto-reset
  let [form, fields] = useForm({
    lastResult: fetcher.data?.result,
    onValidate({ formData }) {
      return parseWithZod(formData, {
        schema: NewCardSchema,
        disableAutoCoercion: true,
      });
    },
    shouldRevalidate: "onBlur",
  });

  // Track if we're currently submitting or loading
  let isSubmitting = fetcher.state !== "idle";

  return (
    <fetcher.Form
      method="post"
      action="/resources/new-card"
      {...getFormProps(form)}
      // Use key to reset form when submission completes successfully
      key={fetcher.data?.result ? Date.now() : "new-card-form"}
      className="flex flex-col gap-3 p-4 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-blue-200 dark:border-blue-800 m-2 shadow-lg animate-in fade-in slide-in-from-top-2 duration-300"
    >
      <input type="hidden" name="boardId" value={params.id} />
      <input
        type="hidden"
        name={ItemMutationFields.columnId.name}
        value={columnId}
      />
      <input
        type="hidden"
        name={ItemMutationFields.order.name}
        value={nextOrder}
      />

      <Textarea
        autoFocus
        required
        key={fields.title.key}
        name={fields.title.name}
        defaultValue={fields.title.initialValue}
        placeholder="Enter a title for this card"
        disabled={isSubmitting}
        onChange={(e) => {
          // Auto-resize textarea
          let el = e.currentTarget;
          el.style.height = "auto";
          el.style.height = Math.min(el.scrollHeight, 256) + "px";
        }}
        className="outline-none border-none text-base font-bold rounded-xl w-full py-2 px-0 resize-none placeholder:text-base placeholder:text-slate-400 dark:placeholder:text-slate-500 min-h-16 max-h-64 overflow-y-auto bg-transparent text-slate-900 dark:text-slate-50 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-0"
        onKeyDown={(event) => {
          if (event.key === "Enter" && !isSubmitting) {
            event.preventDefault();
            invariant(buttonRef.current, "expected button ref");
            buttonRef.current.click();
          }
          if (event.key === "Escape" && !isSubmitting) {
            onComplete();
          }
        }}
      />
      <div className="flex justify-between items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
        <StatusButton
          ref={buttonRef}
          status={isSubmitting ? "pending" : "idle"}
        >
          Create Card
        </StatusButton>
        <CancelButton onClick={onComplete} disabled={isSubmitting}>
          Cancel
        </CancelButton>
      </div>
    </fetcher.Form>
  );
}
