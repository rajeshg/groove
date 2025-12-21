import { Outlet, type MetaFunction } from "react-router";
import { invariant, invariantResponse } from "@epic-web/invariant";

import { requireAuthCookie } from "../auth/auth";

import { getBoardData, getHomeData } from "./queries";
import { assertBoardAccess } from "../utils/permissions";
import Board from "./board/board";
import type { Board as BoardType } from "../../prisma/client";
import type { Route } from "./+types/board.$id";

export async function loader({
  request,
  params,
}: {
  request: Request;
  params: Record<string, string>;
}) {
  let accountId = await requireAuthCookie(request);

  invariant(params.id, "Missing board ID");
  let id = params.id;

  let board = await getBoardData(id, accountId);
  invariantResponse(board, "Board not found", { status: 404 });

  // Check if user has access to this board
  assertBoardAccess(board, accountId);

  let allBoards = await getHomeData(accountId);

  return { board, allBoards };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [
    {
      title: `${data ? (data as { board: BoardType }).board.name : "Board"} | Groove`,
    },
  ];
};

export default function BoardPage({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <Board board={loaderData.board} />
      <Outlet />
    </>
  );
}
