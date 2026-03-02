import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const VALID_ENTITIES = ["events", "tasks", "shopping", "reminders", "medications", "keys"] as const;
type Entity = (typeof VALID_ENTITIES)[number];

// Resolve family member name → UUID
async function resolveMember(name: string): Promise<string | null> {
  const [m] = await sql`
    SELECT id FROM family_members
    WHERE name = ${name} OR nickname = ${name}
    LIMIT 1
  `;
  return m?.id || null;
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

// ── POST: Create ────────────────────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ entity: string }> }
) {
  const { entity } = await params;
  if (!VALID_ENTITIES.includes(entity as Entity)) {
    return json({ error: "Invalid entity" }, 400);
  }

  try {
    const body = await req.json();

    switch (entity as Entity) {
      case "events": {
        const memberId = body.member_name ? await resolveMember(body.member_name) : null;
        const [row] = await sql`
          INSERT INTO events (title, description, category, event_date, end_date, location, related_member_id, status)
          VALUES (${body.title}, ${body.description || null}, ${body.category || "personal"},
                  ${body.event_date}, ${body.end_date || null}, ${body.location || null},
                  ${memberId}, ${body.status || "scheduled"})
          RETURNING *
        `;
        return json({ success: true, item: row });
      }

      case "tasks": {
        const assignedId = body.assigned_to_name ? await resolveMember(body.assigned_to_name) : null;
        const [row] = await sql`
          INSERT INTO tasks (title, description, category, assigned_to, due_date, priority, status)
          VALUES (${body.title}, ${body.description || null}, ${body.category || "errand"},
                  ${assignedId}, ${body.due_date || null}, ${body.priority || "medium"},
                  ${body.status || "pending"})
          RETURNING *
        `;
        return json({ success: true, item: row });
      }

      case "shopping": {
        const [row] = await sql`
          INSERT INTO shopping_items (item_name, quantity, category, store, list_name)
          VALUES (${body.item_name}, ${body.quantity || null}, ${body.category || "grocery"},
                  ${body.store || null}, ${body.list_name || "default"})
          RETURNING *
        `;
        return json({ success: true, item: row });
      }

      case "reminders": {
        const [row] = await sql`
          INSERT INTO reminders (message, remind_at, is_recurring, recurrence_rule)
          VALUES (${body.message}, ${body.remind_at}, ${body.is_recurring || false},
                  ${body.recurrence_rule || null})
          RETURNING *
        `;
        return json({ success: true, item: row });
      }

      case "medications": {
        const memberId = body.for_member_name ? await resolveMember(body.for_member_name) : null;
        const [row] = await sql`
          INSERT INTO medications (name, for_member_id, dosage, frequency, start_date, end_date, notes)
          VALUES (${body.name}, ${memberId}, ${body.dosage || null}, ${body.frequency || null},
                  ${body.start_date || null}, ${body.end_date || null}, ${body.notes || null})
          RETURNING *
        `;
        return json({ success: true, item: row });
      }

      case "keys": {
        const [row] = await sql`
          INSERT INTO keys (name, value, category, location, notes)
          VALUES (${body.name}, ${body.value}, ${body.category || "other"},
                  ${body.location || null}, ${body.notes || null})
          RETURNING *
        `;
        return json({ success: true, item: row });
      }
    }
  } catch (error) {
    console.error(`CRUD POST ${entity}:`, error);
    return json({ error: error instanceof Error ? error.message : "Create failed" }, 500);
  }
}

// ── PUT: Update ─────────────────────────────────────────────────────
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ entity: string }> }
) {
  const { entity } = await params;
  if (!VALID_ENTITIES.includes(entity as Entity)) {
    return json({ error: "Invalid entity" }, 400);
  }

  try {
    const body = await req.json();
    const { id, ...fields } = body;

    if (!id) return json({ error: "Missing id" }, 400);

    switch (entity as Entity) {
      case "events": {
        const memberId = fields.member_name ? await resolveMember(fields.member_name) : undefined;
        const [row] = await sql`
          UPDATE events SET
            title = COALESCE(${fields.title || null}, title),
            description = COALESCE(${fields.description ?? null}, description),
            category = COALESCE(${fields.category || null}, category),
            event_date = COALESCE(${fields.event_date || null}::timestamptz, event_date),
            end_date = COALESCE(${fields.end_date || null}::timestamptz, end_date),
            location = COALESCE(${fields.location ?? null}, location),
            related_member_id = COALESCE(${memberId || null}, related_member_id),
            status = COALESCE(${fields.status || null}, status)
          WHERE id = ${id}
          RETURNING *
        `;
        return row ? json({ success: true, item: row }) : json({ error: "Not found" }, 404);
      }

      case "tasks": {
        const assignedId = fields.assigned_to_name ? await resolveMember(fields.assigned_to_name) : undefined;
        const [row] = await sql`
          UPDATE tasks SET
            title = COALESCE(${fields.title || null}, title),
            description = COALESCE(${fields.description ?? null}, description),
            category = COALESCE(${fields.category || null}, category),
            assigned_to = COALESCE(${assignedId || null}, assigned_to),
            due_date = COALESCE(${fields.due_date || null}::timestamptz, due_date),
            priority = COALESCE(${fields.priority || null}, priority),
            status = COALESCE(${fields.status || null}, status)
          WHERE id = ${id}
          RETURNING *
        `;
        return row ? json({ success: true, item: row }) : json({ error: "Not found" }, 404);
      }

      case "shopping": {
        const [row] = await sql`
          UPDATE shopping_items SET
            item_name = COALESCE(${fields.item_name || null}, item_name),
            quantity = COALESCE(${fields.quantity ?? null}, quantity),
            category = COALESCE(${fields.category || null}, category),
            store = COALESCE(${fields.store ?? null}, store),
            is_purchased = COALESCE(${fields.is_purchased ?? null}, is_purchased)
          WHERE id = ${id}
          RETURNING *
        `;
        return row ? json({ success: true, item: row }) : json({ error: "Not found" }, 404);
      }

      case "reminders": {
        const [row] = await sql`
          UPDATE reminders SET
            message = COALESCE(${fields.message || null}, message),
            remind_at = COALESCE(${fields.remind_at || null}::timestamptz, remind_at),
            is_recurring = COALESCE(${fields.is_recurring ?? null}, is_recurring),
            recurrence_rule = COALESCE(${fields.recurrence_rule ?? null}, recurrence_rule),
            status = COALESCE(${fields.status || null}, status)
          WHERE id = ${id}
          RETURNING *
        `;
        return row ? json({ success: true, item: row }) : json({ error: "Not found" }, 404);
      }

      case "medications": {
        const memberId = fields.for_member_name ? await resolveMember(fields.for_member_name) : undefined;
        const [row] = await sql`
          UPDATE medications SET
            name = COALESCE(${fields.name || null}, name),
            for_member_id = COALESCE(${memberId || null}, for_member_id),
            dosage = COALESCE(${fields.dosage ?? null}, dosage),
            frequency = COALESCE(${fields.frequency ?? null}, frequency),
            start_date = COALESCE(${fields.start_date || null}::date, start_date),
            end_date = COALESCE(${fields.end_date || null}::date, end_date),
            notes = COALESCE(${fields.notes ?? null}, notes)
          WHERE id = ${id}
          RETURNING *
        `;
        return row ? json({ success: true, item: row }) : json({ error: "Not found" }, 404);
      }

      case "keys": {
        const [row] = await sql`
          UPDATE keys SET
            name = COALESCE(${fields.name || null}, name),
            value = COALESCE(${fields.value || null}, value),
            category = COALESCE(${fields.category || null}, category),
            location = COALESCE(${fields.location ?? null}, location),
            notes = COALESCE(${fields.notes ?? null}, notes)
          WHERE id = ${id}
          RETURNING *
        `;
        return row ? json({ success: true, item: row }) : json({ error: "Not found" }, 404);
      }
    }
  } catch (error) {
    console.error(`CRUD PUT ${entity}:`, error);
    return json({ error: error instanceof Error ? error.message : "Update failed" }, 500);
  }
}

// ── DELETE ───────────────────────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ entity: string }> }
) {
  const { entity } = await params;
  if (!VALID_ENTITIES.includes(entity as Entity)) {
    return json({ error: "Invalid entity" }, 400);
  }

  try {
    const body = await req.json();

    // Special: clear all purchased shopping items
    if (entity === "shopping" && body.clear_purchased) {
      await sql`DELETE FROM shopping_items WHERE is_purchased = true`;
      return json({ success: true });
    }

    const { id } = body;
    if (!id) return json({ error: "Missing id" }, 400);

    const table: Record<Entity, string> = {
      events: "events",
      tasks: "tasks",
      shopping: "shopping_items",
      reminders: "reminders",
      medications: "medications",
      keys: "keys",
    };

    // Cascade: delete reminders linked to event
    if (entity === "events") {
      await sql`DELETE FROM reminders WHERE event_id = ${id}`;
    }

    const rows = await sql(`DELETE FROM ${table[entity as Entity]} WHERE id = $1 RETURNING id`, [id]);
    return rows.length > 0
      ? json({ success: true })
      : json({ error: "Not found" }, 404);
  } catch (error) {
    console.error(`CRUD DELETE ${entity}:`, error);
    return json({ error: error instanceof Error ? error.message : "Delete failed" }, 500);
  }
}
