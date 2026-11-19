"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { THEME_KEY as KEY } from "@/lib/theme";

type Theme = "light" | "dark";
const paper: Record<Theme, string> = { light: "#f5f0e6", dark: "#161a17" };

const system = (): Theme => (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

/** The browser bar takes the page colour too. */
function paintBar(t: Theme) {
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", paper[t]));
}

/** Sun and moon. Without a pick the site follows the system; picking the system's own theme goes back to following it. */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const picked = document.documentElement.dataset.theme as Theme | undefined;
    const t = picked ?? system();
    setTheme(t);
    if (picked) paintBar(t);
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onSystem = () => {
      if (!document.documentElement.dataset.theme) setTheme(system());
    };
    mq.addEventListener("change", onSystem);
    return () => mq.removeEventListener("change", onSystem);
  }, []);

  const pick = (t: Theme) => {
    const root = document.documentElement;
    try {
      if (t === system()) {
        delete root.dataset.theme;
        localStorage.removeItem(KEY);
      } else {
        root.dataset.theme = t;
        localStorage.setItem(KEY, t);
      }
    } catch {
      // blocked storage: the pick holds until the page closes
      root.dataset.theme = t;
    }
    paintBar(t);
    setTheme(t);
  };

  const button = (t: Theme, label: string) => (
    <button
      type="button"
      onClick={() => pick(t)}
      aria-pressed={theme === t}
      aria-label={label}
      title={label}
      className={`flex h-11 w-11 items-center justify-center rounded-full ${theme === t ? "bg-ink text-bg" : "text-muted hover:text-ink"}`}
    >
      <Icon name={t === "light" ? "sun" : "moon"} className="h-[18px] w-[18px]" />
    </button>
  );

  return (
    <div role="group" aria-label="Theme" className={`inline-flex items-center gap-0.5 rounded-full border border-line bg-surface p-0.5 ${className}`}>
      {button("light", "Light theme")}
      {button("dark", "Dark theme")}
    </div>
  );
}
