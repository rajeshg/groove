import { useLoaderData } from "react-router";
import type { LoaderData } from "../../+types/board.$id";
import { BoardSwitcher } from "./board-switcher";

export function BoardHeader() {
  const { board, allBoards } = useLoaderData<LoaderData>();

  return (
    <div className="flex-shrink-0 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-4 flex items-center justify-center">
      <div className="flex items-center gap-2">
        <span className="text-xl font-bold">Trellix</span>
        <BoardSwitcher
          currentBoardId={board.id}
          currentBoardName={board.name}
          allBoards={allBoards}
        />
      </div>
    </div>
  );
}
