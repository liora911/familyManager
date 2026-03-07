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

interface Aggregates {
  total_income: number;
  total_expense: number;
  total_investment: number;
  total_savings: number;
  record_count: number;
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
  });
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(monthStr: string) {
  const [year, month] = monthStr.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("he-IL", {
    month: "long",
    year: "numeric",
  });
}

// ── Month Navigator ────────────────────────────────────────────────

function MonthNavigator({
  currentMonth,
  onChange,
}: {
  currentMonth: string;
  onChange: (month: string) => void;
}) {
  const [year, month] = currentMonth.split("-").map(Number);

  const goTo = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1);
    onChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const isCurrent = currentMonth === getCurrentMonth();

  return (
    <div className="flex items-center justify-center gap-2 py-3">
      <button
        onClick={() => goTo(1)}
        className="p-2 rounded-lg hover:bg-hover text-secondary hover:text-primary transition-colors text-lg"
        aria-label="חודש הבא"
      >
        ‹
      </button>
      <span className="text-base font-medium min-w-[150px] text-center">
        {formatMonthLabel(currentMonth)}
      </span>
      <button
        onClick={() => goTo(-1)}
        className="p-2 rounded-lg hover:bg-hover text-secondary hover:text-primary transition-colors text-lg"
        aria-label="חודש קודם"
      >
        ›
      </button>
      {!isCurrent && (
        <button
          onClick={() => onChange(getCurrentMonth())}
          className="text-sm text-link hover:text-link-hover px-3 py-1 rounded-lg hover:bg-hover transition-colors"
        >
          היום
        </button>
      )}
    </div>
  );
}

// ── Record Card ────────────────────────────────────────────────────

function RecordCard({
  r,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  r: FinanceRecord;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const catConf = CATEGORY_CONFIG[r.category] || CATEGORY_CONFIG.other;
  const sym = CURRENCY_SYMBOL[r.currency] || r.currency;

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      {/* Row 1: Badge + recurring + amount */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`text-sm px-3 py-1 rounded-full border ${catConf.color}`}>
            {catConf.label}
          </span>
          {r.is_recurring && <span className="text-base text-muted">🔄</span>}
        </div>
        <span
          className={`text-lg font-bold ${
            r.category === "income"
              ? "text-green-500"
              : r.category === "expense"
                ? "text-red-500"
                : "text-primary"
          }`}
        >
          {r.category === "income" ? "+" : r.category === "expense" ? "-" : ""}
          {sym}
          {parseFloat(r.amount).toLocaleString()}
        </span>
      </div>

      {/* Row 2: Title */}
      <p className="font-medium text-base">{r.title}</p>

      {/* Row 3: Meta + actions */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex flex-wrap gap-3 text-sm text-secondary">
          {r.record_date && <span>{formatDate(r.record_date)}</span>}
          {r.is_recurring && r.recurrence_rule && (
            <span className="text-muted">🔄 {r.recurrence_rule === "monthly" ? "חודשי" : r.recurrence_rule === "quarterly" ? "רבעוני" : r.recurrence_rule === "yearly" ? "שנתי" : r.recurrence_rule}</span>
          )}
          {r.member_name && <span>👤 {r.member_name}</span>}
        </div>
        <div className="flex gap-1">
          <button
            onClick={onEdit}
            className="text-lg text-muted hover:text-primary p-2 rounded-lg hover:bg-hover transition-colors"
            title="ערוך"
          >
            ✏️
          </button>
          <button
            onClick={onDuplicate}
            className="text-lg text-muted hover:text-blue-500 p-2 rounded-lg hover:bg-hover transition-colors"
            title="שכפל"
          >
            📋
          </button>
          <button
            onClick={onDelete}
            className="text-lg text-muted hover:text-red-500 p-2 rounded-lg hover:bg-hover transition-colors"
            title="מחק"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Row 4: Notes */}
      {r.notes && <p className="text-sm text-muted mt-2 truncate">{r.notes}</p>}

      {/* Row 5: Attachments */}
      {r.attachments && r.attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {r.attachments.map((att, i) => (
            <a
              key={i}
              href={att.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-link hover:underline bg-tag px-3 py-1 rounded-full"
            >
              📎 {att.label || att.filename}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────

export default function FinancePage() {
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth);
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [recurring, setRecurring] = useState<FinanceRecord[]>([]);
  const [aggregates, setAggregates] = useState<Aggregates>({
    total_income: 0,
    total_expense: 0,
    total_investment: 0,
    total_savings: 0,
    record_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [modal, setModal] = useState<{
    mode: "create" | "edit";
    initial?: Record<string, unknown>;
  } | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    fetch(`/api/finance?month=${currentMonth}`)
      .then((r) => r.json())
      .then((data) => {
        setRecords(data.records || []);
        setRecurring(data.recurring || []);
        setAggregates(
          data.aggregates || {
            total_income: 0,
            total_expense: 0,
            total_investment: 0,
            total_savings: 0,
            record_count: 0,
          }
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentMonth]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`למחוק את "${label}"?`)) return;
    try {
      await crudRequest("finance", "DELETE", { id });
      refresh();
    } catch {
      alert("שגיאה במחיקה");
    }
  };

  const openEdit = (r: FinanceRecord) => {
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
    });
  };

  const openDuplicate = (r: FinanceRecord) => {
    setModal({
      mode: "create",
      initial: {
        title: r.title,
        category: r.category,
        amount: r.amount,
        currency: r.currency,
        is_recurring: r.is_recurring,
        recurrence_rule: r.recurrence_rule,
        related_member_name: r.member_name,
        notes: r.notes,
      },
    });
  };

  // Client-side filter on monthly records
  const filtered = records.filter((r) => {
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

  const income = Number(aggregates.total_income);
  const expense = Number(aggregates.total_expense);
  const balance = income - expense;

  // Recurring monthly total (expenses only)
  const recurringTotal = recurring
    .filter((r) => r.category === "expense")
    .reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

  return (
    <div dir="rtl" className="min-h-dvh bg-surface text-primary">
      {/* Header */}
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
              <h1 className="text-2xl font-semibold">💰 כספים</h1>
              <p className="text-base text-secondary mt-0.5">ניהול הכנסות והוצאות</p>
            </div>
          </div>
          <button
            onClick={() => setModal({ mode: "create" })}
            className="bg-blue-600 hover:bg-blue-500 text-white text-base font-medium px-5 py-2.5 rounded-xl transition-colors"
          >
            + הוסף
          </button>
        </div>
      </header>

      <main className="px-4 sm:px-8 py-5 sm:py-8">
        {/* Month Navigator */}
        <MonthNavigator currentMonth={currentMonth} onChange={setCurrentMonth} />

        {/* Summary Cards */}
        {!loading && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
              <p className="text-sm text-green-500 mb-1">הכנסות</p>
              <p className="text-xl font-bold text-green-500">
                ₪{income.toLocaleString()}
              </p>
            </div>
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
              <p className="text-sm text-red-500 mb-1">הוצאות</p>
              <p className="text-xl font-bold text-red-500">
                ₪{expense.toLocaleString()}
              </p>
            </div>
            <div
              className={`rounded-xl p-4 text-center border ${
                balance >= 0
                  ? "bg-blue-500/10 border-blue-500/30"
                  : "bg-orange-500/10 border-orange-500/30"
              }`}
            >
              <p className="text-sm text-secondary mb-1">מאזן</p>
              <p
                className={`text-xl font-bold ${
                  balance >= 0 ? "text-blue-500" : "text-orange-500"
                }`}
              >
                ₪{balance.toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {/* Recurring Expenses Section */}
        {recurring.length > 0 && (
          <div className="mb-6">
            <button
              onClick={() => setRecurringOpen(!recurringOpen)}
              className="w-full flex items-center justify-between bg-card border border-border rounded-xl px-5 py-4 text-base font-medium hover:bg-hover transition-colors"
            >
              <div className="flex items-center gap-2">
                <span>🔄</span>
                <span>הוצאות קבועות</span>
                <span className="text-sm text-muted">({recurring.length})</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-red-500 font-bold">
                  ₪{recurringTotal.toLocaleString()}/חודש
                </span>
                <span className="text-muted text-sm">
                  {recurringOpen ? "▾" : "◂"}
                </span>
              </div>
            </button>
            {recurringOpen && (
              <div className="mt-2 space-y-2">
                {recurring.map((r) => (
                  <RecordCard
                    key={r.id}
                    r={r}
                    onEdit={() => openEdit(r)}
                    onDuplicate={() => openDuplicate(r)}
                    onDelete={() => handleDelete(r.id, r.title)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

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
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </div>

        {/* Records */}
        {loading ? (
          <div className="text-center py-16 text-muted text-lg">טוען...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted">
            <div className="text-5xl mb-3">💰</div>
            <p className="text-lg">
              {records.length === 0
                ? "אין רשומות בחודש זה"
                : "אין תוצאות לחיפוש"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => (
              <RecordCard
                key={r.id}
                r={r}
                onEdit={() => openEdit(r)}
                onDuplicate={() => openDuplicate(r)}
                onDelete={() => handleDelete(r.id, r.title)}
              />
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
