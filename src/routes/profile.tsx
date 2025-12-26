"use client";

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "~/components/auth/AuthProvider";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { User, Moon, Sun, Monitor } from "lucide-react";
import { getDisplayName, getInitials, getAvatarColor } from "~/utils/avatar";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

type Theme = "light" | "dark" | "system";

function AppearanceButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: "sun" | "moon" | "monitor";
  label: string;
  onClick: () => void;
}) {
  const IconComponent = icon === "sun" ? Sun : icon === "moon" ? Moon : Monitor;

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
        active
          ? "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 shadow-sm ring-2 ring-blue-500/10"
          : "bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500"
      }`}
    >
      <IconComponent className="w-8 h-8 mb-2" />
      <span className="text-[10px] font-bold uppercase tracking-tighter text-center leading-tight">
        {label}
      </span>
    </button>
  );
}

function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setThemeState] = useState<Theme>(() => {
    // Lazy initializer - runs only once on mount
    if (typeof window !== "undefined") {
      return (localStorage.getItem("theme") as Theme) || "system";
    }
    return "system";
  });

  // Check if user is authenticated
  useEffect(() => {
    if (!user) {
      navigate({ to: "/login" });
    }
  }, [user, navigate]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", newTheme);

      // Apply theme to document
      const root = document.documentElement;
      if (newTheme === "dark") {
        root.classList.add("dark");
      } else if (newTheme === "light") {
        root.classList.remove("dark");
      } else {
        // System preference
        const isDark = window.matchMedia(
          "(prefers-color-scheme: dark)"
        ).matches;
        if (isDark) {
          root.classList.add("dark");
        } else {
          root.classList.remove("dark");
        }
      }
    }
  };

  if (!user) {
    return null;
  }

  const email = user.email || "user@example.com";
  const displayName = getDisplayName({
    firstName: null,
    lastName: null,
    email,
  });
  const initials = getInitials(displayName);
  const avatarColor = getAvatarColor(displayName);

  return (
    <div className="min-h-screen flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
      {/* Subtle grid pattern background */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: "24px 24px",
        }}
      />

      <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col items-center relative z-10">
        {/* Centered context indicator */}
        <div className="mb-8 flex items-center gap-2 text-slate-400 dark:text-slate-500">
          <User size={20} />
          <span className="text-xs font-black uppercase tracking-widest">
            Personal Profile
          </span>
        </div>

        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Left Card: Account Info */}
          <Card className="rounded-[2rem] p-6 md:p-10 flex flex-col items-center relative overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            {/* Avatar */}
            <div
              className="w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center text-white text-3xl md:text-4xl font-bold mb-6 shadow-inner"
              style={{ backgroundColor: avatarColor }}
            >
              {initials}
            </div>

            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 mb-2 text-center">
              {displayName}
            </h1>
            <a
              href={`mailto:${email}`}
              className="text-blue-500 hover:underline mb-6 md:mb-10 font-medium text-sm md:text-base"
            >
              {email}
            </a>

            <div className="w-full flex flex-col gap-3 mb-8 md:mb-12">
              <Link
                to="/boards"
                className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all shadow-md active:scale-[0.98] block text-center"
              >
                View all boards
              </Link>
            </div>

            <div className="w-full pt-6 md:pt-8 border-t border-slate-100 dark:border-slate-800 flex justify-center">
              <Button
                onClick={logout}
                variant="outline"
                className="py-2 px-6 rounded-full text-sm font-medium"
              >
                Sign out of Groove on this device
              </Button>
            </div>
          </Card>

          {/* Right Card: Settings */}
          <Card className="rounded-[2rem] p-6 md:p-10 flex flex-col gap-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            {/* Appearance */}
            <section>
              <div className="flex items-center gap-4 mb-6">
                <div className="h-px flex-1 bg-slate-100 dark:bg-slate-700"></div>
                <h2 className="text-xl font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest text-[13px]">
                  Appearance
                </h2>
                <div className="h-px flex-1 bg-slate-100 dark:bg-slate-700"></div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <AppearanceButton
                  active={theme === "light"}
                  onClick={() => setTheme("light")}
                  icon="sun"
                  label="Always light"
                />
                <AppearanceButton
                  active={theme === "dark"}
                  onClick={() => setTheme("dark")}
                  icon="moon"
                  label="Always dark"
                />
                <AppearanceButton
                  active={theme === "system"}
                  onClick={() => setTheme("system")}
                  icon="monitor"
                  label="Same as OS"
                />
              </div>
            </section>

            {/* Developer */}
            <section>
              <div className="flex items-center gap-4 mb-6">
                <div className="h-px flex-1 bg-slate-100 dark:bg-slate-700"></div>
                <h2 className="text-xl font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest text-[13px]">
                  Developer
                </h2>
                <div className="h-px flex-1 bg-slate-100 dark:bg-slate-700"></div>
              </div>

              <p className="text-center text-slate-600 dark:text-slate-400 text-sm font-medium">
                Manage{" "}
                <button className="text-blue-500 hover:underline">
                  personal access tokens
                </button>{" "}
                used with the Groove developer API.
              </p>
            </section>
          </Card>
        </div>

        {/* Footer Quote */}
        <div className="mt-12 md:mt-16 text-center">
          <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100">
            What have you been up to?
          </h3>
        </div>
      </div>
    </div>
  );
}
