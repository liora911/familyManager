"use client";

import { useState, useEffect, useCallback } from "react";
import EventsCalendar from "@/app/components/EventsCalendar";
import { Card, ActionButtons, Tag, StatusBadge, Empty } from "@/app/components/DashboardCards";
import ClockFooter from "@/app/components/ClockFooter";
import FormModal, { tabs, crudRequest, type TabKey } from "@/app/components/FormModal";
import { useDashboardRefresh } from "@/app/contexts/DashboardRefreshContext";

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

interface KeyItem {
  id: string;
  name: string;
  value: string;
  category: string;
  location?: string;
  notes?: string;
}

interface DashboardData {
  events: Event[];
  tasks: Task[];
  shopping: ShoppingItem[];
  reminders: Reminder[];
  medications: Medication[];
  keys: KeyItem[];
}

// ── Constants ────────────────────────────────────────────────────────

const priorityColors: Record<string, string> = {
  urgent: "bg-badge-red-bg text-badge-red-text",
  high: "bg-badge-orange-bg text-badge-orange-text",
  medium: "bg-badge-blue-bg text-badge-blue-text",
  low: "bg-badge-neutral-bg text-badge-neutral-text",
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

// ── Expired section ──────────────────────────────────────────────────

function isPast(dateStr: string | undefined | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

function ExpiredSection({
  count,
  isOpen,
  onToggle,
  children,
}: {
  count: number;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <div className="mt-4 pt-3 border-t border-border">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 text-xs text-muted hover:text-secondary transition-colors mb-2 w-full"
      >
        <span>{isOpen ? "▾" : "◂"}</span>
        <span>עבר ({count})</span>
      </button>
      {isOpen && <div className="space-y-2 opacity-60">{children}</div>}
    </div>
  );
}

// ── DashboardPanel ──────────────────────────────────────────────────

export default function DashboardPanel({
  className,
  expanded,
  onToggleExpand,
}: {
  className?: string;
  expanded?: boolean;
  onToggleExpand?: () => void;
}) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("events");
  const [eventsView, setEventsView] = useState<"list" | "calendar">("list");
  const [showExpired, setShowExpired] = useState(false);
  const [modal, setModal] = useState<{
    entity: string;
    mode: "create" | "edit";
    initial?: Record<string, unknown>;
  } | null>(null);

  const { subscribeRefresh } = useDashboardRefresh();

  const refresh = useCallback(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Subscribe to refresh signals from ChatPanel
  useEffect(() => {
    const unsubscribe = subscribeRefresh(refresh);
    return unsubscribe;
  }, [subscribeRefresh, refresh]);

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

  const handleClearPurchased = async () => {
    try {
      await fetch("/api/crud/shopping", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clear_purchased: true }),
      });
      refresh();
    } catch {
      alert("שגיאה בניקוי");
    }
  };

  return (
    <div className={`flex flex-col h-full ${className || ""}`}>
      {/* Panel toolbar */}
      {onToggleExpand && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-card flex-shrink-0">
          <button
            onClick={onToggleExpand}
            className="text-muted hover:text-primary text-xs px-2.5 py-1 rounded-lg
                       bg-tag border border-border transition-colors"
          >
            {expanded ? "↙ צמצם" : "↗ הרחב"}
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-card border-b border-border px-2 overflow-x-auto flex-shrink-0">
        <div className="flex gap-0.5">
          {tabs.map((tab) => {
            const count = (() => {
              if (!data) return 0;
              switch (tab.key) {
                case "events": return data.events.filter((e) => !isPast(e.event_date) || e.status !== "scheduled").length;
                case "tasks": return data.tasks.filter((t) => !isPast(t.due_date)).length;
                case "reminders": return data.reminders.filter((r) => !isPast(r.remind_at)).length;
                case "medications": return data.medications.filter((m) => !m.end_date || !isPast(m.end_date)).length;
                default: return data[tab.key]?.length ?? 0;
              }
            })();
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1 px-2.5 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-blue-500 text-link"
                    : "border-transparent text-secondary hover:text-primary"
                }`}
              >
                <span>{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                {count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      activeTab === tab.key
                        ? "bg-badge-blue-bg text-badge-blue-text"
                        : "bg-tag text-secondary"
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
      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex justify-end mb-3">
          <button
            onClick={openCreate}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
          >
            <span className="text-sm leading-none">+</span>
            הוספה
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted text-sm">טוען...</div>
        ) : !data ? (
          <div className="text-center py-12 text-muted text-sm">שגיאה בטעינת נתונים</div>
        ) : (
          <>
            {/* ── Events ── */}
            {activeTab === "events" && (
              <div className="space-y-2">
                <div className="flex items-center gap-1 bg-tag rounded-lg p-1 w-fit">
                  <button
                    onClick={() => setEventsView("list")}
                    className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                      eventsView === "list"
                        ? "bg-card text-primary shadow-sm"
                        : "text-secondary hover:text-primary"
                    }`}
                  >
                    📋 רשימה
                  </button>
                  <button
                    onClick={() => setEventsView("calendar")}
                    className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                      eventsView === "calendar"
                        ? "bg-card text-primary shadow-sm"
                        : "text-secondary hover:text-primary"
                    }`}
                  >
                    📅 לוח חודשי
                  </button>
                </div>

                {eventsView === "calendar" ? (
                  <EventsCalendar
                    events={data.events}
                    onAdd={(type, date) =>
                      setModal({
                        entity: type,
                        mode: "create",
                        initial: type === "events" ? { event_date: date } : { due_date: date },
                      })
                    }
                  />
                ) : (() => {
                  const active = data.events.filter((e) => !isPast(e.event_date) || e.status !== "scheduled");
                  const expired = data.events.filter((e) => isPast(e.event_date) && e.status === "scheduled");
                  const renderEvent = (e: Event) => (
                    <Card
                      key={e.id}
                      onEdit={() =>
                        setModal({
                          entity: "events",
                          mode: "edit",
                          initial: {
                            id: e.id, title: e.title, description: e.description,
                            category: e.category, event_date: e.event_date, end_date: e.end_date,
                            location: e.location, member_name: e.member_name, status: e.status,
                          },
                        })
                      }
                      onDelete={() => handleDelete("events", e.id, e.title)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{e.title}</p>
                          <p className="text-xs text-secondary mt-1">{formatDate(e.event_date)}</p>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {e.member_name && <Tag>{e.member_name}</Tag>}
                            {e.contact_name && <Tag>{e.contact_name}</Tag>}
                            {e.location && <Tag>📍 {e.location}</Tag>}
                          </div>
                        </div>
                        <StatusBadge status={e.status} />
                      </div>
                    </Card>
                  );
                  return (
                    <>
                      {active.length === 0 && expired.length === 0 && <Empty text="אין אירועים קרובים" />}
                      {active.map(renderEvent)}
                      <ExpiredSection count={expired.length} isOpen={showExpired} onToggle={() => setShowExpired((p) => !p)}>
                        {expired.map(renderEvent)}
                      </ExpiredSection>
                    </>
                  );
                })()}
              </div>
            )}

            {/* ── Shopping ── */}
            {activeTab === "shopping" && (
              <div className="space-y-2">
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
                        <p className="text-xs font-medium text-muted uppercase mb-1.5">
                          {category}
                        </p>
                        <div className="bg-card rounded-xl border border-border p-3" style={{ boxShadow: `0 1px 2px var(--color-shadow)` }}>
                          <ul className="divide-y divide-border">
                            {items.map((item) => (
                              <li
                                key={item.id}
                                className="flex items-center justify-between py-1.5 first:pt-0 last:pb-0 gap-2"
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded border-border text-blue-600 cursor-pointer"
                                    onChange={() =>
                                      handleQuickUpdate("shopping", item.id, {
                                        is_purchased: true,
                                      })
                                    }
                                  />
                                  <span className="text-sm">{item.item_name}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <div className="text-xs text-muted flex items-center gap-1.5">
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
                    <button
                      onClick={handleClearPurchased}
                      className="w-full mt-2 text-xs text-muted hover:text-red-500 py-1.5 transition-colors"
                    >
                      🧹 נקה פריטים שנקנו
                    </button>
                  </>
                )}
              </div>
            )}

            {/* ── Tasks ── */}
            {activeTab === "tasks" && (
              <div className="space-y-2">
                {(() => {
                  const active = data.tasks.filter((t) => !isPast(t.due_date));
                  const expired = data.tasks.filter((t) => isPast(t.due_date));
                  const renderTask = (t: Task) => (
                    <Card
                      key={t.id}
                      onEdit={() =>
                        setModal({
                          entity: "tasks",
                          mode: "edit",
                          initial: {
                            id: t.id, title: t.title, description: t.description,
                            category: t.category, priority: t.priority, status: t.status,
                            due_date: t.due_date, assigned_to_name: t.assigned_name,
                          },
                        })
                      }
                      onDelete={() => handleDelete("tasks", t.id, t.title)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{t.title}</p>
                          {t.description && (
                            <p className="text-xs text-secondary mt-1">{t.description}</p>
                          )}
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColors[t.priority] || priorityColors.medium}`}>
                              {priorityLabels[t.priority] || t.priority}
                            </span>
                            {t.assigned_name && <Tag>{t.assigned_name}</Tag>}
                            {t.due_date && <Tag>📅 {formatShortDate(t.due_date)}</Tag>}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <StatusBadge status={t.status} />
                          {t.status === "pending" && (
                            <button
                              onClick={() => handleQuickUpdate("tasks", t.id, { status: "done" })}
                              className="text-xs text-green-600 hover:text-green-500"
                            >
                              סמן כבוצע ✓
                            </button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                  return (
                    <>
                      {active.length === 0 && expired.length === 0 && <Empty text="אין משימות פתוחות 🎉" />}
                      {active.map(renderTask)}
                      <ExpiredSection count={expired.length} isOpen={showExpired} onToggle={() => setShowExpired((p) => !p)}>
                        {expired.map(renderTask)}
                      </ExpiredSection>
                    </>
                  );
                })()}
              </div>
            )}

            {/* ── Reminders ── */}
            {activeTab === "reminders" && (
              <div className="space-y-2">
                {(() => {
                  const active = data.reminders.filter((r) => !isPast(r.remind_at));
                  const expired = data.reminders.filter((r) => isPast(r.remind_at));
                  const renderReminder = (r: Reminder) => (
                    <Card
                      key={r.id}
                      onEdit={() =>
                        setModal({
                          entity: "reminders",
                          mode: "edit",
                          initial: {
                            id: r.id, message: r.message, remind_at: r.remind_at,
                            is_recurring: r.is_recurring, recurrence_rule: r.recurrence_rule,
                          },
                        })
                      }
                      onDelete={() => handleDelete("reminders", r.id, r.message)}
                    >
                      <p className="font-medium text-sm">{r.message}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        <Tag>🔔 {formatDate(r.remind_at)}</Tag>
                        {r.event_title && <Tag>📅 {r.event_title}</Tag>}
                        {r.is_recurring && <Tag>🔄 {r.recurrence_rule || "חוזר"}</Tag>}
                      </div>
                    </Card>
                  );
                  return (
                    <>
                      {active.length === 0 && expired.length === 0 && <Empty text="אין תזכורות ממתינות" />}
                      {active.map(renderReminder)}
                      <ExpiredSection count={expired.length} isOpen={showExpired} onToggle={() => setShowExpired((p) => !p)}>
                        {expired.map(renderReminder)}
                      </ExpiredSection>
                    </>
                  );
                })()}
              </div>
            )}

            {/* ── Medications ── */}
            {activeTab === "medications" && (
              <div className="space-y-2">
                {(() => {
                  const active = data.medications.filter((m) => !m.end_date || !isPast(m.end_date));
                  const expired = data.medications.filter((m) => m.end_date && isPast(m.end_date));
                  const renderMed = (m: Medication) => (
                    <Card
                      key={m.id}
                      onEdit={() =>
                        setModal({
                          entity: "medications",
                          mode: "edit",
                          initial: {
                            id: m.id, name: m.name, dosage: m.dosage, frequency: m.frequency,
                            start_date: m.start_date, end_date: m.end_date, notes: m.notes,
                            for_member_name: m.member_name,
                          },
                        })
                      }
                      onDelete={() => handleDelete("medications", m.id, m.name)}
                    >
                      <p className="font-medium text-sm">{m.name}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {m.dosage && <Tag>💊 {m.dosage}</Tag>}
                        {m.frequency && <Tag>🔄 {m.frequency}</Tag>}
                        {m.member_name && <Tag>{m.member_name}</Tag>}
                      </div>
                    </Card>
                  );
                  return (
                    <>
                      {active.length === 0 && expired.length === 0 && <Empty text="אין תרופות רשומות" />}
                      {active.map(renderMed)}
                      <ExpiredSection count={expired.length} isOpen={showExpired} onToggle={() => setShowExpired((p) => !p)}>
                        {expired.map(renderMed)}
                      </ExpiredSection>
                    </>
                  );
                })()}
              </div>
            )}

            {/* ── Keys ── */}
            {activeTab === "keys" && (
              <div className="space-y-2">
                {data.keys.length === 0 ? (
                  <Empty text="אין מפתחות שמורים" />
                ) : (
                  data.keys.map((k) => (
                    <Card
                      key={k.id}
                      onEdit={() =>
                        setModal({
                          entity: "keys",
                          mode: "edit",
                          initial: {
                            id: k.id,
                            name: k.name,
                            value: k.value,
                            category: k.category,
                            location: k.location,
                            notes: k.notes,
                          },
                        })
                      }
                      onDelete={() => handleDelete("keys", k.id, k.name)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{k.name}</p>
                          <p className="text-xs text-secondary mt-1 font-mono" dir="ltr" style={{ textAlign: "right" }}>
                            {k.value}
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {k.category && <Tag>🔑 {k.category}</Tag>}
                            {k.location && <Tag>📍 {k.location}</Tag>}
                            {k.notes && <Tag>{k.notes}</Tag>}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            )}

          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0">
        <ClockFooter />
      </div>

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
