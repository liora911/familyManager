"use client";

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
}: {
  user: string;
  isPanelOpen: boolean;
  hasMessages: boolean;
  onTogglePanel: () => void;
  onClearChat: () => void;
}) {
  const { theme, toggle } = useTheme();

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
      <div className="flex items-center justify-between">
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
        <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
          <button
            onClick={toggle}
            className="text-lg sm:text-sm text-muted hover:text-primary transition-colors p-2 sm:p-1"
            title={theme === "dark" ? "מצב בהיר" : "מצב כהה"}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          {hasMessages && (
            <button
              onClick={onClearChat}
              className="text-xs text-muted hover:text-primary transition-colors hidden sm:block"
              title="נקה צ׳אט"
            >
              נקה צ׳אט
            </button>
          )}
          <button
            onClick={handleSwitchUser}
            className="text-lg sm:text-xs bg-tag hover:bg-hover text-secondary p-2 sm:px-3 sm:py-1.5 rounded-full transition-colors"
            title="החלף פרופיל"
          >
            <span className="sm:hidden">👤</span>
            <span className="hidden sm:inline">החלף פרופיל</span>
          </button>
          <button
            onClick={onTogglePanel}
            className={`text-lg sm:text-sm p-2 sm:px-3 sm:py-1.5 rounded-full transition-colors ${
              isPanelOpen
                ? "text-link bg-badge-blue-bg"
                : "text-muted hover:text-primary"
            }`}
            title={isPanelOpen ? "סגור לוח בקרה" : "פתח לוח בקרה"}
          >
            <span className="sm:hidden">📋</span>
            <span className="hidden sm:inline">📋 לוח בקרה</span>
          </button>
          <button
            onClick={handleLogout}
            className="text-xs text-muted hover:text-primary transition-colors p-2 sm:p-0"
            title="יציאה"
          >
            יציאה
          </button>
        </div>
      </div>
      {hasMessages && (
        <div className="sm:hidden mt-1.5 flex justify-end">
          <button
            onClick={onClearChat}
            className="text-xs text-muted hover:text-primary transition-colors"
          >
            נקה צ׳אט
          </button>
        </div>
      )}
    </header>
  );
}
