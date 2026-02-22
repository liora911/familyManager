"use client";

import { useState, useMemo, useRef, useEffect } from "react";

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

interface DayInfo {
  date: Date;
  events: Event[];
}

type CalView = "month" | "week";

const WEEK_DAYS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

const statusDotColor: Record<string, string> = {
  scheduled: "bg-blue-500",
  completed: "bg-green-500",
  cancelled: "bg-neutral-400",
};

function getWeekStart(d: Date) {
  const date = new Date(d);
  date.setDate(date.getDate() - date.getDay()); // Sunday
  date.setHours(0, 0, 0, 0);
  return date;
}

function isSameDay(a: Date, b: Date) {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}

function toDatetimeLocal(d: Date) {
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
}

export default function EventsCalendar({
  events,
  onAdd,
}: {
  events: Event[];
  onAdd?: (type: "events" | "tasks", date: string) => void;
}) {
  const [view, setView] = useState<CalView>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<DayInfo | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);
  const [addMenu, setAddMenu] = useState<{ date: Date; pos: { top: number; left: number } } | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  const now = new Date();

  // Group events by date key
  const eventsByDate = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const ev of events) {
      const d = new Date(ev.event_date);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return map;
  }, [events]);

  const getDayInfo = (date: Date): DayInfo => {
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return { date, events: eventsByDate.get(key) || [] };
  };

  // Month grid
  const monthDays = useMemo(() => {
    const first = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const last = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const days: (DayInfo | null)[] = [];
    for (let i = 0; i < first.getDay(); i++) days.push(null);
    for (let d = 1; d <= last.getDate(); d++) {
      days.push(getDayInfo(new Date(currentDate.getFullYear(), currentDate.getMonth(), d)));
    }
    return days;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, eventsByDate]);

  // Week days
  const weekDays = useMemo(() => {
    const start = getWeekStart(currentDate);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return getDayInfo(d);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, eventsByDate]);

  // Navigation
  const goPrev = () => {
    setSelectedDay(null);
    if (view === "month") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    }
  };

  const goNext = () => {
    setSelectedDay(null);
    if (view === "month") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    }
  };

  const goToday = () => {
    setSelectedDay(null);
    setCurrentDate(new Date());
  };

  const headerLabel =
    view === "month"
      ? currentDate.toLocaleDateString("he-IL", { month: "long", year: "numeric" })
      : (() => {
          const start = getWeekStart(currentDate);
          const end = new Date(start);
          end.setDate(end.getDate() + 6);
          const fmt = (d: Date) => d.toLocaleDateString("he-IL", { day: "numeric", month: "short" });
          return `${fmt(start)} – ${fmt(end)}`;
        })();

  // Popover
  const handleDayClick = (day: DayInfo, cell: HTMLElement) => {
    if (day.events.length === 0) {
      setSelectedDay(null);
      setPopoverPos(null);
      return;
    }
    if (selectedDay && isSameDay(selectedDay.date, day.date)) {
      setSelectedDay(null);
      setPopoverPos(null);
      return;
    }
    setSelectedDay(day);
    const rect = cell.getBoundingClientRect();
    const calRect = calendarRef.current?.getBoundingClientRect();
    if (calRect) {
      const top = rect.bottom - calRect.top + 8;
      let left = rect.left - calRect.left + rect.width / 2;
      const popW = 280;
      if (left < popW / 2 + 8) left = popW / 2 + 8;
      if (left > calRect.width - popW / 2 - 8) left = calRect.width - popW / 2 - 8;
      setPopoverPos({ top, left });
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setSelectedDay(null);
        setPopoverPos(null);
        setAddMenu(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });

  const handleAdd = (type: "events" | "tasks", date: Date) => {
    if (!onAdd) return;
    const d = new Date(date);
    d.setHours(9, 0, 0, 0);
    onAdd(type, toDatetimeLocal(d));
    setAddMenu(null);
  };

  const showAddMenu = (date: Date, anchor: HTMLElement) => {
    const rect = anchor.getBoundingClientRect();
    const calRect = calendarRef.current?.getBoundingClientRect();
    if (calRect) {
      const top = rect.bottom - calRect.top + 4;
      let left = rect.left - calRect.left + rect.width / 2;
      if (left < 60) left = 60;
      if (left > calRect.width - 60) left = calRect.width - 60;
      setAddMenu({ date, pos: { top, left } });
    }
  };

  // Shared day cell for month grid
  const renderMonthCell = (day: DayInfo | null, i: number) => (
    <button
      key={i}
      disabled={!day}
      onClick={(e) => day && handleDayClick(day, e.currentTarget)}
      className={`
        group/cell relative aspect-square flex flex-col items-center justify-center rounded-lg transition-all text-sm
        ${!day ? "cursor-default" : "cursor-pointer"}
        ${day && isSameDay(day.date, now) ? "bg-badge-blue-bg ring-2 ring-blue-500" : ""}
        ${day && !isSameDay(day.date, now) ? "hover:bg-hover" : ""}
        ${day?.events.length ? "font-semibold" : ""}
        ${selectedDay && day && isSameDay(selectedDay.date, day.date) ? "bg-hover" : ""}
      `}
    >
      {day && (
        <>
          <span className={isSameDay(day.date, now) ? "text-badge-blue-text" : "text-primary"}>
            {day.date.getDate()}
          </span>
          {day.events.length > 0 && (
            <div className="flex items-center gap-0.5 mt-0.5">
              {day.events.slice(0, 3).map((ev, j) => (
                <div key={j} className={`w-1.5 h-1.5 rounded-full ${statusDotColor[ev.status] || statusDotColor.scheduled}`} />
              ))}
              {day.events.length > 3 && (
                <span className="text-[9px] text-blue-500 font-medium mr-0.5">+{day.events.length - 3}</span>
              )}
            </div>
          )}
          {onAdd && (
            <span
              onClick={(e) => { e.stopPropagation(); showAddMenu(day.date, e.currentTarget as HTMLElement); }}
              className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] leading-none flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-opacity cursor-pointer"
            >
              +
            </span>
          )}
        </>
      )}
    </button>
  );

  // Week view: expanded day cards
  const renderWeekView = () => (
    <div className="space-y-2">
      {weekDays.map((day) => {
        const isT = isSameDay(day.date, now);
        return (
          <div
            key={day.date.toISOString()}
            className={`rounded-xl border p-3 ${isT ? "border-blue-500 bg-badge-blue-bg" : "border-border bg-surface"}`}
          >
            <div className="flex items-center justify-between mb-1">
              <p className={`text-sm font-semibold ${isT ? "text-badge-blue-text" : "text-primary"}`}>
                {day.date.toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "short" })}
              </p>
              {onAdd && (
                <button
                  onClick={(e) => showAddMenu(day.date, e.currentTarget)}
                  className="w-6 h-6 rounded-full bg-blue-600 text-white text-sm leading-none flex items-center justify-center hover:bg-blue-500 transition-colors"
                >
                  +
                </button>
              )}
            </div>
            {day.events.length === 0 ? (
              <p className="text-xs text-muted">אין אירועים</p>
            ) : (
              <div className="space-y-1.5">
                {day.events.map((ev) => (
                  <div key={ev.id} className="flex items-start gap-2 p-2 rounded-lg bg-card">
                    <div className={`w-1 min-h-[1.5rem] rounded-full flex-shrink-0 ${statusDotColor[ev.status] || statusDotColor.scheduled}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-primary truncate">{ev.title}</p>
                      <div className="flex flex-wrap items-center gap-x-2 text-xs text-secondary">
                        <span>{formatTime(ev.event_date)}</span>
                        {ev.member_name && <span>{ev.member_name}</span>}
                        {ev.location && <span>📍 {ev.location}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div ref={calendarRef} className="relative bg-card rounded-2xl border border-border p-4" style={{ boxShadow: "0 1px 2px var(--color-shadow)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={goNext} className="p-2 rounded-lg hover:bg-hover transition-colors text-secondary text-lg" aria-label="הבא">
          ‹
        </button>
        <div className="flex flex-col items-center gap-1.5">
          <h2 className="text-base font-semibold text-primary">{headerLabel}</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setView("month"); setSelectedDay(null); }}
              className={`text-[11px] px-2 py-0.5 rounded-full transition-colors ${view === "month" ? "bg-badge-blue-bg text-badge-blue-text" : "text-muted hover:text-primary"}`}
            >
              חודשי
            </button>
            <button
              onClick={() => { setView("week"); setSelectedDay(null); }}
              className={`text-[11px] px-2 py-0.5 rounded-full transition-colors ${view === "week" ? "bg-badge-blue-bg text-badge-blue-text" : "text-muted hover:text-primary"}`}
            >
              שבועי
            </button>
            <button
              onClick={goToday}
              className="text-[11px] px-2 py-0.5 rounded-full text-muted hover:text-primary transition-colors"
            >
              היום
            </button>
          </div>
        </div>
        <button onClick={goPrev} className="p-2 rounded-lg hover:bg-hover transition-colors text-secondary text-lg" aria-label="הקודם">
          ›
        </button>
      </div>

      {view === "month" ? (
        <>
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEK_DAYS.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted py-1">{d}</div>
            ))}
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((day, i) => renderMonthCell(day, i))}
          </div>

          {/* Popover */}
          {selectedDay && selectedDay.events.length > 0 && popoverPos && (
            <div
              className="absolute z-50 w-72 bg-card rounded-xl border border-border p-3"
              style={{
                top: popoverPos.top,
                left: popoverPos.left,
                transform: "translateX(-50%)",
                boxShadow: "0 4px 12px var(--color-shadow)",
              }}
            >
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-border">
                <p className="text-sm font-medium text-primary">
                  📅{" "}
                  {selectedDay.date.toLocaleDateString("he-IL", {
                    weekday: "long",
                    day: "numeric",
                    month: "short",
                  })}
                </p>
                {onAdd && (
                  <button
                    onClick={(e) => showAddMenu(selectedDay.date, e.currentTarget)}
                    className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center hover:bg-blue-500"
                  >
                    +
                  </button>
                )}
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedDay.events.map((ev) => (
                  <div key={ev.id} className="flex items-start gap-2 p-2 rounded-lg bg-surface">
                    <div className={`w-1 min-h-[2rem] rounded-full flex-shrink-0 ${statusDotColor[ev.status] || statusDotColor.scheduled}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-primary truncate">{ev.title}</p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-xs text-secondary">
                        <span>{formatTime(ev.event_date)}</span>
                        {ev.member_name && <span>{ev.member_name}</span>}
                        {ev.location && <span>📍 {ev.location}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        renderWeekView()
      )}

      {/* Add menu */}
      {addMenu && (
        <div
          className="absolute z-50 bg-card rounded-xl border border-border p-2 flex flex-col gap-1"
          style={{
            top: addMenu.pos.top,
            left: addMenu.pos.left,
            transform: "translateX(-50%)",
            boxShadow: "0 4px 12px var(--color-shadow)",
          }}
        >
          <button
            onClick={() => handleAdd("events", addMenu.date)}
            className="text-xs px-3 py-2 rounded-lg hover:bg-hover transition-colors text-primary text-right whitespace-nowrap"
          >
            📅 אירוע
          </button>
          <button
            onClick={() => handleAdd("tasks", addMenu.date)}
            className="text-xs px-3 py-2 rounded-lg hover:bg-hover transition-colors text-primary text-right whitespace-nowrap"
          >
            ✅ משימה
          </button>
        </div>
      )}

      {/* Legend */}
      <div className="mt-3 pt-3 border-t border-border flex items-center justify-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> מתוכנן
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> הושלם
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-neutral-400 inline-block" /> בוטל
        </span>
      </div>
    </div>
  );
}
