"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Event {
  id: string;
  title: string;
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
}

interface Reminder {
  id: string;
  message: string;
  remind_at: string;
  event_title?: string;
}

interface Medication {
  id: string;
  name: string;
  dosage?: string;
  frequency?: string;
  member_name?: string;
}

interface DashboardData {
  events: Event[];
  tasks: Task[];
  shopping: ShoppingItem[];
  reminders: Reminder[];
  medications: Medication[];
}

const tabs = [
  { key: "events", label: "אירועים", icon: "📅" },
  { key: "shopping", label: "קניות", icon: "🛒" },
  { key: "tasks", label: "משימות", icon: "✅" },
  { key: "reminders", label: "תזכורות", icon: "🔔" },
  { key: "medications", label: "תרופות", icon: "💊" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

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
  return d.toLocaleDateString("he-IL", {
    day: "numeric",
    month: "short",
  });
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

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("events");

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div dir="rtl" className="min-h-dvh bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium">📋 לוח בקרה</h1>
          <p className="text-sm text-gray-500 mt-0.5">כל מה שקורה בבית</p>
        </div>
        <Link
          href="/"
          className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
        >
          💬 חזרה לצ׳אט
        </Link>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-4 overflow-x-auto">
        <div className="flex gap-1 max-w-3xl mx-auto">
          {tabs.map((tab) => {
            const count =
              data?.[tab.key]?.length ?? 0;
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
        {loading ? (
          <div className="text-center py-20 text-gray-400">טוען...</div>
        ) : !data ? (
          <div className="text-center py-20 text-gray-400">שגיאה בטעינת נתונים</div>
        ) : (
          <>
            {/* Events */}
            {activeTab === "events" && (
              <div className="space-y-3">
                {data.events.length === 0 ? (
                  <Empty text="אין אירועים קרובים" />
                ) : (
                  data.events.map((e) => (
                    <Card key={e.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{e.title}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            {formatDate(e.event_date)}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {e.member_name && (
                              <Tag>{e.member_name}</Tag>
                            )}
                            {e.contact_name && (
                              <Tag>{e.contact_name}</Tag>
                            )}
                            {e.location && (
                              <Tag>📍 {e.location}</Tag>
                            )}
                          </div>
                        </div>
                        <StatusBadge status={e.status} />
                      </div>
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* Shopping */}
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
                        <Card>
                          <ul className="divide-y divide-gray-100">
                            {items.map((item) => (
                              <li
                                key={item.id}
                                className="flex items-center justify-between py-2 first:pt-0 last:pb-0"
                              >
                                <span className="text-sm">{item.item_name}</span>
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                  {item.quantity && <span>{item.quantity}</span>}
                                  {item.store && <span>🏪 {item.store}</span>}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </Card>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* Tasks */}
            {activeTab === "tasks" && (
              <div className="space-y-3">
                {data.tasks.length === 0 ? (
                  <Empty text="אין משימות פתוחות 🎉" />
                ) : (
                  data.tasks.map((t) => (
                    <Card key={t.id}>
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
                            {t.due_date && (
                              <Tag>📅 {formatShortDate(t.due_date)}</Tag>
                            )}
                          </div>
                        </div>
                        <StatusBadge status={t.status} />
                      </div>
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* Reminders */}
            {activeTab === "reminders" && (
              <div className="space-y-3">
                {data.reminders.length === 0 ? (
                  <Empty text="אין תזכורות ממתינות" />
                ) : (
                  data.reminders.map((r) => (
                    <Card key={r.id}>
                      <p className="font-medium">{r.message}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Tag>🔔 {formatDate(r.remind_at)}</Tag>
                        {r.event_title && <Tag>📅 {r.event_title}</Tag>}
                      </div>
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* Medications */}
            {activeTab === "medications" && (
              <div className="space-y-3">
                {data.medications.length === 0 ? (
                  <Empty text="אין תרופות רשומות" />
                ) : (
                  data.medications.map((m) => (
                    <Card key={m.id}>
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
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      {children}
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
