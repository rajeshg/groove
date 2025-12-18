import { Link, useLoaderData } from "react-router";
import { requireAuthCookie } from "../auth/auth";
import { getProfileData } from "./queries";
import { Icon } from "../icons/icons";
import { BoardHeader } from "./board/board-header";
import type { Item, Board } from "@prisma/client";

export async function loader({ request }: { request: Request }) {
  const accountId = await requireAuthCookie(request);
  const { assignedCards } = await getProfileData(accountId);
  return { assignedCards };
}

export default function AssignedCards() {
  const { assignedCards } = useLoaderData<typeof loader>();

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50">
      <BoardHeader />
      
      <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center">
        {/* Centered context indicator */}
        <div className="mb-8 flex items-center gap-2 text-slate-400 dark:text-slate-500">
          <Icon name="user" size="md" />
          <span className="text-xs font-black uppercase tracking-widest">Cards Assigned to Me</span>
        </div>

        <div className="w-full max-w-4xl">
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-700 p-10">
            {assignedCards.length === 0 ? (
              <p className="text-center text-slate-500 dark:text-slate-400">No cards assigned to you.</p>
            ) : (
              <div className="space-y-4">
                {assignedCards.map((card: Item & { Board: Board }) => (
                  <div key={card.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                    <h3 className="font-bold text-lg">{card.title}</h3>
                    <p className="text-slate-600 dark:text-slate-400">{card.content}</p>
                    <p className="text-sm text-slate-500">Board: {card.Board.name}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-8 text-center">
              <Link to="/profile" className="text-blue-500 hover:underline">Back to Profile</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}