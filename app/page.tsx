"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

interface Message {
  role: "user" | "assistant";
  content: string;
  actions?: { tool: string; input: unknown; result: unknown }[];
  timestamp: Date;
}

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
        body: JSON.stringify({ message: userMsg.content, history }),
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
    document.cookie =
      "home-manager-auth=; Path=/; Max-Age=0; SameSite=Lax";
    window.location.href = "/login";
  };

  return (
    <div dir="rtl" className="flex flex-col h-dvh bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-gray-200 bg-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium text-gray-900">🏠 מנהל הבית</h1>
          <p className="text-sm text-gray-500 mt-0.5">כתבי מה שעולה לך לראש</p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
          >
            📋 לוח בקרה
          </Link>
          <button
            onClick={handleLogout}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            יציאה
          </button>
        </div>
      </header>

      {/* Messages area */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 mt-20 space-y-3">
              <p className="text-4xl">🚀</p>
              <p className="text-lg text-gray-500">מה עושים היום?</p>
              <div className="text-sm space-y-1 text-gray-400">
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
                    : "bg-white text-gray-900 shadow-sm border border-gray-100"
                }`}
              >
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {msg.content}
                </p>
                {msg.actions && msg.actions.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-400">
                      {msg.actions.length}{" "}
                      {msg.actions.length === 1 ? "פעולה" : "פעולות"} בוצעו ✓
                    </p>
                  </div>
                )}
                <p className="text-[10px] text-gray-400 mt-1">
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
              <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100">
                <div className="flex gap-1.5 items-center">
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:0.1s]" />
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input area */}
      <footer className="flex-shrink-0 border-t border-gray-200 bg-white p-4">
        <div className="max-w-2xl mx-auto flex gap-3 items-end">
          <input
            type="text"
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="תנעצי לי רופא עיניים לאיתן..."
            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3
                       text-gray-900 placeholder-gray-400
                       focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                       text-sm"
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || loading}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-200 disabled:text-gray-400
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
