"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import FormModal, { crudRequest } from "@/app/components/FormModal";

interface FinanceRecord {
  id: string;
  title: string;
  category: string;
  amount: string;
  currency: string;
  record_date?: string;
  is_recurring?: boolean;
  recurrence_rule?: string;
  member_name?: string;
  notes?: string;
  attachments?: { url: string; filename: string; label?: string }[];
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  income: { label: "הכנסה", color: "text-green-500 bg-green-500/10 border-green-500/30" },
  expense: { label: "הוצאה", color: "text-red-500 bg-red-500/10 border-red-500/30" },
  investment: { label: "השקעה", color: "text-purple-500 bg-purple-500/10 border-purple-500/30" },
  savings: { label: "חיסכון", color: "text-blue-500 bg-blue-500/10 border-blue-500/30" },
  debt: { label: "חוב", color: "text-orange-500 bg-orange-500/10 border-orange-500/30" },
  other: { label: "אחר", color: "text-secondary bg-tag border-border" },
};

const CURRENCY_SYMBOL: Record<string, string> = {
  ILS: "₪",
  USD: "$",
  EUR: "€",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("he-IL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatMonth(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("he-IL", {
    month: "long",
    year: "numeric",
  });
}

export default function FinancePage() {
  const router = useRouter();
  const [items, setItems] = useState<FinanceRecord[]>([]);
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
      .then((d) => setItems(d.finance || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`למחוק את "${label}"?`)) return;
    try {
      await crudRequest("finance", "DELETE", { id });
      refresh();
    } catch {
      alert("שגיאה במחיקה");
    }
  };

  const filtered = items.filter((r) => {
    if (filterCat && r.category !== filterCat) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        r.title.toLowerCase().includes(s) ||
        r.notes?.toLowerCase().includes(s) ||
        r.member_name?.toLowerCase().includes(s)
      );
    }
    return true;
  });

  // Monthly summary
  const summary = filtered.reduce(
    (acc, r) => {
      const amt = parseFloat(r.amount) || 0;
      if (r.category === "income") acc.income += amt;
      else if (r.category === "expense") acc.expense += amt;
      return acc;
    },
    { income: 0, expense: 0 }
  );

  // Group by month
  const grouped = filtered.reduce<Record<string, FinanceRecord[]>>((acc, r) => {
    const month = r.record_date ? formatMonth(r.record_date) : "ללא תאריך";
    if (!acc[month]) acc[month] = [];
    acc[month].push(r);
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
              <h1 className="text-xl font-medium">💰 כספים</h1>
              <p className="text-sm text-secondary">ניהול הכנסות והוצאות</p>
            </div>
          </div>
          <button
            onClick={() => setModal({ mode: "create" })}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
          >
            + הוסף רשומה
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 sm:p-6">
        {/* Summary */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-center">
              <p className="text-xs text-green-500 mb-1">הכנסות</p>
              <p className="text-lg font-bold text-green-500">₪{summary.income.toLocaleString()}</p>
            </div>
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-center">
              <p className="text-xs text-red-500 mb-1">הוצאות</p>
              <p className="text-lg font-bold text-red-500">₪{summary.expense.toLocaleString()}</p>
            </div>
            <div className={`rounded-xl p-3 text-center border ${
              summary.income - summary.expense >= 0
                ? "bg-blue-500/10 border-blue-500/30"
                : "bg-orange-500/10 border-orange-500/30"
            }`}>
              <p className="text-xs text-secondary mb-1">מאזן</p>
              <p className={`text-lg font-bold ${
                summary.income - summary.expense >= 0 ? "text-blue-500" : "text-orange-500"
              }`}>
                ₪{(summary.income - summary.expense).toLocaleString()}
              </p>
            </div>
          </div>
        )}

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
            <option value="">הכל</option>
            {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted text-sm">טוען...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted">
            <div className="text-4xl mb-2">💰</div>
            <p className="text-sm">אין רשומות כספיות</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([month, records]) => (
              <div key={month}>
                <h2 className="text-sm font-medium text-muted mb-2">{month}</h2>
                <div className="space-y-2">
                  {records.map((r) => {
                    const catConf = CATEGORY_CONFIG[r.category] || CATEGORY_CONFIG.other;
                    const sym = CURRENCY_SYMBOL[r.currency] || r.currency;
                    return (
                      <div
                        key={r.id}
                        className="bg-card rounded-xl border border-border p-3 flex items-center gap-3"
                      >
                        <div className={`text-xs px-2 py-1 rounded-full border ${catConf.color}`}>
                          {catConf.label}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{r.title}</p>
                          <div className="flex flex-wrap gap-2 mt-1 text-xs text-secondary">
                            {r.record_date && <span>{formatDate(r.record_date)}</span>}
                            {r.is_recurring && <span>🔄 {r.recurrence_rule || "חוזר"}</span>}
                            {r.member_name && <span>👤 {r.member_name}</span>}
                          </div>
                          {r.notes && <p className="text-xs text-muted mt-1 truncate">{r.notes}</p>}
                        </div>
                        <div className={`text-sm font-bold whitespace-nowrap ${
                          r.category === "income" ? "text-green-500" : r.category === "expense" ? "text-red-500" : "text-primary"
                        }`}>
                          {r.category === "income" ? "+" : r.category === "expense" ? "-" : ""}
                          {sym}{parseFloat(r.amount).toLocaleString()}
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() =>
                              setModal({
                                mode: "edit",
                                initial: {
                                  id: r.id,
                                  title: r.title,
                                  category: r.category,
                                  amount: r.amount,
                                  currency: r.currency,
                                  record_date: r.record_date,
                                  is_recurring: r.is_recurring,
                                  recurrence_rule: r.recurrence_rule,
                                  related_member_name: r.member_name,
                                  notes: r.notes,
                                  attachments: r.attachments,
                                },
                              })
                            }
                            className="text-xs text-muted hover:text-primary p-1 rounded-lg hover:bg-hover transition-colors"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(r.id, r.title)}
                            className="text-xs text-muted hover:text-red-500 p-1 rounded-lg hover:bg-hover transition-colors"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {modal && (
        <FormModal
          entity="finance"
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
