import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const [events, tasks, shopping, reminders, medications] = await Promise.all([
      sql`SELECT e.*, fm.name as member_name, c.name as contact_name
          FROM events e
          LEFT JOIN family_members fm ON e.related_member_id = fm.id
          LEFT JOIN contacts c ON e.contact_id = c.id
          WHERE e.event_date >= NOW() - INTERVAL '7 days'
          ORDER BY e.event_date ASC
          LIMIT 50`,
      sql`SELECT t.*, fm.name as assigned_name
          FROM tasks t
          LEFT JOIN family_members fm ON t.assigned_to = fm.id
          WHERE t.status != 'done'
          ORDER BY
            CASE t.priority
              WHEN 'urgent' THEN 0
              WHEN 'high' THEN 1
              WHEN 'medium' THEN 2
              WHEN 'low' THEN 3
            END,
            t.due_date ASC NULLS LAST`,
      sql`SELECT * FROM shopping_items
          WHERE is_purchased = false
          ORDER BY category, created_at DESC`,
      sql`SELECT r.*, e.title as event_title
          FROM reminders r
          LEFT JOIN events e ON r.event_id = e.id
          WHERE r.status = 'pending'
          ORDER BY r.remind_at ASC`,
      sql`SELECT m.*, fm.name as member_name
          FROM medications m
          LEFT JOIN family_members fm ON m.for_member_id = fm.id
          ORDER BY m.created_at DESC`,
    ]);

    return NextResponse.json({ events, tasks, shopping, reminders, medications });
  } catch (err) {
    console.error("Dashboard error:", err);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
