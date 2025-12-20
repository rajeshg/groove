import { useRef } from "react";
import invariant from "tiny-invariant";
import { Form, useSubmit } from "react-router";

import { INTENTS, ItemMutationFields } from "../types";
import { SaveButton, CancelButton } from "./components";
import { Textarea } from "../../components/textarea";

export function NewCard({
  columnId,
  nextOrder,
  onComplete,
  onAddCard,
}: {
  columnId: string;
  nextOrder: number;
  onComplete: () => void;
  onAddCard: () => void;
}) {
  let textAreaRef = useRef<HTMLTextAreaElement>(null);
  let buttonRef = useRef<HTMLButtonElement>(null);
  let submit = useSubmit();

   return (
     <Form
       method="post"
       className="flex flex-col gap-2.5 p-2 pt-1"
      onSubmit={(event) => {
        event.preventDefault();
        let formData = new FormData(event.currentTarget);
        // We don't send an ID for creation, the server will generate nanoid(12)
        submit(formData, {
          navigate: false,
          method: "post",
          flushSync: true,
        });
        onAddCard();
        invariant(textAreaRef.current, "missing textarea ref");
        textAreaRef.current.value = "";
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          onComplete();
        }
      }}
    >
      <input type="hidden" name="intent" value={INTENTS.createItem} />
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
        ref={textAreaRef}
        name={ItemMutationFields.title.name}
        placeholder="Enter a title for this card"
        className="outline-none shadow-sm border border-slate-300 dark:border-slate-600 text-sm rounded w-full py-2 px-3 resize-none placeholder:text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 min-h-16 max-h-64 overflow-y-auto bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-50"
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            invariant(buttonRef.current, "expected button ref");
            buttonRef.current.click();
          }
          if (event.key === "Escape") {
            onComplete();
          }
        }}
        onChange={(event) => {
          let el = event.currentTarget;
          el.style.height = "auto";
          el.style.height = Math.min(el.scrollHeight, 256) + "px";
        }}
      />
      <div className="flex justify-between">
        <SaveButton ref={buttonRef}>Save Card</SaveButton>
        <CancelButton onClick={onComplete}>Cancel</CancelButton>
      </div>
    </Form>
  );
}
