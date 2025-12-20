import { useLoaderData, useNavigate } from "react-router";
import { requireAuthCookie } from "~/auth/auth";
import { badRequest, notFound } from "~/http/bad-request";
import { getBoardData } from "./queries";
import { Icon } from "~/icons/icons";
import { Card } from "./board/card";
import { BoardHeader } from "./board/board-header";
import { EditableText } from "./board/components";
import { ColumnColorPicker } from "./board/column-color-picker";
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

  // Sort items by order
  const sortedItems = [...items].sort((a, b) => a.order - b.order);

  // Calculate next and previous orders for each card
  const itemsWithOrders = sortedItems.map((item, index) => {
    const previousOrder = sortedItems[index - 1]?.order ?? item.order - 1;
    const nextOrder = sortedItems[index + 1]?.order ?? item.order + 1;
    return { ...item, previousOrder, nextOrder };
  });

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50">
      <BoardHeader />

      <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col items-center">
        {/* Header bar with all controls */}
        <div className="mb-6 w-full max-w-4xl">
          <div className="flex items-center justify-between gap-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 px-4 py-3">
            {/* Left: Back button */}
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex-shrink-0 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
              aria-label="Back"
            >
              <Icon name="chevron-left" className="w-5 h-5" />
              <span className="text-sm font-medium">Back</span>
            </button>

            {/* Center: Editable column name */}
            <div className="flex-1 flex items-center justify-center">
              <EditableText
                fieldName="name"
                value={column.name}
                inputLabel="Edit column name"
                buttonLabel={`Edit column "${column.name}" name`}
                inputClassName="border border-slate-300 dark:border-slate-500 rounded px-3 py-2 font-bold text-slate-900 dark:text-slate-50 dark:bg-slate-700 text-lg text-center uppercase"
                buttonClassName="px-3 py-2 font-bold text-slate-900 dark:text-slate-50 text-lg hover:bg-slate-100 dark:hover:bg-slate-700 rounded uppercase"
                placeholder="Column name..."
                action="/resources/update-column"
                hiddenFields={{
                  columnId: column.id,
                }}
              >
                <></>
              </EditableText>
            </div>

            {/* Right: Card count and color picker */}
            <div className="flex items-center gap-4 flex-shrink-0">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-md">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {items.length}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {items.length === 1 ? "card" : "cards"}
                </span>
              </div>

              <ColumnColorPicker
                columnId={column.id}
                columnName={column.name}
                currentColor={column.color || "#94a3b8"}
              />
            </div>
          </div>
        </div>

        <div className="w-full max-w-4xl">
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
                  columnColor={column.color || undefined}
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
