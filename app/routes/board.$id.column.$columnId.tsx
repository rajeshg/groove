import { useLoaderData, useNavigate, useFetchers, Link } from "react-router";
import { useState } from "react";
import { requireAuthCookie } from "~/auth/auth";
import { badRequest, notFound } from "~/http/bad-request";
import { getBoardData } from "./queries.server";
import { Icon } from "~/icons/icons";
import { Card } from "./board/card";
import { BoardHeader } from "./board/board-header";
import { NewCard } from "./board/new-card";
import { assertBoardAccess } from "~/utils/permissions";

export async function loader({
  request,
  params,
}: {
  request: Request;
  params: { id: string; columnId: string };
}) {
  const accountId = await requireAuthCookie(request);
  const boardId = params.id;
  const columnId = params.columnId;

  if (Number.isNaN(boardId)) {
    throw badRequest("Invalid board ID");
  }

  if (!columnId) {
    throw badRequest("Invalid column ID");
  }

  const board = await getBoardData(boardId, accountId);

  if (!board) {
    throw notFound();
  }

  // Check if user has access to this board
  assertBoardAccess(board, accountId);

  const column = board.columns.find((col) => col.id === columnId);

  if (!column) {
    throw notFound();
  }

  // Get items for this column
  const items = board.items.filter((item) => item.columnId === columnId);

  return { board, column, items };
}

export default function ColumnDetail() {
  const { board, column, items } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [addingCard, setAddingCard] = useState(false);

  // Get all active fetchers to track optimistic updates
  const fetchers = useFetchers();

  // Find any pending color update for this column
  const colorFetcher = fetchers.find(
    (f) =>
      f.formAction === "/resources/update-column" &&
      f.formData?.get("columnId") === column.id &&
      f.formData?.get("color")
  );

  const pendingColorUpdate = colorFetcher?.formData?.get("color") as
    | string
    | undefined;

  // Use pending color if available, otherwise use current color
  const displayColor = pendingColorUpdate || column.color || "#94a3b8";

  // Sort items by order
  const sortedItems = [...items].sort((a, b) => a.order - b.order);

  // Calculate next and previous orders for each card
  const itemsWithOrders = sortedItems.map((item, index) => {
    const previousOrder = sortedItems[index - 1]?.order ?? item.order - 1;
    const nextOrder = sortedItems[index + 1]?.order ?? item.order + 1;
    return { ...item, previousOrder, nextOrder };
  });

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white dark:bg-slate-950 text-slate-950 dark:text-slate-50">
      <BoardHeader />

      <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col items-center">
        {/* Header bar with all controls */}
        <div className="mb-6 w-full max-w-4xl">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4 bg-white dark:bg-slate-900 rounded-lg shadow-sm border-2 border-slate-200 dark:border-slate-800 px-4 py-3">
            {/* Left: Back button */}
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-slate-50 font-semibold"
              aria-label="Back"
            >
              <Icon name="chevron-left" className="w-5 h-5" />
              <span className="text-sm font-semibold">Back</span>
            </button>

            {/* Center: Column name */}
            <div className="flex items-center justify-center gap-2.5 min-w-0">
              <div
                className="w-3 h-3 rounded-full shadow-sm flex-shrink-0"
                style={{ backgroundColor: displayColor }}
              />
              <h2 className="font-black text-slate-950 dark:text-slate-50 text-lg uppercase truncate flex items-center h-9">
                {column.name}
              </h2>
              <Link
                to={`/board/${board.id}/column/${column.id}/settings`}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 group flex-shrink-0 flex items-center justify-center"
                title="Column Settings"
              >
                <Icon
                  name="cog"
                  size="md"
                  className="group-hover:rotate-90 transition-transform duration-500"
                />
              </Link>
            </div>

            {/* Right: Card count info */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700">
                <span className="text-sm font-bold text-slate-900 dark:text-slate-50">
                  {items.length}
                </span>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {items.length === 1 ? "card" : "cards"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full max-w-4xl">
          {/* Add Card Button/Form */}
          <div className="mb-4 bg-white dark:bg-slate-900 rounded-lg shadow-sm border-2 border-slate-200 dark:border-slate-800">
            {addingCard ? (
              <NewCard
                columnId={column.id}
                nextOrder={
                  items.length === 0
                    ? 1
                    : Math.max(...items.map((i) => i.order)) + 1
                }
                onComplete={() => setAddingCard(false)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setAddingCard(true)}
                className="w-full flex items-center gap-2 p-4 text-left font-bold text-slate-900 dark:text-slate-50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors rounded-lg"
              >
                <Icon name="plus" />
                <span>Add a card</span>
              </button>
            )}
          </div>

          {/* Cards List */}
          {items.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-700 p-10">
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                <Icon
                  name="inbox"
                  className="w-12 h-12 mx-auto mb-3 opacity-50"
                />
                <p>No cards in this column yet</p>
              </div>
            </div>
          ) : (
            <ul className="flex flex-col gap-2 list-none">
              {itemsWithOrders.map((item) => (
                <Card
                  key={item.id}
                  title={item.title}
                  content={item.content}
                  id={String(item.id)}
                  columnId={String(item.columnId)}
                  columnColor={displayColor}
                  order={item.order}
                  nextOrder={item.nextOrder}
                  previousOrder={item.previousOrder}
                  boardName={board.name}
                  boardId={board.id}
                  createdBy={item.createdBy}
                  createdByUser={item.createdByUser}
                  assignee={item.Assignee}
                  createdAt={item.createdAt}
                  lastActiveAt={item.lastActiveAt}
                  commentCount={item._count.comments}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
