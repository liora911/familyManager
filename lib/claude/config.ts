const USER_CONTEXT: Record<string, string> = {
  yarin: `המשתמש הנוכחי: ירין (אבא).
- כשיוצרים אירוע/משימה בלי לציין למי, שייך אותם לירין
- כשמציגים סיכום, התמקד באירועים/משימות של ירין (אבל הצג גם משותפים)
- פנה בלשון זכר`,
  liora: `המשתמשת הנוכחית: ליאורה/תותי (אמא).
- כשיוצרים אירוע/משימה בלי לציין למי, שייכי אותם לתותי
- כשמציגים סיכום, התמקדי באירועים/משימות של תותי (אבל הציגי גם משותפים)
- פני בלשון נקבה`,
  shared: `מצב משותף - כל המשפחה.
- הצג הכל ללא סינון
- פנה בלשון רבים או נקבה`,
};

export const getSystemPrompt = (today: string, user: string = "shared") =>
  `אתה עוזר חכם לניהול בית משפחת מימון.
המשפחה: ירין (אבא), תותי/תות/ליאורה (אמא), איתן (בן 4), גפן (בת 1).

${USER_CONTEXT[user] || USER_CONTEXT.shared}

כללים:
- ענה תמיד בעברית
- בצע פעולות מיד עם הכלים הזמינים, בלי לבקש אישור
- אחרי כל פעולה אשר בקצרה מה עשית
- חשב תאריכים יחסיים נכון. היום: ${today}
- "יום שלישי הבא" = יום שלישי הקרוב שעדיין לא עבר
- "תנעץ רופא" / "קבע תור" = צור אירוע רפואי
- "תזכיר לי" / "אל תשכח" = צור תזכורת (תישלח במייל)
- "סופר" / "קניות" / "צריך לקנות" = רשימת קניות
- "מה יש לנו" / "מה קבענו" / "מה בתוכנית" = השתמש ב-general_query עם weekly_summary או list_events
- "סיכום" / "תסכם" = השתמש ב-general_query עם weekly_summary
- אם יש מספר פעולות בבקשה אחת, בצע את כולן
- כשהמשתמש/ת מבקש/ת לערוך או למחוק, חפש קודם את הפריט הרלוונטי ואז עדכן/מחק
- אם חסר תאריך או שעה לאירוע או משימה, שאל את המשתמש/ת. אל תנחש תאריכים
- אם חסר מידע קריטי אחר שאל, אבל נסה להסיק כמה שאפשר מהקונטקסט
- הצג תוצאות בצורה קריאה ונעימה
- כשאין אירועים/משימות, אמור בצורה ידידותית שאין כלום ולא צריך לדאוג
- השתמש באימוג'ים כדי להפוך את התשובות ליותר נעימות (📅 לאירועים, ✅ למשימות, 🛒 לקניות, 💊 לתרופות)
- תאריכים: תמיד העבר תאריכים בפורמט ISO 8601 עם אזור זמן ישראל (+02:00). לדוגמה: 2026-02-23T20:00:00+02:00. אל תשתמש ב-Z (UTC). חשב נכון "מחר", "השבוע", "שבוע הבא", "חודש הבא"`;

export const TOOLS = [
  // === EVENTS ===
  {
    name: "create_event",
    description:
      "Create a new event or appointment (doctor, school, social, etc.)",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Event title" },
        description: { type: "string", description: "Optional details" },
        category: {
          type: "string",
          enum: [
            "medical",
            "school",
            "personal",
            "household",
            "social",
            "work",
          ],
        },
        event_date: { type: "string", description: "ISO 8601 datetime" },
        end_date: { type: "string", description: "ISO 8601 datetime, optional" },
        location: { type: "string" },
        related_member_name: {
          type: "string",
          description: "Family member name: ירין, תותי, איתן, גפן",
        },
        contact_name: {
          type: "string",
          description: "Doctor/contact name if relevant",
        },
        contact_specialty: {
          type: "string",
          description: "e.g. orthopedist, dentist",
        },
        contact_phone: { type: "string" },
        contact_address: { type: "string" },
      },
      required: ["title", "category", "event_date"],
    },
  },
  {
    name: "list_events",
    description:
      "List upcoming events, optionally filtered by member, category, or date range",
    input_schema: {
      type: "object" as const,
      properties: {
        from_date: { type: "string", description: "ISO 8601, defaults to now" },
        to_date: {
          type: "string",
          description: "ISO 8601, defaults to +30 days",
        },
        category: { type: "string" },
        member_name: { type: "string" },
        status: {
          type: "string",
          enum: ["scheduled", "completed", "cancelled"],
        },
      },
    },
  },
  {
    name: "update_event",
    description: "Update an existing event by ID",
    input_schema: {
      type: "object" as const,
      properties: {
        event_id: { type: "string", description: "UUID of the event" },
        title: { type: "string" },
        description: { type: "string" },
        event_date: { type: "string" },
        end_date: { type: "string" },
        location: { type: "string" },
        status: {
          type: "string",
          enum: ["scheduled", "completed", "cancelled"],
        },
      },
      required: ["event_id"],
    },
  },
  {
    name: "delete_event",
    description: "Delete an event by ID",
    input_schema: {
      type: "object" as const,
      properties: {
        event_id: { type: "string" },
      },
      required: ["event_id"],
    },
  },

  // === REMINDERS ===
  {
    name: "create_reminder",
    description: "Create a reminder, optionally linked to an event",
    input_schema: {
      type: "object" as const,
      properties: {
        message: { type: "string" },
        remind_at: { type: "string", description: "ISO 8601 datetime" },
        event_id: {
          type: "string",
          description: "Link to event UUID if relevant",
        },
        is_recurring: { type: "boolean" },
        recurrence_rule: {
          type: "string",
          description: "daily, weekly, monthly",
        },
      },
      required: ["message", "remind_at"],
    },
  },
  {
    name: "list_reminders",
    description: "List pending reminders",
    input_schema: {
      type: "object" as const,
      properties: {
        status: { type: "string", enum: ["pending", "sent", "dismissed"] },
        from_date: { type: "string" },
        to_date: { type: "string" },
      },
    },
  },
  {
    name: "dismiss_reminder",
    description: "Mark a reminder as dismissed",
    input_schema: {
      type: "object" as const,
      properties: {
        reminder_id: { type: "string" },
      },
      required: ["reminder_id"],
    },
  },

  // === SHOPPING ===
  {
    name: "add_shopping_items",
    description: "Add one or more items to shopping list",
    input_schema: {
      type: "object" as const,
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              item_name: { type: "string" },
              quantity: { type: "string" },
              category: {
                type: "string",
                enum: ["grocery", "pharmacy", "household", "baby", "other"],
              },
              store: { type: "string" },
            },
            required: ["item_name"],
          },
        },
        list_name: { type: "string", description: "defaults to 'default'" },
      },
      required: ["items"],
    },
  },
  {
    name: "get_shopping_list",
    description: "Get current shopping list",
    input_schema: {
      type: "object" as const,
      properties: {
        list_name: { type: "string" },
        include_purchased: { type: "boolean" },
      },
    },
  },
  {
    name: "mark_purchased",
    description: "Mark shopping items as purchased",
    input_schema: {
      type: "object" as const,
      properties: {
        item_ids: {
          type: "array",
          items: { type: "string" },
          description: "UUIDs of items to mark purchased",
        },
      },
      required: ["item_ids"],
    },
  },
  {
    name: "clear_shopping_list",
    description: "Clear all purchased items from a list",
    input_schema: {
      type: "object" as const,
      properties: {
        list_name: { type: "string" },
      },
    },
  },

  // === TASKS ===
  {
    name: "create_task",
    description: "Create a household task or to-do",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        category: {
          type: "string",
          enum: ["chore", "errand", "finance", "repair", "admin"],
        },
        assigned_to_name: { type: "string" },
        due_date: { type: "string" },
        priority: {
          type: "string",
          enum: ["low", "medium", "high", "urgent"],
        },
      },
      required: ["title"],
    },
  },
  {
    name: "list_tasks",
    description: "List tasks filtered by status, assignee, or priority",
    input_schema: {
      type: "object" as const,
      properties: {
        status: { type: "string", enum: ["pending", "in_progress", "done"] },
        assigned_to_name: { type: "string" },
        priority: { type: "string" },
        category: { type: "string" },
      },
    },
  },
  {
    name: "update_task",
    description: "Update a task's status, priority, or details",
    input_schema: {
      type: "object" as const,
      properties: {
        task_id: { type: "string" },
        title: { type: "string" },
        status: { type: "string", enum: ["pending", "in_progress", "done"] },
        priority: {
          type: "string",
          enum: ["low", "medium", "high", "urgent"],
        },
        due_date: { type: "string" },
        assigned_to_name: { type: "string" },
      },
      required: ["task_id"],
    },
  },

  // === MEDICATIONS ===
  {
    name: "add_medication",
    description: "Track a medication for a family member",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string" },
        for_member_name: { type: "string" },
        dosage: { type: "string" },
        frequency: { type: "string" },
        start_date: { type: "string" },
        end_date: { type: "string" },
        notes: { type: "string" },
      },
      required: ["name", "for_member_name"],
    },
  },
  {
    name: "list_medications",
    description:
      "List active medications, optionally for a specific family member",
    input_schema: {
      type: "object" as const,
      properties: {
        member_name: { type: "string" },
        include_expired: { type: "boolean" },
      },
    },
  },

  // === GENERAL QUERY ===
  {
    name: "general_query",
    description:
      "Run a read-only query across all data - for questions like 'what do we have this week' or 'summary of everything'",
    input_schema: {
      type: "object" as const,
      properties: {
        query_type: {
          type: "string",
          enum: ["weekly_summary", "daily_summary", "search"],
          description: "Type of overview requested",
        },
        search_term: {
          type: "string",
          description: "For free-text search across all tables",
        },
        date: {
          type: "string",
          description: "Reference date, defaults to today",
        },
      },
      required: ["query_type"],
    },
  },
];
