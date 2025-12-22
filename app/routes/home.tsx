import { redirect } from "react-router";
import { Link, useFetcher, useSearchParams, Form } from "react-router";
import { requireAuthCookie } from "../auth/auth";
import { badRequest } from "../http/bad-request";

import { getHomeData, deleteBoard, getActivityFeed } from "./queries.server";
import type { ActivityItem, HomeData } from "./queries.types";
import { INTENTS } from "./types";
import { Icon } from "../icons/icons";
import type { Route } from "./+types/home";

type BoardData = HomeData[number];

export const meta = () => {
  return [{ title: "Dashboard | Trello Clone" }];
};

export async function loader({ request }: { request: Request }) {
  let userId = await requireAuthCookie(request);
  let url = new URL(request.url);
  let boardId = url.searchParams.get("boardId") || undefined;
  let type = url.searchParams.get("type") || undefined;
  let page = Number(url.searchParams.get("page") || "1");
  let limit = 20;
  let offset = (page - 1) * limit;

  let [boards, { activities, totalCount }] = await Promise.all([
    getHomeData(userId),
    getActivityFeed(userId, { boardId, type, limit, offset }),
  ]);

  return {
    boards,
    accountId: userId,
    activity: activities,
    totalCount,
    page,
    limit,
    filters: { boardId, type },
  };
}

export async function action({ request }: { request: Request }) {
  let accountId = await requireAuthCookie(request);
  let formData = await request.formData();
  let intent = String(formData.get("intent"));
  switch (intent) {
    case INTENTS.createBoard: {
      return redirect("/new-board");
    }
    case INTENTS.deleteBoard: {
      let boardId = formData.get("boardId");
      if (!boardId) throw badRequest("Missing boardId");
      await deleteBoard(String(boardId), accountId);
      return { ok: true };
    }
    default: {
      throw badRequest(`Unknown intent: ${intent}`);
    }
  }
}

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  return (
    <div className="min-h-full bg-white dark:bg-slate-950 flex flex-col items-center overflow-y-auto">
      <div className="w-full max-w-[1600px] px-0 sm:px-4">
        <header className="py-6 px-4 border-b border-slate-100 dark:border-slate-900 mb-0 lg:mb-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-600 rounded text-white">
              <Icon name="board-icon" className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Groove Dashboard
            </h1>
          </div>
          <Link
            to="/new-board"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
          >
            <Icon name="plus" className="w-4 h-4" />
            Add a Board
          </Link>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-8 items-start">
          <aside className="lg:col-span-4 xl:col-span-3 order-1 p-4 lg:p-0">
            <Boards loaderData={loaderData} />
          </aside>

          <main className="lg:col-span-8 xl:col-span-9 order-2 p-4 lg:p-0">
            <FullActivityFeed
              activity={loaderData.activity}
              boards={loaderData.boards}
              filters={loaderData.filters}
              totalCount={loaderData.totalCount}
              page={loaderData.page}
              limit={loaderData.limit}
            />
          </main>
        </div>
      </div>
    </div>
  );
}

function FullActivityFeed({
  activity,
  boards,
  filters,
  totalCount,
  page,
  limit,
}: {
  activity: ActivityItem[];
  boards: BoardData[];
  filters: { boardId?: string; type?: string };
  totalCount: number;
  page: number;
  limit: number;
}) {
  const [searchParams] = useSearchParams();

  const activityTypes = [
    { value: "", label: "All Actions" },
    { value: "card_created", label: "Card Created" },
    { value: "card_moved", label: "Card Moved" },
    { value: "card_assigned", label: "Card Assigned" },
    { value: "comment_added", label: "Comment Added" },
    { value: "member_joined", label: "Member Joined" },
    { value: "board_created", label: "Board Created" },
  ];

  if (
    !activity ||
    (activity.length === 0 && !filters.boardId && !filters.type)
  ) {
    return (
      <div className="bg-slate-50 dark:bg-slate-900/40 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center">
        <Icon
          name="board-icon"
          className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4"
        />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          No activity yet
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6">
          Start by creating a board or adding some cards.
        </p>
      </div>
    );
  }

  // Group by day
  const groupedByDay: {
    date: Date;
    activities: ActivityItem[];
    gapEnd?: Date;
  }[] = [];

  const daysWithActivity = new Map<string, ActivityItem[]>();
  activity.forEach((act) => {
    const day = new Date(act.createdAt).toISOString().split("T")[0];
    const existing = daysWithActivity.get(day) || [];
    daysWithActivity.set(day, [...existing, act]);
  });

  const sortedDays = Array.from(daysWithActivity.keys()).sort().reverse();

  if (sortedDays.length > 0) {
    const firstDayWithActivity = new Date(sortedDays[sortedDays.length - 1]);
    const lastDayWithActivity = new Date(sortedDays[0]);

    let current = new Date(lastDayWithActivity);
    while (current >= firstDayWithActivity) {
      const dayStr = current.toISOString().split("T")[0];
      const acts = daysWithActivity.get(dayStr);

      if (acts) {
        groupedByDay.push({
          date: new Date(current),
          activities: acts,
        });
        current.setDate(current.getDate() - 1);
      } else {
        // Gap detection
        const gapStart = new Date(current);
        let gapEnd = new Date(current);
        while (
          current >= firstDayWithActivity &&
          !daysWithActivity.has(current.toISOString().split("T")[0])
        ) {
          gapEnd = new Date(current);
          current.setDate(current.getDate() - 1);
        }

        // Only show gap if it's 3+ days
        const diffDays =
          Math.ceil(
            Math.abs(gapStart.getTime() - gapEnd.getTime()) /
              (1000 * 60 * 60 * 24)
          ) + 1;
        if (diffDays >= 3) {
          groupedByDay.push({
            date: gapStart,
            activities: [],
            gapEnd,
          });
        }
      }
    }
  }

  return (
    <div className="space-y-12">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <h2 className="font-bold text-3xl text-slate-900 dark:text-white flex items-center gap-4 whitespace-nowrap">
          Activity Feed
          <span className="h-px bg-slate-200 dark:bg-slate-800 flex-1 min-w-[50px]" />
        </h2>

        <Form className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <select
              name="boardId"
              defaultValue={filters.boardId || ""}
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
              className="appearance-none pl-3 pr-10 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-base md:text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
            >
              <option value="">All Boards</option>
              {boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <Icon
              name="chevron-right"
              className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none"
            />
          </div>

          <div className="relative">
            <select
              name="type"
              defaultValue={filters.type || ""}
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
              className="appearance-none pl-3 pr-10 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-base md:text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
            >
              {activityTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <Icon
              name="chevron-right"
              className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none"
            />
          </div>

          {(filters.boardId || filters.type) && (
            <Link
              to="/home"
              className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              title="Clear filters"
            >
              <Icon name="trash" className="w-4 h-4" />
            </Link>
          )}
        </Form>
      </div>

      {activity.length === 0 ? (
        <div className="bg-slate-50 dark:bg-slate-900/40 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            No matching activity
          </h3>
          <p className="text-slate-500 dark:text-slate-400">
            Try adjusting your filters to see more results.
          </p>
        </div>
      ) : (
        <div className="space-y-12">
          <div className="flex flex-col">
            {groupedByDay.map((group, idx) => {
              if (group.gapEnd) {
                return (
                  <div
                    key={`gap-${idx}`}
                    className="py-8 border-y border-dashed border-slate-200 dark:border-slate-800 flex justify-center my-4"
                  >
                    <div className="px-6 py-2 bg-slate-50 dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-800">
                      <span className="text-sm font-bold text-slate-400 dark:text-slate-500">
                        No activity from{" "}
                        {group.gapEnd.toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                        {" to "}
                        {group.date.toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                );
              }

              return (
                <section key={group.date.toISOString()} className="mb-8">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="px-4 py-1.5 bg-slate-900 dark:bg-white rounded-full shadow-sm">
                      <span className="text-xs font-black text-white dark:text-slate-900 uppercase tracking-widest">
                        {group.date.toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="h-px bg-slate-100 dark:bg-slate-900 flex-1" />
                  </div>

                  <div className="flex flex-col gap-px bg-slate-100 dark:bg-slate-900 border border-slate-100 dark:border-slate-900 rounded-xl overflow-hidden shadow-sm">
                    {group.activities.map((act) => (
                      <ActivityCard key={act.id} act={act} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          {totalCount > limit && (
            <div className="flex justify-center items-center gap-4 py-8 border-t border-slate-100 dark:border-slate-900">
              <Link
                to={(() => {
                  const sp = new URLSearchParams(searchParams);
                  sp.set("page", String(Math.max(1, page - 1)));
                  return `/home?${sp.toString()}`;
                })()}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
                  page <= 1
                    ? "text-slate-300 pointer-events-none"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900"
                }`}
              >
                <Icon name="chevron-right" className="w-4 h-4 rotate-180" />
                Previous
              </Link>

              <div className="flex items-center gap-2">
                {Array.from({ length: Math.ceil(totalCount / limit) }).map(
                  (_, i) => {
                    const p = i + 1;
                    const isCurrent = p === page;
                    const sp = new URLSearchParams(searchParams);
                    sp.set("page", String(p));

                    return (
                      <Link
                        key={p}
                        to={`/home?${sp.toString()}`}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-black transition-all ${
                          isCurrent
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                            : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900"
                        }`}
                      >
                        {p}
                      </Link>
                    );
                  }
                )}
              </div>

              <Link
                to={(() => {
                  const sp = new URLSearchParams(searchParams);
                  sp.set("page", String(page + 1));
                  return `/home?${sp.toString()}`;
                })()}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
                  page >= Math.ceil(totalCount / limit)
                    ? "text-slate-300 pointer-events-none"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900"
                }`}
              >
                Next
                <Icon name="chevron-right" className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ActivityCard({ act }: { act: ActivityItem }) {
  const getActivityConfig = (type: string) => {
    switch (type) {
      case "card_created":
        return {
          icon: "plus" as const,
          label: "Created card",
          color:
            "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
        };
      case "card_moved":
        return {
          icon: "board-icon" as const,
          label: "Moved card",
          color:
            "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
        };
      case "card_updated":
        return {
          icon: "clipboard" as const,
          label: "Updated card",
          color: "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400",
        };
      case "card_deleted":
        return {
          icon: "trash" as const,
          label: "Deleted card",
          color:
            "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
        };
      case "card_assigned":
        return {
          icon: "user" as const,
          label: "Updated assignment",
          color:
            "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
        };
      case "comment_added":
        return {
          icon: "dots" as const,
          label: "Added comment",
          color:
            "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
        };
      case "comment_updated":
        return {
          icon: "dots" as const,
          label: "Updated comment",
          color:
            "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
        };
      case "comment_deleted":
        return {
          icon: "trash" as const,
          label: "Removed comment",
          color:
            "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
        };
      case "member_invited":
        return {
          icon: "user" as const,
          label: "Invited user",
          color:
            "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400",
        };
      case "member_joined":
        return {
          icon: "user" as const,
          label: "Member joined",
          color:
            "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
        };
      case "member_removed":
        return {
          icon: "user" as const,
          label: "Member removed",
          color:
            "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
        };
      case "board_created":
        return {
          icon: "board-icon" as const,
          label: "Created board",
          color:
            "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
        };
      case "board_updated":
        return {
          icon: "board-icon" as const,
          label: "Updated board",
          color:
            "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
        };
      case "column_created":
        return {
          icon: "plus" as const,
          label: "Added column",
          color:
            "bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400",
        };
      case "column_updated":
        return {
          icon: "clipboard" as const,
          label: "Updated column",
          color:
            "bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400",
        };
      case "column_moved":
        return {
          icon: "board-icon" as const,
          label: "Moved column",
          color:
            "bg-blue-50 text-blue-500 dark:bg-blue-900/20 dark:text-blue-300",
        };
      case "column_deleted":
        return {
          icon: "trash" as const,
          label: "Removed column",
          color:
            "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
        };
      default:
        return {
          icon: "clipboard" as const,
          label: "Updated card",
          color:
            "bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400",
        };
    }
  };

  const config = getActivityConfig(act.type);
  const linkTo = act.itemId ? `/card/${act.itemId}` : `/board/${act.boardId}`;

  return (
    <Link
      to={linkTo}
      className="group bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 border-b border-slate-100 dark:border-slate-900 p-3 transition-colors flex items-center gap-4"
    >
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${config.color}`}
      >
        <Icon name={config.icon} className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            {act.user && (
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {act.user.firstName} {act.user.lastName}
              </span>
            )}
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {config.label}
            </span>
            {act.item && (
              <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors truncate">
                "{act.item.title}"
              </span>
            )}
          </div>
          {act.content && (
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xl">
              {act.content}
            </p>
          )}
        </div>

        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
              {act.board.name}
            </span>
            {act.item && (
              <>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {act.item.Column.name}
                </span>
              </>
            )}
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight w-12 text-right">
            {new Date(act.createdAt).toLocaleTimeString(undefined, {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      </div>
    </Link>
  );
}

function Boards({
  loaderData,
}: {
  loaderData: { boards: BoardData[]; accountId: string };
}) {
  let { boards, accountId } = loaderData;
  return (
    <div className="bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
          Your Boards
          <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded font-black uppercase tracking-widest">
            {boards.length}
          </span>
        </h2>
      </div>

      {boards.length === 0 ? (
        <div className="py-10 flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
          <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">
            No boards found
          </p>
        </div>
      ) : (
        <nav className="space-y-3">
          {boards.map((board) => (
            <Board key={board.id} board={board} currentUserId={accountId} />
          ))}
        </nav>
      )}
    </div>
  );
}

function Board({
  board,
  currentUserId,
}: {
  board: BoardData;
  currentUserId: string;
}) {
  let fetcher = useFetcher();
  let isDeleting = fetcher.state !== "idle";

  if (isDeleting) return null;

  return (
    <Link
      to={`/board/${board.id}`}
      className="group flex flex-col bg-white dark:bg-slate-900 rounded-xl shadow-sm hover:shadow-md border border-slate-200 dark:border-slate-800 transition-all overflow-hidden"
    >
      <div className="p-4 flex flex-col h-full">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2 overflow-hidden">
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: board.color }}
            />
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm line-clamp-1 group-hover:text-blue-600 transition-colors">
              {board.name}
            </h3>
          </div>

          {board.accountId === currentUserId && (
            <fetcher.Form method="post">
              <input type="hidden" name="intent" value={INTENTS.deleteBoard} />
              <input type="hidden" name="boardId" value={board.id} />
              <button
                className="p-1 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                type="submit"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!confirm(`Delete "${board.name}"?`)) e.preventDefault();
                }}
              >
                <Icon name="trash" className="w-3.5 h-3.5" />
              </button>
            </fetcher.Form>
          )}
        </div>

        <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
          <span className="flex items-center gap-1">
            <Icon name="clipboard" className="w-3 h-3" />
            {board._count.items} cards
          </span>
          <span className="flex items-center gap-1">
            <Icon name="user" className="w-3 h-3" />
            {board._count.members}
          </span>
        </div>
      </div>
    </Link>
  );
}
