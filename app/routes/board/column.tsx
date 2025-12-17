import { useState, useRef } from "react";
import { useSubmit } from "react-router";
import invariant from "tiny-invariant";

import { Icon } from "../../icons/icons";
import { ColumnColorPicker } from "./column-color-picker";

import {
  type ItemMutation,
  INTENTS,
  CONTENT_TYPES,
  type RenderedItem,
} from "../types";
import { NewCard } from "./new-card";
import { flushSync } from "react-dom";
import { Card } from "./card";
import { EditableText } from "./components";

interface ColumnProps {
  name: string;
  columnId: string;
  items: RenderedItem[];
  color?: string;
}

export function Column({ name, columnId, items, color = "#94a3b8" }: ColumnProps) {
  let submit = useSubmit();

  let [acceptDrop, setAcceptDrop] = useState(false);
  let [edit, setEdit] = useState(false);
  let listRef = useRef<HTMLUListElement>(null);

  function scrollList() {
    invariant(listRef.current);
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }

  return (
    <div
      className={
         "flex-shrink-0 flex flex-col overflow-hidden max-h-full w-80 border border-slate-300 rounded-xl transition-all duration-100 " +
         (acceptDrop ? `border-l-4 border-l-blue-400 shadow-md` : `shadow-sm`)
      }
       onDragOver={(event) => {
         // Only accept card drops, not column drops
         if (event.dataTransfer.types.includes(CONTENT_TYPES.card)) {
           if (items.length === 0) {
             event.preventDefault();
             setAcceptDrop(true);
           }
         }
         // Ignore column drops on the empty column drop zone
       }}
       onDragLeave={() => {
         setAcceptDrop(false);
       }}
       onDrop={(event) => {
         // Only handle card drops
         if (!event.dataTransfer.types.includes(CONTENT_TYPES.card)) {
           return;
         }

         let transfer = JSON.parse(
           event.dataTransfer.getData(CONTENT_TYPES.card)
         );
         invariant(transfer.id, "missing transfer.id");
         invariant(transfer.title, "missing transfer.title");

          let mutation: ItemMutation = {
            order: 1,
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
            // use the same fetcher instance for any mutations on this card so
            // that interruptions cancel the earlier request and revalidation
            fetcherKey: `card:${transfer.id}`,
          }
        );

        setAcceptDrop(false);
      }}
    >
      <div className="p-2 border-b-2 bg-white" style={{ borderColor: color }}>
        <div className="flex items-center justify-between gap-2">
          <EditableText
            fieldName="name"
            value={name}
            inputLabel="Edit column name"
            buttonLabel={`Edit column "${name}" name`}
            inputClassName="border border-slate-400 flex-1 rounded-lg py-1 px-2 font-medium text-black"
            buttonClassName="block rounded-lg text-left flex-1 border border-transparent py-1 px-2 font-medium text-slate-600"
            placeholder="Column name..."
          >
            <input type="hidden" name="intent" value={INTENTS.updateColumn} />
            <input type="hidden" name="columnId" value={columnId} />
          </EditableText>
          <ColumnColorPicker
            columnId={columnId}
            columnName={name}
            currentColor={color}
          />
        </div>
      </div>

      <ul ref={listRef} className="flex-grow overflow-auto min-h-[2px]">
         {items
           .sort((a, b) => a.order - b.order)
           .map((item, index, items) => (
             <Card
               key={item.id}
               title={item.title}
               content={item.content}
               id={item.id}
               order={item.order}
               columnId={columnId}
               columnColor={color}
               previousOrder={items[index - 1] ? items[index - 1].order : 0}
               nextOrder={
                 items[index + 1] ? items[index + 1].order : item.order + 1
               }
             />
           ))}
       </ul>

       {items.length === 0 && !edit && (
         <div className={`py-8 text-center text-slate-300 transition-all duration-200 ${
           acceptDrop ? 'bg-blue-50' : ''
         }`}>
           <div className={`text-xs font-medium transition-opacity duration-200 ${
             acceptDrop ? 'opacity-100' : 'opacity-40'
           }`}>
             {acceptDrop ? 'Drop here' : ''}
           </div>
         </div>
       )}

       {edit ? (
        <NewCard
          columnId={columnId}
          nextOrder={items.length === 0 ? 1 : items[items.length - 1].order + 1}
          onAddCard={() => scrollList()}
          onComplete={() => setEdit(false)}
        />
      ) : (
        <div className="p-2 pt-1">
          <button
            type="button"
            onClick={() => {
              flushSync(() => {
                setEdit(true);
              });
              scrollList();
            }}
            className="flex items-center gap-2 rounded-lg text-left w-full p-2 font-medium text-slate-500 hover:bg-slate-200 focus:bg-slate-200"
          >
            <Icon name="plus" /> Add a card
          </button>
        </div>
      )}
    </div>
  );
}
