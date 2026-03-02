"use client";

import {
  useState,
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useDashboardRefresh } from "@/app/contexts/DashboardRefreshContext";

// ── Types ────────────────────────────────────────────────────────────

interface Message {
  role: "user" | "assistant";
  content: string;
  actions?: { tool: string; input: unknown; result: unknown }[];
  timestamp: Date;
}

// ── Persistence ──────────────────────────────────────────────────────

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

// ── Suggestion chips ─────────────────────────────────────────────────

const SUGGESTIONS = [
  "מה יש לנו השבוע?",
  "תוסיף חלב וביצים לסופר",
  "תזכיר לי מחר בבוקר לחדש ביטוח",
  "תנעץ רופא עיניים לאיתן",
  "מה המצב עם המשימות?",
];

// ── Component ────────────────────────────────────────────────────────

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
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageCountRef = useRef(0);
  const { triggerRefresh } = useDashboardRefresh();

  useEffect(() => {
    const loaded = loadMessages();
    setMessages(loaded);
    messageCountRef.current = loaded.length;
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
        messageCountRef.current = 0;
        localStorage.removeItem("home-manager-messages");
      },
      get hasMessages() {
        return messages.length > 0;
      },
    }),
    [messages]
  );

  // ── Auto-resize textarea ──────────────────────────────────────────

  const adjustHeight = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    requestAnimationFrame(adjustHeight);
  };

  // ── Submit ────────────────────────────────────────────────────────

  const handleSubmit = async (directMessage?: string) => {
    const text = directMessage || input.trim();
    if (!text || loading) return;

    const userMsg: Message = {
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    setLoading(true);

    try {
      const history = messages.slice(-10).map((m) => {
        if (m.role === "assistant" && m.actions?.length) {
          const actionsSummary = m.actions
            .map(
              (a) =>
                `${a.tool}(${JSON.stringify(a.input)}) → ${JSON.stringify(a.result)}`
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
        body: JSON.stringify({ message: text, history, user }),
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

      if (data.actions?.length > 0) {
        triggerRefresh();
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "שגיאה - נסי שוב",
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

  // ── Helpers ───────────────────────────────────────────────────────

  const isLastInGroup = (index: number): boolean => {
    if (index === messages.length - 1) return true;
    return messages[index + 1].role !== messages[index].role;
  };

  // Only animate messages that arrived after initial load
  const shouldAnimate = (index: number): boolean => {
    return index >= messageCountRef.current;
  };

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className={`flex flex-col h-full ${className || ""}`}>
      {/* Messages area */}
      <main className="flex-1 overflow-y-auto px-3 py-4 sm:px-4 sm:py-6">
        <div className="max-w-2xl mx-auto space-y-3">
          {/* Empty state */}
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center mt-16 sm:mt-24 animate-empty-fade">
              <h2 className="text-2xl sm:text-3xl font-light text-primary mb-2">
                שלום, מה נעשה היום?
              </h2>
              <p className="text-sm text-muted mb-8">
                כתבי כל בקשה בשפה חופשית
              </p>
              <div className="flex flex-wrap justify-center gap-2 max-w-md px-4">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSubmit(s)}
                    className="text-sm px-4 py-2 rounded-full
                               bg-card border border-border text-secondary
                               hover:bg-hover hover:text-primary hover:border-divider
                               transition-all duration-200"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex group ${
                msg.role === "user" ? "justify-start" : "justify-end"
              } ${shouldAnimate(i) ? "animate-chat-in" : ""}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-blue-500 text-white"
                    : "bg-card text-primary border border-border"
                }`}
                style={
                  msg.role === "assistant"
                    ? { boxShadow: "0 1px 3px var(--color-shadow)" }
                    : undefined
                }
              >
                {/* Content */}
                {msg.role === "assistant" ? (
                  <div className="chat-prose">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {msg.content}
                  </p>
                )}

                {/* Tool actions badge */}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-divider">
                    <svg
                      className="w-3.5 h-3.5 text-badge-green-text flex-shrink-0"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-xs text-badge-green-text">
                      {msg.actions.length}{" "}
                      {msg.actions.length === 1 ? "פעולה" : "פעולות"} בוצעו
                    </span>
                  </div>
                )}

                {/* Timestamp */}
                <p
                  className={`text-[10px] mt-1 transition-opacity duration-200 ${
                    msg.role === "user" ? "text-white/50" : "text-muted"
                  } ${
                    isLastInGroup(i)
                      ? "opacity-100"
                      : "opacity-0 group-hover:opacity-100"
                  }`}
                >
                  {msg.timestamp.toLocaleTimeString("he-IL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex justify-end animate-chat-in">
              <div
                className="bg-card rounded-2xl px-4 py-3 border border-border"
                style={{ boxShadow: "0 1px 3px var(--color-shadow)" }}
              >
                <div className="flex gap-1.5 items-center h-5">
                  <div className="w-1.5 h-1.5 bg-muted rounded-full animate-pulse-dot" />
                  <div
                    className="w-1.5 h-1.5 bg-muted rounded-full animate-pulse-dot"
                    style={{ animationDelay: "0.2s" }}
                  />
                  <div
                    className="w-1.5 h-1.5 bg-muted rounded-full animate-pulse-dot"
                    style={{ animationDelay: "0.4s" }}
                  />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input area */}
      <footer className="flex-shrink-0 p-3 sm:p-4">
        <div className="max-w-2xl mx-auto">
          <div
            className="flex items-end gap-2 bg-input border border-border rounded-2xl
                        px-3 py-2 transition-all duration-200
                        focus-within:border-blue-500/50 focus-within:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]
                        shadow-sm"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="כתבי כל בקשה..."
              rows={1}
              className="flex-1 bg-transparent text-primary placeholder-muted
                         resize-none text-sm leading-6
                         focus:outline-none
                         max-h-[120px] overflow-y-auto"
            />
            <button
              onClick={() => handleSubmit()}
              disabled={!input.trim() || loading}
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center
                         rounded-full bg-blue-500 text-white
                         disabled:opacity-30 disabled:cursor-not-allowed
                         hover:bg-blue-400 active:scale-95
                         transition-all duration-150"
              aria-label="שלח"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 19V5" />
                <path d="M5 12l7-7 7 7" />
              </svg>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
});

export default ChatPanel;
