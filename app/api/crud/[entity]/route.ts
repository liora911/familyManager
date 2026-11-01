import { sql } from "@/lib/db";
import { del } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { scheduleReminder } from "@/lib/scheduler";

const VALID_ENTITIES = ["events", "tasks", "shopping", "reminders", "medications", "keys", "inventory", "insurance", "finance", "cv", "notebook"] as const;
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
          INSERT INTO shopping_items (item_name, quantity, category, store, list_name, image_url)
          VALUES (${body.item_name}, ${body.quantity || null}, ${body.category || "grocery"},
                  ${body.store || null}, ${body.list_name || "default"}, ${body.image_url || null})
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
        await scheduleReminder(row.id, row.remind_at);
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

      case "inventory": {
        const specs = body.specs ? JSON.stringify(body.specs) : "{}";
        const attachments = body.attachments ? JSON.stringify(body.attachments) : "[]";
        const [row] = await sql`
          INSERT INTO inventory (name, category, sub_category, brand, model, serial_number, location, purchase_date, warranty_expiry, cost, notes, specs, attachments)
          VALUES (${body.name}, ${body.category || "appliance"}, ${body.sub_category || null},
                  ${body.brand || null}, ${body.model || null}, ${body.serial_number || null},
                  ${body.location || null}, ${body.purchase_date || null}, ${body.warranty_expiry || null},
                  ${body.cost || null}, ${body.notes || null}, ${specs}::jsonb, ${attachments}::jsonb)
          RETURNING *
        `;
        return json({ success: true, item: row });
      }

      case "insurance": {
        const memberId = body.insured_member_name ? await resolveMember(body.insured_member_name) : null;
        const attachments = body.attachments ? JSON.stringify(body.attachments) : "[]";
        const [row] = await sql`
          INSERT INTO insurance_policies (title, category, provider, policy_number, insured_member_id, start_date, end_date, monthly_cost, contact_phone, contact_name, notes, attachments)
          VALUES (${body.title}, ${body.category || "general"}, ${body.provider || null},
                  ${body.policy_number || null}, ${memberId}, ${body.start_date || null},
                  ${body.end_date || null}, ${body.monthly_cost || null}, ${body.contact_phone || null},
                  ${body.contact_name || null}, ${body.notes || null}, ${attachments}::jsonb)
          RETURNING *
        `;
        return json({ success: true, item: row });
      }

      case "finance": {
        const memberId = body.related_member_name ? await resolveMember(body.related_member_name) : null;
        const attachments = body.attachments ? JSON.stringify(body.attachments) : "[]";
        const [row] = await sql`
          INSERT INTO finance_records (title, category, amount, currency, record_date, is_recurring, recurrence_rule, related_member_id, notes, attachments)
          VALUES (${body.title}, ${body.category || "expense"}, ${body.amount},
                  ${body.currency || "ILS"}, ${body.record_date || null}, ${body.is_recurring || false},
                  ${body.recurrence_rule || null}, ${memberId}, ${body.notes || null}, ${attachments}::jsonb)
          RETURNING *
        `;
        return json({ success: true, item: row });
      }

      case "cv": {
        const memberId = body.member_name ? await resolveMember(body.member_name) : null;
        const [row] = await sql`
          INSERT INTO cv_sections (member_id, section_type, title, organization, start_date, end_date, is_current, description, sort_order)
          VALUES (${memberId}, ${body.section_type || "other"}, ${body.title},
                  ${body.organization || null}, ${body.start_date || null}, ${body.end_date || null},
                  ${body.is_current || false}, ${body.description || null}, ${body.sort_order || 0})
          RETURNING *
        `;
        return json({ success: true, item: row });
      }

      case "notebook": {
        const [row] = await sql`
          INSERT INTO notebook_entries (title, content, category, is_pinned)
          VALUES (${body.title || null}, ${body.content}, ${body.category || "general"}, ${body.is_pinned || false})
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
//
// Only the keys present in the request body are updated. An empty string
// clears a nullable column (so a due date, location or assignee can be
// removed from the edit form); required columns keep their current value.

interface UpdateSpec {
  table: string;
  /** Body keys that map 1:1 to column names */
  columns: string[];
  /** Columns that must not be cleared; an empty value leaves them unchanged */
  notNull: string[];
  /** Columns stored as JSONB (value is serialized before saving) */
  json?: string[];
  /** Family member name in the body → UUID column */
  member?: { key: string; column: string };
  /** Timestamp column to bump on every update */
  touch?: string;
}

const UPDATE_SPECS: Record<Entity, UpdateSpec> = {
  events: {
    table: "events",
    columns: ["title", "description", "category", "event_date", "end_date", "location", "status"],
    notNull: ["title", "category", "event_date", "status"],
    member: { key: "member_name", column: "related_member_id" },
  },
  tasks: {
    table: "tasks",
    columns: ["title", "description", "category", "due_date", "priority", "status"],
    notNull: ["title", "category", "priority", "status"],
    member: { key: "assigned_to_name", column: "assigned_to" },
  },
  shopping: {
    table: "shopping_items",
    columns: ["item_name", "quantity", "category", "store", "is_purchased", "list_name", "image_url"],
    notNull: ["item_name", "category", "is_purchased", "list_name"],
  },
  reminders: {
    table: "reminders",
    columns: ["message", "remind_at", "is_recurring", "recurrence_rule", "status"],
    notNull: ["message", "remind_at", "is_recurring", "status"],
  },
  medications: {
    table: "medications",
    columns: ["name", "dosage", "frequency", "start_date", "end_date", "notes"],
    notNull: ["name"],
    member: { key: "for_member_name", column: "for_member_id" },
  },
  keys: {
    table: "keys",
    columns: ["name", "value", "category", "location", "notes"],
    notNull: ["name", "value", "category"],
  },
  inventory: {
    table: "inventory",
    columns: ["name", "category", "sub_category", "brand", "model", "serial_number", "location", "purchase_date", "warranty_expiry", "cost", "notes", "specs", "attachments"],
    notNull: ["name", "category", "specs", "attachments"],
    json: ["specs", "attachments"],
  },
  insurance: {
    table: "insurance_policies",
    columns: ["title", "category", "provider", "policy_number", "start_date", "end_date", "monthly_cost", "contact_phone", "contact_name", "notes", "attachments"],
    notNull: ["title", "category", "attachments"],
    json: ["attachments"],
    member: { key: "insured_member_name", column: "insured_member_id" },
  },
  finance: {
    table: "finance_records",
    columns: ["title", "category", "amount", "currency", "record_date", "is_recurring", "recurrence_rule", "notes", "attachments"],
    notNull: ["title", "category", "amount", "currency", "is_recurring", "attachments"],
    json: ["attachments"],
    member: { key: "related_member_name", column: "related_member_id" },
  },
  cv: {
    table: "cv_sections",
    columns: ["section_type", "title", "organization", "start_date", "end_date", "is_current", "description", "sort_order"],
    notNull: ["section_type", "title", "is_current"],
    member: { key: "member_name", column: "member_id" },
  },
  notebook: {
    table: "notebook_entries",
    columns: ["title", "content", "category", "is_pinned"],
    notNull: ["content", "category", "is_pinned"],
    touch: "updated_at",
  },
};

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
    const { id } = body;
    if (!id) return json({ error: "Missing id" }, 400);

    const spec = UPDATE_SPECS[entity as Entity];

    // Shopping: when the image is replaced or removed, delete the old blob
    if (entity === "shopping" && body.image_url !== undefined) {
      const [existing] = await sql`SELECT image_url FROM shopping_items WHERE id = ${id}`;
      if (existing?.image_url && existing.image_url !== body.image_url) {
        try { await del(existing.image_url); } catch { /* ignore */ }
      }
    }

    const sets: string[] = [];
    const values: unknown[] = [];
    const add = (column: string, value: unknown) => {
      values.push(value);
      sets.push(`${column} = $${values.length}`);
    };

    for (const column of spec.columns) {
      if (!(column in body)) continue;
      let value: unknown = body[column];
      if (value === "" || value === undefined) value = null;
      if (value === null && spec.notNull.includes(column)) continue;
      if (value !== null && spec.json?.includes(column)) value = JSON.stringify(value);
      add(column, value);
    }

    if (spec.member && spec.member.key in body) {
      const name = body[spec.member.key];
      if (!name) {
        add(spec.member.column, null);
      } else {
        const memberId = await resolveMember(String(name));
        if (memberId) add(spec.member.column, memberId);
      }
    }

    if (sets.length === 0) return json({ error: "Nothing to update" }, 400);
    if (spec.touch) sets.push(`${spec.touch} = NOW()`);

    values.push(id);
    const rows = await sql(
      `UPDATE ${spec.table} SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING *`,
      values
    );
    const updated = rows[0];
    // A reminder with a new time (or reopened) needs a new exact-time booking
    if (
      updated &&
      entity === "reminders" &&
      updated.status === "pending" &&
      ("remind_at" in body || "status" in body)
    ) {
      await scheduleReminder(updated.id, updated.remind_at);
    }
    return updated ? json({ success: true, item: updated }) : json({ error: "Not found" }, 404);
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
      // Clean up blobs for purchased items that have images
      const withImages = await sql`SELECT image_url FROM shopping_items WHERE is_purchased = true AND image_url IS NOT NULL`;
      for (const row of withImages) {
        try { await del(row.image_url); } catch { /* ignore */ }
      }
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
      inventory: "inventory",
      insurance: "insurance_policies",
      finance: "finance_records",
      cv: "cv_sections",
      notebook: "notebook_entries",
    };

    // Cascade: delete reminders linked to event
    if (entity === "events") {
      await sql`DELETE FROM reminders WHERE event_id = ${id}`;
    }

    // Clean up blob for shopping item image
    if (entity === "shopping") {
      const [existing] = await sql`SELECT image_url FROM shopping_items WHERE id = ${id}`;
      if (existing?.image_url) {
        try { await del(existing.image_url); } catch { /* ignore */ }
      }
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
