-- Home Manager DB Schema
-- Run this in Neon SQL Editor (dashboard.neon.tech)

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

-- Seed family members
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
