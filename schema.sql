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

CREATE TABLE keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  value TEXT NOT NULL,
  category TEXT DEFAULT 'other',
  location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT DEFAULT 'appliance',
  sub_category TEXT,
  brand TEXT,
  model TEXT,
  serial_number TEXT,
  location TEXT,
  purchase_date DATE,
  warranty_expiry DATE,
  cost TEXT,
  notes TEXT,
  specs JSONB DEFAULT '{}',
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Insurance Policies ───────────────────────────────────────────────
CREATE TABLE insurance_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT DEFAULT 'general' CHECK (category IN ('health','car','home','life','travel','general')),
  provider TEXT,
  policy_number TEXT,
  insured_member_id UUID REFERENCES family_members(id),
  start_date DATE,
  end_date DATE,
  monthly_cost TEXT,
  contact_phone TEXT,
  contact_name TEXT,
  notes TEXT,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Finance Records ─────────────────────────────────────────────────
CREATE TABLE finance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT DEFAULT 'expense' CHECK (category IN ('income','expense','investment','savings','debt','other')),
  amount TEXT NOT NULL,
  currency TEXT DEFAULT 'ILS',
  record_date DATE DEFAULT CURRENT_DATE,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_rule TEXT,
  related_member_id UUID REFERENCES family_members(id),
  notes TEXT,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── CV Sections ─────────────────────────────────────────────────────
CREATE TABLE cv_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES family_members(id),
  section_type TEXT NOT NULL CHECK (section_type IN ('personal','education','experience','skill','language','certification','other')),
  title TEXT NOT NULL,
  organization TEXT,
  start_date DATE,
  end_date DATE,
  is_current BOOLEAN DEFAULT FALSE,
  description TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Notebook Entries ────────────────────────────────────────────────
CREATE TABLE notebook_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general' CHECK (category IN ('general','idea','dream','reflection','list','other')),
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
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
CREATE INDEX idx_insurance_end ON insurance_policies(end_date);
CREATE INDEX idx_finance_date ON finance_records(record_date);
CREATE INDEX idx_finance_category ON finance_records(category);
CREATE INDEX idx_cv_member ON cv_sections(member_id, section_type);
CREATE INDEX idx_notebook_pinned ON notebook_entries(is_pinned, created_at DESC);
