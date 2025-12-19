"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  // Use resolvedTheme which is only available after hydration
  // During SSR, resolvedTheme will be undefined, so we default to dark
  // After hydration, resolvedTheme will match the actual theme
  const currentTheme = resolvedTheme || theme || "dark";
  const isLight = currentTheme === "light";

  return (
    <button
      onClick={() => setTheme(isLight ? "dark" : "light")}
      className={`p-2 rounded-lg transition-colors ${
        isLight
          ? "bg-zinc-200 hover:bg-zinc-300 text-zinc-900"
          : "bg-zinc-800 hover:bg-zinc-700 text-white"
      }`}
      aria-label={`Switch to ${isLight ? "dark" : "light"} mode`}
      title={`Switch to ${isLight ? "dark" : "light"} mode`}
      suppressHydrationWarning
    >
      {isLight ? (
        <Moon className="w-5 h-5" />
      ) : (
        <Sun className="w-5 h-5" />
      )}
    </button>
  );
}

