import { useRef, useEffect } from "react";
import { invariant } from "@epic-web/invariant";
import { useFetcher, useParams } from "react-router";

import { ItemMutationFields } from "../types";
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
  let fetcher = useFetcher();
  let params = useParams();
  
  // Track previous state to detect when submission completes
  let prevStateRef = useRef(fetcher.state);
  
  useEffect(() => {
    // When fetcher completes (goes from submitting to idle), call onAddCard and clear input
    if (prevStateRef.current === "submitting" && fetcher.state === "idle") {
      onAddCard();
      if (textAreaRef.current) {
        textAreaRef.current.value = "";
      }
    }
    prevStateRef.current = fetcher.state;
  }, [fetcher.state, onAddCard]);

  return (
    <fetcher.Form
      method="post"
      action="/resources/new-card"
      className="flex flex-col gap-2.5 p-2 pt-1"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          onComplete();
        }
      }}
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
    </fetcher.Form>
  );
}
