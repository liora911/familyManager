"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { crudRequest } from "@/app/components/FormModal";

interface NotebookEntry {
  id: string;
  title?: string;
  content: string;
  category: string;
  is_pinned?: boolean;
  created_at: string;
  updated_at: string;
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: string }> = {
  general: { label: "כללי", icon: "📝" },
  idea: { label: "רעיון", icon: "💡" },
  dream: { label: "חלום", icon: "🌙" },
  reflection: { label: "מחשבה", icon: "🤔" },
  list: { label: "רשימה", icon: "📋" },
  other: { label: "אחר", icon: "📌" },
};

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/#{1,6}\s+/g, "")
    .replace(/[`~]{1,3}/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "");
}

function timeAgo(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `לפני ${mins} דקות`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `לפני ${hours} שעות`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `לפני ${days} ימים`;
  return d.toLocaleDateString("he-IL", { day: "numeric", month: "short", year: "numeric" });
}

export default function NotebookPage() {
  const router = useRouter();
  const [items, setItems] = useState<NotebookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");

  // View / Editor state
  const [viewing, setViewing] = useState<NotebookEntry | null>(null);
  const [editing, setEditing] = useState<NotebookEntry | null>(null);
  const [editorTitle, setEditorTitle] = useState("");
  const [editorContent, setEditorContent] = useState("");
  const [editorCategory, setEditorCategory] = useState("general");
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => setItems(d.notebook || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const openNew = () => {
    setEditing({
      id: "",
      content: "",
      category: "general",
      created_at: "",
      updated_at: "",
    });
    setEditorTitle("");
    setEditorContent("");
    setEditorCategory("general");
  };

  const openView = (entry: NotebookEntry) => {
    setViewing(entry);
  };

  const openEditFromView = () => {
    if (!viewing) return;
    setEditing(viewing);
    setEditorTitle(viewing.title || "");
    setEditorContent(viewing.content);
    setEditorCategory(viewing.category);
    setViewing(null);
  };

  const openEdit = (entry: NotebookEntry) => {
    setEditing(entry);
    setEditorTitle(entry.title || "");
    setEditorContent(entry.content);
    setEditorCategory(entry.category);
  };

  const handleSave = async () => {
    if (!editorContent.trim()) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: editorTitle || null,
        content: editorContent,
        category: editorCategory,
      };
      if (editing?.id) {
        await crudRequest("notebook", "PUT", { id: editing.id, ...payload });
      } else {
        await crudRequest("notebook", "POST", payload);
      }
      setEditing(null);
      refresh();
    } catch {
      alert("שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`למחוק את "${label}"?`)) return;
    try {
      await crudRequest("notebook", "DELETE", { id });
      refresh();
    } catch {
      alert("שגיאה במחיקה");
    }
  };

  const handleTogglePin = async (entry: NotebookEntry) => {
    try {
      await crudRequest("notebook", "PUT", {
        id: entry.id,
        is_pinned: !entry.is_pinned,
      });
      refresh();
    } catch {
      alert("שגיאה בעדכון");
    }
  };

  const filtered = items.filter((e) => {
    if (filterCat && e.category !== filterCat) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        (e.title?.toLowerCase().includes(s)) ||
        e.content.toLowerCase().includes(s)
      );
    }
    return true;
  });

  // ── Full-screen view (rendered markdown) ──────────────────────────
  if (viewing) {
    const catConf = CATEGORY_CONFIG[viewing.category] || CATEGORY_CONFIG.general;
    return (
      <div dir="rtl" className="min-h-dvh bg-surface text-primary flex flex-col">
        <header className="border-b border-border bg-card px-5 sm:px-8 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setViewing(null)}
              className="text-muted hover:text-primary transition-colors text-base"
            >
              ← חזרה
            </button>
            <span className="text-sm text-muted bg-tag px-3 py-1 rounded-full">
              {catConf.icon} {catConf.label}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleDelete(viewing.id, viewing.title || "רשומה").then(() => setViewing(null))}
              className="text-muted hover:text-red-500 transition-colors text-lg px-3 py-2"
            >
              🗑️
            </button>
            <button
              onClick={openEditFromView}
              className="bg-blue-600 hover:bg-blue-500 text-white text-base font-medium px-5 py-2 rounded-lg transition-colors"
            >
              ✏️ עריכה
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-auto px-4 sm:px-6 py-5 sm:py-8 w-full">
          {viewing.title && (
            <h1 className="text-2xl font-bold mb-5">{viewing.title}</h1>
          )}
          <div className="prose prose-base prose-invert max-w-none
            prose-headings:text-primary prose-headings:font-bold
            prose-p:text-secondary prose-p:leading-relaxed
            prose-strong:text-primary prose-em:text-secondary
            prose-li:text-secondary prose-li:marker:text-muted
            prose-hr:border-border
            prose-a:text-link prose-a:no-underline hover:prose-a:underline
            prose-blockquote:border-border prose-blockquote:text-muted
            prose-code:text-primary prose-code:bg-tag prose-code:px-1 prose-code:rounded
            prose-pre:bg-card prose-pre:border prose-pre:border-border">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {viewing.content}
            </ReactMarkdown>
          </div>
          <p className="text-sm text-muted mt-8">
            {timeAgo(viewing.updated_at || viewing.created_at)}
          </p>
        </div>
      </div>
    );
  }

  // ── Full-screen editor ────────────────────────────────────────────
  if (editing) {
    return (
      <div dir="rtl" className="min-h-dvh bg-surface text-primary flex flex-col">
        <header className="border-b border-border bg-card px-5 sm:px-8 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setEditing(null)}
              className="text-muted hover:text-primary transition-colors text-base"
            >
              ← חזרה
            </button>
            <span className="text-base text-secondary">
              {editing.id ? "עריכת רשומה" : "רשומה חדשה"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={editorCategory}
              onChange={(e) => setEditorCategory(e.target.value)}
              className="border border-divider rounded-lg px-3 py-2 text-sm bg-input text-primary"
            >
              {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.icon} {v.label}
                </option>
              ))}
            </select>
            <button
              onClick={handleSave}
              disabled={saving || !editorContent.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-disabled text-white text-base font-medium px-5 py-2 rounded-lg transition-colors"
            >
              {saving ? "שומר..." : "שמור"}
            </button>
          </div>
        </header>
        <div className="flex-1 flex flex-col px-4 sm:px-6 py-5 sm:py-8 w-full">
          <input
            type="text"
            placeholder="כותרת (אופציונלי)"
            value={editorTitle}
            onChange={(e) => setEditorTitle(e.target.value)}
            className="border-none bg-transparent text-2xl font-medium text-primary placeholder:text-muted
                       focus:outline-none mb-4 px-1"
          />
          <textarea
            placeholder="התחל לכתוב..."
            value={editorContent}
            onChange={(e) => setEditorContent(e.target.value)}
            className="flex-1 border-none bg-transparent text-base text-primary placeholder:text-muted
                       focus:outline-none resize-none px-1 leading-relaxed"
            autoFocus
          />
        </div>
      </div>
    );
  }

  // ── List view ─────────────────────────────────────────────────────
  return (
    <div dir="rtl" className="min-h-dvh bg-surface text-primary">
      <header className="border-b border-border bg-card px-5 sm:px-8 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/resources")}
              className="text-muted hover:text-primary transition-colors text-base"
            >
              ← חזרה
            </button>
            <div>
              <h1 className="text-2xl font-semibold">📓 מחברת</h1>
              <p className="text-base text-secondary mt-0.5">רעיונות, מחשבות, רשימות</p>
            </div>
          </div>
          <button
            onClick={openNew}
            className="bg-blue-600 hover:bg-blue-500 text-white text-base font-medium px-5 py-2.5 rounded-xl transition-colors"
          >
            + רשומה חדשה
          </button>
        </div>
      </header>

      <main className="px-4 sm:px-6 py-5 sm:py-8">
        {/* Search & Filter */}
        <div className="flex gap-3 mb-6">
          <input
            type="text"
            placeholder="חיפוש..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 border border-divider rounded-xl px-4 py-3 text-base bg-input text-primary
                       focus:outline-none focus:border-blue-500"
          />
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="border border-divider rounded-xl px-4 py-3 text-base bg-input text-primary"
          >
            <option value="">הכל</option>
            {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.icon} {v.label}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="text-center py-16 text-muted text-lg">טוען...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted">
            <div className="text-5xl mb-3">📓</div>
            <p className="text-lg">המחברת ריקה</p>
            <button onClick={openNew} className="mt-4 text-link hover:underline text-base">
              כתוב רשומה ראשונה
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((entry) => {
              const catConf = CATEGORY_CONFIG[entry.category] || CATEGORY_CONFIG.general;
              return (
                <div
                  key={entry.id}
                  onClick={() => openView(entry)}
                  className={`bg-card rounded-xl border cursor-pointer transition-colors hover:bg-hover flex overflow-hidden ${
                    entry.is_pinned ? "border-amber-500/40" : "border-border"
                  }`}
                >
                  {/* Category icon strip — full height right side */}
                  <div className="flex-shrink-0 w-20 bg-surface/50 border-l border-border flex items-center justify-center">
                    <span className="text-4xl opacity-70">{catConf.icon}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {entry.is_pinned && <span className="text-amber-500 text-lg">📌</span>}
                          <p className="font-semibold text-lg">
                            {entry.title || "ללא כותרת"}
                          </p>
                          <span className="text-sm text-muted">{catConf.label}</span>
                        </div>
                        <p className="text-base text-secondary mt-2 line-clamp-2 whitespace-pre-wrap leading-relaxed">
                          {stripMarkdown(entry.content)}
                        </p>
                        <p className="text-sm text-muted mt-3">
                          {timeAgo(entry.updated_at || entry.created_at)}
                        </p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleTogglePin(entry)}
                          className={`text-lg p-2 rounded-lg hover:bg-hover transition-colors ${
                            entry.is_pinned ? "text-amber-500" : "text-muted hover:text-amber-500"
                          }`}
                          title={entry.is_pinned ? "בטל נעיצה" : "נעץ"}
                        >
                          📌
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id, entry.title || "רשומה")}
                          className="text-lg text-muted hover:text-red-500 p-2 rounded-lg hover:bg-hover transition-colors"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
