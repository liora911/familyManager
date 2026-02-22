import { sql } from "@/lib/db";
import { Resend } from "resend";
import webpush from "web-push";

const resend = new Resend(process.env.RESEND_API_KEY);

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:liora532@gmail.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

async function sendPushNotifications(title: string, body: string, tag: string) {
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
}

export async function GET(req: Request) {
  // Verify cron secret (Vercel sends this header for cron jobs)
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    // Get pending reminders that are due
    const dueReminders = await sql`
      SELECT r.*, e.title as event_title
      FROM reminders r
      LEFT JOIN events e ON r.event_id = e.id
      WHERE r.status = 'pending' AND r.remind_at <= NOW()
      ORDER BY r.remind_at ASC
      LIMIT 20
    `;

    if (dueReminders.length === 0) {
      return Response.json({ sent: 0 });
    }

    const reminderEmail = process.env.REMINDER_EMAIL || "liora532@gmail.com";
    let sentCount = 0;

    for (const reminder of dueReminders) {
      const subject = reminder.event_title
        ? `תזכורת: ${reminder.event_title}`
        : `תזכורת: ${reminder.message.slice(0, 50)}`;

      try {
        // Send push notification
        await sendPushNotifications(
          "🔔 תזכורת",
          reminder.event_title
            ? `${reminder.message} (${reminder.event_title})`
            : reminder.message,
          `reminder-${reminder.id}`
        );

        // Send email as fallback
        await resend.emails.send({
          from: "מנהל הבית <onboarding@resend.dev>",
          to: reminderEmail,
          subject,
          html: `
            <div dir="rtl" style="font-family: sans-serif; padding: 20px;">
              <h2>🔔 תזכורת</h2>
              <p style="font-size: 16px;">${reminder.message}</p>
              ${reminder.event_title ? `<p style="color: #666;">אירוע: ${reminder.event_title}</p>` : ""}
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="color: #999; font-size: 12px;">מנהל הבית 🏠</p>
            </div>
          `,
        });

        // Mark as sent
        await sql`UPDATE reminders SET status = 'sent' WHERE id = ${reminder.id}`;
        sentCount++;

        // Handle recurring: create next occurrence
        if (reminder.is_recurring && reminder.recurrence_rule) {
          const nextDate = calculateNextDate(
            new Date(reminder.remind_at),
            reminder.recurrence_rule
          );
          if (nextDate) {
            await sql`
              INSERT INTO reminders (message, remind_at, event_id, is_recurring, recurrence_rule)
              VALUES (${reminder.message}, ${nextDate.toISOString()}, ${reminder.event_id},
                      true, ${reminder.recurrence_rule})
            `;
          }
        }
      } catch (emailError) {
        console.error(`Failed to send reminder ${reminder.id}:`, emailError);
      }
    }

    return Response.json({ sent: sentCount, total: dueReminders.length });
  } catch (error) {
    console.error("Cron error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

function calculateNextDate(
  current: Date,
  rule: string
): Date | null {
  const next = new Date(current);
  switch (rule) {
    case "daily":
      next.setDate(next.getDate() + 1);
      return next;
    case "weekly":
      next.setDate(next.getDate() + 7);
      return next;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      return next;
    default:
      return null;
  }
}
