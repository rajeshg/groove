import invariant from "tiny-invariant";
import { useFetcher, useSubmit } from "react-router";
import { useState, useRef } from "react";

import { Icon } from "../../icons/icons";

import type { ItemMutation } from "../types";
import { INTENTS, CONTENT_TYPES } from "../types";

interface CardProps {
  title: string;
  content: string | null;
  id: string;
  columnId: string;
  columnColor?: string;
  order: number;
  nextOrder: number;
  previousOrder: number;
}

export function Card({
  title,
  content,
  id,
  columnId,
  columnColor = "#94a3b8",
  order,
  nextOrder,
  previousOrder,
}: CardProps) {
  let submit = useSubmit();
  let deleteFetcher = useFetcher();
  let editFetcher = useFetcher();

  let [acceptDrop, setAcceptDrop] = useState<"none" | "top" | "bottom">("none");
  let [isEditingContent, setIsEditingContent] = useState(false);
  let contentInputRef = useRef<HTMLTextAreaElement>(null);

  return deleteFetcher.state !== "idle" ? null : (
    <li
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes(CONTENT_TYPES.card)) {
          event.preventDefault();
          event.stopPropagation();
          let rect = event.currentTarget.getBoundingClientRect();
          let midpoint = (rect.top + rect.bottom) / 2;
          setAcceptDrop(event.clientY <= midpoint ? "top" : "bottom");
        }
      }}
      onDragLeave={() => {
        setAcceptDrop("none");
      }}
      onDrop={(event) => {
        event.stopPropagation();

        let transfer = JSON.parse(
          event.dataTransfer.getData(CONTENT_TYPES.card)
        );
        invariant(transfer.id, "missing cardId");
        invariant(transfer.title, "missing title");

        let droppedOrder = acceptDrop === "top" ? previousOrder : nextOrder;
        let moveOrder = (droppedOrder + order) / 2;

         let mutation: ItemMutation = {
           order: moveOrder,
           columnId: columnId,
           id: transfer.id,
           title: transfer.title,
           content: null,
         };

        submit(
          { ...mutation, intent: INTENTS.moveItem },
          {
            method: "post",
            navigate: false,
            fetcherKey: `card:${transfer.id}`,
          }
        );

        setAcceptDrop("none");
      }}
       className={
         "border-t-4 border-b-2 -mb-[2px] last:mb-0 cursor-grab active:cursor-grabbing px-2 py-1 " +
         (acceptDrop === "top"
           ? "border-b-red-500 border-b-transparent"
           : acceptDrop === "bottom"
             ? "border-b-red-500 border-b-transparent"
             : "border-b-transparent")
       }
       style={{ borderTopColor: columnColor }}
     >
       <div
         draggable
         className="bg-white shadow shadow-slate-300 border border-slate-200 text-sm rounded-lg w-full py-2 px-3 relative group hover:shadow-md transition-shadow"
         onDragStart={(event) => {
           event.dataTransfer.effectAllowed = "move";
           event.dataTransfer.setData(
             CONTENT_TYPES.card,
             JSON.stringify({ id, title })
           );
         }}
       >
         <h3 className="font-semibold text-slate-900 text-xs mb-1">{title}</h3>
         
         {isEditingContent ? (
           <editFetcher.Form
             method="post"
             onSubmit={(e) => {
               e.preventDefault();
               const contentValue = contentInputRef.current?.value || "";
                editFetcher.submit(
                  {
                    intent: INTENTS.updateItem,
                    id,
                    columnId,
                    title,
                    order: String(order),
                    content: contentValue,
                  },
                  { method: "post" }
                );
               setIsEditingContent(false);
             }}
             className="space-y-1"
           >
             <textarea
               ref={contentInputRef}
               defaultValue={content || ""}
               placeholder="Add description..."
               className="block w-full rounded border border-blue-400 px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
               rows={2}
               autoFocus
               onKeyDown={(e) => {
                 if (e.key === "Escape") {
                   setIsEditingContent(false);
                 }
               }}
             />
             <div className="flex gap-1">
               <button
                 type="submit"
                 className="flex-1 rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700"
               >
                 Save
               </button>
               <button
                 type="button"
                 onClick={() => setIsEditingContent(false)}
                 className="flex-1 rounded bg-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-300"
               >
                 Cancel
               </button>
             </div>
           </editFetcher.Form>
         ) : (
           <div
             onClick={() => setIsEditingContent(true)}
             className="min-h-10 text-xs text-slate-600 leading-relaxed cursor-text hover:bg-slate-50 rounded px-1 py-1 transition-colors whitespace-pre-wrap break-words"
           >
             {content ? (
               content
             ) : (
               <span className="italic text-slate-400">Click to add description...</span>
             )}
           </div>
         )}
         
         <deleteFetcher.Form method="post" className="absolute top-2 right-2">
           <input type="hidden" name="intent" value={INTENTS.deleteCard} />
           <input type="hidden" name="itemId" value={id} />
           <button
             aria-label="Delete card"
             className="text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-600 transition-all"
             type="submit"
             onClick={(event) => {
               event.stopPropagation();
             }}
           >
             <Icon name="trash" />
           </button>
         </deleteFetcher.Form>
       </div>
    </li>
  );
}
