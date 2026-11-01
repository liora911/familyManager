// Exact-time reminder delivery through Upstash QStash.
//
// Vercel's Hobby plan only runs our cron once a day. Instead of polling,
// each reminder books one QStash message that calls /api/cron a few seconds
// after the reminder is due. The cron run is idempotent, so a stale booking
// (edited or deleted reminder) just finds nothing to send.
//
// Disabled unless QSTASH_TOKEN and CRON_SECRET are set and the app's public
// URL is known (APP_URL, or Vercel's VERCEL_PROJECT_PRODUCTION_URL).

import { sql } from "@/lib/db";

// QStash's free plan allows delays up to 7 days; stay safely below.
const MAX_DELAY_MS = (Number(process.env.QSTASH_MAX_DELAY_DAYS) || 6.5) * 86_400_000;
// Fire a little after the due time so the reminder is definitely due.
const FIRE_MARGIN_S = 5;

/** Read an env var, tolerating values pasted with surrounding quotes or spaces */
function env(name: string): string | undefined {
  const v = process.env[name]?.trim().replace(/^(["'])(.*)\1$/, "$2").trim();
  return v || undefined;
}

function baseUrl(): string | null {
  const raw = env("APP_URL") || env("VERCEL_PROJECT_PRODUCTION_URL");
  if (!raw) return null;
  return (raw.startsWith("http") ? raw : `https://${raw}`).replace(/\/+$/, "");
}

export function isSchedulerConfigured(): boolean {
  return !!env("QSTASH_TOKEN") && !!env("CRON_SECRET") && !!baseUrl();
}

let columnReady: Promise<unknown> | null = null;

/** reminders.scheduled_run_at records which due time already has a booking */
function ensureColumn(): Promise<unknown> {
  if (!columnReady) {
    columnReady = sql`
      ALTER TABLE reminders ADD COLUMN IF NOT EXISTS scheduled_run_at TIMESTAMPTZ
    `.catch((e) => {
      columnReady = null;
      throw e;
    });
  }
  return columnReady;
}

/** Book one call to /api/cron at (or just after) the given moment */
async function publishRun(at: Date): Promise<boolean> {
  const url = baseUrl();
  const token = env("QSTASH_TOKEN");
  const cronSecret = env("CRON_SECRET");
  if (!token || !cronSecret || !url) return false;

  const fireAt = Math.max(
    Math.ceil(at.getTime() / 1000) + FIRE_MARGIN_S,
    Math.ceil(Date.now() / 1000) + FIRE_MARGIN_S
  );
  const qstash = (env("QSTASH_URL") || "https://qstash.upstash.io").replace(/\/+$/, "");

  const res = await fetch(`${qstash}/v2/publish/${url}/api/cron`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Upstash-Not-Before": String(fireAt),
      "Upstash-Method": "GET",
      "Upstash-Retries": "3",
      // One booking per second is enough; the run handles every reminder that is due
      "Upstash-Deduplication-Id": `reminder-run-${fireAt}`,
      "Upstash-Forward-Authorization": `Bearer ${cronSecret}`,
    },
  });

  if (!res.ok) {
    console.error("[scheduler] QStash publish failed:", res.status, await res.text().catch(() => ""));
    return false;
  }
  return true;
}

/**
 * Book an exact-time run for one reminder. Reminders further out than the
 * QStash limit are skipped here and booked later by scheduleUpcomingReminders().
 * Never throws.
 */
export async function scheduleReminder(id: string, remindAt: string | Date): Promise<boolean> {
  if (!isSchedulerConfigured()) return false;
  const when = new Date(remindAt);
  if (Number.isNaN(when.getTime())) return false;
  if (when.getTime() - Date.now() > MAX_DELAY_MS) return false;

  try {
    await ensureColumn();
    const ok = await publishRun(when);
    if (ok) {
      await sql`UPDATE reminders SET scheduled_run_at = ${when.toISOString()} WHERE id = ${id}`;
    }
    return ok;
  } catch (e) {
    console.error("[scheduler] scheduleReminder failed:", e);
    return false;
  }
}

/** Book a run some time from now, e.g. to retry a reminder no channel could deliver */
export async function scheduleRunIn(ms: number): Promise<boolean> {
  if (!isSchedulerConfigured()) return false;
  try {
    return await publishRun(new Date(Date.now() + ms));
  } catch (e) {
    console.error("[scheduler] scheduleRunIn failed:", e);
    return false;
  }
}

/**
 * Book every pending reminder inside the QStash window whose current due
 * time has no booking yet (new, edited, or previously too far ahead).
 * Called at the end of every cron run. Never throws.
 */
export async function scheduleUpcomingReminders(): Promise<number> {
  if (!isSchedulerConfigured()) return 0;
  try {
    await ensureColumn();
    const horizon = new Date(Date.now() + MAX_DELAY_MS).toISOString();
    const rows = await sql`
      SELECT id, remind_at FROM reminders
      WHERE status = 'pending'
        AND remind_at > NOW()
        AND remind_at <= ${horizon}
        AND (scheduled_run_at IS NULL OR scheduled_run_at <> remind_at)
      ORDER BY remind_at
      LIMIT 200
    `;
    let booked = 0;
    for (const r of rows) {
      if (await scheduleReminder(r.id, r.remind_at)) booked++;
    }
    return booked;
  } catch (e) {
    console.error("[scheduler] scheduleUpcomingReminders failed:", e);
    return 0;
  }
}
