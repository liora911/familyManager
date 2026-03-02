"use client";

import { useState } from "react";

// ── Shared constants ────────────────────────────────────────────────

export const tabs = [
  { key: "events", label: "אירועים", icon: "📅" },
  { key: "shopping", label: "קניות", icon: "🛒" },
  { key: "tasks", label: "משימות", icon: "✅" },
  { key: "reminders", label: "תזכורות", icon: "🔔" },
  { key: "medications", label: "תרופות", icon: "💊" },
  { key: "keys", label: "מפתחות", icon: "🔑" },
] as const;

export type TabKey = (typeof tabs)[number]["key"];

export const FAMILY_MEMBERS = ["ירין", "תותי", "איתן", "גפן"];

// ── Helpers ──────────────────────────────────────────────────────────

function toLocalDatetime(dateStr: string) {
  const d = new Date(dateStr);
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
}

function toLocalDate(dateStr: string) {
  return new Date(dateStr).toISOString().slice(0, 10);
}

export async function crudRequest(entity: string, method: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/crud/${entity}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "שגיאה");
  return data;
}

// ── Form field definitions ──────────────────────────────────────────

interface FormField {
  key: string;
  label: string;
  type: "text" | "select" | "datetime" | "date" | "checkbox";
  required?: boolean;
  options?: { value: string; label: string }[];
}

export const FORM_FIELDS: Record<string, FormField[]> = {
  events: [
    { key: "title", label: "כותרת", type: "text", required: true },
    { key: "description", label: "תיאור", type: "text" },
    {
      key: "category",
      label: "קטגוריה",
      type: "select",
      required: true,
      options: [
        { value: "medical", label: "רפואי" },
        { value: "school", label: "בית ספר" },
        { value: "personal", label: "אישי" },
        { value: "household", label: "בית" },
        { value: "social", label: "חברתי" },
        { value: "work", label: "עבודה" },
      ],
    },
    { key: "event_date", label: "תאריך ושעה", type: "datetime", required: true },
    { key: "end_date", label: "תאריך סיום", type: "datetime" },
    { key: "location", label: "מיקום", type: "text" },
    {
      key: "member_name",
      label: "בן משפחה",
      type: "select",
      options: FAMILY_MEMBERS.map((n) => ({ value: n, label: n })),
    },
    {
      key: "status",
      label: "סטטוס",
      type: "select",
      options: [
        { value: "scheduled", label: "מתוכנן" },
        { value: "completed", label: "הושלם" },
        { value: "cancelled", label: "בוטל" },
      ],
    },
  ],
  tasks: [
    { key: "title", label: "כותרת", type: "text", required: true },
    { key: "description", label: "תיאור", type: "text" },
    {
      key: "category",
      label: "קטגוריה",
      type: "select",
      options: [
        { value: "chore", label: "מטלה" },
        { value: "errand", label: "סידור" },
        { value: "finance", label: "כספים" },
        { value: "repair", label: "תיקון" },
        { value: "admin", label: "ניהול" },
      ],
    },
    {
      key: "priority",
      label: "עדיפות",
      type: "select",
      options: [
        { value: "low", label: "נמוך" },
        { value: "medium", label: "בינוני" },
        { value: "high", label: "גבוה" },
        { value: "urgent", label: "דחוף" },
      ],
    },
    { key: "due_date", label: "תאריך יעד", type: "datetime" },
    {
      key: "assigned_to_name",
      label: "אחראי",
      type: "select",
      options: FAMILY_MEMBERS.map((n) => ({ value: n, label: n })),
    },
    {
      key: "status",
      label: "סטטוס",
      type: "select",
      options: [
        { value: "pending", label: "ממתין" },
        { value: "in_progress", label: "בתהליך" },
        { value: "done", label: "בוצע" },
      ],
    },
  ],
  shopping: [
    { key: "item_name", label: "פריט", type: "text", required: true },
    { key: "quantity", label: "כמות", type: "text" },
    {
      key: "category",
      label: "קטגוריה",
      type: "select",
      options: [
        { value: "grocery", label: "מכולת" },
        { value: "pharmacy", label: "בית מרקחת" },
        { value: "household", label: "בית" },
        { value: "baby", label: "תינוק" },
        { value: "other", label: "אחר" },
      ],
    },
    { key: "store", label: "חנות", type: "text" },
  ],
  reminders: [
    { key: "message", label: "הודעה", type: "text", required: true },
    { key: "remind_at", label: "תאריך תזכורת", type: "datetime", required: true },
    { key: "is_recurring", label: "חוזר", type: "checkbox" },
    {
      key: "recurrence_rule",
      label: "תדירות",
      type: "select",
      options: [
        { value: "daily", label: "יומי" },
        { value: "weekly", label: "שבועי" },
        { value: "monthly", label: "חודשי" },
      ],
    },
  ],
  medications: [
    { key: "name", label: "שם תרופה", type: "text", required: true },
    {
      key: "for_member_name",
      label: "עבור",
      type: "select",
      required: true,
      options: FAMILY_MEMBERS.map((n) => ({ value: n, label: n })),
    },
    { key: "dosage", label: "מינון", type: "text" },
    { key: "frequency", label: "תדירות", type: "text" },
    { key: "start_date", label: "תאריך התחלה", type: "date" },
    { key: "end_date", label: "תאריך סיום", type: "date" },
    { key: "notes", label: "הערות", type: "text" },
  ],
  keys: [
    { key: "name", label: "שם", type: "text", required: true },
    { key: "value", label: "ערך / קוד", type: "text", required: true },
    {
      key: "category",
      label: "קטגוריה",
      type: "select",
      options: [
        { value: "wifi", label: "WiFi" },
        { value: "door_code", label: "קוד דלת" },
        { value: "safe", label: "כספת" },
        { value: "password", label: "סיסמה" },
        { value: "physical_key", label: "מפתח פיזי" },
        { value: "other", label: "אחר" },
      ],
    },
    { key: "location", label: "מיקום", type: "text" },
    { key: "notes", label: "הערות", type: "text" },
  ],
};

// ── FormModal Component ─────────────────────────────────────────────

export default function FormModal({
  entity,
  mode,
  initial,
  onClose,
  onSaved,
}: {
  entity: string;
  mode: "create" | "edit";
  initial?: Record<string, unknown>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const fields = FORM_FIELDS[entity] || [];
  const [form, setForm] = useState<Record<string, unknown>>(() => {
    if (!initial) return {};
    const v: Record<string, unknown> = { ...initial };
    for (const f of fields) {
      if (f.type === "datetime" && v[f.key] && typeof v[f.key] === "string") {
        v[f.key] = toLocalDatetime(v[f.key] as string);
      }
      if (f.type === "date" && v[f.key] && typeof v[f.key] === "string") {
        v[f.key] = toLocalDate(v[f.key] as string);
      }
    }
    return v;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const tabLabel = tabs.find((t) => t.key === entity)?.label || entity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload = { ...form };
      for (const f of fields) {
        if (f.type === "datetime" && payload[f.key]) {
          payload[f.key] = new Date(payload[f.key] as string).toISOString();
        }
      }

      if (mode === "create") {
        await crudRequest(entity, "POST", payload);
      } else {
        await crudRequest(entity, "PUT", payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-overlay flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-medium">
            {mode === "create" ? `הוספת ${tabLabel}` : `עריכת ${tabLabel}`}
          </h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-primary text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {fields.map((field) => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-secondary mb-1">
                {field.label}
                {field.required && <span className="text-red-500 mr-1">*</span>}
              </label>

              {field.type === "select" ? (
                <select
                  value={(form[field.key] as string) || ""}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, [field.key]: e.target.value }))
                  }
                  required={field.required}
                  className="w-full border border-divider rounded-xl px-3 py-2.5 text-sm bg-input text-primary
                             focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">בחר...</option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : field.type === "checkbox" ? (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!form[field.key]}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, [field.key]: e.target.checked }))
                    }
                    className="w-4 h-4 rounded border-border text-blue-600"
                  />
                  <span className="text-sm text-secondary">כן</span>
                </label>
              ) : (
                <input
                  type={
                    field.type === "datetime"
                      ? "datetime-local"
                      : field.type === "date"
                        ? "date"
                        : "text"
                  }
                  value={(form[field.key] as string) || ""}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, [field.key]: e.target.value }))
                  }
                  required={field.required}
                  className="w-full border border-divider rounded-xl px-3 py-2.5 text-sm bg-input text-primary
                             focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              )}
            </div>
          ))}

          {error && (
            <p className="text-sm text-red-500 bg-badge-red-bg rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-disabled
                         text-white font-medium py-2.5 rounded-xl transition-colors text-sm"
            >
              {saving ? "שומר..." : mode === "create" ? "הוסף" : "שמור"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 border border-divider rounded-xl text-sm text-secondary
                         hover:bg-hover transition-colors"
            >
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
