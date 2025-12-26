/// <reference types="vite/client" />
import {
  HeadContent,
  Link,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import * as React from "react";
import { DefaultCatchBoundary } from "~/components/DefaultCatchBoundary";
import { NotFound } from "~/components/NotFound";
import { AuthProvider, useAuth } from "~/components/auth/AuthProvider";
import { UserMenu } from "~/components/auth/UserMenu";
import { BoardSwitcher } from "~/components/BoardSwitcher";
import { useLiveQuery } from "@tanstack/react-db";
import { boardsCollection, queryClient } from "~/db/collections";
import { eq } from "@tanstack/db";
import appCss from "~/styles/app.css?url";
import columnsCss from "~/styles/columns.css?url";
import { seo } from "~/utils/seo";
import { initializeServer } from "~/server/init";

// Import shared QueryClient from collections.ts
// This ensures TanStack Query and TanStack DB use the same client instance

export const Route = createRootRoute({
  beforeLoad: async () => {
    // Initialize server on first request
    // This ensures database migrations are run once before any requests
    if (typeof window === "undefined") {
      await initializeServer();
    }
    return {};
  },
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      ...seo({
        title: "Groove | Kanban Project Management",
        description: `Groove is a modern Kanban-style project management tool built with TanStack Start.`,
      }),
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "stylesheet", href: columnsCss },
      {
        rel: "apple-touch-icon",
        sizes: "180x180",
        href: "/apple-touch-icon.png",
      },
      {
        rel: "icon",
        type: "image/svg+xml",
        href: "/logo-light.svg",
      },
      {
        rel: "icon",
        type: "image/svg+xml",
        href: "/logo-dark.svg",
        media: "(prefers-color-scheme: dark)",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: "/favicon-32x32.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "16x16",
        href: "/favicon-16x16.png",
      },
      { rel: "manifest", href: "/site.webmanifest", color: "#fffff" },
      { rel: "icon", href: "/favicon.ico" },
    ],
    scripts: [
      {
        src: "/customScript.js",
        type: "text/javascript",
      },
    ],
  }),
  errorComponent: DefaultCatchBoundary,
  notFoundComponent: () => <NotFound />,
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50">
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <div className="min-h-screen flex flex-col">
              <Navbar />
              <div className="flex-1 flex flex-col">{children}</div>
            </div>
            <TanStackRouterDevtools position="bottom-right" />
            <ReactQueryDevtools initialIsOpen={false} />
          </QueryClientProvider>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}

function Navbar() {
  const { user } = useAuth();
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  // Try to get current board ID from URL - will be undefined if not on board page
  const currentBoardId =
    typeof window !== "undefined"
      ? window.location.pathname.match(/\/boards\/([^/]+)/)?.[1]
      : undefined;

  return (
    <div className="sticky top-0 z-50 flex-shrink-0 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
      <div className="flex items-center justify-between h-14 px-3 md:px-6 relative">
        {/* Left/Center: Logo + BoardSwitcher */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {/* Logo */}
          <Link
            to="/boards"
            className="flex items-center gap-1.5 sm:gap-2 hover:opacity-80 transition-opacity flex-shrink-0"
          >
            <div className="relative w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0">
              <img
                src="/logo-light.svg"
                alt=""
                className="absolute inset-0 w-full h-full dark:hidden"
              />
              <img
                src="/logo-dark.svg"
                alt=""
                className="absolute inset-0 w-full h-full hidden dark:block"
              />
            </div>
            <span className="hidden sm:inline font-black text-base sm:text-lg tracking-tighter uppercase truncate">
              Groove
            </span>
          </Link>

          {/* BoardSwitcher with J > */}
          {user && isClient && (
            <div className="flex-shrink-0 max-w-[150px] sm:max-w-none">
              <BoardSwitcherWrapper
                user={user}
                currentBoardId={currentBoardId}
              />
            </div>
          )}
        </div>

        {/* Right: User Menu */}
        <div className="flex items-center flex-shrink-0 ml-2">
          <UserMenu />
        </div>
      </div>
    </div>
  );
}

function BoardSwitcherWrapper({
  user,
  currentBoardId,
}: {
  user: any;
  currentBoardId?: string;
}) {
  const result = useLiveQuery((q) =>
    q
      .from({ board: boardsCollection })
      .where(({ board }) => eq(board.accountId, user.id))
  );

  const boards = result.data || [];
  const isLoading = !result.data && result.status === "loading";

  return (
    <BoardSwitcher
      currentBoardId={currentBoardId}
      allBoards={boards as any}
      isLoading={isLoading}
    />
  );
}
