"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

const THEME_COLORS: Record<Theme, string> = {
  dark: "#09090b",
  light: "#f9fafb",
};

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "dark",
  toggle: () => {},
});

function applyTheme(t: Theme) {
  document.documentElement.classList.toggle("dark", t === "dark");
  // Keep the browser chrome / PWA status bar in step with the theme
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((m) => m.setAttribute("content", THEME_COLORS[t]));
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const initial: Theme = saved === "light" ? "light" : "dark";
    setTheme(initial);
    applyTheme(initial);

    // Register the service worker (offline shell + push).
    // Push subscription itself happens from the bell button in the header,
    // because browsers only allow the permission prompt after a tap.
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // PWA standalone tweaks
    if (window.matchMedia("(display-mode: standalone)").matches) {
      document.body.classList.add("pwa");
      document.addEventListener("contextmenu", function (e) {
        if ((e as MouseEvent).shiftKey) return;
        const t = e.target as HTMLElement;
        if (t.matches("a,img,textarea:not([disabled]),input[type=text]:not([disabled])")) return;
        const s = window.getSelection();
        if (s && s.toString().length > 0) return;
        e.preventDefault();
      });
    }
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    localStorage.setItem("theme", next);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
