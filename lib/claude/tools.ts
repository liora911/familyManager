import { sql } from "@/lib/db";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function executeTool(name: string, input: Record<string, any>): Promise<any> {
  switch (name) {
    // ── EVENTS ────────────────────────────────────────────────────────

    case "create_event": {
      let memberId = null;
      if (input.related_member_name) {
        const [m] = await sql`
          SELECT id FROM family_members
          WHERE name = ${input.related_member_name} OR nickname = ${input.related_member_name}
          LIMIT 1
        `;
        memberId = m?.id;
      }

      let contactId = null;
      if (input.contact_name) {
        const [existing] = await sql`
          SELECT id FROM contacts WHERE name = ${input.contact_name} LIMIT 1
        `;
        if (existing) {
          contactId = existing.id;
        } else {
          const [c] = await sql`
            INSERT INTO contacts (name, category, specialty, phone, address, related_member_id)
            VALUES (${input.contact_name}, 'doctor', ${input.contact_specialty || null},
                    ${input.contact_phone || null}, ${input.contact_address || null}, ${memberId})
            RETURNING id
          `;
          contactId = c.id;
        }
      }

      const [event] = await sql`
        INSERT INTO events (title, description, category, event_date, end_date, location,
                           related_member_id, contact_id, status)
        VALUES (${input.title}, ${input.description || null}, ${input.category},
                ${input.event_date}, ${input.end_date || null}, ${input.location || null},
                ${memberId}, ${contactId}, 'scheduled')
        RETURNING *
      `;
      return { success: true, event };
    }

    case "list_events": {
      const from = input.from_date || new Date().toISOString();
      const to =
        input.to_date ||
        new Date(Date.now() + 30 * 86400000).toISOString();

      let memberFilter = sql``;
      if (input.member_name) {
        const [m] = await sql`
          SELECT id FROM family_members
          WHERE name = ${input.member_name} OR nickname = ${input.member_name}
          LIMIT 1
        `;
        if (m) memberFilter = sql`AND e.related_member_id = ${m.id}`;
      }

      const rows = await sql`
        SELECT e.*, fm.name as member_name, c.name as contact_name, c.specialty
        FROM events e
        LEFT JOIN family_members fm ON e.related_member_id = fm.id
        LEFT JOIN contacts c ON e.contact_id = c.id
        WHERE e.event_date >= ${from} AND e.event_date <= ${to}
          AND e.status = ${input.status || "scheduled"}
          ${input.category ? sql`AND e.category = ${input.category}` : sql``}
          ${memberFilter}
        ORDER BY e.event_date ASC
      `;
      return { events: rows };
    }

    case "update_event": {
      const { event_id, ...fields } = input;
      const [updated] = await sql`
        UPDATE events SET
          title = COALESCE(${fields.title || null}, title),
          description = COALESCE(${fields.description || null}, description),
          event_date = COALESCE(${fields.event_date || null}::timestamptz, event_date),
          end_date = COALESCE(${fields.end_date || null}::timestamptz, end_date),
          location = COALESCE(${fields.location || null}, location),
          status = COALESCE(${fields.status || null}, status)
        WHERE id = ${event_id}
        RETURNING *
      `;
      return updated
        ? { success: true, event: updated }
        : { success: false, error: "Event not found" };
    }

    case "delete_event": {
      await sql`DELETE FROM reminders WHERE event_id = ${input.event_id}`;
      const [deleted] = await sql`
        DELETE FROM events WHERE id = ${input.event_id} RETURNING id
      `;
      return deleted
        ? { success: true }
        : { success: false, error: "Event not found" };
    }

    // ── REMINDERS ─────────────────────────────────────────────────────

    case "create_reminder": {
      const [reminder] = await sql`
        INSERT INTO reminders (message, remind_at, event_id, is_recurring, recurrence_rule)
        VALUES (${input.message}, ${input.remind_at}, ${input.event_id || null},
                ${input.is_recurring || false}, ${input.recurrence_rule || null})
        RETURNING *
      `;
      return { success: true, reminder };
    }

    case "list_reminders": {
      const rows = await sql`
        SELECT r.*, e.title as event_title
        FROM reminders r
        LEFT JOIN events e ON r.event_id = e.id
        WHERE r.status = ${input.status || "pending"}
        ${input.from_date ? sql`AND r.remind_at >= ${input.from_date}` : sql``}
        ${input.to_date ? sql`AND r.remind_at <= ${input.to_date}` : sql``}
        ORDER BY r.remind_at ASC
      `;
      return { reminders: rows };
    }

    case "dismiss_reminder": {
      const [r] = await sql`
        UPDATE reminders SET status = 'dismissed'
        WHERE id = ${input.reminder_id} RETURNING id
      `;
      return r
        ? { success: true }
        : { success: false, error: "Reminder not found" };
    }

    // ── SHOPPING ──────────────────────────────────────────────────────

    case "add_shopping_items": {
      const listName = input.list_name || "default";
      const inserted = [];
      for (const item of input.items) {
        const [row] = await sql`
          INSERT INTO shopping_items (item_name, quantity, category, store, list_name)
          VALUES (${item.item_name}, ${item.quantity || null}, ${item.category || "grocery"},
                  ${item.store || null}, ${listName})
          RETURNING *
        `;
        inserted.push(row);
      }
      return { success: true, items: inserted };
    }

    case "get_shopping_list": {
      const rows = await sql`
        SELECT * FROM shopping_items
        WHERE list_name = ${input.list_name || "default"}
          ${!input.include_purchased ? sql`AND is_purchased = false` : sql``}
        ORDER BY category, created_at
      `;
      return { items: rows };
    }

    case "mark_purchased": {
      await sql`
        UPDATE shopping_items SET is_purchased = true
        WHERE id = ANY(${input.item_ids}::uuid[])
      `;
      return { success: true, count: input.item_ids.length };
    }

    case "clear_shopping_list": {
      await sql`
        DELETE FROM shopping_items
        WHERE list_name = ${input.list_name || "default"} AND is_purchased = true
      `;
      return { success: true };
    }

    // ── TASKS ─────────────────────────────────────────────────────────

    case "create_task": {
      let assignedId = null;
      if (input.assigned_to_name) {
        const [m] = await sql`
          SELECT id FROM family_members
          WHERE name = ${input.assigned_to_name} OR nickname = ${input.assigned_to_name}
          LIMIT 1
        `;
        assignedId = m?.id;
      }
      const [task] = await sql`
        INSERT INTO tasks (title, description, category, assigned_to, due_date, priority)
        VALUES (${input.title}, ${input.description || null}, ${input.category || "errand"},
                ${assignedId}, ${input.due_date || null}, ${input.priority || "medium"})
        RETURNING *
      `;
      return { success: true, task };
    }

    case "list_tasks": {
      let assigneeFilter = sql``;
      if (input.assigned_to_name) {
        const [m] = await sql`
          SELECT id FROM family_members
          WHERE name = ${input.assigned_to_name} OR nickname = ${input.assigned_to_name}
          LIMIT 1
        `;
        if (m) assigneeFilter = sql`AND t.assigned_to = ${m.id}`;
      }

      const rows = await sql`
        SELECT t.*, fm.name as assigned_name
        FROM tasks t
        LEFT JOIN family_members fm ON t.assigned_to = fm.id
        WHERE t.status = ${input.status || "pending"}
          ${input.category ? sql`AND t.category = ${input.category}` : sql``}
          ${input.priority ? sql`AND t.priority = ${input.priority}` : sql``}
          ${assigneeFilter}
        ORDER BY
          CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1
                          WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END,
          t.due_date ASC NULLS LAST
      `;
      return { tasks: rows };
    }

    case "update_task": {
      const { task_id, assigned_to_name, ...f } = input;
      let assignedId = undefined;
      if (assigned_to_name) {
        const [m] = await sql`
          SELECT id FROM family_members
          WHERE name = ${assigned_to_name} OR nickname = ${assigned_to_name}
          LIMIT 1
        `;
        assignedId = m?.id;
      }
      const [updated] = await sql`
        UPDATE tasks SET
          title = COALESCE(${f.title || null}, title),
          status = COALESCE(${f.status || null}, status),
          priority = COALESCE(${f.priority || null}, priority),
          due_date = COALESCE(${f.due_date || null}::timestamptz, due_date),
          assigned_to = COALESCE(${assignedId || null}, assigned_to)
        WHERE id = ${task_id}
        RETURNING *
      `;
      return updated
        ? { success: true, task: updated }
        : { success: false, error: "Task not found" };
    }

    // ── MEDICATIONS ───────────────────────────────────────────────────

    case "add_medication": {
      const [m] = await sql`
        SELECT id FROM family_members
        WHERE name = ${input.for_member_name} OR nickname = ${input.for_member_name}
        LIMIT 1
      `;
      const [med] = await sql`
        INSERT INTO medications (name, for_member_id, dosage, frequency, start_date, end_date, notes)
        VALUES (${input.name}, ${m?.id || null}, ${input.dosage || null}, ${input.frequency || null},
                ${input.start_date || null}, ${input.end_date || null}, ${input.notes || null})
        RETURNING *
      `;
      return { success: true, medication: med };
    }

    case "list_medications": {
      let memberFilter = sql``;
      if (input.member_name) {
        const [m] = await sql`
          SELECT id FROM family_members
          WHERE name = ${input.member_name} OR nickname = ${input.member_name}
          LIMIT 1
        `;
        if (m) memberFilter = sql`AND med.for_member_id = ${m.id}`;
      }

      const rows = await sql`
        SELECT med.*, fm.name as member_name
        FROM medications med
        LEFT JOIN family_members fm ON med.for_member_id = fm.id
        WHERE 1=1
          ${!input.include_expired ? sql`AND (med.end_date IS NULL OR med.end_date >= CURRENT_DATE)` : sql``}
          ${memberFilter}
        ORDER BY fm.name, med.name
      `;
      return { medications: rows };
    }

    // ── GENERAL QUERY ─────────────────────────────────────────────────

    case "general_query": {
      if (
        input.query_type === "weekly_summary" ||
        input.query_type === "daily_summary"
      ) {
        const days = input.query_type === "daily_summary" ? 1 : 7;
        const from = input.date || new Date().toISOString();
        const to = new Date(
          new Date(from).getTime() + days * 86400000
        ).toISOString();

        const [events, reminders, tasks, shopping] = await Promise.all([
          sql`SELECT e.*, fm.name as member_name FROM events e
              LEFT JOIN family_members fm ON e.related_member_id = fm.id
              WHERE e.event_date >= ${from} AND e.event_date <= ${to} AND e.status = 'scheduled'
              ORDER BY e.event_date`,
          sql`SELECT * FROM reminders
              WHERE remind_at >= ${from} AND remind_at <= ${to} AND status = 'pending'
              ORDER BY remind_at`,
          sql`SELECT t.*, fm.name as assigned_name FROM tasks t
              LEFT JOIN family_members fm ON t.assigned_to = fm.id
              WHERE t.status != 'done'
              ORDER BY
                CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1
                                WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END,
                t.due_date ASC NULLS LAST`,
          sql`SELECT * FROM shopping_items
              WHERE is_purchased = false ORDER BY category`,
        ]);
        return { events, reminders, pending_tasks: tasks, shopping_items: shopping };
      }

      if (input.query_type === "search" && input.search_term) {
        const term = `%${input.search_term}%`;
        const [events, tasks, shopping, contacts] = await Promise.all([
          sql`SELECT * FROM events WHERE title ILIKE ${term} OR description ILIKE ${term}`,
          sql`SELECT * FROM tasks WHERE title ILIKE ${term} OR description ILIKE ${term}`,
          sql`SELECT * FROM shopping_items WHERE item_name ILIKE ${term}`,
          sql`SELECT * FROM contacts WHERE name ILIKE ${term} OR specialty ILIKE ${term}`,
        ]);
        return { events, tasks, shopping, contacts };
      }

      return { error: "Unknown query type" };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}
