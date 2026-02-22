"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "dark",
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const saved = localStorage.getItem("theme") as Theme | null;
    const initial = saved || "dark";
    setTheme(initial);
    applyTheme(initial);

    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js");
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

  const applyTheme = (t: Theme) => {
    const root = document.documentElement;
    if (t === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  };

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
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
