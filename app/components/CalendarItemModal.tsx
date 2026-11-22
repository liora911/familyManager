"use client";

import { useEffect, useMemo, useState } from "react";
import { FAMILY_MEMBERS } from "@/app/components/FormModal";
import { enablePush, getPushStatus, type PushStatus } from "@/lib/push";

// Add / edit dialog for the calendar page. Two tabs:
//   1. "מה ומתי"  — what the item is and when it happens
//   2. "הגדרות"   — notifications (required), event or to-do, who, category

export interface CalendarReminder {
  id: string;
  remind_at: string;
  status: string;
  is_recurring?: boolean;
}

export interface CalendarItem {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  event_date: string;
  location?: string | null;
  status: string;
  is_todo: boolean;
  member_name?: string | null;
  reminders: CalendarReminder[];
}

export const NOTIFY_PRESETS: { minutes: number; label: string }[] = [
  { minutes: 0, label: "בדיוק בזמן" },
  { minutes: 10, label: "10 דק׳ לפני" },
  { minutes: 30, label: "חצי שעה לפני" },
  { minutes: 60, label: "שעה לפני" },
  { minutes: 120, label: "שעתיים לפני" },
  { minutes: 1440, label: "יום לפני" },
  { minutes: 10080, label: "שבוע לפני" },
];

export const CALENDAR_CATEGORIES: { key: string; label: string; icon: string }[] = [
  { key: "personal", label: "אישי", icon: "⭐" },
  { key: "medical", label: "רפואי", icon: "🩺" },
  { key: "school", label: "גן / בית ספר", icon: "🎒" },
  { key: "household", label: "בית", icon: "🏠" },
  { key: "social", label: "חברים ומשפחה", icon: "🎉" },
  { key: "work", label: "עבודה", icon: "💼" },
];

const pad = (n: number) => String(n).padStart(2, "0");

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function timeValue(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function datetimeValue(d: Date): string {
  return `${dateKey(d)}T${timeValue(d)}`;
}

/** Minutes between a notification and the item it belongs to (positive = before) */
export function minutesBefore(eventDate: string, remindAt: string): number {
  return Math.round((new Date(eventDate).getTime() - new Date(remindAt).getTime()) / 60_000);
}

/** A sensible starting time for a new item on the given day */
function defaultStart(day: Date): Date {
  const now = new Date();
  const start = new Date(day);
  if (dateKey(day) === dateKey(now)) {
    // Next round hour, but at least half an hour away so "before" notifications still fit
    start.setHours(now.getHours() + (now.getMinutes() > 30 ? 2 : 1), 0, 0, 0);
    if (dateKey(start) !== dateKey(now)) {
      start.setTime(now.getTime());
      start.setHours(23, 55, 0, 0);
    }
  } else {
    start.setHours(9, 0, 0, 0);
  }
  return start;
}

type Tab = "what" | "settings";

export default function CalendarItemModal({
  item,
  day,
  onClose,
  onSaved,
}: {
  /** The item being edited; leave out to create a new one */
  item?: CalendarItem;
  /** Day a new item starts on */
  day: Date;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!item;
  const start = item ? new Date(item.event_date) : defaultStart(day);

  const [tab, setTab] = useState<Tab>("what");
  const [title, setTitle] = useState(item?.title ?? "");
  const [date, setDate] = useState(dateKey(start));
  const [time, setTime] = useState(timeValue(start));
  const [description, setDescription] = useState(item?.description ?? "");
  const [location, setLocation] = useState(item?.location ?? "");
  const [isTodo, setIsTodo] = useState(item?.is_todo ?? false);
  const [member, setMember] = useState(item?.member_name ?? "");
  const [category, setCategory] = useState(item?.category ?? "personal");

  // Notifications already chosen for this item (pending, one-time ones)
  const existing = useMemo(() => {
    const offsets = new Set<number>();
    let custom = "";
    for (const r of item?.reminders ?? []) {
      if (r.status !== "pending" || r.is_recurring) continue;
      const minutes = minutesBefore(item!.event_date, r.remind_at);
      if (NOTIFY_PRESETS.some((p) => p.minutes === minutes)) offsets.add(minutes);
      else if (!custom) custom = datetimeValue(new Date(r.remind_at));
    }
    return { offsets, custom };
  }, [item]);

  const [offsets, setOffsets] = useState<Set<number>>(existing.offsets);
  const [customOn, setCustomOn] = useState(!!existing.custom);
  const [customAt, setCustomAt] = useState(existing.custom);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [push, setPush] = useState<PushStatus | "loading">("loading");

  useEffect(() => {
    getPushStatus().then(setPush).catch(() => setPush("unsupported"));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const eventDate = useMemo(() => new Date(`${date}T${time || "00:00"}`), [date, time]);
  const eventValid = !!date && !!time && !Number.isNaN(eventDate.getTime());
  const now = Date.now();
  const isFuture = eventValid && eventDate.getTime() > now;

  const presetIsPast = (minutes: number) =>
    !eventValid || eventDate.getTime() - minutes * 60_000 <= now;

  const validOffsets = [...offsets].filter((m) => !presetIsPast(m));
  const customDate = customOn && customAt ? new Date(customAt) : null;
  const customValid = !!customDate && !Number.isNaN(customDate.getTime()) && customDate.getTime() > now;
  const notificationCount = validOffsets.length + (customValid ? 1 : 0);

  const alreadyNotified = !!item?.reminders.some((r) => r.status === "sent");
  const needsNotification = isFuture && !alreadyNotified;
  const notificationMissing = needsNotification && notificationCount === 0;

  const toggleOffset = (minutes: number) => {
    setError("");
    setOffsets((prev) => {
      const next = new Set(prev);
      if (next.has(minutes)) next.delete(minutes);
      else next.add(minutes);
      return next;
    });
  };

  const setQuickDate = (daysAhead: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    setDate(dateKey(d));
  };

  const openCustom = () => {
    setError("");
    if (customOn) {
      setCustomOn(false);
      return;
    }
    if (!customAt && eventValid) {
      // Start from the morning of the item's day, or an hour from now if that already passed
      const suggestion = new Date(eventDate);
      suggestion.setHours(8, 0, 0, 0);
      if (suggestion.getTime() <= Date.now()) {
        suggestion.setTime(Date.now() + 60 * 60_000);
        suggestion.setSeconds(0, 0);
      }
      setCustomAt(datetimeValue(suggestion));
    }
    setCustomOn(true);
  };

  const save = async () => {
    if (saving) return;
    if (!title.trim()) {
      setTab("what");
      setError("כתבו מה מתוכנן");
      return;
    }
    if (!eventValid) {
      setTab("what");
      setError("בחרו תאריך ושעה");
      return;
    }
    if (notificationMissing) {
      setTab("settings");
      setError("בחרו מתי להתריע");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/calendar", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item?.id,
          title: title.trim(),
          description,
          location,
          event_date: eventDate.toISOString(),
          is_todo: isTodo,
          member_name: member || null,
          category,
          reminder_offsets: validOffsets,
          reminder_custom_at: customValid ? customDate!.toISOString() : null,
        }),
      });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "השמירה נכשלה");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "השמירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!item || saving) return;
    if (!confirm(`למחוק את "${item.title}"?`)) return;
    setSaving(true);
    try {
      const res = await fetch("/api/calendar", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      if (!res.ok) throw new Error();
      onSaved();
    } catch {
      setError("המחיקה נכשלה");
      setSaving(false);
    }
  };

  const handleEnablePush = async () => {
    try {
      setPush(await enablePush());
    } catch {
      alert("לא הצלחנו להפעיל התראות. נסו שוב מאוחר יותר.");
    }
  };

  // On a new item the first tab leads to the second; once there (or when editing) the button saves
  const primaryIsNext = tab === "what" && !isEdit && notificationMissing;

  const input =
    "w-full border border-divider rounded-xl px-3 py-2.5 text-base bg-input text-primary " +
    "placeholder-muted focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";
  const label = "block text-sm font-medium text-secondary mb-1.5";
  const chip = (on: boolean, disabled = false) =>
    `px-3 py-2 rounded-full text-sm border transition-colors ${
      disabled
        ? "border-border text-disabled-text bg-disabled cursor-not-allowed"
        : on
          ? "border-blue-500 bg-blue-600 text-white"
          : "border-divider bg-card text-primary hover:bg-hover"
    }`;
  const tabButton = (on: boolean) =>
    `flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium rounded-lg transition-colors ${
      on ? "bg-card text-primary shadow-sm" : "text-secondary hover:text-primary"
    }`;

  const today = dateKey(new Date());
  const tomorrow = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return dateKey(d);
  })();

  return (
    <div
      className="fixed inset-0 bg-overlay flex items-end sm:items-center justify-center z-50 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? "עריכת פריט ביומן" : "הוספה ליומן"}
    >
      <div
        className="bg-card w-full sm:max-w-md max-h-[92dvh] flex flex-col rounded-t-3xl sm:rounded-2xl shadow-xl"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title + close */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <h2 className="text-lg font-medium text-primary">{isEdit ? "עריכה" : "הוספה ליומן"}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-primary text-xl leading-none p-2 -m-2 rounded-lg hover:bg-hover"
            aria-label="סגירה"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="px-5">
          <div className="flex gap-1 p-1 bg-tag rounded-xl" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "what"}
              onClick={() => setTab("what")}
              className={tabButton(tab === "what")}
            >
              ✏️ מה ומתי
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "settings"}
              onClick={() => setTab("settings")}
              className={tabButton(tab === "settings")}
            >
              ⚙️ הגדרות
              {notificationMissing ? (
                <span className="w-2 h-2 rounded-full bg-red-500" aria-label="חסרה התראה" />
              ) : notificationCount > 0 ? (
                <span className="text-xs text-badge-green-text">🔔 {notificationCount}</span>
              ) : null}
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {tab === "what" ? (
            <>
              <div>
                <label className={label} htmlFor="cal-title">מה מתוכנן?</label>
                <input
                  id="cal-title"
                  type="text"
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); setError(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (primaryIsNext) setTab("settings"); else save(); } }}
                  placeholder="למשל: רופא שיניים לאיתן"
                  autoFocus={!isEdit}
                  className={`${input} text-lg`}
                />
              </div>

              <div>
                <span className={label}>מתי?</span>
                <div className="flex gap-2 mb-2">
                  <button type="button" onClick={() => setQuickDate(0)} className={chip(date === today)}>היום</button>
                  <button type="button" onClick={() => setQuickDate(1)} className={chip(date === tomorrow)}>מחר</button>
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    aria-label="תאריך"
                    className={input}
                  />
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    aria-label="שעה"
                    className={`${input} w-32`}
                  />
                </div>
                {eventValid && (
                  <p className="text-xs text-muted mt-1.5">
                    {eventDate.toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" })}
                    {!isFuture && " · הזמן הזה כבר עבר"}
                  </p>
                )}
              </div>

              <div>
                <label className={label} htmlFor="cal-notes">פרטים (לא חובה)</label>
                <textarea
                  id="cal-notes"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="מה להביא, מה לזכור..."
                  className={`${input} resize-none`}
                />
              </div>

              <div>
                <label className={label} htmlFor="cal-location">איפה (לא חובה)</label>
                <input
                  id="cal-location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="מקום או כתובת"
                  className={input}
                />
              </div>
            </>
          ) : (
            <>
              {/* Notifications */}
              <div>
                <span className={label}>
                  🔔 מתי להתריע? {needsNotification && <span className="text-red-500">*</span>}
                </span>
                {!isFuture ? (
                  <p className="text-sm text-muted">הזמן של הפריט כבר עבר, אז לא תישלח התראה.</p>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {NOTIFY_PRESETS.map((p) => {
                        const past = presetIsPast(p.minutes);
                        return (
                          <button
                            key={p.minutes}
                            type="button"
                            disabled={past}
                            onClick={() => toggleOffset(p.minutes)}
                            aria-pressed={offsets.has(p.minutes) && !past}
                            title={past ? "הזמן הזה כבר עבר" : undefined}
                            className={chip(offsets.has(p.minutes) && !past, past)}
                          >
                            {p.label}
                          </button>
                        );
                      })}
                      <button type="button" onClick={openCustom} aria-pressed={customOn} className={chip(customOn)}>
                        זמן אחר…
                      </button>
                    </div>
                    {customOn && (
                      <div className="mt-2">
                        <input
                          type="datetime-local"
                          value={customAt}
                          onChange={(e) => { setCustomAt(e.target.value); setError(""); }}
                          aria-label="זמן התראה אחר"
                          className={input}
                        />
                        {customAt && !customValid && (
                          <p className="text-xs text-red-500 mt-1">הזמן הזה כבר עבר</p>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-muted mt-2">
                      אפשר לבחור כמה התראות. הן נשלחות לטלפון ולמייל.
                    </p>
                    {push === "available" && (
                      <button
                        type="button"
                        onClick={handleEnablePush}
                        className="mt-1 text-xs text-link hover:text-link-hover underline"
                      >
                        ההתראות כבויות במכשיר הזה. להפעלה
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Event or to-do */}
              <div>
                <span className={label}>איזה סוג?</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsTodo(false)}
                    aria-pressed={!isTodo}
                    className={`rounded-xl border p-3 text-right transition-colors ${
                      !isTodo ? "border-blue-500 bg-badge-blue-bg" : "border-divider hover:bg-hover"
                    }`}
                  >
                    <span className="block text-sm font-medium text-primary">📅 אירוע</span>
                    <span className="block text-xs text-secondary mt-0.5">משהו שקורה בזמן מסוים</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsTodo(true)}
                    aria-pressed={isTodo}
                    className={`rounded-xl border p-3 text-right transition-colors ${
                      isTodo ? "border-blue-500 bg-badge-blue-bg" : "border-divider hover:bg-hover"
                    }`}
                  >
                    <span className="block text-sm font-medium text-primary">✅ משימה</span>
                    <span className="block text-xs text-secondary mt-0.5">משהו לעשות ולסמן שבוצע</span>
                  </button>
                </div>
              </div>

              {/* Who */}
              <div>
                <span className={label}>של מי? (לא חובה)</span>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setMember("")} aria-pressed={!member} className={chip(!member)}>
                    כולם
                  </button>
                  {FAMILY_MEMBERS.map((m) => (
                    <button key={m} type="button" onClick={() => setMember(m)} aria-pressed={member === m} className={chip(member === m)}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div>
                <span className={label}>קטגוריה</span>
                <div className="flex flex-wrap gap-2">
                  {CALENDAR_CATEGORIES.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setCategory(c.key)}
                      aria-pressed={category === c.key}
                      className={chip(category === c.key)}
                    >
                      {c.icon} {c.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {error && <p className="text-sm text-red-500 mb-2" role="alert">{error}</p>}
          <div className="flex items-center gap-2">
            {isEdit && (
              <button
                type="button"
                onClick={remove}
                disabled={saving}
                className="px-3 py-3 rounded-xl text-sm text-red-500 hover:bg-hover transition-colors disabled:opacity-50"
              >
                מחיקה
              </button>
            )}
            <button
              type="button"
              onClick={primaryIsNext ? () => { if (!title.trim()) { setError("כתבו מה מתוכנן"); return; } setError(""); setTab("settings"); } : save}
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-disabled disabled:text-disabled-text
                         text-white font-medium px-6 py-3 rounded-xl transition-colors"
            >
              {saving ? "..." : primaryIsNext ? "המשך: מתי להתריע? ←" : "שמירה"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
