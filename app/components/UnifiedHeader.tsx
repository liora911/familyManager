"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import HouseIcon from "@/app/components/HouseIcon";
import { useTheme } from "@/app/components/ThemeProvider";
import {
  getPushStatus,
  enablePush,
  disablePush,
  needsHomeScreenInstall,
  type PushStatus,
} from "@/lib/push";

const USER_LABELS: Record<string, string> = {
  yarin: "ירין",
  liora: "ליאורה",
  shared: "משותף",
};

export type HeaderSection = "chat" | "inventory" | "resources";

// ── Monochrome SVG Icons ─────────────────────────────────────────────

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M10 2a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 2zM10 15a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 15zM10 7a3 3 0 100 6 3 3 0 000-6zM15.657 5.404a.75.75 0 10-1.06-1.06l-1.061 1.06a.75.75 0 001.06 1.061l1.06-1.06zM6.464 14.596a.75.75 0 10-1.06-1.06l-1.06 1.06a.75.75 0 001.06 1.06l1.06-1.06zM18 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 0118 10zM5 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 015 10zM14.596 13.535a.75.75 0 011.061 1.061l-1.06 1.06a.75.75 0 01-1.061-1.06l1.06-1.06zM5.404 4.343a.75.75 0 011.06 1.061l-1.06 1.06a.75.75 0 01-1.06-1.06l1.06-1.06z" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M7.455 2.004a.75.75 0 01.26.77 7 7 0 009.958 7.967.75.75 0 011.067.853A8.5 8.5 0 116.647 1.921a.75.75 0 01.808.083z" clipRule="evenodd" />
    </svg>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M10 2a6 6 0 00-6 6c0 1.887-.454 3.665-1.257 5.234a.75.75 0 00.515 1.076 32.91 32.91 0 003.256.508 3.5 3.5 0 006.972 0 32.903 32.903 0 003.256-.508.75.75 0 00.515-1.076A11.448 11.448 0 0116 8a6 6 0 00-6-6zM8.05 14.943a33.54 33.54 0 003.9 0 2 2 0 01-3.9 0z" clipRule="evenodd" />
    </svg>
  );
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M10 2c-2.236 0-4.43.18-6.57.524C1.993 2.755 1 4.014 1 5.426v5.148c0 1.413.993 2.67 2.43 2.902 1.168.188 2.352.327 3.55.414.28.02.521.18.642.413l1.713 3.293a.75.75 0 001.33 0l1.713-3.293a.783.783 0 01.642-.413 41.102 41.102 0 003.55-.414c1.437-.231 2.43-1.49 2.43-2.902V5.426c0-1.413-.993-2.67-2.43-2.902A41.289 41.289 0 0010 2zM6.75 6a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0 2.5a.75.75 0 000 1.5h3.5a.75.75 0 000-1.5h-3.5z" clipRule="evenodd" />
    </svg>
  );
}

function InventoryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M9.293 2.293a1 1 0 011.414 0l7 7A1 1 0 0117 11h-1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6H3a1 1 0 01-.707-1.707l7-7zM15 16V9.414l-5-5-5 5V16h4v-3a1 1 0 012 0v3h4z" clipRule="evenodd" />
    </svg>
  );
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M3.75 3A1.75 1.75 0 002 4.75v3.26a3.235 3.235 0 011.75-.51h12.5c.644 0 1.245.188 1.75.51V6.75A1.75 1.75 0 0016.25 5h-4.836a.25.25 0 01-.177-.073L9.823 3.513A1.75 1.75 0 008.586 3H3.75zM3.75 9A1.75 1.75 0 002 10.75v4.5c0 .966.784 1.75 1.75 1.75h12.5A1.75 1.75 0 0018 15.25v-4.5A1.75 1.75 0 0016.25 9H3.75z" />
    </svg>
  );
}

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M15.988 3.012A2.25 2.25 0 0118 5.25v6.5A2.25 2.25 0 0115.75 14H13.5v-3.379a3 3 0 00-.879-2.121l-3.12-3.121a3 3 0 00-1.402-.791 2.252 2.252 0 011.913-1.576A2.25 2.25 0 0112.25 1h1.5a2.25 2.25 0 012.238 2.012zM11.5 3.25a.75.75 0 01.75-.75h1.5a.75.75 0 01.75.75v.25a.75.75 0 01-.75.75h-1.5a.75.75 0 01-.75-.75v-.25z" clipRule="evenodd" />
      <path d="M3.5 6A1.5 1.5 0 002 7.5v9A1.5 1.5 0 003.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L8.44 6.439A1.5 1.5 0 007.378 6H3.5z" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
    </svg>
  );
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z" clipRule="evenodd" />
      <path fillRule="evenodd" d="M19 10a.75.75 0 00-.75-.75H8.704l1.048-.943a.75.75 0 10-1.004-1.114l-2.5 2.25a.75.75 0 000 1.114l2.5 2.25a.75.75 0 101.004-1.114l-1.048-.943h9.546A.75.75 0 0019 10z" clipRule="evenodd" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
    </svg>
  );
}

// ── Header ───────────────────────────────────────────────────────────
//
// Shared top bar for every signed-in page. On the home page the callbacks
// switch views in place; elsewhere (e.g. /resources) they navigate home.

export default function UnifiedHeader({
  user,
  active,
  isPanelOpen = false,
  hasMessages = false,
  onTogglePanel,
  onClearChat,
  onOpenInventory,
  onOpenChat,
}: {
  user: string;
  /** Which section is showing, for the highlighted nav item */
  active: HeaderSection;
  isPanelOpen?: boolean;
  hasMessages?: boolean;
  onTogglePanel?: () => void;
  onClearChat?: () => void;
  onOpenInventory?: () => void;
  onOpenChat?: () => void;
}) {
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [push, setPush] = useState<PushStatus | "loading">("loading");
  const [pushBusy, setPushBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const goChat = onOpenChat ?? (() => router.push("/"));
  const goInventory = onOpenInventory ?? (() => router.push("/#inventory"));
  const toggleDashboard = onTogglePanel ?? (() => router.push("/#dashboard"));

  useEffect(() => {
    getPushStatus().then(setPush).catch(() => setPush("unsupported"));
  }, []);

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

  const handlePushToggle = async () => {
    if (pushBusy || push === "loading") return;
    if (push === "unsupported") {
      alert(
        needsHomeScreenInstall()
          ? "כדי לקבל התראות באייפון צריך להוסיף את האפליקציה למסך הבית (שיתוף ← הוספה למסך הבית) ולפתוח אותה משם."
          : "הדפדפן הזה לא תומך בהתראות."
      );
      return;
    }
    if (push === "denied") {
      alert("ההתראות חסומות בהגדרות הדפדפן לאתר הזה. אפשר לאפשר אותן שם ולנסות שוב.");
      return;
    }
    setPushBusy(true);
    try {
      setPush(push === "subscribed" ? await disablePush() : await enablePush());
    } catch {
      alert("לא הצלחנו להפעיל התראות. נסו שוב מאוחר יותר.");
    } finally {
      setPushBusy(false);
    }
  };

  const pushOn = push === "subscribed";
  const pushLabel = pushOn ? "התראות פעילות" : "הפעלת התראות";
  const themeLabel = theme === "dark" ? "מצב בהיר" : "מצב כהה";

  const navPill = (isActive: boolean) =>
    `hidden sm:flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full transition-colors ${
      isActive ? "text-link bg-badge-blue-bg" : "text-muted hover:text-primary"
    }`;

  const menuItem = (isActive = false) =>
    `w-full flex items-center gap-2.5 text-right px-4 py-3 text-sm transition-colors ${
      isActive ? "text-link bg-badge-blue-bg" : "text-primary hover:bg-hover"
    }`;

  const close = (fn: () => void) => () => {
    setMenuOpen(false);
    fn();
  };

  return (
    <header className="flex-shrink-0 border-b border-border bg-card px-3 sm:px-6 py-3" dir="rtl">
      <div className="flex items-center justify-between gap-2">
        {/* Logo + title (goes to chat) */}
        <button
          onClick={goChat}
          className="flex items-center gap-2 min-w-0 text-right rounded-lg -m-1 p-1 hover:bg-hover transition-colors"
          aria-label="מעבר לצ׳אט"
        >
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
        </button>

        {/* Actions */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {/* ── Desktop ── */}
          <button
            onClick={toggle}
            className="hidden sm:flex items-center justify-center text-muted hover:text-primary transition-colors p-2 rounded-lg hover:bg-hover"
            title={themeLabel}
            aria-label={themeLabel}
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
          {push !== "loading" && (
            <button
              onClick={handlePushToggle}
              disabled={pushBusy}
              className={`hidden sm:flex items-center justify-center transition-colors p-2 rounded-lg hover:bg-hover disabled:opacity-50 ${
                pushOn ? "text-link" : "text-muted hover:text-primary"
              }`}
              title={pushLabel}
              aria-label={pushLabel}
              aria-pressed={pushOn}
            >
              <BellIcon />
            </button>
          )}
          {hasMessages && onClearChat && (
            <button
              onClick={onClearChat}
              className="hidden sm:flex items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors px-2 py-1.5 rounded-lg hover:bg-hover"
            >
              <PlusIcon className="w-4 h-4" />
              שיחה חדשה
            </button>
          )}
          <button
            onClick={handleSwitchUser}
            className="hidden sm:flex items-center gap-1.5 text-xs bg-tag hover:bg-hover text-secondary px-3 py-1.5 rounded-full transition-colors"
          >
            <UserIcon className="w-3.5 h-3.5" />
            החלף פרופיל
          </button>
          <button onClick={goChat} className={navPill(active === "chat")} aria-current={active === "chat" ? "page" : undefined}>
            <ChatIcon />
            צ׳אט
          </button>
          <button onClick={goInventory} className={navPill(active === "inventory")} aria-current={active === "inventory" ? "page" : undefined}>
            <InventoryIcon />
            מלאי הבית
          </button>
          <Link href="/resources" className={navPill(active === "resources")} aria-current={active === "resources" ? "page" : undefined}>
            <FolderIcon />
            משאבים
          </Link>
          <button onClick={toggleDashboard} className={navPill(isPanelOpen)} aria-pressed={isPanelOpen}>
            <ClipboardIcon />
            דשבורד ניהול
          </button>
          <button
            onClick={handleLogout}
            className="hidden sm:flex items-center justify-center text-muted hover:text-primary transition-colors p-2 rounded-lg hover:bg-hover"
            title="יציאה"
            aria-label="יציאה"
          >
            <LogoutIcon />
          </button>

          {/* ── Mobile: chat (when elsewhere) + dashboard + overflow menu ── */}
          {active !== "chat" && (
            <button
              onClick={goChat}
              className="sm:hidden p-2.5 rounded-full text-muted hover:text-primary transition-colors"
              aria-label="צ׳אט"
            >
              <ChatIcon className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={toggleDashboard}
            className={`sm:hidden p-2.5 rounded-full transition-colors ${
              isPanelOpen ? "text-link bg-badge-blue-bg" : "text-muted hover:text-primary"
            }`}
            aria-label="דשבורד ניהול"
            aria-pressed={isPanelOpen}
          >
            <ClipboardIcon className="w-5 h-5" />
          </button>

          <div className="relative sm:hidden" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((p) => !p)}
              className="p-2.5 rounded-full text-muted hover:text-primary transition-colors"
              aria-label="תפריט"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M3 10a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM8.5 10a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM15.5 8.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" />
              </svg>
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute left-0 top-full mt-1 w-56 bg-card border border-border rounded-xl
                           shadow-lg z-50 py-1 overflow-hidden"
              >
                <button role="menuitem" onClick={close(goChat)} className={menuItem(active === "chat")}>
                  <ChatIcon className={`w-4 h-4 flex-shrink-0 ${active === "chat" ? "text-link" : "text-muted"}`} />
                  צ׳אט
                </button>
                <button role="menuitem" onClick={close(goInventory)} className={menuItem(active === "inventory")}>
                  <InventoryIcon className={`w-4 h-4 flex-shrink-0 ${active === "inventory" ? "text-link" : "text-muted"}`} />
                  מלאי הבית
                </button>
                <Link
                  role="menuitem"
                  href="/resources"
                  onClick={() => setMenuOpen(false)}
                  className={menuItem(active === "resources")}
                >
                  <FolderIcon className={`w-4 h-4 flex-shrink-0 ${active === "resources" ? "text-link" : "text-muted"}`} />
                  משאבים
                </Link>
                {push !== "loading" && (
                  <button role="menuitem" onClick={close(handlePushToggle)} className={menuItem()}>
                    <BellIcon className={`w-4 h-4 flex-shrink-0 ${pushOn ? "text-link" : "text-muted"}`} />
                    {pushLabel}
                    {pushOn && <span className="mr-auto text-xs text-link">✓</span>}
                  </button>
                )}
                <button role="menuitem" onClick={close(toggle)} className={menuItem()}>
                  {theme === "dark"
                    ? <SunIcon className="w-4 h-4 text-muted flex-shrink-0" />
                    : <MoonIcon className="w-4 h-4 text-muted flex-shrink-0" />
                  }
                  {themeLabel}
                </button>
                {hasMessages && onClearChat && (
                  <button role="menuitem" onClick={close(onClearChat)} className={menuItem()}>
                    <PlusIcon className="w-4 h-4 text-muted flex-shrink-0" />
                    שיחה חדשה
                  </button>
                )}
                <button role="menuitem" onClick={close(handleSwitchUser)} className={menuItem()}>
                  <UserIcon className="w-4 h-4 text-muted flex-shrink-0" />
                  החלף פרופיל
                </button>
                <div className="border-t border-border" />
                <button
                  role="menuitem"
                  onClick={close(handleLogout)}
                  className="w-full flex items-center gap-2.5 text-right px-4 py-3 text-sm text-red-500 hover:bg-hover transition-colors"
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
