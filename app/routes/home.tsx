import { redirect } from "react-router";
import {
  Form,
  Link,
  useFetcher,
  useLoaderData,
  useNavigation,
} from "react-router";

import { requireAuthCookie } from "../auth/auth";
import { Button } from "../components/button";
import { Label, LabeledInput } from "../components/input";
import { badRequest } from "../http/bad-request";

import { getHomeData, createBoard, deleteBoard } from "./queries";
import { INTENTS } from "./types";
import { Icon } from "../icons/icons";

export const meta = () => {
  return [{ title: "Boards" }];
};

export async function loader({ request }: { request: Request }) {
  let userId = await requireAuthCookie(request);
  let boards = await getHomeData(userId);
  return { boards };
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

export default function Projects() {
  return (
    <div className="h-full">
      <NewBoard />
      <Boards />
    </div>
  );
}

function Boards() {
  let { boards } = useLoaderData<typeof loader>();
  return (
    <div className="p-8">
      <h2 className="font-bold mb-6 text-2xl text-slate-900">Your Boards</h2>
      {boards.length === 0 ? (
        <p className="text-slate-600">
          No boards yet. Create one to get started!
        </p>
      ) : (
        <nav className="flex flex-wrap gap-6">
          {boards.map((board: { id: number; name: string; color: string }) => (
            <Board
              key={board.id}
              name={board.name}
              id={board.id}
              color={board.color}
            />
          ))}
        </nav>
      )}
    </div>
  );
}

function Board({
  name,
  id,
  color,
}: {
  name: string;
  id: number;
  color: string;
}) {
  let fetcher = useFetcher();
  let isDeleting = fetcher.state !== "idle";
  return isDeleting ? null : (
    <Link
      to={`/board/${id}`}
      className="group w-60 h-40 p-4 block border-b-4 shadow-md rounded-lg hover:shadow-lg bg-white transition-all hover:scale-105 relative"
      style={{ borderColor: color }}
    >
      <div className="font-bold text-slate-900 text-lg">{name}</div>
      <fetcher.Form method="post">
        <input type="hidden" name="intent" value={INTENTS.deleteBoard} />
        <input type="hidden" name="boardId" value={id} />
        <button
          aria-label="Delete board"
          className="absolute top-4 right-4 text-slate-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
          type="submit"
          disabled={fetcher.state !== "idle"}
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          <Icon name="trash" />
        </button>
      </fetcher.Form>
    </Link>
  );
}

function NewBoard() {
  let navigation = useNavigation();
  let isCreating = navigation.formData?.get("intent") === "createBoard";

  return (
    <Form
      method="post"
      className="p-8 max-w-md border-b border-slate-200 bg-slate-50"
    >
      <input type="hidden" name="intent" value="createBoard" />
      <div>
        <h2 className="font-bold mb-4 text-xl text-slate-900">
          Create New Board
        </h2>
        <LabeledInput label="Name" name="name" type="text" required />
      </div>

      <div className="mt-6 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Label htmlFor="board-color" className="mb-0">
            Color
          </Label>
          <input
            id="board-color"
            name="color"
            type="color"
            defaultValue="#2563eb"
            className="h-10 w-14 rounded border border-slate-300 cursor-pointer"
          />
        </div>
        <Button type="submit" className="flex-1" disabled={isCreating}>
          {isCreating ? "Creating..." : "Create"}
        </Button>
      </div>
    </Form>
  );
}
