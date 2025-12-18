import { useState, useRef } from "react";
import { flushSync } from "react-dom";
import invariant from "tiny-invariant";
import { Icon } from "../../icons/icons";
import { Form, useSubmit } from "react-router";

import { INTENTS } from "../types";
import { CancelButton, SaveButton } from "./components";
import { Input } from "../../components/input";

export function NewColumn({
  boardId,
  onAdd,
  editInitially,
}: {
  boardId: number;
  onAdd: () => void;
  editInitially: boolean;
}) {
  let [editing, setEditing] = useState(editInitially);
  let inputRef = useRef<HTMLInputElement>(null);
  let submit = useSubmit();

  return editing ? (
    <Form
      method="post"
      navigate={false}
      className="p-3 flex-shrink-0 flex flex-col gap-3 overflow-hidden max-h-full w-[24rem] border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm bg-white dark:bg-slate-800"
      onSubmit={(event) => {
        event.preventDefault();
        let formData = new FormData(event.currentTarget);
        formData.set("id", crypto.randomUUID());
        submit(formData, {
          navigate: false,
          method: "post",
          flushSync: true,
        });
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
      <input type="hidden" name="intent" value={INTENTS.createColumn} />
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
    </Form>
  ) : (
    <button
      onClick={() => {
        flushSync(() => {
          setEditing(true);
        });
        onAdd();
      }}
      aria-label="Add new column"
      className="flex-shrink-0 flex items-center justify-center w-8 h-8 mt-2 ml-2 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all"
    >
      <Icon name="plus" size="md" />
    </button>
  );
}
