# Home Manager - Build Spec

## Overview
A Hebrew RTL Next.js 15 App Router app. Single giant text input + "שגר" button. User types natural language in Hebrew, Claude parses it into structured DB operations via tool use. One user (wife/Tuti). MVP/POC level.

## Stack
- Next.js 15 App Router (TypeScript)
- Tailwind CSS
- Neon Postgres (serverless driver `@neondatabase/serverless`)
- Anthropic SDK (`@anthropic-ai/sdk`) — model: `claude-sonnet-4-5-20250514`
- Resend (`resend`) for reminder emails
- Deploy to Vercel

## Auth
Simple PIN gate. No NextAuth, no sessions, no OAuth.
- Single env var: `APP_PIN=XXXX`
- On first visit, show a PIN input screen (dark theme, centered, Hebrew)
- Store PIN in a cookie (`home-manager-auth`) with `httpOnly: false`, `maxAge: 30 days`
- Middleware checks cookie on all routes except `/api/cron`
- No user management, no registration, no logout needed (but nice to have a small logout button)

## Architecture

### Flow
```
User input → POST /api/chat → Claude API (with tools) → agentic tool loop → DB mutations → Hebrew confirmation text → UI
```

### Stateless
Each message is independent. No conversation history. No message_log table. No history UI.
The API receives a single message string, sends it to Claude with system prompt + tools, executes tool calls in a loop until Claude returns final text, returns the text to the frontend.

## Database Schema (Neon Postgres)

```sql
CREATE TABLE family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  nickname TEXT,
  role TEXT NOT NULL CHECK (role IN ('parent', 'child')),
  birth_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  specialty TEXT,
  phone TEXT,
  address TEXT,
  related_member_id UUID REFERENCES family_members(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  location TEXT,
  related_member_id UUID REFERENCES family_members(id),
  contact_id UUID REFERENCES contacts(id),
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  remind_at TIMESTAMPTZ NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_rule TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE shopping_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name TEXT NOT NULL,
  quantity TEXT,
  category TEXT DEFAULT 'grocery',
  store TEXT,
  is_purchased BOOLEAN DEFAULT FALSE,
  list_name TEXT DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'errand',
  assigned_to UUID REFERENCES family_members(id),
  due_date TIMESTAMPTZ,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  for_member_id UUID REFERENCES family_members(id),
  dosage TEXT,
  frequency TEXT,
  start_date DATE,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed family
INSERT INTO family_members (name, nickname, role, birth_date) VALUES
  ('ירין', 'ירין', 'parent', '1994-01-01'),
  ('תותי', 'תות', 'parent', NULL),
  ('איתן', 'איתן', 'child', '2021-01-01'),
  ('גפן', 'גפן', 'child', '2024-01-01');

-- Indexes
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_reminders_status_remind ON reminders(status, remind_at);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_shopping_purchased ON shopping_items(is_purchased);
```

## Claude System Prompt

```
אתה עוזר חכם לניהול בית משפחת מימון.
המשפחה: ירין (אבא), תותי/תות (אמא), איתן (בן 4), גפן (בת 1).

כללים:
- ענה תמיד בעברית
- בצע פעולות מיד עם הכלים הזמינים, בלי לבקש אישור
- אחרי כל פעולה אשר בקצרה מה עשית
- חשב תאריכים יחסיים נכון. היום: {TODAY}
- "יום שלישי הבא" = יום שלישי הקרוב שעדיין לא עבר
- "תנעץ רופא" = צור אירוע רפואי
- "תזכיר לי" = צור תזכורת (תישלח במייל)
- "סופר" / "קניות" = רשימת קניות
- אם יש מספר פעולות בבקשה אחת, בצע את כולן
- כשהמשתמשת מבקשת לערוך או למחוק, חפש קודם את הפריט הרלוונטי ואז עדכן/מחק
- אם חסר מידע קריטי שאל, אבל נסה להסיק כמה שאפשר מהקונטקסט
- הצג תוצאות בצורה קריאה ונעימה
```

## Claude Tools
Define these as Anthropic tool_use tools on every request:

1. **create_event** — title, description?, category (medical|school|personal|household|social|work), event_date, end_date?, location?, related_member_name?, contact_name?, contact_specialty?, contact_phone?, contact_address?
2. **list_events** — from_date?, to_date?, category?, member_name?, status?
3. **update_event** — event_id, title?, description?, event_date?, end_date?, location?, status?
4. **delete_event** — event_id
5. **create_reminder** — message, remind_at, event_id?, is_recurring?, recurrence_rule?
6. **list_reminders** — status?, from_date?, to_date?
7. **dismiss_reminder** — reminder_id
8. **add_shopping_items** — items[]{item_name, quantity?, category?, store?}, list_name?
9. **get_shopping_list** — list_name?, include_purchased?
10. **mark_purchased** — item_ids[]
11. **clear_shopping_list** — list_name?
12. **create_task** — title, description?, category?, assigned_to_name?, due_date?, priority?
13. **list_tasks** — status?, assigned_to_name?, priority?, category?
14. **update_task** — task_id, title?, status?, priority?, due_date?, assigned_to_name?
15. **add_medication** — name, for_member_name, dosage?, frequency?, start_date?, end_date?, notes?
16. **list_medications** — member_name?, include_expired?
17. **general_query** — query_type (weekly_summary|daily_summary|search), search_term?, date?

## Tool Executor
Each tool maps to a server-side function that runs SQL against Neon. Key patterns:
- Resolve `member_name` → UUID via family_members lookup (match on name OR nickname)
- `create_event` with contact info: upsert into contacts table, link to event
- `list_events`: default from=now, to=+30 days, status=scheduled
- `general_query` weekly_summary: parallel query events + reminders + tasks + shopping for the period
- `general_query` search: ILIKE search across events, tasks, shopping, contacts

## Reminder Delivery (Resend)

### Cron endpoint: `GET /api/cron`
- Vercel Cron runs every 5 minutes
- Query: `SELECT * FROM reminders WHERE status = 'pending' AND remind_at <= NOW()`
- For each: send email via Resend to `liora532@gmail.com`
- Update reminder status to 'sent'
- For recurring reminders: calculate next remind_at based on recurrence_rule, insert new reminder

### vercel.json
```json
{
  "crons": [{
    "path": "/api/cron",
    "schedule": "*/5 * * * *"
  }]
}
```

### Resend setup
```typescript
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);
// Send from: onboarding@resend.dev (default) or custom domain
// Send to: liora532@gmail.com
```

## Frontend

### Single page (`app/page.tsx`)
- Dark theme (zinc-950 bg)
- Full RTL (`dir="rtl"`)
- Header: "🏠 מנהל הבית" + subtitle
- Empty state: rocket emoji + example prompts in muted text
- Chat-style message bubbles: user (blue, right-aligned in RTL) / assistant (zinc-800)
- Bottom: auto-resizing textarea + "שגר 🚀" button
- Enter to send, Shift+Enter for newline
- Loading: bouncing dots animation
- Show "X פעולות בוצעו ✓" badge on assistant messages that triggered tools
- Mobile responsive (full height, no scroll issues)

### PIN screen
- When no auth cookie: show centered PIN input (4-6 digits or short password)
- Dark theme matching main app
- On correct PIN, set cookie and redirect to main page
- Hebrew: "הזן קוד גישה"

## Environment Variables
```
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require
APP_PIN=...
RESEND_API_KEY=re_...
REMINDER_EMAIL=liora532@gmail.com
CRON_SECRET=... (to secure the cron endpoint)
```

## File Structure
```
app/
  page.tsx              # Main chat UI (client component)
  layout.tsx            # RootLayout with RTL, Hebrew, meta
  globals.css           # Tailwind imports
  api/
    chat/route.ts       # POST - Claude chat endpoint
    cron/route.ts       # GET - Reminder delivery cron
    auth/route.ts       # POST - PIN verification
  login/
    page.tsx            # PIN entry screen
lib/
  claude/
    config.ts           # System prompt + tool definitions
    tools.ts            # Tool executor functions
  db.ts                 # Neon client export
middleware.ts           # Auth cookie check
vercel.json             # Cron config
```

## Important Notes
- No ORMs. Raw SQL via Neon serverless driver tagged templates.
- No message history / conversation persistence. Each request is stateless.
- No message_log table. Keep it lean.
- Hebrew everywhere in UI and Claude responses.
- Mobile-first — Tuti will likely use this from her phone browser too.
