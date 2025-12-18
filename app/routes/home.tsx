import { redirect } from "react-router";
import { Form, Link, useFetcher, useNavigation } from "react-router";
import type { Board } from "@prisma/client";

import { requireAuthCookie } from "../auth/auth";
import { Button } from "../components/button";
import { Label, LabeledInput } from "../components/input";
import { badRequest } from "../http/bad-request";

import { getHomeData, createBoard, deleteBoard } from "./queries";
import { INTENTS } from "./types";
import { Icon } from "../icons/icons";
import type { Route } from "./+types/home";

type BoardData = Pick<Board, "id" | "name" | "color" | "accountId">;

export const meta = () => {
  return [{ title: "Boards" }];
};

export async function loader({ request }: { request: Request }) {
  let userId = await requireAuthCookie(request);
  let boards = await getHomeData(userId);
  return { boards, accountId: userId };
}

export async function action({ request }: { request: Request }) {
  let accountId = await requireAuthCookie(request);
  let formData = await request.formData();
  let intent = String(formData.get("intent"));
  switch (intent) {
    case INTENTS.createBoard: {
      let name = String(formData.get("name") || "");
      let color = String(formData.get("color") || "");
      if (!name) throw badRequest("Bad request");
      let board = await createBoard(accountId, name, color);
      return redirect(`/board/${board.id}`);
    }
    case INTENTS.deleteBoard: {
      let boardId = formData.get("boardId");
      if (!boardId) throw badRequest("Missing boardId");
      await deleteBoard(Number(boardId), accountId);
      return { ok: true };
    }
    default: {
      throw badRequest(`Unknown intent: ${intent}`);
    }
  }
}

export default function Projects({ loaderData }: Route.ComponentProps) {
  return (
    <div className="h-full flex flex-col items-center overflow-y-auto">
      <div className="w-full max-w-6xl">
        <NewBoard />
        <Boards loaderData={loaderData} />
      </div>
    </div>
  );
}

function Boards({
  loaderData,
}: {
  loaderData: { boards: BoardData[]; accountId: string };
}) {
  let { boards, accountId } = loaderData;
  return (
    <div className="p-8 flex flex-col items-center">
      <div className="w-full">
        <h2 className="font-bold mb-6 text-2xl text-slate-900 dark:text-slate-100">
          Your Boards
        </h2>
        {boards.length === 0 ? (
          <p className="text-slate-600 dark:text-slate-400">
            No boards yet. Create one to get started!
          </p>
        ) : (
          <nav className="flex flex-wrap gap-6">
            {boards.map(
              (board: {
                id: number;
                name: string;
                color: string;
                accountId: string;
              }) => (
                <Board
                  key={board.id}
                  name={board.name}
                  id={board.id}
                  color={board.color}
                  ownerId={board.accountId}
                  currentUserId={accountId}
                />
              )
            )}
          </nav>
        )}
      </div>
    </div>
  );
}

function Board({
  name,
  id,
  color,
  ownerId,
  currentUserId,
}: {
  name: string;
  id: number;
  color: string;
  ownerId: string;
  currentUserId: string;
}) {
  let fetcher = useFetcher();
  let isDeleting = fetcher.state !== "idle";
  return isDeleting ? null : (
    <Link
      to={`/board/${id}`}
      className="group w-60 h-40 p-4 block border-b-4 shadow-md rounded-lg hover:shadow-lg bg-white dark:bg-slate-800 transition-all hover:scale-105 relative"
      style={{ borderColor: color }}
    >
      <div className="font-bold text-slate-900 dark:text-slate-100 text-lg">
        {name}
      </div>
      {ownerId === currentUserId && (
        <fetcher.Form method="post">
          <input type="hidden" name="intent" value={INTENTS.deleteBoard} />
          <input type="hidden" name="boardId" value={id} />
          <button
            aria-label="Delete board"
            className="absolute top-4 right-4 text-slate-400 hover:text-red-600 transition-colors opacity-50 group-hover:opacity-100 disabled:opacity-50"
            type="submit"
            disabled={fetcher.state !== "idle"}
            onClick={(event) => {
              event.stopPropagation();
              if (
                !confirm(
                  `Are you sure you want to delete the board "${name}"? This action cannot be undone.`
                )
              ) {
                event.preventDefault();
              }
            }}
          >
            <Icon name="trash" />
          </button>
        </fetcher.Form>
      )}
    </Link>
  );
}

function NewBoard() {
  let navigation = useNavigation();
  let isCreating = navigation.formData?.get("intent") === "createBoard";

  return (
    <div className="flex justify-center border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
      <Form method="post" className="p-8 w-full max-w-md">
        <input type="hidden" name="intent" value="createBoard" />
        <div>
          <h2 className="font-bold mb-4 text-xl text-slate-900 dark:text-slate-100">
            Create New Board
          </h2>
          <LabeledInput label="Name" name="name" type="text" required />
        </div>

        <div className="mt-6 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="board-color" className="mb-0 dark:text-slate-300">
              Color
            </Label>
            <input
              id="board-color"
              name="color"
              type="color"
              defaultValue="#2563eb"
              className="h-10 w-14 rounded border border-slate-300 dark:border-slate-600 cursor-pointer bg-white dark:bg-slate-800"
            />
          </div>
          <Button type="submit" className="flex-1" disabled={isCreating}>
            {isCreating ? "Creating..." : "Create"}
          </Button>
        </div>
      </Form>
    </div>
  );
}
