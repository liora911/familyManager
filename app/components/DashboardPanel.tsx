"use client";

import { useState, useEffect, useCallback } from "react";
import EventsCalendar from "@/app/components/EventsCalendar";
import { Card, ActionButtons, Tag, StatusBadge, Empty } from "@/app/components/DashboardCards";
import ClockFooter from "@/app/components/ClockFooter";
import FormModal, { tabs, crudRequest, FORM_FIELDS, type TabKey } from "@/app/components/FormModal";
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
  contact_phone?: string;
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
  image_url?: string;
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

// ── Labels ───────────────────────────────────────────────────────────

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

/** Build a value → Hebrew label map from the shared form definitions */
function optionLabels(entity: string, key: string): Record<string, string> {
  const field = FORM_FIELDS[entity]?.find((f) => f.key === key);
  return Object.fromEntries((field?.options || []).map((o) => [o.value, o.label]));
}

const shoppingCategoryLabels = optionLabels("shopping", "category");
const keyCategoryLabels = optionLabels("keys", "category");
const recurrenceLabels = optionLabels("reminders", "recurrence_rule");

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

function isPast(dateStr: string | undefined | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

async function fetchDashboard(): Promise<DashboardData | null> {
  const r = await fetch("/api/dashboard");
  if (r.status === 401) {
    window.location.href = "/login";
    return null;
  }
  if (!r.ok) return null;
  return r.json();
}

// ── WhatsApp share ──────────────────────────────────────────────────

/** Normalize Israeli phone to international format: 0501234567 → 972501234567 */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/[\s\-()]+/g, "");
  if (digits.startsWith("0")) return "972" + digits.slice(1);
  if (digits.startsWith("+")) return digits.slice(1);
  return digits;
}

function shareEventToWhatsApp(e: Event) {
  if (!e.contact_phone) return;
  const lines = [`📅 ${e.title}`, `🗓 ${formatDate(e.event_date)}`];
  if (e.location) lines.push(`📍 ${e.location}`);
  if (e.member_name) lines.push(`👤 ${e.member_name}`);
  if (e.contact_name) lines.push(`📞 ${e.contact_name}`);
  if (e.description) lines.push(`\n${e.description}`);
  const phone = normalizePhone(e.contact_phone);
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
}

// ── Small pieces ────────────────────────────────────────────────────

function OverdueTag() {
  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-badge-red-bg text-badge-red-text font-medium">
      באיחור
    </span>
  );
}

function CollapsibleSection({
  label,
  count,
  isOpen,
  onToggle,
  children,
}: {
  label: string;
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
        className="flex items-center gap-2 text-xs text-muted hover:text-secondary transition-colors mb-2 w-full py-1"
        aria-expanded={isOpen}
      >
        <span>{isOpen ? "▾" : "◂"}</span>
        <span>
          {label} ({count})
        </span>
      </button>
      {isOpen && <div className="space-y-2 opacity-70">{children}</div>}
    </div>
  );
}

// ── DashboardPanel ──────────────────────────────────────────────────

export default function DashboardPanel({
  className,
  requestedTab,
}: {
  className?: string;
  requestedTab?: TabKey | null;
}) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("events");
  const [eventsView, setEventsView] = useState<"list" | "calendar">("list");
  const [showExpired, setShowExpired] = useState(false);
  const [showPurchased, setShowPurchased] = useState(false);
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [modal, setModal] = useState<{
    entity: string;
    mode: "create" | "edit";
    initial?: Record<string, unknown>;
  } | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Sync external tab request
  useEffect(() => {
    if (requestedTab) setActiveTab(requestedTab);
  }, [requestedTab]);

  const { subscribeRefresh } = useDashboardRefresh();

  const refresh = useCallback(() => {
    fetchDashboard()
      .then((d) => {
        if (d) setData(d);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchDashboard()
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
    if (!confirm("למחוק את כל הפריטים שנקנו?")) return;
    try {
      await crudRequest("shopping", "DELETE", { clear_purchased: true });
      refresh();
    } catch {
      alert("שגיאה בניקוי");
    }
  };

  const toggleReveal = (id: string) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyKey = async (k: KeyItem) => {
    try {
      await navigator.clipboard.writeText(k.value);
      setCopiedKey(k.id);
      setTimeout(() => setCopiedKey((c) => (c === k.id ? null : c)), 1500);
    } catch {
      alert("לא ניתן להעתיק בדפדפן הזה");
    }
  };

  const tabCount = (key: TabKey): number => {
    if (!data) return 0;
    switch (key) {
      case "events":
        return data.events.filter((e) => !isPast(e.event_date)).length;
      case "tasks":
        return data.tasks.length;
      case "reminders":
        return data.reminders.length;
      case "shopping":
        return data.shopping.filter((i) => !i.is_purchased).length;
      case "medications":
        return data.medications.filter((m) => !m.end_date || !isPast(m.end_date)).length;
      case "keys":
        return data.keys.length;
    }
  };

  return (
    <div className={`flex flex-col h-full ${className || ""}`}>
      {/* Tabs */}
      <div className="bg-card border-b border-border px-2 overflow-x-auto flex-shrink-0">
        <div className="flex gap-0.5" role="tablist">
          {tabs.map((tab) => {
            const count = tabCount(tab.key);
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={isActive}
                aria-label={tab.label}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1 px-2.5 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? "border-blue-500 text-link"
                    : "border-transparent text-secondary hover:text-primary"
                }`}
              >
                <span aria-hidden="true">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                {count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      isActive ? "bg-badge-blue-bg text-badge-blue-text" : "bg-tag text-secondary"
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
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors flex items-center gap-1"
          >
            <span className="text-sm leading-none">+</span>
            הוספה
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted text-sm">טוען...</div>
        ) : !data ? (
          <div className="text-center py-12 text-muted text-sm space-y-3">
            <p>שגיאה בטעינת נתונים</p>
            <button onClick={refresh} className="text-link hover:underline text-sm">
              נסו שוב
            </button>
          </div>
        ) : (
          <>
            {/* ── Events ── */}
            {activeTab === "events" && (
              <div className="space-y-2">
                <div className="relative flex items-center bg-tag rounded-xl p-1 w-fit">
                  <div
                    className="absolute top-1 bottom-1 rounded-lg bg-card shadow-sm transition-all duration-250 ease-in-out"
                    style={{
                      width: "calc(50% - 2px)",
                      right: eventsView === "list" ? "2px" : "calc(50%)",
                    }}
                  />
                  <button
                    onClick={() => setEventsView("list")}
                    className={`relative z-10 text-xs px-3 py-1.5 rounded-lg transition-colors duration-200 ${
                      eventsView === "list" ? "text-primary font-medium" : "text-muted hover:text-secondary"
                    }`}
                  >
                    רשימה
                  </button>
                  <button
                    onClick={() => setEventsView("calendar")}
                    className={`relative z-10 text-xs px-3 py-1.5 rounded-lg transition-colors duration-200 ${
                      eventsView === "calendar" ? "text-primary font-medium" : "text-muted hover:text-secondary"
                    }`}
                  >
                    לוח חודשי
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
                ) : (
                  (() => {
                    const upcoming = data.events.filter((e) => !isPast(e.event_date));
                    const past = data.events.filter((e) => isPast(e.event_date));
                    const renderEvent = (e: Event) => (
                      <Card
                        key={e.id}
                        onShare={e.contact_phone ? () => shareEventToWhatsApp(e) : undefined}
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
                        {upcoming.length === 0 && <Empty text="אין אירועים קרובים" />}
                        {upcoming.map(renderEvent)}
                        <CollapsibleSection
                          label="אירועים שעברו"
                          count={past.length}
                          isOpen={showExpired}
                          onToggle={() => setShowExpired((p) => !p)}
                        >
                          {past.map(renderEvent)}
                        </CollapsibleSection>
                      </>
                    );
                  })()
                )}
              </div>
            )}

            {/* ── Shopping ── */}
            {activeTab === "shopping" && (() => {
              const open = data.shopping.filter((i) => !i.is_purchased);
              const bought = data.shopping.filter((i) => i.is_purchased);
              const groups = open.reduce<Record<string, ShoppingItem[]>>((acc, item) => {
                const cat = item.category || "other";
                if (!acc[cat]) acc[cat] = [];
                acc[cat].push(item);
                return acc;
              }, {});

              const renderActions = (item: ShoppingItem) => (
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
                        image_url: item.image_url,
                      },
                    })
                  }
                  onDelete={() => handleDelete("shopping", item.id, item.item_name)}
                  small
                />
              );

              return (
                <div className="space-y-3">
                  {open.length === 0 && (
                    <Empty text={bought.length > 0 ? "הכל נקנה 🎉" : "רשימת הקניות ריקה 🎉"} />
                  )}

                  {Object.entries(groups).map(([category, items]) => (
                    <div key={category}>
                      <p className="text-xs font-medium text-muted mb-1.5">
                        {shoppingCategoryLabels[category] || category}
                      </p>
                      <div className="bg-card rounded-xl border border-border p-3" style={{ boxShadow: `0 1px 2px var(--color-shadow)` }}>
                        <ul className="divide-y divide-border">
                          {items.map((item) => (
                            <li key={item.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0 gap-2">
                              <label className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer py-0.5">
                                <input
                                  type="checkbox"
                                  checked={false}
                                  className="w-5 h-5 rounded border-border text-blue-600 cursor-pointer flex-shrink-0"
                                  onChange={() => handleQuickUpdate("shopping", item.id, { is_purchased: true })}
                                  aria-label={`סמן ${item.item_name} כנקנה`}
                                />
                                <span className="text-sm truncate">{item.item_name}</span>
                              </label>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <div className="text-xs text-muted flex items-center gap-1.5">
                                  {item.quantity && <span>{item.quantity}</span>}
                                  {item.store && <span>🏪 {item.store}</span>}
                                </div>
                                {item.image_url && (
                                  <button
                                    onClick={() => setPreviewImage(item.image_url!)}
                                    className="text-muted hover:text-primary p-1.5 rounded-lg hover:bg-hover transition-colors"
                                    aria-label="צפייה בתמונה"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                                    </svg>
                                  </button>
                                )}
                                {renderActions(item)}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}

                  {bought.length > 0 && (
                    <div className="mt-2 pt-3 border-t border-border">
                      <button
                        onClick={() => setShowPurchased((p) => !p)}
                        className="flex items-center gap-2 text-xs text-muted hover:text-secondary transition-colors w-full py-1"
                        aria-expanded={showPurchased}
                      >
                        <span>{showPurchased ? "▾" : "◂"}</span>
                        <span>נקנו ({bought.length})</span>
                      </button>
                      {showPurchased && (
                        <div className="bg-card rounded-xl border border-border p-3 mt-2 opacity-80">
                          <ul className="divide-y divide-border">
                            {bought.map((item) => (
                              <li key={item.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0 gap-2">
                                <label className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer py-0.5">
                                  <input
                                    type="checkbox"
                                    checked
                                    className="w-5 h-5 rounded border-border text-blue-600 cursor-pointer flex-shrink-0"
                                    onChange={() => handleQuickUpdate("shopping", item.id, { is_purchased: false })}
                                    aria-label={`החזר את ${item.item_name} לרשימה`}
                                  />
                                  <span className="text-sm line-through text-muted truncate">{item.item_name}</span>
                                </label>
                                {renderActions(item)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <button
                        onClick={handleClearPurchased}
                        className="w-full mt-2 text-xs text-muted hover:text-red-500 py-2 transition-colors"
                      >
                        🧹 נקה פריטים שנקנו
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── Tasks ── */}
            {activeTab === "tasks" && (
              <div className="space-y-2">
                {(() => {
                  const overdue = data.tasks.filter((t) => isPast(t.due_date));
                  const upcoming = data.tasks.filter((t) => !isPast(t.due_date));
                  const renderTask = (t: Task) => {
                    const late = isPast(t.due_date);
                    return (
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
                              {late && <OverdueTag />}
                              <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColors[t.priority] || priorityColors.medium}`}>
                                {priorityLabels[t.priority] || t.priority}
                              </span>
                              {t.assigned_name && <Tag>{t.assigned_name}</Tag>}
                              {t.due_date && (
                                <span className={`text-xs px-2 py-0.5 rounded-full ${late ? "bg-badge-red-bg text-badge-red-text" : "bg-tag text-secondary"}`}>
                                  📅 {formatShortDate(t.due_date)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                            <StatusBadge status={t.status} />
                            {t.status !== "done" && (
                              <button
                                onClick={() => handleQuickUpdate("tasks", t.id, { status: "done" })}
                                className="text-xs text-green-600 hover:text-green-500 px-2 py-1 rounded-lg hover:bg-hover transition-colors"
                              >
                                סמן כבוצע ✓
                              </button>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  };
                  return (
                    <>
                      {overdue.length === 0 && upcoming.length === 0 && <Empty text="אין משימות פתוחות 🎉" />}
                      {overdue.map(renderTask)}
                      {upcoming.map(renderTask)}
                    </>
                  );
                })()}
              </div>
            )}

            {/* ── Reminders ── */}
            {activeTab === "reminders" && (
              <div className="space-y-2">
                {(() => {
                  const overdue = data.reminders.filter((r) => isPast(r.remind_at));
                  const upcoming = data.reminders.filter((r) => !isPast(r.remind_at));
                  const renderReminder = (r: Reminder) => {
                    const late = isPast(r.remind_at);
                    return (
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
                          {late && <OverdueTag />}
                          <span className={`text-xs px-2 py-0.5 rounded-full ${late ? "bg-badge-red-bg text-badge-red-text" : "bg-tag text-secondary"}`}>
                            🔔 {formatDate(r.remind_at)}
                          </span>
                          {r.event_title && <Tag>📅 {r.event_title}</Tag>}
                          {r.is_recurring && (
                            <Tag>🔄 {(r.recurrence_rule && recurrenceLabels[r.recurrence_rule]) || "חוזר"}</Tag>
                          )}
                        </div>
                      </Card>
                    );
                  };
                  return (
                    <>
                      {overdue.length === 0 && upcoming.length === 0 && <Empty text="אין תזכורות ממתינות" />}
                      {overdue.map(renderReminder)}
                      {upcoming.map(renderReminder)}
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
                  const ended = data.medications.filter((m) => m.end_date && isPast(m.end_date));
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
                        {m.end_date && <Tag>עד {formatShortDate(m.end_date)}</Tag>}
                      </div>
                      {m.notes && <p className="text-xs text-muted mt-1.5">{m.notes}</p>}
                    </Card>
                  );
                  return (
                    <>
                      {active.length === 0 && ended.length === 0 && <Empty text="אין תרופות רשומות" />}
                      {active.map(renderMed)}
                      <CollapsibleSection
                        label="הסתיימו"
                        count={ended.length}
                        isOpen={showExpired}
                        onToggle={() => setShowExpired((p) => !p)}
                      >
                        {ended.map(renderMed)}
                      </CollapsibleSection>
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
                  data.keys.map((k) => {
                    const revealed = revealedKeys.has(k.id);
                    return (
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
                        <p className="font-medium text-sm">{k.name}</p>
                        <div className="flex items-center gap-1 mt-1.5">
                          <p
                            className="flex-1 min-w-0 text-sm text-secondary font-mono truncate"
                            dir="ltr"
                            style={{ textAlign: "right" }}
                          >
                            {revealed ? k.value : "••••••••"}
                          </p>
                          <button
                            onClick={() => toggleReveal(k.id)}
                            className="text-xs text-link hover:text-link-hover px-2 py-1.5 rounded-lg hover:bg-hover transition-colors"
                            aria-pressed={revealed}
                          >
                            {revealed ? "הסתר" : "הצג"}
                          </button>
                          <button
                            onClick={() => copyKey(k)}
                            className="text-xs text-link hover:text-link-hover px-2 py-1.5 rounded-lg hover:bg-hover transition-colors"
                          >
                            {copiedKey === k.id ? "הועתק ✓" : "העתק"}
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {k.category && <Tag>🔑 {keyCategoryLabels[k.category] || k.category}</Tag>}
                          {k.location && <Tag>📍 {k.location}</Tag>}
                          {k.notes && <Tag>{k.notes}</Tag>}
                        </div>
                      </Card>
                    );
                  })
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

      {/* Image preview modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4 cursor-pointer"
          onClick={() => setPreviewImage(null)}
          role="dialog"
          aria-label="תצוגה מקדימה של תמונה"
        >
          <img
            src={previewImage}
            alt="תצוגה מקדימה"
            className="max-w-full max-h-[85vh] rounded-xl object-contain"
          />
        </div>
      )}
    </div>
  );
}
