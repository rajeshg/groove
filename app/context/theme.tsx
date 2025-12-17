import { createContext, useContext, useState, useEffect } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("system");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Initialize theme from localStorage
    const saved = localStorage.getItem("theme") as Theme | null;
    const initialTheme = saved || "system";
    setTheme(initialTheme);
    applyTheme(initialTheme);
    setIsMounted(true);
  }, []);

  const applyTheme = (t: Theme) => {
    const html = document.documentElement;

    if (t === "system") {
      // Remove dark class and let media query take over
      html.classList.remove("dark");
      localStorage.removeItem("theme");
    } else if (t === "dark") {
      // Set dark class
      html.classList.add("dark");
      localStorage.setItem("theme", t);
    } else {
      // Light mode: remove dark class
      html.classList.remove("dark");
      localStorage.setItem("theme", t);
    }
  };

  useEffect(() => {
    if (isMounted) {
      applyTheme(theme);
    }
  }, [theme, isMounted]);

  const toggleTheme = () => {
    setTheme((prev) => {
      if (prev === "light") return "dark";
      if (prev === "dark") return "system";
      return "light";
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
