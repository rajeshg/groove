import { useState, useRef } from "react";
import { flushSync } from "react-dom";
import { invariant } from "@epic-web/invariant";
import { Icon } from "../../icons/icons";
import { useFetcher } from "react-router";

import { CancelButton, SaveButton } from "./components";
import { Input } from "../../components/input";

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
  let fetcher = useFetcher();

  return editing ? (
    <fetcher.Form
      method="post"
      action="/resources/new-column"
      className={
        isMobile
          ? "p-4 flex flex-col gap-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 shadow-inner"
          : "p-4 flex-shrink-0 flex flex-col gap-4 overflow-hidden max-h-full w-[24rem] border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-sm shadow-sm"
      }
      onSubmit={(event) => {
        event.preventDefault();
        let formData = new FormData(event.currentTarget);
        // Generate temporary client ID for optimistic updates (server will generate nanoid(12))
        formData.set("id", `temp-${Math.random().toString(36).slice(2, 9)}`);
        fetcher.submit(formData);
        onAdd();
        invariant(inputRef.current, "missing input ref");
        inputRef.current.value = "";
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setEditing(false);
        }
      }}
    >
      <input type="hidden" name="boardId" value={boardId} />
      <Input
        autoFocus
        required
        ref={inputRef}
        type="text"
        name="name"
        placeholder="Column name..."
        className="border border-slate-300 dark:border-slate-600 w-full rounded px-2 py-1 font-bold text-slate-900 dark:text-slate-50 dark:bg-slate-700 text-sm"
      />
      <div className="flex justify-between gap-2">
        <SaveButton>Save Column</SaveButton>
        <CancelButton onClick={() => setEditing(false)}>Cancel</CancelButton>
      </div>
    </fetcher.Form>
  ) : (
    <button
      onClick={() => {
        flushSync(() => {
          setEditing(true);
        });
        onAdd();
      }}
      aria-label="Add new column"
      className={
        isMobile
          ? "w-full p-8 flex items-center justify-center gap-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-white dark:hover:bg-slate-800 transition-all text-slate-500 dark:text-slate-400 font-bold group shadow-sm"
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
