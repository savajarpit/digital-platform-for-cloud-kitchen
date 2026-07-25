"use client";

import { useCallback, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { THEME_STORAGE_KEY } from "@/lib/theme/theme-mode";

function subscribe(callback: () => void): () => void {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributeFilter: ["class"] });
  return () => observer.disconnect();
}

function getSnapshot(): boolean {
  return document.documentElement.classList.contains("dark");
}

// The blocking script (theme-mode.ts) may have already set the real class
// before hydration — this only backs the very first server-matching render;
// useSyncExternalStore swaps to the real DOM state immediately after.
function getServerSnapshot(): boolean {
  return false;
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    document.documentElement.classList.toggle("light", !next);
    localStorage.setItem(THEME_STORAGE_KEY, next ? "dark" : "light");
  }, []);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle dark mode"
      className={`rounded-lg p-2.5 text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 ${className}`}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
