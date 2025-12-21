import { useState, useRef, useEffect } from "react";
import { flushSync } from "react-dom";
import { invariant } from "@epic-web/invariant";
import { Icon } from "../../icons/icons";
import { useFetcher } from "react-router";
import { useForm, getFormProps } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod/v4";

import { CancelButton } from "./components";
import { StatusButton } from "../../components/status-button";
import { Input } from "../../components/input";
import { createColumnSchema } from "../validation";

export function NewColumn({
  boardId,
  onAdd,
  editInitially,
  isMobile = false,
}: {
  boardId: string;
  onAdd: () => void;
  editInitially: boolean;
  isMobile?: boolean;
}) {
  let [editing, setEditing] = useState(editInitially);
  let inputRef = useRef<HTMLInputElement>(null);
  let buttonRef = useRef<HTMLButtonElement>(null);
  let fetcher = useFetcher();

  // Use Conform for form state management
  let [form, fields] = useForm({
    lastResult: fetcher.data?.result,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: createColumnSchema });
    },
    shouldRevalidate: "onBlur",
  });

  // Track if we're currently submitting or loading
  let isSubmitting = fetcher.state !== "idle";

  // Close form after successful submission
  useEffect(() => {
    if (
      fetcher.state === "idle" &&
      fetcher.data?.result?.status === "success" &&
      editing
    ) {
      setEditing(false);
    }
  }, [fetcher.state, fetcher.data, editing]);

  return editing ? (
    <fetcher.Form
      method="post"
      action="/resources/new-column"
      {...getFormProps(form)}
      className={
        isMobile
          ? "p-4 flex flex-col gap-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 shadow-inner"
          : "p-4 flex-shrink-0 flex flex-col gap-4 overflow-hidden max-h-full w-[24rem] border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-sm shadow-sm"
      }
      onBlur={(event) => {
        // Don't close form on mobile - it interferes with button clicks
        if (isMobile) return;
        // Don't close form if we're submitting
        if (isSubmitting) return;
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setEditing(false);
        }
      }}
    >
      <input type="hidden" name="boardId" value={boardId} />
      <Input
        autoFocus={!isMobile}
        required
        ref={inputRef}
        key={fields.name.key}
        name={fields.name.name}
        defaultValue={fields.name.initialValue}
        placeholder="Column name..."
        disabled={isSubmitting}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !isSubmitting) {
            event.preventDefault();
            invariant(buttonRef.current, "expected button ref");
            buttonRef.current.click();
          }
          if (event.key === "Escape" && !isSubmitting) {
            setEditing(false);
          }
        }}
        className="border border-slate-300 dark:border-slate-600 w-full rounded px-2 py-1 font-bold text-slate-900 dark:text-slate-50 dark:bg-slate-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      />
      <div className="flex justify-between gap-2">
        <StatusButton 
          ref={buttonRef}
          status={isSubmitting ? "pending" : "idle"}
        >
          Save Column
        </StatusButton>
        <CancelButton 
          onClick={() => setEditing(false)} 
          disabled={isSubmitting}
        >
          Cancel
        </CancelButton>
      </div>
    </fetcher.Form>
  ) : (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        flushSync(() => {
          setEditing(true);
        });
        onAdd();
      }}
      aria-label="Add new column"
      className={
        isMobile
          ? "w-full p-8 flex items-center justify-center gap-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-white dark:hover:bg-slate-800 transition-all text-slate-500 dark:text-slate-400 font-bold group shadow-sm touch-manipulation"
          : "flex-shrink-0 flex flex-col items-center justify-center w-[24rem] self-stretch bg-slate-100/30 dark:bg-slate-900/30 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-slate-100/50 dark:hover:bg-slate-900/50 transition-all group m-0"
      }
    >
      <div className="flex flex-col items-center gap-4 transition-transform duration-300 group-hover:scale-110">
        <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all">
          <Icon name="plus" size="md" />
        </div>
        <span className="uppercase tracking-[0.3em] text-[10px] font-black text-slate-400 dark:text-slate-500 group-hover:text-blue-600 transition-colors">Add Column</span>
      </div>
    </button>

  );
}
