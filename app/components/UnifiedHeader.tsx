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

// ── Monochrome SVG Icons ─────────────────────────────────────────────

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 2a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 2zM10 15a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 15zM10 7a3 3 0 100 6 3 3 0 000-6zM15.657 5.404a.75.75 0 10-1.06-1.06l-1.061 1.06a.75.75 0 001.06 1.061l1.06-1.06zM6.464 14.596a.75.75 0 10-1.06-1.06l-1.06 1.06a.75.75 0 001.06 1.06l1.06-1.06zM18 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 0118 10zM5 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 015 10zM14.596 13.535a.75.75 0 011.061 1.061l-1.06 1.06a.75.75 0 01-1.061-1.06l1.06-1.06zM5.404 4.343a.75.75 0 011.06 1.061l-1.06 1.06a.75.75 0 01-1.06-1.06l1.06-1.06z" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M7.455 2.004a.75.75 0 01.26.77 7 7 0 009.958 7.967.75.75 0 011.067.853A8.5 8.5 0 116.647 1.921a.75.75 0 01.808.083z" clipRule="evenodd" />
    </svg>
  );
}

function InventoryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M9.293 2.293a1 1 0 011.414 0l7 7A1 1 0 0117 11h-1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6H3a1 1 0 01-.707-1.707l7-7zM15 16V9.414l-5-5-5 5V16h4v-3a1 1 0 012 0v3h4z" clipRule="evenodd" />
    </svg>
  );
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
      <path d="M3.75 3A1.75 1.75 0 002 4.75v3.26a3.235 3.235 0 011.75-.51h12.5c.644 0 1.245.188 1.75.51V6.75A1.75 1.75 0 0016.25 5h-4.836a.25.25 0 01-.177-.073L9.823 3.513A1.75 1.75 0 008.586 3H3.75zM3.75 9A1.75 1.75 0 002 10.75v4.5c0 .966.784 1.75 1.75 1.75h12.5A1.75 1.75 0 0018 15.25v-4.5A1.75 1.75 0 0016.25 9H3.75z" />
    </svg>
  );
}

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M15.988 3.012A2.25 2.25 0 0118 5.25v6.5A2.25 2.25 0 0115.75 14H13.5v-3.379a3 3 0 00-.879-2.121l-3.12-3.121a3 3 0 00-1.402-.791 2.252 2.252 0 011.913-1.576A2.25 2.25 0 0112.25 1h1.5a2.25 2.25 0 012.238 2.012zM11.5 3.25a.75.75 0 01.75-.75h1.5a.75.75 0 01.75.75v.25a.75.75 0 01-.75.75h-1.5a.75.75 0 01-.75-.75v-.25z" clipRule="evenodd" />
      <path d="M3.5 6A1.5 1.5 0 002 7.5v9A1.5 1.5 0 003.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L8.44 6.439A1.5 1.5 0 007.378 6H3.5z" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
    </svg>
  );
}

function BroomIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
    </svg>
  );
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z" clipRule="evenodd" />
      <path fillRule="evenodd" d="M19 10a.75.75 0 00-.75-.75H8.704l1.048-.943a.75.75 0 10-1.004-1.114l-2.5 2.25a.75.75 0 000 1.114l2.5 2.25a.75.75 0 101.004-1.114l-1.048-.943h9.546A.75.75 0 0019 10z" clipRule="evenodd" />
    </svg>
  );
}

// ── Header ───────────────────────────────────────────────────────────

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
            className="hidden sm:flex items-center justify-center text-muted hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-hover"
            title={theme === "dark" ? "מצב בהיר" : "מצב כהה"}
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
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
            className="hidden sm:flex items-center gap-1.5 text-xs bg-tag hover:bg-hover text-secondary px-3 py-1.5 rounded-full transition-colors"
          >
            <UserIcon className="w-3.5 h-3.5" />
            החלף פרופיל
          </button>
          {onOpenInventory && (
            <button
              onClick={onOpenInventory}
              className="hidden sm:flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full transition-colors text-muted hover:text-primary"
            >
              <InventoryIcon />
              מלאי הבית
            </button>
          )}
          <Link
            href="/resources"
            className="hidden sm:flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full transition-colors text-muted hover:text-primary"
          >
            <FolderIcon />
            משאבים
          </Link>
          <button
            onClick={onTogglePanel}
            className={`hidden sm:flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full transition-colors ${
              isPanelOpen
                ? "text-link bg-badge-blue-bg"
                : "text-muted hover:text-primary"
            }`}
          >
            <ClipboardIcon />
            דשבורד ניהול
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
            className={`sm:hidden p-2 rounded-full transition-colors ${
              isPanelOpen
                ? "text-link bg-badge-blue-bg"
                : "text-muted hover:text-primary"
            }`}
          >
            <ClipboardIcon className="w-5 h-5" />
          </button>

          {/* "..." overflow menu for mobile */}
          <div className="relative sm:hidden" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((p) => !p)}
              className="text-lg p-2 rounded-full text-muted hover:text-primary transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M3 10a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM8.5 10a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM15.5 8.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" />
              </svg>
            </button>
            {menuOpen && (
              <div
                className="absolute left-0 top-full mt-1 w-48 bg-card border border-border rounded-xl
                           shadow-lg z-50 py-1 overflow-hidden"
              >
                {onOpenInventory && (
                  <button
                    onClick={() => { setMenuOpen(false); onOpenInventory(); }}
                    className="w-full flex items-center gap-2.5 text-right px-4 py-2.5 text-sm text-primary hover:bg-hover transition-colors"
                  >
                    <InventoryIcon className="w-4 h-4 text-muted flex-shrink-0" />
                    מלאי הבית
                  </button>
                )}
                <Link
                  href="/resources"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 w-full text-right px-4 py-2.5 text-sm text-primary hover:bg-hover transition-colors"
                >
                  <FolderIcon className="w-4 h-4 text-muted flex-shrink-0" />
                  משאבים
                </Link>
                <button
                  onClick={() => { setMenuOpen(false); toggle(); }}
                  className="w-full flex items-center gap-2.5 text-right px-4 py-2.5 text-sm text-primary hover:bg-hover transition-colors"
                >
                  {theme === "dark"
                    ? <SunIcon className="w-4 h-4 text-muted flex-shrink-0" />
                    : <MoonIcon className="w-4 h-4 text-muted flex-shrink-0" />
                  }
                  {theme === "dark" ? "מצב בהיר" : "מצב כהה"}
                </button>
                {hasMessages && (
                  <button
                    onClick={() => { setMenuOpen(false); onClearChat(); }}
                    className="w-full flex items-center gap-2.5 text-right px-4 py-2.5 text-sm text-primary hover:bg-hover transition-colors"
                  >
                    <BroomIcon className="w-4 h-4 text-muted flex-shrink-0" />
                    נקה צ׳אט
                  </button>
                )}
                <button
                  onClick={() => { setMenuOpen(false); handleSwitchUser(); }}
                  className="w-full flex items-center gap-2.5 text-right px-4 py-2.5 text-sm text-primary hover:bg-hover transition-colors"
                >
                  <UserIcon className="w-4 h-4 text-muted flex-shrink-0" />
                  החלף פרופיל
                </button>
                <div className="border-t border-border" />
                <button
                  onClick={() => { setMenuOpen(false); handleLogout(); }}
                  className="w-full flex items-center gap-2.5 text-right px-4 py-2.5 text-sm text-red-500 hover:bg-hover transition-colors"
                >
                  <LogoutIcon className="w-4 h-4 flex-shrink-0" />
                  יציאה
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
