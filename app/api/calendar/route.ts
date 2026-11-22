import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { scheduleReminder } from "@/lib/scheduler";
import { APP_TIME_ZONE } from "@/lib/time";

// Calendar page API. A calendar item is an `events` row plus one `reminders`
// row per notification the user chose. Items are either a plain event or a
// to-do (is_todo), which can be ticked off (status = 'completed').
//
// Every item whose time is still ahead must have at least one notification.

const CATEGORIES = ["personal", "medical", "school", "household", "social", "work"];
const MAX_OFFSET_MIN = 60 * 24 * 60; // 60 days before

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

let columnsReady: Promise<unknown> | null = null;

/** events.is_todo is added on first use */
function ensureColumns(): Promise<unknown> {
  columnsReady ??= sql`
    ALTER TABLE events ADD COLUMN IF NOT EXISTS is_todo BOOLEAN DEFAULT FALSE
  `.catch((e) => {
    columnsReady = null;
    throw e;
  });
  return columnsReady;
}

async function resolveMember(name: unknown): Promise<string | null> {
  if (!name || typeof name !== "string") return null;
  const [m] = await sql`
    SELECT id FROM family_members WHERE name = ${name} OR nickname = ${name} LIMIT 1
  `;
  return m?.id || null;
}

function israelTime(date: Date): string {
  return date.toLocaleTimeString("he-IL", {
    timeZone: APP_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

/** Notification text for "N minutes before"; the cron adds the item title after it */
function offsetMessage(minutes: number, eventDate: Date): string {
  if (minutes === 0) return "עכשיו";
  if (minutes < 60) return `בעוד ${minutes} דקות`;
  if (minutes === 60) return "בעוד שעה";
  if (minutes === 120) return "בעוד שעתיים";
  if (minutes < 1440) return `בעוד ${Math.round(minutes / 60)} שעות`;
  const time = israelTime(eventDate);
  if (minutes === 1440) return `מחר ב-${time}`;
  if (minutes === 2880) return `בעוד יומיים ב-${time}`;
  if (minutes === 10080) return `בעוד שבוע ב-${time}`;
  return `בעוד ${Math.round(minutes / 1440)} ימים ב-${time}`;
}

function customMessage(eventDate: Date): string {
  const day = eventDate.toLocaleDateString("he-IL", {
    timeZone: APP_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "numeric",
  });
  return `${day} ב-${israelTime(eventDate)}`;
}

interface PlannedReminder {
  remindAt: Date;
  message: string;
}

/** Turns the chosen notifications into reminder rows, dropping any already in the past */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function planReminders(eventDate: Date, body: any): PlannedReminder[] {
  const cutoff = Date.now() - 60_000;
  const planned = new Map<number, PlannedReminder>();

  const offsets: unknown[] = Array.isArray(body.reminder_offsets) ? body.reminder_offsets : [];
  for (const raw of offsets) {
    const minutes = Number(raw);
    if (!Number.isInteger(minutes) || minutes < 0 || minutes > MAX_OFFSET_MIN) continue;
    const remindAt = new Date(eventDate.getTime() - minutes * 60_000);
    if (remindAt.getTime() < cutoff) continue;
    planned.set(remindAt.getTime(), { remindAt, message: offsetMessage(minutes, eventDate) });
  }

  if (body.reminder_custom_at) {
    const remindAt = new Date(body.reminder_custom_at);
    if (!Number.isNaN(remindAt.getTime()) && remindAt.getTime() >= cutoff && !planned.has(remindAt.getTime())) {
      planned.set(remindAt.getTime(), { remindAt, message: customMessage(eventDate) });
    }
  }

  return [...planned.values()].sort((a, b) => a.remindAt.getTime() - b.remindAt.getTime());
}

async function insertReminders(eventId: string, planned: PlannedReminder[]) {
  for (const p of planned) {
    const [row] = await sql`
      INSERT INTO reminders (message, remind_at, event_id)
      VALUES (${p.message}, ${p.remindAt.toISOString()}, ${eventId})
      RETURNING id, remind_at
    `;
    if (row) await scheduleReminder(row.id, row.remind_at);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readItem(body: any) {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const eventDate = new Date(body.event_date);
  return {
    title,
    eventDate,
    valid: !!title && !Number.isNaN(eventDate.getTime()),
    description: typeof body.description === "string" && body.description.trim() ? body.description.trim() : null,
    location: typeof body.location === "string" && body.location.trim() ? body.location.trim() : null,
    category: CATEGORIES.includes(body.category) ? (body.category as string) : "personal",
    isTodo: body.is_todo === true,
  };
}

const NEEDS_NOTIFICATION = "צריך לבחור לפחות התראה אחת שעוד לא עבר זמנה";

// ── GET: items in a date range, each with its notifications ─────────
export async function GET(req: NextRequest) {
  try {
    await ensureColumns();
    const params = req.nextUrl.searchParams;
    const from = new Date(params.get("from") || Date.now() - 45 * 86_400_000);
    const to = new Date(params.get("to") || Date.now() + 45 * 86_400_000);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return json({ error: "Invalid range" }, 400);
    }

    const items = await sql`
      SELECT e.id, e.title, e.description, e.category, e.event_date, e.location,
             e.status, e.is_todo, fm.name AS member_name,
             COALESCE((
               SELECT json_agg(json_build_object(
                        'id', r.id, 'remind_at', r.remind_at,
                        'status', r.status, 'is_recurring', r.is_recurring
                      ) ORDER BY r.remind_at)
               FROM reminders r
               WHERE r.event_id = e.id AND r.status <> 'dismissed'
             ), '[]'::json) AS reminders
      FROM events e
      LEFT JOIN family_members fm ON e.related_member_id = fm.id
      WHERE e.event_date >= ${from.toISOString()} AND e.event_date < ${to.toISOString()}
        AND e.status <> 'cancelled'
      ORDER BY e.event_date ASC
      LIMIT 1000
    `;
    return json({ items });
  } catch (err) {
    console.error("Calendar GET:", err);
    return json({ error: "Failed to load calendar" }, 500);
  }
}

// ── POST: create an item with its notifications ─────────────────────
export async function POST(req: NextRequest) {
  try {
    await ensureColumns();
    const body = await req.json();
    const item = readItem(body);
    if (!item.valid) return json({ error: "חסרים כותרת או תאריך" }, 400);

    const planned = planReminders(item.eventDate, body);
    if (item.eventDate.getTime() > Date.now() && planned.length === 0) {
      return json({ error: NEEDS_NOTIFICATION }, 400);
    }

    const memberId = await resolveMember(body.member_name);
    const [row] = await sql`
      INSERT INTO events (title, description, category, event_date, location, related_member_id, is_todo)
      VALUES (${item.title}, ${item.description}, ${item.category}, ${item.eventDate.toISOString()},
              ${item.location}, ${memberId}, ${item.isTodo})
      RETURNING id
    `;
    await insertReminders(row.id, planned);
    return json({ success: true, id: row.id });
  } catch (err) {
    console.error("Calendar POST:", err);
    return json({ error: "השמירה נכשלה" }, 500);
  }
}

// ── PUT: update an item and replace its pending notifications ───────
export async function PUT(req: NextRequest) {
  try {
    await ensureColumns();
    const body = await req.json();
    if (!body.id) return json({ error: "Missing id" }, 400);
    const item = readItem(body);
    if (!item.valid) return json({ error: "חסרים כותרת או תאריך" }, 400);

    const planned = planReminders(item.eventDate, body);
    if (item.eventDate.getTime() > Date.now() && planned.length === 0) {
      // An item that was already notified about may be edited without a new notification
      const [sent] = await sql`
        SELECT 1 FROM reminders WHERE event_id = ${body.id} AND status = 'sent' LIMIT 1
      `;
      if (!sent) return json({ error: NEEDS_NOTIFICATION }, 400);
    }

    const memberId = await resolveMember(body.member_name);
    const [row] = await sql`
      UPDATE events SET
        title = ${item.title}, description = ${item.description}, category = ${item.category},
        event_date = ${item.eventDate.toISOString()}, location = ${item.location},
        related_member_id = ${memberId}, is_todo = ${item.isTodo}
      WHERE id = ${body.id}
      RETURNING id
    `;
    if (!row) return json({ error: "Not found" }, 404);

    // Repeating reminders (created through the chat) are left as they are
    await sql`
      DELETE FROM reminders
      WHERE event_id = ${body.id} AND status = 'pending' AND is_recurring IS NOT TRUE
    `;
    await insertReminders(row.id, planned);
    return json({ success: true, id: row.id });
  } catch (err) {
    console.error("Calendar PUT:", err);
    return json({ error: "השמירה נכשלה" }, 500);
  }
}

// ── PATCH: tick a to-do done / not done ─────────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const { id, done } = await req.json();
    if (!id || typeof done !== "boolean") return json({ error: "Missing id or done" }, 400);

    const [row] = await sql`
      UPDATE events SET status = ${done ? "completed" : "scheduled"}
      WHERE id = ${id}
      RETURNING id
    `;
    if (!row) return json({ error: "Not found" }, 404);

    if (done) {
      // A finished item should not notify any more
      await sql`UPDATE reminders SET status = 'dismissed' WHERE event_id = ${id} AND status = 'pending'`;
    } else {
      const restored = await sql`
        UPDATE reminders SET status = 'pending'
        WHERE event_id = ${id} AND status = 'dismissed' AND remind_at > NOW()
        RETURNING id, remind_at
      `;
      for (const r of restored) await scheduleReminder(r.id, r.remind_at);
    }
    return json({ success: true });
  } catch (err) {
    console.error("Calendar PATCH:", err);
    return json({ error: "העדכון נכשל" }, 500);
  }
}

// ── DELETE: remove an item and its notifications ────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return json({ error: "Missing id" }, 400);
    await sql`DELETE FROM reminders WHERE event_id = ${id}`;
    const rows = await sql`DELETE FROM events WHERE id = ${id} RETURNING id`;
    return rows.length > 0 ? json({ success: true }) : json({ error: "Not found" }, 404);
  } catch (err) {
    console.error("Calendar DELETE:", err);
    return json({ error: "המחיקה נכשלה" }, 500);
  }
}
