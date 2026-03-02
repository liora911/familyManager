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
      const to = input.to_date || new Date(Date.now() + 30 * 86400000).toISOString();
      const status = input.status || "scheduled";

      // Resolve member ID if filtering by member
      let memberId = null;
      if (input.member_name) {
        const [m] = await sql`
          SELECT id FROM family_members
          WHERE name = ${input.member_name} OR nickname = ${input.member_name}
          LIMIT 1
        `;
        memberId = m?.id || null;
      }

      // Build dynamic query with positional params (neon HTTP driver doesn't support fragment composition)
      let query = `
        SELECT e.*, fm.name as member_name, c.name as contact_name, c.specialty
        FROM events e
        LEFT JOIN family_members fm ON e.related_member_id = fm.id
        LEFT JOIN contacts c ON e.contact_id = c.id
        WHERE e.event_date >= $1 AND e.event_date <= $2
          AND e.status = $3
      `;
      const params: unknown[] = [from, to, status];

      if (input.category) {
        params.push(input.category);
        query += ` AND e.category = $${params.length}`;
      }

      if (memberId) {
        params.push(memberId);
        query += ` AND e.related_member_id = $${params.length}`;
      }

      query += ` ORDER BY e.event_date ASC`;

      const rows = await sql(query, params);
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
      const status = input.status || "pending";

      let query = `
        SELECT r.*, e.title as event_title
        FROM reminders r
        LEFT JOIN events e ON r.event_id = e.id
        WHERE r.status = $1
      `;
      const params: unknown[] = [status];

      if (input.from_date) {
        params.push(input.from_date);
        query += ` AND r.remind_at >= $${params.length}`;
      }
      if (input.to_date) {
        params.push(input.to_date);
        query += ` AND r.remind_at <= $${params.length}`;
      }

      query += ` ORDER BY r.remind_at ASC`;

      const rows = await sql(query, params);
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
      const listName = input.list_name || "default";

      if (input.include_purchased) {
        const rows = await sql`
          SELECT * FROM shopping_items
          WHERE list_name = ${listName}
          ORDER BY category, created_at
        `;
        return { items: rows };
      } else {
        const rows = await sql`
          SELECT * FROM shopping_items
          WHERE list_name = ${listName} AND is_purchased = false
          ORDER BY category, created_at
        `;
        return { items: rows };
      }
    }

    case "mark_purchased": {
      const ids = input.item_ids as string[];
      // Mark each item individually since neon HTTP driver doesn't support array casting well
      for (const id of ids) {
        await sql`UPDATE shopping_items SET is_purchased = true WHERE id = ${id}`;
      }
      return { success: true, count: ids.length };
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
      const status = input.status || "pending";

      // Resolve assignee
      let assignedId = null;
      if (input.assigned_to_name) {
        const [m] = await sql`
          SELECT id FROM family_members
          WHERE name = ${input.assigned_to_name} OR nickname = ${input.assigned_to_name}
          LIMIT 1
        `;
        assignedId = m?.id || null;
      }

      let query = `
        SELECT t.*, fm.name as assigned_name
        FROM tasks t
        LEFT JOIN family_members fm ON t.assigned_to = fm.id
        WHERE t.status = $1
      `;
      const params: unknown[] = [status];

      if (input.category) {
        params.push(input.category);
        query += ` AND t.category = $${params.length}`;
      }
      if (input.priority) {
        params.push(input.priority);
        query += ` AND t.priority = $${params.length}`;
      }
      if (assignedId) {
        params.push(assignedId);
        query += ` AND t.assigned_to = $${params.length}`;
      }

      query += `
        ORDER BY
          CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1
                          WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END,
          t.due_date ASC NULLS LAST
      `;

      const rows = await sql(query, params);
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
      let memberId = null;
      if (input.member_name) {
        const [m] = await sql`
          SELECT id FROM family_members
          WHERE name = ${input.member_name} OR nickname = ${input.member_name}
          LIMIT 1
        `;
        memberId = m?.id || null;
      }

      if (memberId && !input.include_expired) {
        const rows = await sql`
          SELECT med.*, fm.name as member_name
          FROM medications med
          LEFT JOIN family_members fm ON med.for_member_id = fm.id
          WHERE med.for_member_id = ${memberId}
            AND (med.end_date IS NULL OR med.end_date >= CURRENT_DATE)
          ORDER BY fm.name, med.name
        `;
        return { medications: rows };
      } else if (memberId && input.include_expired) {
        const rows = await sql`
          SELECT med.*, fm.name as member_name
          FROM medications med
          LEFT JOIN family_members fm ON med.for_member_id = fm.id
          WHERE med.for_member_id = ${memberId}
          ORDER BY fm.name, med.name
        `;
        return { medications: rows };
      } else if (!memberId && !input.include_expired) {
        const rows = await sql`
          SELECT med.*, fm.name as member_name
          FROM medications med
          LEFT JOIN family_members fm ON med.for_member_id = fm.id
          WHERE (med.end_date IS NULL OR med.end_date >= CURRENT_DATE)
          ORDER BY fm.name, med.name
        `;
        return { medications: rows };
      } else {
        const rows = await sql`
          SELECT med.*, fm.name as member_name
          FROM medications med
          LEFT JOIN family_members fm ON med.for_member_id = fm.id
          ORDER BY fm.name, med.name
        `;
        return { medications: rows };
      }
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

    // ── KEYS ────────────────────────────────────────────────────────────

    case "save_key": {
      // Check if key with same name exists, update if so
      const [existing] = await sql`
        SELECT id FROM keys WHERE name = ${input.name} LIMIT 1
      `;
      if (existing) {
        const [updated] = await sql`
          UPDATE keys SET
            value = ${input.value},
            category = COALESCE(${input.category || null}, category),
            location = COALESCE(${input.location || null}, location),
            notes = COALESCE(${input.notes || null}, notes)
          WHERE id = ${existing.id}
          RETURNING *
        `;
        return { success: true, key: updated, action: "updated" };
      }
      const [key] = await sql`
        INSERT INTO keys (name, value, category, location, notes)
        VALUES (${input.name}, ${input.value}, ${input.category || "other"},
                ${input.location || null}, ${input.notes || null})
        RETURNING *
      `;
      return { success: true, key, action: "created" };
    }

    case "list_keys": {
      let query = `SELECT * FROM keys WHERE 1=1`;
      const params: unknown[] = [];
      if (input.category) {
        params.push(input.category);
        query += ` AND category = $${params.length}`;
      }
      if (input.search_term) {
        params.push(`%${input.search_term}%`);
        query += ` AND name ILIKE $${params.length}`;
      }
      query += ` ORDER BY category, name`;
      const rows = await sql(query, params);
      return { keys: rows };
    }

    case "delete_key": {
      const [deleted] = await sql`
        DELETE FROM keys WHERE id = ${input.key_id} RETURNING id
      `;
      return deleted
        ? { success: true }
        : { success: false, error: "Key not found" };
    }

    // ── INVENTORY ───────────────────────────────────────────────────────

    case "add_inventory_item": {
      const [item] = await sql`
        INSERT INTO inventory (name, category, sub_category, brand, model, serial_number,
                              location, purchase_date, warranty_expiry, cost, notes)
        VALUES (${input.name}, ${input.category || "other"}, ${input.sub_category || null},
                ${input.brand || null}, ${input.model || null}, ${input.serial_number || null},
                ${input.location || null}, ${input.purchase_date || null},
                ${input.warranty_expiry || null}, ${input.cost || null}, ${input.notes || null})
        RETURNING *
      `;
      return { success: true, item };
    }

    case "list_inventory": {
      let query = `SELECT * FROM inventory WHERE 1=1`;
      const params: unknown[] = [];
      if (input.category) {
        params.push(input.category);
        query += ` AND category = $${params.length}`;
      }
      if (input.search_term) {
        params.push(`%${input.search_term}%`);
        query += ` AND (name ILIKE $${params.length} OR brand ILIKE $${params.length} OR model ILIKE $${params.length})`;
      }
      query += ` ORDER BY category, name`;
      const rows = await sql(query, params);
      return { items: rows };
    }

    // ── INSURANCE ───────────────────────────────────────────────────────

    case "add_insurance": {
      let memberId = null;
      if (input.insured_member_name) {
        const [m] = await sql`
          SELECT id FROM family_members
          WHERE name = ${input.insured_member_name} OR nickname = ${input.insured_member_name}
          LIMIT 1
        `;
        memberId = m?.id || null;
      }
      const [policy] = await sql`
        INSERT INTO insurance_policies (title, category, provider, policy_number, insured_member_id,
                                       start_date, end_date, monthly_cost, contact_phone, contact_name, notes)
        VALUES (${input.title}, ${input.category || "general"}, ${input.provider || null},
                ${input.policy_number || null}, ${memberId}, ${input.start_date || null},
                ${input.end_date || null}, ${input.monthly_cost || null},
                ${input.contact_phone || null}, ${input.contact_name || null}, ${input.notes || null})
        RETURNING *
      `;
      return { success: true, policy };
    }

    case "list_insurance": {
      let memberId = null;
      if (input.member_name) {
        const [m] = await sql`
          SELECT id FROM family_members
          WHERE name = ${input.member_name} OR nickname = ${input.member_name}
          LIMIT 1
        `;
        memberId = m?.id || null;
      }
      let query = `
        SELECT ip.*, fm.name as member_name
        FROM insurance_policies ip
        LEFT JOIN family_members fm ON ip.insured_member_id = fm.id
        WHERE 1=1
      `;
      const params: unknown[] = [];
      if (input.category) {
        params.push(input.category);
        query += ` AND ip.category = $${params.length}`;
      }
      if (memberId) {
        params.push(memberId);
        query += ` AND ip.insured_member_id = $${params.length}`;
      }
      query += ` ORDER BY ip.end_date ASC NULLS LAST`;
      const rows = await sql(query, params);
      return { policies: rows };
    }

    // ── FINANCE ─────────────────────────────────────────────────────────

    case "add_finance_record": {
      let memberId = null;
      if (input.related_member_name) {
        const [m] = await sql`
          SELECT id FROM family_members
          WHERE name = ${input.related_member_name} OR nickname = ${input.related_member_name}
          LIMIT 1
        `;
        memberId = m?.id || null;
      }
      const [record] = await sql`
        INSERT INTO finance_records (title, category, amount, currency, record_date,
                                    is_recurring, recurrence_rule, related_member_id, notes)
        VALUES (${input.title}, ${input.category || "expense"}, ${input.amount},
                ${input.currency || "ILS"}, ${input.record_date || null},
                ${input.is_recurring || false}, ${input.recurrence_rule || null},
                ${memberId}, ${input.notes || null})
        RETURNING *
      `;
      return { success: true, record };
    }

    case "list_finance": {
      let memberId = null;
      if (input.member_name) {
        const [m] = await sql`
          SELECT id FROM family_members
          WHERE name = ${input.member_name} OR nickname = ${input.member_name}
          LIMIT 1
        `;
        memberId = m?.id || null;
      }
      let query = `
        SELECT fr.*, fm.name as member_name
        FROM finance_records fr
        LEFT JOIN family_members fm ON fr.related_member_id = fm.id
        WHERE 1=1
      `;
      const params: unknown[] = [];
      if (input.category) {
        params.push(input.category);
        query += ` AND fr.category = $${params.length}`;
      }
      if (input.from_date) {
        params.push(input.from_date);
        query += ` AND fr.record_date >= $${params.length}`;
      }
      if (input.to_date) {
        params.push(input.to_date);
        query += ` AND fr.record_date <= $${params.length}`;
      }
      if (memberId) {
        params.push(memberId);
        query += ` AND fr.related_member_id = $${params.length}`;
      }
      query += ` ORDER BY fr.record_date DESC LIMIT 100`;
      const rows = await sql(query, params);
      return { records: rows };
    }

    // ── CV ───────────────────────────────────────────────────────────────

    case "add_cv_section": {
      let memberId = null;
      if (input.member_name) {
        const [m] = await sql`
          SELECT id FROM family_members
          WHERE name = ${input.member_name} OR nickname = ${input.member_name}
          LIMIT 1
        `;
        memberId = m?.id || null;
      }
      const [section] = await sql`
        INSERT INTO cv_sections (member_id, section_type, title, organization,
                                start_date, end_date, is_current, description)
        VALUES (${memberId}, ${input.section_type}, ${input.title},
                ${input.organization || null}, ${input.start_date || null},
                ${input.end_date || null}, ${input.is_current || false},
                ${input.description || null})
        RETURNING *
      `;
      return { success: true, section };
    }

    case "list_cv": {
      let memberId = null;
      if (input.member_name) {
        const [m] = await sql`
          SELECT id FROM family_members
          WHERE name = ${input.member_name} OR nickname = ${input.member_name}
          LIMIT 1
        `;
        memberId = m?.id || null;
      }
      let query = `
        SELECT cs.*, fm.name as member_name
        FROM cv_sections cs
        LEFT JOIN family_members fm ON cs.member_id = fm.id
        WHERE 1=1
      `;
      const params: unknown[] = [];
      if (memberId) {
        params.push(memberId);
        query += ` AND cs.member_id = $${params.length}`;
      }
      if (input.section_type) {
        params.push(input.section_type);
        query += ` AND cs.section_type = $${params.length}`;
      }
      query += ` ORDER BY cs.member_id, cs.section_type, cs.sort_order`;
      const rows = await sql(query, params);
      return { sections: rows };
    }

    // ── NOTEBOOK ────────────────────────────────────────────────────────

    case "add_notebook_entry": {
      const [entry] = await sql`
        INSERT INTO notebook_entries (title, content, category, is_pinned)
        VALUES (${input.title || null}, ${input.content}, ${input.category || "general"},
                ${input.is_pinned || false})
        RETURNING *
      `;
      return { success: true, entry };
    }

    case "list_notebook": {
      let query = `SELECT * FROM notebook_entries WHERE 1=1`;
      const params: unknown[] = [];
      if (input.category) {
        params.push(input.category);
        query += ` AND category = $${params.length}`;
      }
      if (input.search_term) {
        params.push(`%${input.search_term}%`);
        query += ` AND (title ILIKE $${params.length} OR content ILIKE $${params.length})`;
      }
      if (input.pinned_only) {
        query += ` AND is_pinned = true`;
      }
      query += ` ORDER BY is_pinned DESC, created_at DESC`;
      const rows = await sql(query, params);
      return { entries: rows };
    }

    case "update_notebook_entry": {
      const { entry_id, ...fields } = input;
      const [updated] = await sql`
        UPDATE notebook_entries SET
          title = COALESCE(${fields.title ?? null}, title),
          content = COALESCE(${fields.content || null}, content),
          category = COALESCE(${fields.category || null}, category),
          is_pinned = COALESCE(${fields.is_pinned ?? null}, is_pinned),
          updated_at = NOW()
        WHERE id = ${entry_id}
        RETURNING *
      `;
      return updated
        ? { success: true, entry: updated }
        : { success: false, error: "Entry not found" };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}
