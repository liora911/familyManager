"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import HouseIcon from "@/app/components/HouseIcon";
import { useTheme } from "@/app/components/ThemeProvider";

const USER_LABELS: Record<string, string> = {
  yarin: "ירין",
  liora: "ליאורה",
  shared: "משותף",
};

export default function UnifiedHeader({
  user,
  isPanelOpen,
  hasMessages,
  onTogglePanel,
  onClearChat,
  onOpenInventory,
}: {
  user: string;
  isPanelOpen: boolean;
  hasMessages: boolean;
  onTogglePanel: () => void;
  onClearChat: () => void;
  onOpenInventory?: () => void;
}) {
  const { theme, toggle } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const handleLogout = () => {
    document.cookie = "home-manager-auth=; Path=/; Max-Age=0; SameSite=Lax";
    document.cookie = "home-manager-user=; Path=/; Max-Age=0; SameSite=Lax";
    window.location.href = "/login";
  };

  const handleSwitchUser = () => {
    document.cookie = "home-manager-user=; Path=/; Max-Age=0; SameSite=Lax";
    window.location.href = "/select";
  };

  return (
    <header className="flex-shrink-0 border-b border-border bg-card px-3 sm:px-6 py-3">
      <div className="flex items-center justify-between gap-2">
        {/* Left: Logo + title */}
        <div className="flex items-center gap-2 min-w-0">
          <HouseIcon size={24} className="text-link flex-shrink-0" />
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-medium text-primary truncate">
              מנהל הבית
            </h1>
            <p className="text-xs sm:text-sm text-secondary">
              {user === "shared"
                ? "מצב משותף"
                : `שלום ${USER_LABELS[user] || user}`}
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
          {/* ── Desktop-only full buttons ── */}
          <button
            onClick={toggle}
            className="hidden sm:block text-sm text-muted hover:text-primary transition-colors p-1"
            title={theme === "dark" ? "מצב בהיר" : "מצב כהה"}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          {hasMessages && (
            <button
              onClick={onClearChat}
              className="hidden sm:block text-xs text-muted hover:text-primary transition-colors"
            >
              נקה צ׳אט
            </button>
          )}
          <button
            onClick={handleSwitchUser}
            className="hidden sm:block text-xs bg-tag hover:bg-hover text-secondary px-3 py-1.5 rounded-full transition-colors"
          >
            החלף פרופיל
          </button>
          {onOpenInventory && (
            <button
              onClick={onOpenInventory}
              className="hidden sm:block text-sm px-3 py-1.5 rounded-full transition-colors text-muted hover:text-primary"
            >
              🏠 מלאי הבית
            </button>
          )}
          <Link
            href="/resources"
            className="hidden sm:block text-sm px-3 py-1.5 rounded-full transition-colors text-muted hover:text-primary"
          >
            📁 משאבים
          </Link>
          <button
            onClick={onTogglePanel}
            className={`hidden sm:block text-sm px-3 py-1.5 rounded-full transition-colors ${
              isPanelOpen
                ? "text-link bg-badge-blue-bg"
                : "text-muted hover:text-primary"
            }`}
          >
            📋 דשבורד ניהול
          </button>
          <button
            onClick={handleLogout}
            className="hidden sm:block text-xs text-muted hover:text-primary transition-colors"
          >
            יציאה
          </button>

          {/* ── Mobile: primary actions + overflow menu ── */}

          {/* Dashboard toggle — always visible on mobile */}
          <button
            onClick={onTogglePanel}
            className={`sm:hidden text-lg p-2 rounded-full transition-colors ${
              isPanelOpen
                ? "text-link bg-badge-blue-bg"
                : "text-muted hover:text-primary"
            }`}
          >
            📋
          </button>

          {/* "..." overflow menu for mobile */}
          <div className="relative sm:hidden" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((p) => !p)}
              className="text-lg p-2 rounded-full text-muted hover:text-primary transition-colors"
            >
              ⋯
            </button>
            {menuOpen && (
              <div
                className="absolute left-0 top-full mt-1 w-48 bg-card border border-border rounded-xl
                           shadow-lg z-50 py-1 overflow-hidden"
              >
                {onOpenInventory && (
                  <button
                    onClick={() => { setMenuOpen(false); onOpenInventory(); }}
                    className="w-full text-right px-4 py-2.5 text-sm text-primary hover:bg-hover transition-colors"
                  >
                    🏠 מלאי הבית
                  </button>
                )}
                <Link
                  href="/resources"
                  onClick={() => setMenuOpen(false)}
                  className="block w-full text-right px-4 py-2.5 text-sm text-primary hover:bg-hover transition-colors"
                >
                  📁 משאבים
                </Link>
                <button
                  onClick={() => { setMenuOpen(false); toggle(); }}
                  className="w-full text-right px-4 py-2.5 text-sm text-primary hover:bg-hover transition-colors"
                >
                  {theme === "dark" ? "☀️ מצב בהיר" : "🌙 מצב כהה"}
                </button>
                {hasMessages && (
                  <button
                    onClick={() => { setMenuOpen(false); onClearChat(); }}
                    className="w-full text-right px-4 py-2.5 text-sm text-primary hover:bg-hover transition-colors"
                  >
                    🧹 נקה צ׳אט
                  </button>
                )}
                <button
                  onClick={() => { setMenuOpen(false); handleSwitchUser(); }}
                  className="w-full text-right px-4 py-2.5 text-sm text-primary hover:bg-hover transition-colors"
                >
                  👤 החלף פרופיל
                </button>
                <div className="border-t border-border" />
                <button
                  onClick={() => { setMenuOpen(false); handleLogout(); }}
                  className="w-full text-right px-4 py-2.5 text-sm text-red-500 hover:bg-hover transition-colors"
                >
                  🚪 יציאה
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
