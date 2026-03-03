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
  imageCount?: number;
  timestamp: Date;
}

interface PendingImage {
  data: string;
  media_type: string;
  name: string;
  preview: string; // data URL for thumbnail
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

// ── Image helpers ───────────────────────────────────────────────────

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

function readFileAsBase64(file: File): Promise<{ data: string; preview: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data:...;base64, prefix for the API
      const base64 = result.split(",")[1];
      resolve({ data: base64, preview: result });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  // ── Image handling ────────────────────────────────────────────────

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) continue;
      if (file.size > MAX_IMAGE_SIZE) continue;
      if (pendingImages.length >= 4) break;

      try {
        const { data, preview } = await readFileAsBase64(file);
        setPendingImages((prev) => [
          ...prev.slice(0, 3), // max 4 total
          { data, media_type: file.type, name: file.name, preview },
        ]);
      } catch {
        // skip failed reads
      }
    }

    // Reset file input so same file can be re-selected
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Submit ────────────────────────────────────────────────────────

  const handleSubmit = async (directMessage?: string) => {
    const text = directMessage || input.trim();
    const hasImages = pendingImages.length > 0;
    if ((!text && !hasImages) || loading) return;

    const userMsg: Message = {
      role: "user",
      content: text || (hasImages ? "תמונה" : ""),
      imageCount: hasImages ? pendingImages.length : undefined,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";

    // Capture images before clearing
    const imagesToSend = hasImages
      ? pendingImages.map((img) => ({ data: img.data, media_type: img.media_type }))
      : undefined;
    setPendingImages([]);
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
        body: JSON.stringify({
          message: text,
          history,
          user,
          images: imagesToSend,
        }),
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

  const canSend = input.trim() || pendingImages.length > 0;

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
                {/* Image indicator for user messages */}
                {msg.role === "user" && msg.imageCount && msg.imageCount > 0 && (
                  <div className="flex items-center gap-1 mb-1.5 text-white/70 text-xs">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M1 5.25A2.25 2.25 0 013.25 3h13.5A2.25 2.25 0 0119 5.25v9.5A2.25 2.25 0 0116.75 17H3.25A2.25 2.25 0 011 14.75v-9.5zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 00.75-.75v-2.69l-2.22-2.219a.75.75 0 00-1.06 0l-1.91 1.909-4.97-4.969a.75.75 0 00-1.06 0L2.5 11.06zm12.22-4.81a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z" clipRule="evenodd" />
                    </svg>
                    <span>{msg.imageCount} {msg.imageCount === 1 ? "תמונה" : "תמונות"}</span>
                  </div>
                )}

                {/* Content */}
                {msg.role === "assistant" ? (
                  <div className="chat-prose">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  msg.content && (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {msg.content}
                    </p>
                  )
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
          {/* Image preview strip */}
          {pendingImages.length > 0 && (
            <div className="flex gap-2 mb-2 px-1">
              {pendingImages.map((img, i) => (
                <div key={i} className="relative group/img">
                  <img
                    src={img.preview}
                    alt={img.name}
                    className="w-12 h-12 rounded-lg object-cover border border-border"
                  />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white
                               flex items-center justify-center text-xs opacity-0 group-hover/img:opacity-100
                               transition-opacity"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div
            className="flex items-end gap-2 bg-input border border-border rounded-2xl
                        px-3 py-2 transition-all duration-200
                        focus-within:border-blue-500/50 focus-within:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]
                        shadow-sm"
          >
            {/* Image upload button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || pendingImages.length >= 4}
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center
                         rounded-full text-muted hover:text-primary
                         disabled:opacity-30 disabled:cursor-not-allowed
                         transition-colors"
              title="צרף תמונה"
            >
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M1 5.25A2.25 2.25 0 013.25 3h13.5A2.25 2.25 0 0119 5.25v9.5A2.25 2.25 0 0116.75 17H3.25A2.25 2.25 0 011 14.75v-9.5zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 00.75-.75v-2.69l-2.22-2.219a.75.75 0 00-1.06 0l-1.91 1.909-4.97-4.969a.75.75 0 00-1.06 0L2.5 11.06zm12.22-4.81a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z" clipRule="evenodd" />
              </svg>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

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
              disabled={!canSend || loading}
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
