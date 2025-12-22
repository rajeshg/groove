import { redirect } from "react-router";
import { Form, Link, useFetcher, useNavigation } from "react-router";
import { useState } from "react";
import type { Board } from "../../prisma/client";

import { requireAuthCookie } from "../auth/auth";
import { StatusButton } from "../components/status-button";
import { Label, LabeledInput } from "../components/input";
import { badRequest } from "../http/bad-request";

import { getHomeData, createBoard, deleteBoard } from "./queries.server";
import { INTENTS } from "./types";
import { Icon } from "../icons/icons";
import { ColorPicker } from "../components/ColorPicker";
import { getBoardTemplates } from "../constants/templates";
import type { Route } from "./+types/new-board";

type BoardData = {
  id: string;
  name: string;
  color: string;
  accountId: string;
  _count: {
    items: number;
    members: number;
  };
};

export const meta = () => {
  return [{ title: "New Board | Trello Clone" }];
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
      let templateName = formData.get("template")
        ? String(formData.get("template"))
        : undefined;
      if (!name) throw badRequest("Bad request");
      let board = await createBoard(accountId, name, color, templateName);
      return redirect(`/board/${board.id}`);
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

export default function NewBoardPage({ loaderData }: Route.ComponentProps) {
  return (
    <div className="min-h-full bg-white dark:bg-slate-950 flex flex-col items-center overflow-y-auto">
      <div className="w-full max-w-[1600px] px-0 sm:px-4">
        <header className="py-6 px-4 border-b border-slate-100 dark:border-slate-900 mb-0 lg:mb-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-600 rounded text-white">
              <Icon name="board-icon" className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Create New Board
            </h1>
          </div>
          <Link
            to="/home"
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg transition-colors"
          >
            <Icon name="chevron-left" className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-8 items-start">
          <aside className="lg:col-span-4 xl:col-span-3 order-1 p-4 lg:p-0">
            <Boards loaderData={loaderData} />
          </aside>

          <main className="lg:col-span-8 xl:col-span-9 order-2 p-4 lg:p-0">
            <NewBoard />
          </main>
        </div>
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

function NewBoard() {
  let navigation = useNavigation();
  let isCreating =
    navigation.state !== "idle" &&
    navigation.formData?.get("intent") === INTENTS.createBoard;
  let templates = getBoardTemplates();
  let [selectedColor, setSelectedColor] = useState("#2563eb");
  let [boardTitle, setBoardTitle] = useState("");

  const handleTemplateChange = (templateName: string) => {
    setBoardTitle(templateName);
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900/20 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 lg:p-8">
      <div className="flex items-center justify-between mb-8">
        <h2 className="font-bold text-2xl text-slate-900 dark:text-white flex items-center gap-3">
          Start a new board
          <span className="h-px bg-slate-200 dark:bg-slate-800 flex-1 min-w-[50px] lg:min-w-[200px]" />
        </h2>
      </div>

      <Form method="post" className="space-y-8">
        <input type="hidden" name="intent" value={INTENTS.createBoard} />

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          <div className="xl:col-span-4 space-y-6">
            <LabeledInput
              label="What's the project name?"
              name="name"
              type="text"
              required
              placeholder="e.g. Vacation Planning"
              className="h-12 text-base font-medium rounded-xl border-slate-200 focus:border-blue-500"
              disabled={isCreating}
              value={boardTitle}
              onChange={(e) => setBoardTitle(e.target.value)}
            />

            <div className="space-y-3">
              <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Pick a color
              </Label>
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <ColorPicker
                  value={selectedColor}
                  onChange={(color) => {
                    setSelectedColor(color);
                    const input = document.querySelector(
                      'input[name="color"]'
                    ) as HTMLInputElement;
                    if (input) input.value = color;
                  }}
                />
                <input type="hidden" name="color" value={selectedColor} />
              </div>
            </div>

            <StatusButton
              type="submit"
              status={isCreating ? "pending" : "idle"}
              className="w-full h-12 text-base font-bold rounded-xl shadow-lg shadow-blue-500/20"
            >
              Create Project
            </StatusButton>
          </div>

          <div className="xl:col-span-8 space-y-4">
            <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Select a workflow template
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
              {templates.map((template) => (
                <label
                  key={template.name}
                  className="relative group cursor-pointer"
                >
                  <input
                    type="radio"
                    name="template"
                    value={template.name}
                    defaultChecked={template.name === "Default"}
                    className="sr-only peer"
                    disabled={isCreating}
                    onChange={() => handleTemplateChange(template.name)}
                  />

                  <div className="h-full p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all peer-checked:ring-2 peer-checked:ring-blue-500 peer-checked:border-transparent group-hover:shadow-md">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {template.name}
                      </span>
                      <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700 flex items-center justify-center group-has-[:checked]:bg-blue-500 group-has-[:checked]:border-blue-500 transition-colors">
                        <div className="w-1.5 h-1.5 rounded-full bg-white opacity-0 group-has-[:checked]:opacity-100 transition-opacity" />
                      </div>
                    </div>

                    <div className="flex gap-1 mb-2">
                      {template.columns.map((col) => (
                        <div
                          key={col.name}
                          className="h-1.5 flex-1 rounded-full opacity-60"
                          style={{ backgroundColor: col.color }}
                        />
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium truncate">
                      {template.columns.map((c) => c.name).join(" • ")}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Form>
    </div>
  );
}
