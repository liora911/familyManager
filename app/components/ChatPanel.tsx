"use client";

import {
  useState,
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";
import { useDashboardRefresh } from "@/app/contexts/DashboardRefreshContext";

interface Message {
  role: "user" | "assistant";
  content: string;
  actions?: { tool: string; input: unknown; result: unknown }[];
  timestamp: Date;
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

export interface ChatPanelHandle {
  clearChat: () => void;
  hasMessages: boolean;
}

const ChatPanel = forwardRef<
  ChatPanelHandle,
  { className?: string; user: string }
>(function ChatPanel({ className, user }, ref) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { triggerRefresh } = useDashboardRefresh();

  useEffect(() => {
    setMessages(loadMessages());
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    if (messages.length > 0) saveMessages(messages);
  }, [messages]);

  useImperativeHandle(
    ref,
    () => ({
      clearChat: () => {
        setMessages([]);
        localStorage.removeItem("home-manager-messages");
      },
      get hasMessages() {
        return messages.length > 0;
      },
    }),
    [messages],
  );

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
      const history = messages.slice(-10).map((m) => {
        if (m.role === "assistant" && m.actions?.length) {
          const actionsSummary = m.actions
            .map(
              (a) =>
                `${a.tool}(${JSON.stringify(a.input)}) → ${JSON.stringify(a.result)}`,
            )
            .join("\n");
          return {
            role: m.role,
            content: `${m.content}\n\n[פעולות שבוצעו:\n${actionsSummary}]`,
          };
        }
        return { role: m.role, content: m.content };
      });

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

      // Trigger dashboard refresh if tools were used
      if (data.actions?.length > 0) {
        triggerRefresh();
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "שגיאה - נסי שוב 😅",
          timestamp: new Date(),
        },
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

  return (
    <div className={`flex flex-col h-full ${className || ""}`}>
      {/* Messages area */}
      <main className="flex-1 overflow-y-auto px-3 py-4 sm:px-4 sm:py-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted mt-20 space-y-3">
              <p className="text-4xl">🚀</p>
              <p className="text-lg text-secondary">מה עושים היום?</p>
              <div className="text-sm space-y-1 text-muted">
                <p>&quot;תוסיף חלב, ביצים ולחם לרשימת הסופר&quot;</p>
                <p>&quot;מה יש לנו השבוע?&quot;</p>
                <p>&quot;תזכיר לי מחר בבוקר לחדש ביטוח&quot;</p>
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
                style={
                  msg.role === "assistant"
                    ? { boxShadow: `0 1px 2px var(--color-shadow)` }
                    : undefined
                }
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
              <div
                className="bg-card rounded-2xl px-4 py-3 border border-border"
                style={{ boxShadow: `0 1px 2px var(--color-shadow)` }}
              >
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
});

export default ChatPanel;
