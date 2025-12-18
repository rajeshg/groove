import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  Link,
  useMatches,
} from "react-router";

import "./app.css";
import { getAuthFromRequest } from "./auth/auth";
import { ThemeProvider } from "./context/theme";
import { BoardSwitcher } from "./routes/board/board-switcher";
import type { Board } from "@prisma/client";

type SimpleBoardInfo = { id: number; name: string; color: string };

export const links = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export async function loader({ request }: { request: Request }) {
  let userId = await getAuthFromRequest(request);
  if (userId) {
    const { getHomeData } = await import("./routes/queries");
    const allBoards = await getHomeData(userId);
    return { userId, allBoards };
  }
  return { userId: null, allBoards: [] };
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  let { userId, allBoards } = useLoaderData<typeof loader>();

  return (
    <ThemeProvider>
      <AppContent userId={userId} allBoards={allBoards} />
    </ThemeProvider>
  );
}

function AppContent({
  userId,
  allBoards,
}: {
  userId: string | null;
  allBoards: SimpleBoardInfo[];
}) {
  const matches = useMatches();

  // Find board context from matches (board page or card detail page)
  const boardMatch = matches.find((m) => m.id.includes("board.$id"));
  const cardMatch = matches.find((m) => m.id.includes("card.$cardId"));

  const currentBoard =
    (boardMatch?.data as unknown as { board?: Board })?.board ||
    (cardMatch?.data as unknown as { card?: { Board: Board } })?.card?.Board;

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 flex flex-col">
      {/* Global Header */}
      <div className="sticky top-0 z-50 flex-shrink-0 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="grid grid-cols-3 items-center h-14 px-6">
          {/* Left section: Switcher (only on board pages) */}
          <div className="flex items-center">
            {/* Space left empty to keep Trellix centered, or could put switcher here if desired */}
          </div>

          {/* Center: Brand Logo + Optional Board Switcher */}
          <div className="flex justify-center items-center gap-2">
            <Link
              to="/home"
              className="font-bold text-xl hover:opacity-80 transition-opacity tracking-tighter uppercase flex items-center gap-2"
            >
              Trellix
            </Link>
            {userId && (
              <BoardSwitcher
                currentBoardId={currentBoard?.id}
                allBoards={allBoards}
                userId={userId}
              />
            )}
          </div>

          {/* Right section: Auth controls */}
          <div className="flex items-center justify-end gap-2">
            {userId ? (
              <form method="post" action="/logout">
                <button className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
                  Log out
                </button>
              </form>
            ) : (
              <Link
                to="/login"
                className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Log in
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <Outlet />
      </div>
    </div>
  );
}

export function ErrorBoundary({ error }: { error: unknown }) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
