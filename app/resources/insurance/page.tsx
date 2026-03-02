"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import FormModal, { crudRequest } from "@/app/components/FormModal";

interface InsurancePolicy {
  id: string;
  title: string;
  category: string;
  provider?: string;
  policy_number?: string;
  member_name?: string;
  start_date?: string;
  end_date?: string;
  monthly_cost?: string;
  contact_phone?: string;
  contact_name?: string;
  notes?: string;
  attachments?: { url: string; filename: string; label?: string }[];
}

const CATEGORY_LABELS: Record<string, string> = {
  health: "🏥 בריאות",
  car: "🚗 רכב",
  home: "🏠 דירה",
  life: "💙 חיים",
  travel: "✈️ נסיעות",
  general: "📋 כללי",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("he-IL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isExpiringSoon(endDate?: string): boolean {
  if (!endDate) return false;
  const diff = new Date(endDate).getTime() - Date.now();
  return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000; // 30 days
}

function isExpired(endDate?: string): boolean {
  if (!endDate) return false;
  return new Date(endDate) < new Date();
}

export default function InsurancePage() {
  const router = useRouter();
  const [items, setItems] = useState<InsurancePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [modal, setModal] = useState<{
    mode: "create" | "edit";
    initial?: Record<string, unknown>;
  } | null>(null);

  const refresh = useCallback(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => setItems(d.insurance || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`למחוק את "${label}"?`)) return;
    try {
      await crudRequest("insurance", "DELETE", { id });
      refresh();
    } catch {
      alert("שגיאה במחיקה");
    }
  };

  const filtered = items.filter((p) => {
    if (filterCat && p.category !== filterCat) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        p.title.toLowerCase().includes(s) ||
        p.provider?.toLowerCase().includes(s) ||
        p.policy_number?.toLowerCase().includes(s) ||
        p.member_name?.toLowerCase().includes(s)
      );
    }
    return true;
  });

  // Group by category
  const grouped = filtered.reduce<Record<string, InsurancePolicy[]>>((acc, p) => {
    const cat = p.category || "general";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  return (
    <div dir="rtl" className="min-h-dvh bg-surface text-primary">
      <header className="border-b border-border bg-card px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/resources")}
              className="text-muted hover:text-primary transition-colors text-sm"
            >
              → חזרה
            </button>
            <div>
              <h1 className="text-xl font-medium">🛡️ ביטוח</h1>
              <p className="text-sm text-secondary">פוליסות ביטוח</p>
            </div>
          </div>
          <button
            onClick={() => setModal({ mode: "create" })}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
          >
            + הוסף פוליסה
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 sm:p-6">
        {/* Search & Filter */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="חיפוש..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 border border-divider rounded-xl px-3 py-2 text-sm bg-input text-primary
                       focus:outline-none focus:border-blue-500"
          />
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="border border-divider rounded-xl px-3 py-2 text-sm bg-input text-primary"
          >
            <option value="">כל הקטגוריות</option>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted text-sm">טוען...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted">
            <div className="text-4xl mb-2">🛡️</div>
            <p className="text-sm">אין פוליסות ביטוח</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([cat, policies]) => (
              <div key={cat}>
                <h2 className="text-sm font-medium text-muted mb-2">
                  {CATEGORY_LABELS[cat] || cat}
                </h2>
                <div className="space-y-3">
                  {policies.map((p) => (
                    <div
                      key={p.id}
                      className={`bg-card rounded-xl border p-4 transition-colors ${
                        isExpired(p.end_date)
                          ? "border-red-500/40 bg-red-500/5"
                          : isExpiringSoon(p.end_date)
                            ? "border-amber-500/40 bg-amber-500/5"
                            : "border-border"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{p.title}</p>
                          <div className="flex flex-wrap gap-2 mt-2 text-xs text-secondary">
                            {p.provider && <span className="bg-tag px-2 py-0.5 rounded-full">{p.provider}</span>}
                            {p.policy_number && <span className="bg-tag px-2 py-0.5 rounded-full font-mono" dir="ltr">#{p.policy_number}</span>}
                            {p.member_name && <span className="bg-tag px-2 py-0.5 rounded-full">👤 {p.member_name}</span>}
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2 text-xs text-secondary">
                            {p.monthly_cost && <span>💰 ₪{p.monthly_cost}/חודש</span>}
                            {p.start_date && <span>📅 מ-{formatDate(p.start_date)}</span>}
                            {p.end_date && (
                              <span className={isExpired(p.end_date) ? "text-red-500 font-medium" : isExpiringSoon(p.end_date) ? "text-amber-500 font-medium" : ""}>
                                {isExpired(p.end_date) ? "⚠️ פג תוקף " : "🛡️ עד "}
                                {formatDate(p.end_date)}
                              </span>
                            )}
                          </div>
                          {p.contact_name && (
                            <p className="text-xs text-secondary mt-1">
                              📞 {p.contact_name} {p.contact_phone || ""}
                            </p>
                          )}
                          {p.notes && <p className="text-xs text-muted mt-1">{p.notes}</p>}
                          {p.attachments && p.attachments.length > 0 && (
                            <div className="flex gap-2 mt-2">
                              {p.attachments.map((att, i) => (
                                <a
                                  key={i}
                                  href={att.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-link hover:underline bg-tag px-2 py-0.5 rounded-full"
                                >
                                  📎 {att.label || att.filename}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() =>
                              setModal({
                                mode: "edit",
                                initial: {
                                  id: p.id,
                                  title: p.title,
                                  category: p.category,
                                  provider: p.provider,
                                  policy_number: p.policy_number,
                                  insured_member_name: p.member_name,
                                  start_date: p.start_date,
                                  end_date: p.end_date,
                                  monthly_cost: p.monthly_cost,
                                  contact_name: p.contact_name,
                                  contact_phone: p.contact_phone,
                                  notes: p.notes,
                                  attachments: p.attachments,
                                },
                              })
                            }
                            className="text-xs text-muted hover:text-primary p-1.5 rounded-lg hover:bg-hover transition-colors"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(p.id, p.title)}
                            className="text-xs text-muted hover:text-red-500 p-1.5 rounded-lg hover:bg-hover transition-colors"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {modal && (
        <FormModal
          entity="insurance"
          mode={modal.mode}
          initial={modal.initial}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
