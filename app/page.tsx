"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import HouseIcon from "@/app/components/HouseIcon";
import { useTheme } from "@/app/components/ThemeProvider";

interface Message {
  role: "user" | "assistant";
  content: string;
  actions?: { tool: string; input: unknown; result: unknown }[];
  timestamp: Date;
}

const USER_LABELS: Record<string, string> = {
  yarin: "ירין",
  liora: "ליאורה",
  shared: "משותף",
};

function getUser(): string {
  const match = document.cookie.match(/home-manager-user=(\w+)/);
  return match?.[1] || "shared";
}

function loadMessages(): Message[] {
  try {
    const stored = localStorage.getItem("home-manager-messages");
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return parsed.map((m: Record<string, unknown>) => ({
      ...m,
      timestamp: new Date(m.timestamp as string),
    }));
  } catch {
    return [];
  }
}

function saveMessages(msgs: Message[]) {
  const toSave = msgs.slice(-50);
  localStorage.setItem("home-manager-messages", JSON.stringify(toSave));
}

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState("shared");
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { theme, toggle } = useTheme();

  useEffect(() => {
    setUser(getUser());
    setMessages(loadMessages());
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    if (messages.length > 0) saveMessages(messages);
  }, [messages]);

  const handleSubmit = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = {
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = messages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg.content, history, user }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "שגיאה");

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.response,
          actions: data.actions,
          timestamp: new Date(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "שגיאה - נסי שוב 😅", timestamp: new Date() },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleLogout = () => {
    document.cookie = "home-manager-auth=; Path=/; Max-Age=0; SameSite=Lax";
    document.cookie = "home-manager-user=; Path=/; Max-Age=0; SameSite=Lax";
    window.location.href = "/login";
  };

  const handleSwitchUser = () => {
    document.cookie = "home-manager-user=; Path=/; Max-Age=0; SameSite=Lax";
    window.location.href = "/select";
  };

  const handleClearChat = () => {
    setMessages([]);
    localStorage.removeItem("home-manager-messages");
  };

  return (
    <div dir="rtl" className="flex flex-col h-dvh bg-surface text-primary">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-border bg-card px-3 sm:px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <HouseIcon size={24} className="text-link flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-medium text-primary truncate">מנהל הבית</h1>
              <p className="text-xs sm:text-sm text-secondary">
                {user === "shared" ? "מצב משותף" : `שלום ${USER_LABELS[user] || user}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <button
              onClick={toggle}
              className="text-sm text-muted hover:text-primary transition-colors p-1"
              title={theme === "dark" ? "מצב בהיר" : "מצב כהה"}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
            {messages.length > 0 && (
              <button
                onClick={handleClearChat}
                className="text-xs text-muted hover:text-primary transition-colors hidden sm:block"
                title="נקה צ׳אט"
              >
                נקה צ׳אט
              </button>
            )}
            <button
              onClick={handleSwitchUser}
              className="text-xs bg-tag hover:bg-hover text-secondary px-2 sm:px-3 py-1.5 rounded-full transition-colors"
              title="החלף פרופיל"
            >
              <span className="sm:hidden">👤</span>
              <span className="hidden sm:inline">החלף פרופיל</span>
            </button>
            <Link
              href="/dashboard"
              className="text-sm text-link hover:text-link-hover transition-colors"
              title="לוח בקרה"
            >
              <span className="sm:hidden">📋</span>
              <span className="hidden sm:inline">📋 לוח בקרה</span>
            </Link>
            <button
              onClick={handleLogout}
              className="text-xs text-muted hover:text-primary transition-colors"
              title="יציאה"
            >
              יציאה
            </button>
          </div>
        </div>
        {messages.length > 0 && (
          <div className="sm:hidden mt-1.5 flex justify-end">
            <button
              onClick={handleClearChat}
              className="text-xs text-muted hover:text-primary transition-colors"
            >
              נקה צ׳אט
            </button>
          </div>
        )}
      </header>

      {/* Messages area */}
      <main className="flex-1 overflow-y-auto px-3 py-4 sm:px-4 sm:py-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted mt-20 space-y-3">
              <p className="text-4xl">🚀</p>
              <p className="text-lg text-secondary">מה עושים היום?</p>
              <div className="text-sm space-y-1 text-muted">
                <p>&quot;תקבעי לגפן רופא שיניים ליום חמישי ב-10 בבוקר&quot;</p>
                <p>&quot;תוסיפי חלב, ביצים ולחם לרשימת הסופר&quot;</p>
                <p>&quot;מה יש לנו השבוע?&quot;</p>
                <p>&quot;תזכירי לי מחר בבוקר לחדש ביטוח&quot;</p>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-card text-primary shadow-sm border border-border"
                }`}
                style={msg.role === "assistant" ? { boxShadow: `0 1px 2px var(--color-shadow)` } : undefined}
              >
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {msg.content}
                </p>
                {msg.actions && msg.actions.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-divider">
                    <p className="text-xs text-muted">
                      {msg.actions.length}{" "}
                      {msg.actions.length === 1 ? "פעולה" : "פעולות"} בוצעו ✓
                    </p>
                  </div>
                )}
                <p className="text-[10px] text-muted mt-1">
                  {msg.timestamp.toLocaleTimeString("he-IL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-end">
              <div className="bg-card rounded-2xl px-4 py-3 border border-border" style={{ boxShadow: `0 1px 2px var(--color-shadow)` }}>
                <div className="flex gap-1.5 items-center">
                  <div className="w-2 h-2 bg-muted rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-muted rounded-full animate-bounce [animation-delay:0.1s]" />
                  <div className="w-2 h-2 bg-muted rounded-full animate-bounce [animation-delay:0.2s]" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input area */}
      <footer className="flex-shrink-0 border-t border-border bg-card p-3 sm:p-4">
        <div className="max-w-2xl mx-auto flex gap-2 sm:gap-3 items-end">
          <input
            type="text"
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="תנעצי לי רופא עיניים לאיתן..."
            className="flex-1 bg-input border border-divider rounded-xl px-3 sm:px-4 py-3
                       text-primary placeholder-muted
                       focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                       text-sm"
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || loading}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-disabled disabled:text-disabled-text
                       text-white font-medium px-4 sm:px-6 py-3 rounded-xl transition-colors
                       text-sm flex-shrink-0"
          >
            שגר 🚀
          </button>
        </div>
      </footer>
    </div>
  );
}
