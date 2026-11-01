import { sql } from "@/lib/db";
import { Resend } from "resend";
import webpush from "web-push";
import { isWhatsAppConfigured, sendWhatsAppTemplate } from "@/lib/whatsapp";
import { scheduleReminder, scheduleRunIn, scheduleUpcomingReminders } from "@/lib/scheduler";
import { addIsraelTime } from "@/lib/time";

// Called by Vercel Cron once a day (safety net) and by Upstash QStash at each
// reminder's exact time (see lib/scheduler.ts). Safe to run concurrently.

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:liora532@gmail.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

const RETRY_WINDOW_MS = 60 * 60 * 1000; // keep retrying a failed reminder for an hour
const RETRY_DELAY_MS = 10 * 60 * 1000;

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string
  );
}

/** Sends to every stored subscription; returns how many accepted the push */
async function sendPushNotifications(title: string, body: string, tag: string): Promise<number> {
  let delivered = 0;
  try {
    const subs = await sql`SELECT * FROM push_subscriptions`;
    for (const sub of subs) {
      const pushSub = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth },
      };
      try {
        await webpush.sendNotification(
          pushSub,
          JSON.stringify({ title, body, tag, url: "/" })
        );
        delivered++;
      } catch (err: unknown) {
        // If subscription is expired/invalid, remove it
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 410 || statusCode === 404) {
          await sql`DELETE FROM push_subscriptions WHERE endpoint = ${sub.endpoint}`;
        }
      }
    }
  } catch (err) {
    console.error("Push notification error:", err);
  }
  return delivered;
}

async function sendEmail(to: string, message: string, eventTitle: string | null): Promise<boolean> {
  if (!resend) return false;
  const subject = eventTitle
    ? `תזכורת: ${eventTitle}`
    : `תזכורת: ${message.slice(0, 50)}`;
  try {
    const { error } = await resend.emails.send({
      from: "מנהל הבית <onboarding@resend.dev>",
      to,
      subject,
      html: `
        <div dir="rtl" style="font-family: sans-serif; padding: 20px;">
          <h2>🔔 תזכורת</h2>
          <p style="font-size: 16px;">${escapeHtml(message)}</p>
          ${eventTitle ? `<p style="color: #666;">אירוע: ${escapeHtml(eventTitle)}</p>` : ""}
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 12px;">מנהל הבית 🏠</p>
        </div>
      `,
    });
    if (error) {
      console.error("Email error:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Email error:", err);
    return false;
  }
}

/** Next occurrence after `from`, skipping any that are already in the past */
function calculateNextDate(from: Date, rule: string): Date | null {
  const step = (d: Date): Date | null => {
    switch (rule) {
      case "daily":
        return addIsraelTime(d, "day", 1);
      case "weekly":
        return addIsraelTime(d, "day", 7);
      case "monthly":
        return addIsraelTime(d, "month", 1);
      default:
        return null;
    }
  };
  let next = step(from);
  for (let guard = 0; next && next.getTime() <= Date.now() && guard < 400; guard++) {
    next = step(next);
  }
  return next;
}

async function runCron(req: Request) {
  // Verify cron secret (sent by Vercel Cron, and forwarded by QStash)
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  const unquoted = secret?.trim().replace(/^(["'])(.*)\1$/, "$2").trim();
  if (!secret || (authHeader !== `Bearer ${secret}` && authHeader !== `Bearer ${unquoted}`)) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    // Pending reminders that are due (small margin for clock differences)
    const dueReminders = await sql`
      SELECT r.*, e.title as event_title
      FROM reminders r
      LEFT JOIN events e ON r.event_id = e.id
      WHERE r.status = 'pending' AND r.remind_at <= NOW() + INTERVAL '15 seconds'
      ORDER BY r.remind_at ASC
      LIMIT 20
    `;

    const reminderEmail = process.env.REMINDER_EMAIL || "liora532@gmail.com";
    let sentCount = 0;
    let retryNeeded = false;
    const whatsapp = { sent: 0, failed: 0, stopped: null as string | null };
    // Turned off for the rest of the run once the daily cap or a rate limit is hit
    let whatsappActive = isWhatsAppConfigured();

    for (const reminder of dueReminders) {
      // Claim the reminder first, so two overlapping runs never send it twice
      const [claimed] = await sql`
        UPDATE reminders SET status = 'sent'
        WHERE id = ${reminder.id} AND status = 'pending'
        RETURNING id
      `;
      if (!claimed) continue;

      const text = reminder.event_title
        ? `${reminder.message} (${reminder.event_title})`
        : reminder.message;

      const pushOk = (await sendPushNotifications("🔔 תזכורת", text, `reminder-${reminder.id}`)) > 0;

      let whatsappOk = false;
      if (whatsappActive) {
        try {
          const r = await sendWhatsAppTemplate(text);
          whatsapp.sent += r.sent;
          whatsapp.failed += r.failed;
          whatsappOk = r.sent > 0;
          if (r.reason) {
            whatsapp.stopped = r.reason;
            whatsappActive = false;
          }
        } catch (err) {
          console.error("WhatsApp error:", err);
        }
      }

      const emailOk = await sendEmail(reminderEmail, reminder.message, reminder.event_title);

      if (!pushOk && !whatsappOk && !emailOk) {
        // Nothing got through: release it so a later run tries again
        console.error(`Reminder ${reminder.id}: no channel delivered, will retry`);
        await sql`UPDATE reminders SET status = 'pending' WHERE id = ${reminder.id}`;
        if (Date.now() - new Date(reminder.remind_at).getTime() < RETRY_WINDOW_MS) {
          retryNeeded = true;
        }
        continue;
      }

      sentCount++;

      // Recurring: create and book the next occurrence
      if (reminder.is_recurring && reminder.recurrence_rule) {
        const nextDate = calculateNextDate(new Date(reminder.remind_at), reminder.recurrence_rule);
        if (nextDate) {
          const [next] = await sql`
            INSERT INTO reminders (message, remind_at, event_id, is_recurring, recurrence_rule)
            VALUES (${reminder.message}, ${nextDate.toISOString()}, ${reminder.event_id},
                    true, ${reminder.recurrence_rule})
            RETURNING id, remind_at
          `;
          if (next) await scheduleReminder(next.id, next.remind_at);
        }
      }
    }

    if (retryNeeded) await scheduleRunIn(RETRY_DELAY_MS);

    // Book exact-time runs for anything new, edited, or now within QStash's window
    const booked = await scheduleUpcomingReminders();

    return Response.json({ sent: sentCount, due: dueReminders.length, booked, whatsapp });
  } catch (error) {
    console.error("Cron error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  return runCron(req);
}

export async function POST(req: Request) {
  return runCron(req);
}
