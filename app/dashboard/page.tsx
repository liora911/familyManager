"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// ── Types ────────────────────────────────────────────────────────────

interface Event {
  id: string;
  title: string;
  description?: string;
  event_date: string;
  end_date?: string;
  location?: string;
  status: string;
  category: string;
  member_name?: string;
  contact_name?: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  category: string;
  priority: string;
  status: string;
  due_date?: string;
  assigned_name?: string;
}

interface ShoppingItem {
  id: string;
  item_name: string;
  quantity?: string;
  category: string;
  store?: string;
  is_purchased?: boolean;
}

interface Reminder {
  id: string;
  message: string;
  remind_at: string;
  is_recurring?: boolean;
  recurrence_rule?: string;
  event_title?: string;
}

interface Medication {
  id: string;
  name: string;
  dosage?: string;
  frequency?: string;
  start_date?: string;
  end_date?: string;
  notes?: string;
  member_name?: string;
}

interface DashboardData {
  events: Event[];
  tasks: Task[];
  shopping: ShoppingItem[];
  reminders: Reminder[];
  medications: Medication[];
}

// ── Constants ────────────────────────────────────────────────────────

const tabs = [
  { key: "events", label: "אירועים", icon: "📅" },
  { key: "shopping", label: "קניות", icon: "🛒" },
  { key: "tasks", label: "משימות", icon: "✅" },
  { key: "reminders", label: "תזכורות", icon: "🔔" },
  { key: "medications", label: "תרופות", icon: "💊" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

const FAMILY_MEMBERS = ["ירין", "תותי", "איתן", "גפן"];

const USER_LABELS: Record<string, string> = {
  yarin: "ירין",
  liora: "ליאורה",
  shared: "משותף",
};

function getUser(): string {
  const match = document.cookie.match(/home-manager-user=(\w+)/);
  return match?.[1] || "shared";
}

const priorityColors: Record<string, string> = {
  urgent: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-blue-100 text-blue-700",
  low: "bg-gray-100 text-gray-600",
};

const statusLabels: Record<string, string> = {
  scheduled: "מתוכנן",
  completed: "הושלם",
  cancelled: "בוטל",
  pending: "ממתין",
  in_progress: "בתהליך",
  done: "בוצע",
};

const priorityLabels: Record<string, string> = {
  urgent: "דחוף",
  high: "גבוה",
  medium: "בינוני",
  low: "נמוך",
};

// ── Helpers ──────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("he-IL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("he-IL", { day: "numeric", month: "short" });
}

function toLocalDatetime(dateStr: string) {
  const d = new Date(dateStr);
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
}

function toLocalDate(dateStr: string) {
  return new Date(dateStr).toISOString().slice(0, 10);
}

// ── CRUD helpers ────────────────────────────────────────────────────

async function crudRequest(entity: string, method: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/crud/${entity}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "שגיאה");
  return data;
}

// ── Main Component ──────────────────────────────────────────────────

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("events");
  const [user, setUser] = useState("shared");
  const [modal, setModal] = useState<{
    entity: string;
    mode: "create" | "edit";
    initial?: Record<string, unknown>;
  } | null>(null);

  const refresh = useCallback(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setUser(getUser());
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (entity: string, id: string, label: string) => {
    if (!confirm(`למחוק את "${label}"?`)) return;
    try {
      await crudRequest(entity, "DELETE", { id });
      refresh();
    } catch {
      alert("שגיאה במחיקה");
    }
  };

  const handleQuickUpdate = async (entity: string, id: string, fields: Record<string, unknown>) => {
    try {
      await crudRequest(entity, "PUT", { id, ...fields });
      refresh();
    } catch {
      alert("שגיאה בעדכון");
    }
  };

  const openCreate = () => setModal({ entity: activeTab, mode: "create" });

  return (
    <div dir="rtl" className="min-h-dvh bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium">📋 לוח בקרה</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {user === "shared" ? "כל המשפחה" : USER_LABELS[user] || user}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              document.cookie = "home-manager-user=; Path=/; Max-Age=0; SameSite=Lax";
              window.location.href = "/select";
            }}
            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-full transition-colors"
          >
            החלף פרופיל
          </button>
          <Link
            href="/"
            className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
          >
            💬 חזרה לצ׳אט
          </Link>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-4 overflow-x-auto">
        <div className="flex gap-1 max-w-3xl mx-auto">
          {tabs.map((tab) => {
            const count = data?.[tab.key]?.length ?? 0;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {count > 0 && (
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full ${
                      activeTab === tab.key
                        ? "bg-blue-100 text-blue-600"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-3xl mx-auto p-4">
        {/* Add button */}
        <div className="flex justify-end mb-4">
          <button
            onClick={openCreate}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <span className="text-lg leading-none">+</span>
            הוספה
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">טוען...</div>
        ) : !data ? (
          <div className="text-center py-20 text-gray-400">שגיאה בטעינת נתונים</div>
        ) : (
          <>
            {/* ── Events ── */}
            {activeTab === "events" && (
              <div className="space-y-3">
                {data.events.length === 0 ? (
                  <Empty text="אין אירועים קרובים" />
                ) : (
                  data.events.map((e) => (
                    <Card
                      key={e.id}
                      onEdit={() =>
                        setModal({
                          entity: "events",
                          mode: "edit",
                          initial: {
                            id: e.id,
                            title: e.title,
                            description: e.description,
                            category: e.category,
                            event_date: e.event_date,
                            end_date: e.end_date,
                            location: e.location,
                            member_name: e.member_name,
                            status: e.status,
                          },
                        })
                      }
                      onDelete={() => handleDelete("events", e.id, e.title)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{e.title}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            {formatDate(e.event_date)}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {e.member_name && <Tag>{e.member_name}</Tag>}
                            {e.contact_name && <Tag>{e.contact_name}</Tag>}
                            {e.location && <Tag>📍 {e.location}</Tag>}
                          </div>
                        </div>
                        <StatusBadge status={e.status} />
                      </div>
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* ── Shopping ── */}
            {activeTab === "shopping" && (
              <div className="space-y-3">
                {data.shopping.length === 0 ? (
                  <Empty text="רשימת הקניות ריקה 🎉" />
                ) : (
                  <>
                    {Object.entries(
                      data.shopping.reduce<Record<string, ShoppingItem[]>>(
                        (acc, item) => {
                          const cat = item.category || "כללי";
                          if (!acc[cat]) acc[cat] = [];
                          acc[cat].push(item);
                          return acc;
                        },
                        {}
                      )
                    ).map(([category, items]) => (
                      <div key={category}>
                        <p className="text-xs font-medium text-gray-400 uppercase mb-2">
                          {category}
                        </p>
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                          <ul className="divide-y divide-gray-100">
                            {items.map((item) => (
                              <li
                                key={item.id}
                                className="flex items-center justify-between py-2 first:pt-0 last:pb-0 gap-2"
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                                    onChange={() =>
                                      handleQuickUpdate("shopping", item.id, {
                                        is_purchased: true,
                                      })
                                    }
                                  />
                                  <span className="text-sm">{item.item_name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="text-xs text-gray-400 flex items-center gap-2">
                                    {item.quantity && <span>{item.quantity}</span>}
                                    {item.store && <span>🏪 {item.store}</span>}
                                  </div>
                                  <ActionButtons
                                    onEdit={() =>
                                      setModal({
                                        entity: "shopping",
                                        mode: "edit",
                                        initial: {
                                          id: item.id,
                                          item_name: item.item_name,
                                          quantity: item.quantity,
                                          category: item.category,
                                          store: item.store,
                                        },
                                      })
                                    }
                                    onDelete={() =>
                                      handleDelete("shopping", item.id, item.item_name)
                                    }
                                    small
                                  />
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* ── Tasks ── */}
            {activeTab === "tasks" && (
              <div className="space-y-3">
                {data.tasks.length === 0 ? (
                  <Empty text="אין משימות פתוחות 🎉" />
                ) : (
                  data.tasks.map((t) => (
                    <Card
                      key={t.id}
                      onEdit={() =>
                        setModal({
                          entity: "tasks",
                          mode: "edit",
                          initial: {
                            id: t.id,
                            title: t.title,
                            description: t.description,
                            category: t.category,
                            priority: t.priority,
                            status: t.status,
                            due_date: t.due_date,
                            assigned_to_name: t.assigned_name,
                          },
                        })
                      }
                      onDelete={() => handleDelete("tasks", t.id, t.title)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{t.title}</p>
                          {t.description && (
                            <p className="text-sm text-gray-500 mt-1">{t.description}</p>
                          )}
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                priorityColors[t.priority] || priorityColors.medium
                              }`}
                            >
                              {priorityLabels[t.priority] || t.priority}
                            </span>
                            {t.assigned_name && <Tag>{t.assigned_name}</Tag>}
                            {t.due_date && <Tag>📅 {formatShortDate(t.due_date)}</Tag>}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <StatusBadge status={t.status} />
                          {t.status === "pending" && (
                            <button
                              onClick={() =>
                                handleQuickUpdate("tasks", t.id, { status: "done" })
                              }
                              className="text-xs text-green-600 hover:text-green-700"
                            >
                              סמן כבוצע ✓
                            </button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* ── Reminders ── */}
            {activeTab === "reminders" && (
              <div className="space-y-3">
                {data.reminders.length === 0 ? (
                  <Empty text="אין תזכורות ממתינות" />
                ) : (
                  data.reminders.map((r) => (
                    <Card
                      key={r.id}
                      onEdit={() =>
                        setModal({
                          entity: "reminders",
                          mode: "edit",
                          initial: {
                            id: r.id,
                            message: r.message,
                            remind_at: r.remind_at,
                            is_recurring: r.is_recurring,
                            recurrence_rule: r.recurrence_rule,
                          },
                        })
                      }
                      onDelete={() => handleDelete("reminders", r.id, r.message)}
                    >
                      <p className="font-medium">{r.message}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Tag>🔔 {formatDate(r.remind_at)}</Tag>
                        {r.event_title && <Tag>📅 {r.event_title}</Tag>}
                        {r.is_recurring && <Tag>🔄 {r.recurrence_rule || "חוזר"}</Tag>}
                      </div>
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* ── Medications ── */}
            {activeTab === "medications" && (
              <div className="space-y-3">
                {data.medications.length === 0 ? (
                  <Empty text="אין תרופות רשומות" />
                ) : (
                  data.medications.map((m) => (
                    <Card
                      key={m.id}
                      onEdit={() =>
                        setModal({
                          entity: "medications",
                          mode: "edit",
                          initial: {
                            id: m.id,
                            name: m.name,
                            dosage: m.dosage,
                            frequency: m.frequency,
                            start_date: m.start_date,
                            end_date: m.end_date,
                            notes: m.notes,
                            for_member_name: m.member_name,
                          },
                        })
                      }
                      onDelete={() => handleDelete("medications", m.id, m.name)}
                    >
                      <p className="font-medium">{m.name}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {m.dosage && <Tag>💊 {m.dosage}</Tag>}
                        {m.frequency && <Tag>🔄 {m.frequency}</Tag>}
                        {m.member_name && <Tag>{m.member_name}</Tag>}
                      </div>
                    </Card>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Modal */}
      {modal && (
        <FormModal
          entity={modal.entity}
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

// ── Reusable UI Components ──────────────────────────────────────────

function Card({
  children,
  onEdit,
  onDelete,
}: {
  children: React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 group">
      {children}
      {(onEdit || onDelete) && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <button
              onClick={onEdit}
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              ✏️ עריכה
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
            >
              🗑️ מחיקה
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ActionButtons({
  onEdit,
  onDelete,
  small,
}: {
  onEdit: () => void;
  onDelete: () => void;
  small?: boolean;
}) {
  const size = small ? "text-xs" : "text-sm";
  return (
    <div className="flex gap-1">
      <button onClick={onEdit} className={`${size} text-blue-600 hover:text-blue-700 p-1`}>
        ✏️
      </button>
      <button onClick={onDelete} className={`${size} text-red-500 hover:text-red-600 p-1`}>
        🗑️
      </button>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
      {children}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    scheduled: "bg-blue-100 text-blue-600",
    completed: "bg-green-100 text-green-600",
    cancelled: "bg-gray-100 text-gray-400",
    pending: "bg-yellow-100 text-yellow-600",
    in_progress: "bg-purple-100 text-purple-600",
  };
  return (
    <span
      className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
        colors[status] || colors.pending
      }`}
    >
      {statusLabels[status] || status}
    </span>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="text-center py-16 text-gray-400">
      <p className="text-lg">{text}</p>
    </div>
  );
}

// ── Form Modal ──────────────────────────────────────────────────────

interface FormField {
  key: string;
  label: string;
  type: "text" | "select" | "datetime" | "date" | "checkbox";
  required?: boolean;
  options?: { value: string; label: string }[];
}

const FORM_FIELDS: Record<string, FormField[]> = {
  events: [
    { key: "title", label: "כותרת", type: "text", required: true },
    { key: "description", label: "תיאור", type: "text" },
    {
      key: "category",
      label: "קטגוריה",
      type: "select",
      required: true,
      options: [
        { value: "medical", label: "רפואי" },
        { value: "school", label: "בית ספר" },
        { value: "personal", label: "אישי" },
        { value: "household", label: "בית" },
        { value: "social", label: "חברתי" },
        { value: "work", label: "עבודה" },
      ],
    },
    { key: "event_date", label: "תאריך ושעה", type: "datetime", required: true },
    { key: "end_date", label: "תאריך סיום", type: "datetime" },
    { key: "location", label: "מיקום", type: "text" },
    {
      key: "member_name",
      label: "בן משפחה",
      type: "select",
      options: FAMILY_MEMBERS.map((n) => ({ value: n, label: n })),
    },
    {
      key: "status",
      label: "סטטוס",
      type: "select",
      options: [
        { value: "scheduled", label: "מתוכנן" },
        { value: "completed", label: "הושלם" },
        { value: "cancelled", label: "בוטל" },
      ],
    },
  ],
  tasks: [
    { key: "title", label: "כותרת", type: "text", required: true },
    { key: "description", label: "תיאור", type: "text" },
    {
      key: "category",
      label: "קטגוריה",
      type: "select",
      options: [
        { value: "chore", label: "מטלה" },
        { value: "errand", label: "סידור" },
        { value: "finance", label: "כספים" },
        { value: "repair", label: "תיקון" },
        { value: "admin", label: "ניהול" },
      ],
    },
    {
      key: "priority",
      label: "עדיפות",
      type: "select",
      options: [
        { value: "low", label: "נמוך" },
        { value: "medium", label: "בינוני" },
        { value: "high", label: "גבוה" },
        { value: "urgent", label: "דחוף" },
      ],
    },
    { key: "due_date", label: "תאריך יעד", type: "datetime" },
    {
      key: "assigned_to_name",
      label: "אחראי",
      type: "select",
      options: FAMILY_MEMBERS.map((n) => ({ value: n, label: n })),
    },
    {
      key: "status",
      label: "סטטוס",
      type: "select",
      options: [
        { value: "pending", label: "ממתין" },
        { value: "in_progress", label: "בתהליך" },
        { value: "done", label: "בוצע" },
      ],
    },
  ],
  shopping: [
    { key: "item_name", label: "פריט", type: "text", required: true },
    { key: "quantity", label: "כמות", type: "text" },
    {
      key: "category",
      label: "קטגוריה",
      type: "select",
      options: [
        { value: "grocery", label: "מכולת" },
        { value: "pharmacy", label: "בית מרקחת" },
        { value: "household", label: "בית" },
        { value: "baby", label: "תינוק" },
        { value: "other", label: "אחר" },
      ],
    },
    { key: "store", label: "חנות", type: "text" },
  ],
  reminders: [
    { key: "message", label: "הודעה", type: "text", required: true },
    { key: "remind_at", label: "תאריך תזכורת", type: "datetime", required: true },
    { key: "is_recurring", label: "חוזר", type: "checkbox" },
    {
      key: "recurrence_rule",
      label: "תדירות",
      type: "select",
      options: [
        { value: "daily", label: "יומי" },
        { value: "weekly", label: "שבועי" },
        { value: "monthly", label: "חודשי" },
      ],
    },
  ],
  medications: [
    { key: "name", label: "שם תרופה", type: "text", required: true },
    {
      key: "for_member_name",
      label: "עבור",
      type: "select",
      required: true,
      options: FAMILY_MEMBERS.map((n) => ({ value: n, label: n })),
    },
    { key: "dosage", label: "מינון", type: "text" },
    { key: "frequency", label: "תדירות", type: "text" },
    { key: "start_date", label: "תאריך התחלה", type: "date" },
    { key: "end_date", label: "תאריך סיום", type: "date" },
    { key: "notes", label: "הערות", type: "text" },
  ],
};

function FormModal({
  entity,
  mode,
  initial,
  onClose,
  onSaved,
}: {
  entity: string;
  mode: "create" | "edit";
  initial?: Record<string, unknown>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const fields = FORM_FIELDS[entity] || [];
  const [form, setForm] = useState<Record<string, unknown>>(() => {
    if (!initial) return {};
    const v: Record<string, unknown> = { ...initial };
    // Convert dates to local datetime-local format for inputs
    for (const f of fields) {
      if (f.type === "datetime" && v[f.key] && typeof v[f.key] === "string") {
        v[f.key] = toLocalDatetime(v[f.key] as string);
      }
      if (f.type === "date" && v[f.key] && typeof v[f.key] === "string") {
        v[f.key] = toLocalDate(v[f.key] as string);
      }
    }
    return v;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const tabLabel = tabs.find((t) => t.key === entity)?.label || entity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload = { ...form };
      // Convert datetime-local values to ISO strings
      for (const f of fields) {
        if (f.type === "datetime" && payload[f.key]) {
          payload[f.key] = new Date(payload[f.key] as string).toISOString();
        }
      }

      if (mode === "create") {
        await crudRequest(entity, "POST", payload);
      } else {
        await crudRequest(entity, "PUT", payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-medium">
            {mode === "create" ? `הוספת ${tabLabel}` : `עריכת ${tabLabel}`}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {fields.map((field) => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}
                {field.required && <span className="text-red-500 mr-1">*</span>}
              </label>

              {field.type === "select" ? (
                <select
                  value={(form[field.key] as string) || ""}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, [field.key]: e.target.value }))
                  }
                  required={field.required}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50
                             focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">בחר...</option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : field.type === "checkbox" ? (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!form[field.key]}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, [field.key]: e.target.checked }))
                    }
                    className="w-4 h-4 rounded border-gray-300 text-blue-600"
                  />
                  <span className="text-sm text-gray-600">כן</span>
                </label>
              ) : (
                <input
                  type={
                    field.type === "datetime"
                      ? "datetime-local"
                      : field.type === "date"
                        ? "date"
                        : "text"
                  }
                  value={(form[field.key] as string) || ""}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, [field.key]: e.target.value }))
                  }
                  required={field.required}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50
                             focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              )}
            </div>
          ))}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-300
                         text-white font-medium py-2.5 rounded-xl transition-colors text-sm"
            >
              {saving ? "שומר..." : mode === "create" ? "הוסף" : "שמור"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600
                         hover:bg-gray-50 transition-colors"
            >
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
