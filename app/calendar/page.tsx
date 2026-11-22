"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import CalendarItemModal, {
  CALENDAR_CATEGORIES,
  NOTIFY_PRESETS,
  dateKey,
  minutesBefore,
  type CalendarItem,
} from "@/app/components/CalendarItemModal";

// Calendar page: month grid on top, the selected day's items below
// (side by side on wide screens). Every item carries its own notifications.

const WEEK_DAYS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

const categoryIcon = (key: string) => CALENDAR_CATEGORIES.find((c) => c.key === key)?.icon ?? "📅";

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });

/** Short description of an item's notifications, e.g. "שעה לפני · יום לפני" */
function notificationSummary(item: CalendarItem): string | null {
  const pending = item.reminders.filter((r) => r.status === "pending");
  if (pending.length === 0) {
    return item.reminders.some((r) => r.status === "sent") ? "ההתראה נשלחה" : null;
  }
  return pending
    .map((r) => {
      const minutes = minutesBefore(item.event_date, r.remind_at);
      const preset = NOTIFY_PRESETS.find((p) => p.minutes === minutes);
      if (preset) return preset.label;
      const at = new Date(r.remind_at);
      const sameDay = dateKey(at) === dateKey(new Date(item.event_date));
      return sameDay
        ? formatTime(r.remind_at)
        : `${at.toLocaleDateString("he-IL", { day: "numeric", month: "numeric" })} ${formatTime(r.remind_at)}`;
    })
    .join(" · ");
}

export default function CalendarPage() {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selected, setSelected] = useState(() => new Date());
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [modal, setModal] = useState<{ item?: CalendarItem } | null>(null);

  const load = useCallback(async () => {
    // A week of padding on each side covers every item the grid can show
    const from = new Date(month.getFullYear(), month.getMonth(), -7);
    const to = new Date(month.getFullYear(), month.getMonth() + 1, 8);
    try {
      const res = await fetch(`/api/calendar?from=${from.toISOString()}&to=${to.toISOString()}`);
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) throw new Error();
      const data = await res.json();
      setItems(data.items ?? []);
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of items) {
      const key = dateKey(new Date(item.event_date));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return map;
  }, [items]);

  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const list: (Date | null)[] = Array(first.getDay()).fill(null);
    for (let d = 1; d <= daysInMonth; d++) list.push(new Date(month.getFullYear(), month.getMonth(), d));
    return list;
  }, [month]);

  const todayKey = dateKey(new Date());
  const selectedKey = dateKey(selected);
  const dayItems = byDay.get(selectedKey) ?? [];

  const shiftMonth = (delta: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + delta, 1);
    setMonth(next);
    // Keep a day selected inside the month being shown
    const now = new Date();
    setSelected(
      next.getFullYear() === now.getFullYear() && next.getMonth() === now.getMonth() ? now : next
    );
  };

  const goToday = () => {
    const now = new Date();
    setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelected(now);
  };

  const toggleDone = async (item: CalendarItem) => {
    const done = item.status !== "completed";
    // Show the change right away; reload afterwards for the real state
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: done ? "completed" : "scheduled" } : i))
    );
    try {
      const res = await fetch("/api/calendar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, done }),
      });
      if (!res.ok) throw new Error();
    } catch {
      alert("העדכון נכשל");
    }
    load();
  };

  const selectedLabel = selected.toLocaleDateString("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <main dir="rtl" className="min-h-[calc(100dvh-4rem)] bg-surface text-primary pb-24">
      <div className="max-w-5xl mx-auto p-3 sm:p-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        {/* ── Month ── */}
        <section
          className="bg-card rounded-2xl border border-border p-3 sm:p-4"
          style={{ boxShadow: "0 1px 2px var(--color-shadow)" }}
          aria-label="לוח חודשי"
        >
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => shiftMonth(-1)}
              className="w-11 h-11 rounded-full hover:bg-hover transition-colors text-secondary text-2xl leading-none"
              aria-label="החודש הקודם"
            >
              ›
            </button>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">
                {month.toLocaleDateString("he-IL", { month: "long", year: "numeric" })}
              </h1>
              {(selectedKey !== todayKey || dateKey(month).slice(0, 7) !== todayKey.slice(0, 7)) && (
                <button
                  onClick={goToday}
                  className="text-xs px-3 py-1.5 rounded-full bg-tag text-secondary hover:bg-hover transition-colors"
                >
                  היום
                </button>
              )}
            </div>
            <button
              onClick={() => shiftMonth(1)}
              className="w-11 h-11 rounded-full hover:bg-hover transition-colors text-secondary text-2xl leading-none"
              aria-label="החודש הבא"
            >
              ‹
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEK_DAYS.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (!day) return <div key={`blank-${i}`} />;
              const key = dateKey(day);
              const list = byDay.get(key) ?? [];
              const isToday = key === todayKey;
              const isSelected = key === selectedKey;
              return (
                <button
                  key={key}
                  onClick={() => setSelected(day)}
                  onDoubleClick={() => { setSelected(day); setModal({}); }}
                  aria-pressed={isSelected}
                  aria-label={`${day.toLocaleDateString("he-IL", { day: "numeric", month: "long" })}, ${list.length} פריטים`}
                  className={`relative flex flex-col items-center sm:items-stretch gap-0.5 rounded-xl p-1 min-h-14 sm:min-h-24 transition-colors
                    ${isSelected ? "bg-badge-blue-bg ring-2 ring-blue-500" : "hover:bg-hover"}`}
                >
                  <span
                    className={`self-center flex items-center justify-center w-7 h-7 rounded-full text-sm
                      ${isToday ? "bg-blue-600 text-white font-semibold" : "text-primary"}`}
                  >
                    {day.getDate()}
                  </span>

                  {/* Phone: dots */}
                  {list.length > 0 && (
                    <span className="sm:hidden flex items-center gap-0.5">
                      {list.slice(0, 3).map((it) => (
                        <span
                          key={it.id}
                          className={`w-1.5 h-1.5 rounded-full ${it.status === "completed" ? "bg-green-500" : "bg-blue-500"}`}
                        />
                      ))}
                      {list.length > 3 && <span className="text-[9px] text-link">+{list.length - 3}</span>}
                    </span>
                  )}

                  {/* Wider screens: item titles */}
                  <span className="hidden sm:flex flex-col gap-0.5 min-w-0">
                    {list.slice(0, 2).map((it) => (
                      <span
                        key={it.id}
                        className={`truncate text-[11px] leading-tight rounded px-1 py-0.5 text-right
                          ${it.status === "completed"
                            ? "bg-badge-green-bg text-badge-green-text line-through"
                            : "bg-badge-blue-bg text-badge-blue-text"}`}
                      >
                        {it.title}
                      </span>
                    ))}
                    {list.length > 2 && (
                      <span className="text-[10px] text-muted text-right px-1">עוד {list.length - 2}</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Selected day ── */}
        <section
          className="bg-card rounded-2xl border border-border p-4"
          style={{ boxShadow: "0 1px 2px var(--color-shadow)" }}
          aria-label="הפריטים של היום שנבחר"
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="min-w-0">
              <h2 className="text-base font-semibold truncate">{selectedLabel}</h2>
              {selectedKey === todayKey && <p className="text-xs text-link">היום</p>}
            </div>
            <button
              onClick={() => setModal({})}
              className="hidden lg:flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-full transition-colors"
            >
              + הוספה
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-muted py-6 text-center">טוען...</p>
          ) : loadError ? (
            <div className="py-6 text-center">
              <p className="text-sm text-red-500 mb-2">לא הצלחנו לטעון את היומן</p>
              <button onClick={load} className="text-sm text-link hover:text-link-hover underline">
                לנסות שוב
              </button>
            </div>
          ) : dayItems.length === 0 ? (
            <button
              onClick={() => setModal({})}
              className="w-full py-8 rounded-xl border border-dashed border-divider text-center hover:bg-hover transition-colors"
            >
              <span className="block text-2xl mb-1">🗓️</span>
              <span className="block text-sm text-secondary">אין כלום ביום הזה</span>
              <span className="block text-sm text-link mt-1">+ הוספה</span>
            </button>
          ) : (
            <ul className="space-y-2">
              {dayItems.map((item) => {
                const done = item.status === "completed";
                const notify = notificationSummary(item);
                return (
                  <li key={item.id} className="flex items-stretch gap-2 rounded-xl bg-surface border border-border">
                    {item.is_todo ? (
                      <button
                        onClick={() => toggleDone(item)}
                        role="checkbox"
                        aria-checked={done}
                        aria-label={done ? "סימון כלא בוצע" : "סימון כבוצע"}
                        className="flex items-center justify-center w-12 flex-shrink-0 rounded-r-xl hover:bg-hover transition-colors"
                      >
                        <span
                          className={`flex items-center justify-center w-6 h-6 rounded-full border-2 text-xs
                            ${done ? "bg-green-500 border-green-500 text-white" : "border-divider text-transparent"}`}
                        >
                          ✓
                        </span>
                      </button>
                    ) : (
                      <span className="flex items-center justify-center w-12 flex-shrink-0 text-lg" aria-hidden="true">
                        {categoryIcon(item.category)}
                      </span>
                    )}
                    <button
                      onClick={() => setModal({ item })}
                      className="flex-1 min-w-0 text-right py-2.5 pl-3 rounded-l-xl hover:bg-hover transition-colors"
                      aria-label={`עריכת ${item.title}`}
                    >
                      <span className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold text-link flex-shrink-0">{formatTime(item.event_date)}</span>
                        <span className={`text-sm font-medium truncate ${done ? "line-through text-muted" : "text-primary"}`}>
                          {item.title}
                        </span>
                      </span>
                      <span className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-secondary">
                        {notify && <span>🔔 {notify}</span>}
                        {item.member_name && <span>👤 {item.member_name}</span>}
                        {item.location && <span>📍 {item.location}</span>}
                      </span>
                      {item.description && (
                        <span className="block text-xs text-muted mt-0.5 truncate">{item.description}</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Add button, always within thumb reach on phones and tablets */}
      <button
        onClick={() => setModal({})}
        className="lg:hidden fixed bottom-5 left-5 z-30 flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white
                   font-medium pl-5 pr-4 py-3.5 rounded-full shadow-lg transition-colors mb-[env(safe-area-inset-bottom)]"
        aria-label="הוספה ליומן"
      >
        <span className="text-xl leading-none">+</span> הוספה
      </button>

      {modal && (
        <CalendarItemModal
          key={modal.item?.id ?? `new-${selectedKey}`}
          item={modal.item}
          day={selected}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            load();
          }}
        />
      )}
    </main>
  );
}
