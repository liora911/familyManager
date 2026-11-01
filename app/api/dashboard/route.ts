import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// Map user cookie value → family_members name for filtering
const USER_TO_MEMBER: Record<string, string> = {
  yarin: "ירין",
  liora: "תותי",
};

export async function GET(req: NextRequest) {
  try {
    const user = req.cookies.get("home-manager-user")?.value || "shared";
    const memberName = USER_TO_MEMBER[user];

    // If a specific user is selected, resolve their family_members.id
    let memberId: string | null = null;
    if (memberName) {
      const [m] = await sql`
        SELECT id FROM family_members
        WHERE name = ${memberName} OR nickname = ${memberName}
        LIMIT 1
      `;
      memberId = m?.id || null;
    }

    // Personal profiles see their own items plus items not assigned to anyone.
    // The shared profile (or an unknown member) sees everything.
    const memberFilter = (column: string) =>
      memberId ? ` AND (${column} = $1 OR ${column} IS NULL)` : "";
    const memberParams = memberId ? [memberId] : [];

    const [
      events,
      tasks,
      medications,
      shopping,
      reminders,
      keys,
      inventory,
      insurance,
      finance,
      cvSections,
      notebook,
    ] = await Promise.all([
      // Events: a few months back so the calendar can browse, everything ahead
      sql(
        `SELECT e.*, fm.name as member_name, c.name as contact_name, c.phone as contact_phone
         FROM events e
         LEFT JOIN family_members fm ON e.related_member_id = fm.id
         LEFT JOIN contacts c ON e.contact_id = c.id
         WHERE e.event_date >= NOW() - INTERVAL '90 days'${memberFilter("e.related_member_id")}
         ORDER BY e.event_date ASC
         LIMIT 500`,
        memberParams
      ),
      sql(
        `SELECT t.*, fm.name as assigned_name
         FROM tasks t
         LEFT JOIN family_members fm ON t.assigned_to = fm.id
         WHERE t.status != 'done'${memberFilter("t.assigned_to")}
         ORDER BY
           CASE t.priority
             WHEN 'urgent' THEN 0 WHEN 'high' THEN 1
             WHEN 'medium' THEN 2 WHEN 'low' THEN 3
           END,
           t.due_date ASC NULLS LAST`,
        memberParams
      ),
      sql(
        `SELECT m.*, fm.name as member_name
         FROM medications m
         LEFT JOIN family_members fm ON m.for_member_id = fm.id
         WHERE 1=1${memberFilter("m.for_member_id")}
         ORDER BY m.created_at DESC`,
        memberParams
      ),
      // Shopping includes purchased items so they can be unchecked or cleared
      sql`SELECT * FROM shopping_items
          ORDER BY is_purchased, category, created_at DESC`,
      sql`SELECT r.*, e.title as event_title
          FROM reminders r
          LEFT JOIN events e ON r.event_id = e.id
          WHERE r.status = 'pending'
          ORDER BY r.remind_at ASC`,
      sql`SELECT * FROM keys ORDER BY category, name`,
      sql`SELECT * FROM inventory ORDER BY category, name`,
      sql`SELECT ip.*, fm.name as member_name
          FROM insurance_policies ip
          LEFT JOIN family_members fm ON ip.insured_member_id = fm.id
          ORDER BY ip.end_date ASC NULLS LAST`,
      sql`SELECT fr.*, fm.name as member_name
          FROM finance_records fr
          LEFT JOIN family_members fm ON fr.related_member_id = fm.id
          ORDER BY fr.record_date DESC
          LIMIT 100`,
      sql`SELECT cs.*, fm.name as member_name
          FROM cv_sections cs
          LEFT JOIN family_members fm ON cs.member_id = fm.id
          ORDER BY cs.member_id, cs.section_type, cs.sort_order`,
      sql`SELECT * FROM notebook_entries
          ORDER BY is_pinned DESC, created_at DESC`,
    ]);

    return NextResponse.json({
      events,
      tasks,
      shopping,
      reminders,
      medications,
      keys,
      inventory,
      insurance,
      finance,
      cv: cvSections,
      notebook,
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
