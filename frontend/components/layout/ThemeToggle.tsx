"use client";

import { useCallback, useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "narrativescope-theme";

type ThemeName = "light" | "dark";

function applyTheme(theme: ThemeName) {
  const isDark = theme === "dark";
  document.documentElement.classList.toggle("theme-dark", isDark);
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(STORAGE_KEY, theme);
}

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const darkEnabled = document.documentElement.classList.contains("theme-dark");
    setIsDark(darkEnabled);
  }, []);

  const onToggle = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    const nextDark = !isDark;
    const nextTheme: ThemeName = nextDark ? "dark" : "light";

    const buttonRect = event.currentTarget.getBoundingClientRect();
    const centerX = buttonRect.left + buttonRect.width / 2;
    const centerY = buttonRect.top + buttonRect.height / 2;

    const maxRadius = Math.max(
      Math.hypot(centerX, centerY),
      Math.hypot(window.innerWidth - centerX, centerY),
      Math.hypot(centerX, window.innerHeight - centerY),
      Math.hypot(window.innerWidth - centerX, window.innerHeight - centerY),
    );

    if (!("startViewTransition" in document)) {
      applyTheme(nextTheme);
      setIsDark(nextDark);
      return;
    }

    const transition = (document as Document & {
      startViewTransition: (callback: () => void) => { ready: Promise<void> };
    }).startViewTransition(() => {
      flushSync(() => {
        applyTheme(nextTheme);
        setIsDark(nextDark);
      });
    });

    await transition.ready;

    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${centerX}px ${centerY}px)`,
          `circle(${maxRadius}px at ${centerX}px ${centerY}px)`,
        ],
      },
      {
        duration: 1000,
        easing: "ease-in-out",
        pseudoElement: "::view-transition-new(root)",
      },
    );

    document.documentElement.animate(
      { opacity: [1, 1] },
      {
        duration: 1000,
        easing: "linear",
        pseudoElement: "::view-transition-old(root)",
      },
    );
  }, [isDark]);

  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d1d5db] bg-white text-[#1a1a3e] shadow-sm transition-transform duration-200 hover:scale-105"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
