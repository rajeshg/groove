import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  Link,
} from "react-router";

import "./app.css";
import { getAuthFromRequest } from "./auth/auth";
import { ThemeProvider, useTheme } from "./context/theme";

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
  let auth = await getAuthFromRequest(request);
  return auth;
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
  let userId = useLoaderData<typeof loader>();

  return (
    <ThemeProvider>
      <AppContent userId={userId} />
    </ThemeProvider>
  );
}

function AppContent({ userId }: { userId: any }) {
  const { theme, toggleTheme } = useTheme();

  const getThemeIcon = () => {
    if (theme === "light") return "🌙";
    if (theme === "dark") return "☀️";
    return "🖥️"; // system preference
  };

  return (
    <div className="h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="flex items-center justify-between h-16 px-6">
          {/* Logo/Brand */}
          <Link
            to="/home"
            className="font-bold text-xl hover:opacity-80 transition-opacity"
          >
            Trellix
          </Link>

          {/* Auth and theme controls on the right */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title={`Theme: ${theme === "system" ? "System" : theme === "light" ? "Light" : "Dark"}`}
              aria-label="Toggle theme"
            >
              <span className="text-lg">{getThemeIcon()}</span>
            </button>

            {/* Auth divider */}
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>

            {/* Auth controls */}
            {userId ? (
              <form method="post" action="/logout">
                <button className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
                  Log out
                </button>
              </form>
            ) : (
              <Link
                to="/login"
                className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Log in
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-grow min-h-0 h-full">
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
