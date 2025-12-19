import { Link } from "react-router";
import type { Route } from "./+types/me.assigned";
import { requireAuthCookie } from "../auth/auth";
import { prisma } from "../../prisma/client";
import { Icon } from "../icons/icons";
import { BoardHeader } from "./board/board-header";
import type { Item, Board } from "../../prisma/client";

export async function loader({ request }: { request: Request }) {
  const accountId = await requireAuthCookie(request);
  // Find assignees linked to this user
  const userAssignees = await prisma.assignee.findMany({
    where: { userId: accountId },
    select: { id: true },
  });

  // Find all items assigned to any of the user's assignees
  const assignedCards = await prisma.item.findMany({
    where: {
      assigneeId: {
        in: userAssignees.map((a: { id: string }) => a.id),
      },
    },
    include: { Board: true },
  });
  return { assignedCards };
}

export default function AssignedCards({ loaderData }: Route.ComponentProps) {
  const { assignedCards = [] } = loaderData;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50">
      <BoardHeader />

      <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center">
        {/* Centered context indicator */}
        <div className="mb-8 flex items-center gap-2 text-slate-400 dark:text-slate-500">
          <Icon name="user" size="md" />
          <span className="text-xs font-black uppercase tracking-widest">
            Cards Assigned to Me
          </span>
        </div>

        <div className="w-full max-w-4xl">
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-700 p-10">
            {assignedCards.length === 0 ? (
              <p className="text-center text-slate-500 dark:text-slate-400">
                No cards assigned to you.
              </p>
            ) : (
              <div className="space-y-4">
                {assignedCards.map((card: Item & { Board: Board }) => (
                  <Link
                    key={card.id}
                    to={`/card/${card.id}`}
                    className="block border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:border-blue-400 dark:hover:border-blue-500 transition-colors bg-white dark:bg-slate-800 group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {card.title}
                      </h3>
                      <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded uppercase">
                        {card.id.substring(0, 4)}
                      </span>
                    </div>

                    {card.content ? (
                      <div
                        className="text-slate-600 dark:text-slate-400 mb-3 prose dark:prose-invert prose-sm max-w-none line-clamp-3 overflow-hidden"
                        dangerouslySetInnerHTML={{ __html: card.content }}
                      />
                    ) : (
                      <p className="text-slate-400 dark:text-slate-500 italic text-sm mb-3">
                        No description
                      </p>
                    )}

                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Icon name="board-icon" />
                      <span>Board: {card.Board?.name}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            <div className="mt-8 text-center">
              <Link to="/profile" className="text-blue-500 hover:underline">
                Back to Profile
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
