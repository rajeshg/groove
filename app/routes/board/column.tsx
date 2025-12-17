import { useState, useRef } from "react";
import { useSubmit } from "react-router";
import invariant from "tiny-invariant";

import { Icon } from "../../icons/icons";
import { ColumnMenu } from "./column-menu";

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
  isDefault?: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
}

export function Column({ name, columnId, items, color = "#94a3b8", isDefault = false, isExpanded = true, onToggle }: ColumnProps) {
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
         "flex-shrink-0 flex flex-col overflow-hidden max-h-full w-72 sm:w-80 rounded-lg transition-all duration-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 " +
         (acceptDrop ? `ring-2 ring-offset-2 dark:ring-offset-slate-900 ring-blue-400` : ``)
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
      <div className="px-3 py-3 border-b-4 bg-white dark:bg-slate-800" style={{ borderColor: color }}>
        <div className="flex items-center justify-between gap-2">
          {isExpanded ? (
            <EditableText
              fieldName="name"
              value={name}
              inputLabel="Edit column name"
              buttonLabel={`Edit column "${name}" name`}
              inputClassName="border border-slate-300 dark:border-slate-500 flex-1 rounded px-2 py-1 font-bold text-slate-900 dark:text-slate-50 dark:bg-slate-700 text-sm"
              buttonClassName="block rounded text-left flex-1 border border-transparent py-1 px-2 font-bold text-slate-900 dark:text-slate-50 text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
              placeholder="Column name..."
              hiddenFields={{
                intent: INTENTS.updateColumn,
                columnId: columnId,
              }}
            >
              <></>
            </EditableText>
          ) : (
            <button
              onClick={onToggle}
              className="flex items-center gap-2 flex-1 text-left p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title={`Expand column: ${name} (${items.length} cards)`}
            >
              <Icon name="chevron-right" />
              <span className="font-bold text-slate-900 dark:text-slate-50 text-sm truncate">{name}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 ml-auto">({items.length})</span>
            </button>
          )}
          {isExpanded && (
            <>
              {/* Collapse button */}
              <button
                onClick={onToggle}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                title="Collapse column"
                aria-label="Collapse column"
              >
                <Icon name="shrink" size="md" />
              </button>

              <ColumnMenu
                columnId={columnId}
                columnName={name}
                currentColor={color}
                isDefault={isDefault}
                isExpanded={true}
              />
            </>
          )}
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
         <div className={`py-8 text-center transition-all duration-200 bg-slate-50 dark:bg-slate-700/50`}>
           <div className={`text-xs font-medium text-slate-400 dark:text-slate-500`}>
             No cards
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
        <div className="p-3">
          <button
            type="button"
            onClick={() => {
              flushSync(() => {
                setEdit(true);
              });
              scrollList();
            }}
            className="flex items-center gap-2 rounded text-left w-full p-2 font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 focus:bg-slate-100 dark:focus:bg-slate-700 transition-colors text-sm"
          >
            <Icon name="plus" /> Add a card
          </button>
        </div>
      )}
    </div>
  );
}
