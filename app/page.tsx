"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import HouseIcon from "@/app/components/HouseIcon";

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
  // Keep last 50 messages to avoid bloating localStorage
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
      // Send last 10 messages as history so Claude has conversation context
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
    <div dir="rtl" className="flex flex-col h-dvh bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-zinc-800 bg-zinc-900 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium text-zinc-100 flex items-center gap-2">
            <HouseIcon size={28} className="text-blue-400" />
            מנהל הבית
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            {user === "shared" ? "מצב משותף" : `שלום ${USER_LABELS[user] || user}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              נקה צ׳אט
            </button>
          )}
          <button
            onClick={handleSwitchUser}
            className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-3 py-1.5 rounded-full transition-colors"
          >
            החלף פרופיל
          </button>
          <Link
            href="/dashboard"
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            📋 לוח בקרה
          </Link>
          <button
            onClick={handleLogout}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            יציאה
          </button>
        </div>
      </header>

      {/* Messages area */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-zinc-500 mt-20 space-y-3">
              <p className="text-4xl">🚀</p>
              <p className="text-lg text-zinc-400">מה עושים היום?</p>
              <div className="text-sm space-y-1 text-zinc-500">
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
                    : "bg-zinc-900 text-zinc-100 shadow-sm shadow-black/20 border border-zinc-800"
                }`}
              >
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {msg.content}
                </p>
                {msg.actions && msg.actions.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-zinc-700">
                    <p className="text-xs text-zinc-500">
                      {msg.actions.length}{" "}
                      {msg.actions.length === 1 ? "פעולה" : "פעולות"} בוצעו ✓
                    </p>
                  </div>
                )}
                <p className="text-[10px] text-zinc-500 mt-1">
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
              <div className="bg-zinc-900 rounded-2xl px-4 py-3 shadow-sm shadow-black/20 border border-zinc-800">
                <div className="flex gap-1.5 items-center">
                  <div className="w-2 h-2 bg-zinc-600 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-zinc-600 rounded-full animate-bounce [animation-delay:0.1s]" />
                  <div className="w-2 h-2 bg-zinc-600 rounded-full animate-bounce [animation-delay:0.2s]" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input area */}
      <footer className="flex-shrink-0 border-t border-zinc-800 bg-zinc-900 p-4">
        <div className="max-w-2xl mx-auto flex gap-3 items-end">
          <input
            type="text"
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="תנעצי לי רופא עיניים לאיתן..."
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3
                       text-zinc-100 placeholder-zinc-500
                       focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                       text-sm"
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || loading}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600
                       text-white font-medium px-6 py-3 rounded-xl transition-colors
                       text-sm flex-shrink-0"
          >
            שגר 🚀
          </button>
        </div>
      </footer>
    </div>
  );
}
