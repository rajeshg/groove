import { useRef, useState } from "react";
import invariant from "tiny-invariant";
import { useFetchers, useLoaderData, useSubmit } from "react-router";

import type { LoaderData } from "../../+types/board.$id";
import { INTENTS, type RenderedItem, CONTENT_TYPES } from "../types";
import { Column } from "./column";
import { NewColumn } from "./new-column";
import { EditableText } from "./components";

export function Board() {
  let { board } = useLoaderData<LoaderData>();
  let submit = useSubmit();
  let [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  let [draggedCardId, setDraggedCardId] = useState<string | null>(null);

  let itemsById = new Map(board.items.map((item) => [item.id, item]));

  let pendingItems = usePendingItems();

  // merge pending items and existing items
  for (const pendingItem of pendingItems) {
    let item = itemsById.get(pendingItem.id);
    let merged: any = item
      ? { ...item, ...pendingItem }
      : { ...pendingItem, boardId: board.id };
    itemsById.set(pendingItem.id, merged);
  }

  // merge pending and existing columns
  let optAddingColumns = usePendingColumns();
  type Column =
    | (typeof board.columns)[number]
    | (typeof optAddingColumns)[number];
  type ColumnWithItems = (Column & { items: typeof board.items }) | (Column & { items: typeof board.items; order: number });
  let columns = new Map<string, any>();
  for (let column of [...board.columns, ...optAddingColumns]) {
    columns.set(column.id, { ...column, items: [], order: (column as any).order || 0 });
  }

  // add items to their columns
  for (const item of itemsById.values()) {
    let columnId = (item as any).columnId;
    let column = columns.get(columnId);
    invariant(column, "missing column");
    column.items.push(item as any);
  }

  // scroll right when new columns are added
  let scrollContainerRef = useRef<HTMLDivElement>(null);
  function scrollRight() {
    invariant(scrollContainerRef.current, "no scroll container");
    scrollContainerRef.current.scrollLeft =
      scrollContainerRef.current.scrollWidth;
  }

  // Get sorted columns for rendering
  const columnArray = [...columns.values()].sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <div
      className="h-full min-h-0 flex flex-col overflow-x-scroll"
      ref={scrollContainerRef}
      style={{ backgroundColor: board.color }}
    >
      <h1>
        <EditableText
          value={board.name}
          fieldName="name"
          inputClassName="mx-8 my-4 text-2xl font-medium border border-slate-400 rounded-lg py-1 px-2 text-black"
          buttonClassName="mx-8 my-4 text-2xl font-medium block rounded-lg text-left border border-transparent py-1 px-2 text-slate-800"
          buttonLabel={`Edit board "${board.name}" name`}
          inputLabel="Edit board name"
          placeholder="Board name..."
        >
          <input type="hidden" name="intent" value={INTENTS.updateBoardName} />
          <input type="hidden" name="id" value={board.id} />
        </EditableText>
      </h1>

        <div
          className="flex flex-grow min-h-0 h-full items-start gap-4 px-8 pb-4"
          onDragStart={(e) => {
            // Track when card dragging starts
            if (e.target instanceof HTMLElement && e.target.closest('[data-card-id]')) {
              const cardId = e.target.closest('[data-card-id]')?.getAttribute('data-card-id');
              if (cardId) setDraggedCardId(cardId);
            }
          }}
          onDragEnd={() => {
            // Reset all drag states when any drag ends
            setDraggedCardId(null);
            setDraggedColumnId(null);
          }}
        >
         {columnArray.map((col, index) => {
           return (
             <div
               key={col.id}
               draggable
               className={`cursor-grab active:cursor-grabbing ${draggedColumnId === col.id ? "opacity-50" : ""}`}
               onDragStart={(e) => {
                 setDraggedColumnId(col.id);
                 e.dataTransfer.effectAllowed = "move";
                 e.dataTransfer.setData(CONTENT_TYPES.column, JSON.stringify({ id: col.id }));
               }}
               onDragEnd={() => {
                 setDraggedColumnId(null);
               }}
               onDragOver={(e) => {
                 if (e.dataTransfer.types.includes(CONTENT_TYPES.column)) {
                   e.preventDefault();
                   e.dataTransfer.dropEffect = "move";
                 }
               }}
               onDrop={(e) => {
                 e.preventDefault();
                 const transfer = JSON.parse(e.dataTransfer.getData(CONTENT_TYPES.column));
                 const draggedId = transfer.id;

                 if (draggedId === col.id) {
                   setDraggedColumnId(null);
                   return;
                 }

                 // Calculate new order
                 const draggedCol = columnArray.find((c) => c.id === draggedId);
                 if (!draggedCol) return;

                 const draggedOrder = draggedCol.order || 0;
                 const targetOrder = col.order || 0;

                 // Calculate the new order for the dragged column
                 const newOrder = (draggedOrder + targetOrder) / 2;

                 // Submit the move
                 submit(
                   {
                     intent: INTENTS.moveColumn,
                     id: draggedId,
                     order: String(newOrder),
                   },
                   {
                     method: "post",
                     navigate: false,
                     fetcherKey: `column:${draggedId}`,
                   }
                 );

                 setDraggedColumnId(null);
               }}
             >
               <Column
                 name={col.name}
                 columnId={col.id}
                 items={col.items}
                 color={(col as any).color || "#94a3b8"}
               />
             </div>
           );
         })}

        <NewColumn
          boardId={board.id}
          onAdd={scrollRight}
          editInitially={board.columns.length === 0}
        />

        {/* trolling you to add some extra margin to the right of the container with a whole dang div */}
        <div data-lol className="w-8 h-1 flex-shrink-0" />
      </div>
    </div>
  );
}

// These are the inflight columns that are being created, instead of managing
// state ourselves, we just ask Remix for the state
function usePendingColumns() {
  type CreateColumnFetcher = ReturnType<typeof useFetchers>[number] & {
    formData: FormData;
  };

  return useFetchers()
    .filter((fetcher): fetcher is CreateColumnFetcher => {
      return fetcher.formData?.get("intent") === INTENTS.createColumn;
    })
    .map((fetcher) => {
      let name = String(fetcher.formData.get("name"));
      let id = String(fetcher.formData.get("id"));
      return { name, id };
    });
}

// These are the inflight items that are being created or moved, instead of
// managing state ourselves, we just ask Remix for the state
function usePendingItems() {
  type PendingItem = ReturnType<typeof useFetchers>[number] & {
    formData: FormData;
  };
  return useFetchers()
    .filter((fetcher): fetcher is PendingItem => {
      if (!fetcher.formData) return false;
      let intent = fetcher.formData.get("intent");
      return intent === INTENTS.createItem || intent === INTENTS.moveItem;
    })
    .map((fetcher) => {
      let columnId = String(fetcher.formData.get("columnId"));
      let title = String(fetcher.formData.get("title"));
      let id = String(fetcher.formData.get("id"));
      let order = Number(fetcher.formData.get("order"));
      let item: RenderedItem = { title, id, order, columnId, content: null };
      return item;
    });
}
