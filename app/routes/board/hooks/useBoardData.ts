import { useMemo } from "react";
import { useFetchers } from "react-router";
import invariant from "tiny-invariant";
import type { Item } from "@prisma/client";
import {
  INTENTS,
  type RenderedItem,
  type RenderedAssignee,
} from "../../types";
import type { getBoardData } from "../../queries";
import type { BoardColumn } from "../types";

type BoardData = NonNullable<Awaited<ReturnType<typeof getBoardData>>>;

interface UseBoardDataResult {
  columnArray: BoardColumn[];
  itemsById: Map<string, Item>;
}

/**
 * Manages board data including pending items/columns and search filtering
 */
export function useBoardData(
  board: BoardData,
  searchTerm: string
): UseBoardDataResult {
  const pendingItems = usePendingItems();
  const pendingColumns = usePendingColumns();

  const { itemsById, columns } = useMemo(() => {
    // Create items map
    const itemsMap = new Map(board.items.map((item: Item) => [item.id, item]));

    // Merge pending items with existing items
    for (const pendingItem of pendingItems) {
      const item = itemsMap.get(pendingItem.id);
      const merged = item
        ? ({ ...item, ...pendingItem } as unknown as Item)
        : ({
            ...pendingItem,
            boardId: board.id,
            _count: { comments: 0 },
          } as unknown as Item);
      itemsMap.set(pendingItem.id, merged);
    }

    // Merge pending and existing columns
    const columnsMap = new Map<string, BoardColumn>();
    
    // Add existing columns from board
    for (const column of board.columns) {
      columnsMap.set(column.id, {
        ...column,
        items: [],
      });
    }
    
    // Add pending columns (optimistic UI)
    for (const pendingColumn of pendingColumns) {
      if (!columnsMap.has(pendingColumn.id)) {
        columnsMap.set(pendingColumn.id, {
          id: pendingColumn.id,
          name: pendingColumn.name,
          color: pendingColumn.color,
          order: pendingColumn.order,
          isDefault: pendingColumn.isDefault,
          isExpanded: true,
          shortcut: "c",
          boardId: board.id,
          createdAt: new Date(),
          updatedAt: new Date(),
          items: [],
        });
      }
    }

    // Add items to their columns
    for (const item of itemsMap.values()) {
      const columnId = (item as RenderedItem).columnId;
      const column = columnsMap.get(columnId);
      invariant(column, `missing column: ${columnId}`);
      column.items.push(item as Item & { Assignee: RenderedAssignee | null });
    }

    return { itemsById: itemsMap, columns: columnsMap };
  }, [board, pendingItems, pendingColumns]);

  // Sort columns and apply search filter
  const columnArray = useMemo(() => {
    const sorted = [...columns.values()].sort(
      (a, b) => (a.order || 0) - (b.order || 0)
    );

    if (!searchTerm) return sorted;

    const lowerSearchTerm = searchTerm.toLowerCase();
    return sorted.map((col) => ({
      ...col,
      items: col.items.filter(
        (item: Item) =>
          item.title.toLowerCase().includes(lowerSearchTerm) ||
          (item.content && item.content.toLowerCase().includes(lowerSearchTerm))
      ),
    }));
  }, [columns, searchTerm]);

  return { columnArray, itemsById };
}

/**
 * Get pending columns being created via fetchers
 */
function usePendingColumns() {
  type CreateColumnFetcher = ReturnType<typeof useFetchers>[number] & {
    formData: FormData;
  };

  return useFetchers()
    .filter((fetcher): fetcher is CreateColumnFetcher => {
      return fetcher.formData?.get("intent") === INTENTS.createColumn;
    })
    .map((fetcher) => {
      const name = String(fetcher.formData.get("name"));
      const id = String(fetcher.formData.get("id"));
      return { name, id, order: 0, color: "#94a3b8", isDefault: false };
    });
}

/**
 * Get pending items being created or moved via fetchers
 */
function usePendingItems() {
  type PendingItem = ReturnType<typeof useFetchers>[number] & {
    formData: FormData;
  };

  return useFetchers()
    .filter((fetcher): fetcher is PendingItem => {
      if (!fetcher.formData) return false;
      const intent = fetcher.formData.get("intent");
      return intent === INTENTS.createItem || intent === INTENTS.moveItem;
    })
    .map((fetcher) => {
      const columnId = String(fetcher.formData.get("columnId"));
      const title = String(fetcher.formData.get("title"));
      const id = String(fetcher.formData.get("id"));
      const order = Number(fetcher.formData.get("order"));
      const item: RenderedItem = {
        title,
        id,
        order,
        columnId,
        content: null,
        createdBy: null,
        assigneeId: null,
        Assignee: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActiveAt: new Date(),
        boardId: 0,
      };
      return item;
    });
}
