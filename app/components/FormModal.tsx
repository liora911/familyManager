"use client";

import { useState, useRef } from "react";
import {
  INVENTORY_CATEGORIES,
  findCategoryBySubKey,
  type InventoryCategory,
} from "@/app/components/InventoryCategories";
import FileUpload, { type Attachment } from "@/app/components/FileUpload";
import { clientUpload, isAllowedFile } from "@/lib/upload";

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
  type: "text" | "select" | "datetime" | "date" | "checkbox" | "textarea";
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
  inventory: [
    // category + sub_category are handled by the tree picker, not regular fields
    { key: "name", label: "שם הפריט", type: "text", required: true },
    { key: "brand", label: "מותג", type: "text" },
    { key: "model", label: "דגם", type: "text" },
    { key: "serial_number", label: "מספר סריאלי", type: "text" },
    { key: "location", label: "מיקום בבית", type: "text" },
    { key: "purchase_date", label: "תאריך רכישה", type: "date" },
    { key: "warranty_expiry", label: "תוקף אחריות", type: "date" },
    { key: "cost", label: "עלות", type: "text" },
    { key: "notes", label: "הערות", type: "text" },
  ],
  insurance: [
    { key: "title", label: "שם הפוליסה", type: "text", required: true },
    {
      key: "category",
      label: "קטגוריה",
      type: "select",
      required: true,
      options: [
        { value: "health", label: "בריאות" },
        { value: "car", label: "רכב" },
        { value: "home", label: "דירה" },
        { value: "life", label: "חיים" },
        { value: "travel", label: "נסיעות" },
        { value: "general", label: "כללי" },
      ],
    },
    { key: "provider", label: "חברת ביטוח", type: "text" },
    { key: "policy_number", label: "מספר פוליסה", type: "text" },
    {
      key: "insured_member_name",
      label: "מבוטח",
      type: "select",
      options: FAMILY_MEMBERS.map((n) => ({ value: n, label: n })),
    },
    { key: "start_date", label: "תאריך התחלה", type: "date" },
    { key: "end_date", label: "תאריך סיום", type: "date" },
    { key: "monthly_cost", label: "עלות חודשית", type: "text" },
    { key: "contact_name", label: "איש קשר", type: "text" },
    { key: "contact_phone", label: "טלפון", type: "text" },
    { key: "notes", label: "הערות", type: "textarea" },
  ],
  finance: [
    { key: "title", label: "כותרת", type: "text", required: true },
    {
      key: "category",
      label: "קטגוריה",
      type: "select",
      required: true,
      options: [
        { value: "income", label: "הכנסה" },
        { value: "expense", label: "הוצאה" },
        { value: "investment", label: "השקעה" },
        { value: "savings", label: "חיסכון" },
        { value: "debt", label: "חוב" },
        { value: "other", label: "אחר" },
      ],
    },
    { key: "amount", label: "סכום", type: "text", required: true },
    {
      key: "currency",
      label: "מטבע",
      type: "select",
      options: [
        { value: "ILS", label: "₪ שקל" },
        { value: "USD", label: "$ דולר" },
        { value: "EUR", label: "€ אירו" },
      ],
    },
    { key: "record_date", label: "תאריך", type: "date" },
    { key: "is_recurring", label: "חוזר", type: "checkbox" },
    {
      key: "recurrence_rule",
      label: "תדירות",
      type: "select",
      options: [
        { value: "monthly", label: "חודשי" },
        { value: "quarterly", label: "רבעוני" },
        { value: "yearly", label: "שנתי" },
      ],
    },
    {
      key: "related_member_name",
      label: "בן משפחה",
      type: "select",
      options: FAMILY_MEMBERS.map((n) => ({ value: n, label: n })),
    },
    { key: "notes", label: "הערות", type: "textarea" },
  ],
  cv: [
    {
      key: "member_name",
      label: "בן משפחה",
      type: "select",
      required: true,
      options: FAMILY_MEMBERS.map((n) => ({ value: n, label: n })),
    },
    {
      key: "section_type",
      label: "סוג",
      type: "select",
      required: true,
      options: [
        { value: "personal", label: "אישי" },
        { value: "education", label: "השכלה" },
        { value: "experience", label: "ניסיון" },
        { value: "skill", label: "מיומנות" },
        { value: "language", label: "שפה" },
        { value: "certification", label: "הסמכה" },
        { value: "other", label: "אחר" },
      ],
    },
    { key: "title", label: "כותרת", type: "text", required: true },
    { key: "organization", label: "ארגון / מוסד", type: "text" },
    { key: "start_date", label: "תאריך התחלה", type: "date" },
    { key: "end_date", label: "תאריך סיום", type: "date" },
    { key: "is_current", label: "עד היום", type: "checkbox" },
    { key: "description", label: "תיאור", type: "textarea" },
  ],
  notebook: [
    { key: "title", label: "כותרת", type: "text" },
    {
      key: "category",
      label: "קטגוריה",
      type: "select",
      options: [
        { value: "general", label: "כללי" },
        { value: "idea", label: "רעיון" },
        { value: "dream", label: "חלום" },
        { value: "reflection", label: "מחשבה" },
        { value: "list", label: "רשימה" },
        { value: "other", label: "אחר" },
      ],
    },
    { key: "content", label: "תוכן", type: "textarea", required: true },
    { key: "is_pinned", label: "נעוץ", type: "checkbox" },
  ],
};

// ── Inventory Tree Picker ────────────────────────────────────────────

function InventoryTreePicker({
  selectedCategory,
  selectedSubCategory,
  onSelect,
}: {
  selectedCategory: string;
  selectedSubCategory: string;
  onSelect: (category: string, subCategory: string) => void;
}) {
  const [expandedCats, setExpandedCats] = useState<Set<string>>(() => {
    // Auto-expand the category that contains the current selection
    if (selectedCategory) return new Set([selectedCategory]);
    return new Set<string>();
  });

  const toggleCat = (catKey: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(catKey)) next.delete(catKey);
      else next.add(catKey);
      return next;
    });
  };

  return (
    <div className="border border-divider rounded-xl overflow-hidden bg-input">
      {INVENTORY_CATEGORIES.map((cat: InventoryCategory) => {
        const isExpanded = expandedCats.has(cat.key);
        return (
          <div key={cat.key}>
            <button
              type="button"
              onClick={() => toggleCat(cat.key)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors
                         hover:bg-hover border-b border-divider
                         ${isExpanded ? "bg-hover text-primary" : "text-secondary"}`}
            >
              <span className="text-base">{cat.icon}</span>
              <span className="flex-1 text-right">{cat.label}</span>
              <span className="text-xs text-muted">{isExpanded ? "▾" : "◂"}</span>
            </button>
            {isExpanded && (
              <div className="bg-surface">
                {cat.children.map((sub) => {
                  const isSelected = selectedCategory === cat.key && selectedSubCategory === sub.key;
                  return (
                    <button
                      type="button"
                      key={sub.key}
                      onClick={() => onSelect(cat.key, sub.key)}
                      className={`w-full flex items-center gap-2 px-6 py-2 text-sm transition-colors
                                 border-b border-divider last:border-b-0
                                 ${isSelected
                                   ? "bg-badge-blue-bg text-badge-blue-text font-medium"
                                   : "text-secondary hover:bg-hover hover:text-primary"
                                 }`}
                    >
                      <span>{sub.icon}</span>
                      <span>{sub.label}</span>
                      {isSelected && <span className="mr-auto text-xs">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Shopping Image Upload ────────────────────────────────────────────

function ShoppingImageField({
  imageUrl,
  onChange,
}: {
  imageUrl: string;
  onChange: (url: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFile = async (file: File) => {
    if (!isAllowedFile(file)) return;
    setUploading(true);
    setProgress(0);
    const result = await clientUpload(file, setProgress);
    setUploading(false);
    setProgress(0);
    if (result.success && result.url) {
      onChange(result.url);
    }
  };

  return (
    <div>
      <label className="block text-base font-medium text-secondary mb-1.5">
        תמונה
      </label>
      {imageUrl ? (
        <div className="relative inline-block">
          <img
            src={imageUrl}
            alt="תמונת פריט"
            className="w-24 h-24 object-cover rounded-xl border border-border"
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-400"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => !uploading && fileRef.current?.click()}
          disabled={uploading}
          className="border-2 border-dashed border-border rounded-xl px-4 py-3 text-sm text-secondary hover:border-blue-500 hover:bg-hover transition-colors w-full"
        >
          {uploading ? (
            <span>מעלה... {progress > 0 && `${progress}%`}</span>
          ) : (
            <span>📷 הוסף תמונה</span>
          )}
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          if (fileRef.current) fileRef.current.value = "";
        }}
      />
    </div>
  );
}

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

  const entityLabels: Record<string, string> = {
    insurance: "ביטוח",
    finance: "כספים",
    cv: "קורות חיים",
    notebook: "מחברת",
  };
  const tabLabel = tabs.find((t) => t.key === entity)?.label || entityLabels[entity] || entity;

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

      // For inventory: collect spec_* keys into a specs object
      if (entity === "inventory") {
        const specs: Record<string, string> = {};
        for (const key of Object.keys(payload)) {
          if (key.startsWith("spec_")) {
            const specKey = key.slice(5);
            if (payload[key]) specs[specKey] = payload[key] as string;
            delete payload[key];
          }
        }
        if (Object.keys(specs).length > 0) payload.specs = specs;
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
          {/* Inventory tree picker — shown before other fields */}
          {entity === "inventory" && (
            <div>
              <label className="block text-sm font-medium text-secondary mb-1.5">
                סוג פריט <span className="text-red-500 mr-1">*</span>
              </label>
              <InventoryTreePicker
                selectedCategory={(form.category as string) || ""}
                selectedSubCategory={(form.sub_category as string) || ""}
                onSelect={(cat, sub) => {
                  setForm((prev) => {
                    const next: Record<string, unknown> = { ...prev, category: cat, sub_category: sub };
                    // Clear old predefined field values when changing type
                    const oldSub = findCategoryBySubKey(prev.sub_category as string);
                    if (oldSub) {
                      for (const f of oldSub.sub.predefinedFields || []) {
                        delete next[`spec_${f.key}`];
                      }
                    }
                    return next;
                  });
                }}
              />
            </div>
          )}

          {/* Dynamic predefined fields for selected inventory sub-category */}
          {entity === "inventory" && !!form.sub_category && (() => {
            const match = findCategoryBySubKey(form.sub_category as string);
            const pFields = match?.sub.predefinedFields || [];
            if (pFields.length === 0) return null;
            return (
              <div className="border border-divider rounded-xl p-3 bg-surface space-y-3">
                <p className="text-xs font-medium text-muted">
                  {match?.sub.icon} מפרט {match?.sub.label}
                </p>
                {pFields.map((pf) => (
                  <div key={pf.key}>
                    <label className="block text-xs font-medium text-secondary mb-1">
                      {pf.label}
                    </label>
                    <input
                      type="text"
                      value={(form[`spec_${pf.key}`] as string) || ""}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, [`spec_${pf.key}`]: e.target.value }))
                      }
                      placeholder={pf.placeholder}
                      className="w-full border border-divider rounded-lg px-3 py-2 text-base bg-input text-primary
                                 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Regular form fields */}
          {fields.map((field) => (
            <div key={field.key}>
              <label className="block text-base font-medium text-secondary mb-1.5">
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
                  className="w-full border border-divider rounded-xl px-3 py-2.5 text-base bg-input text-primary
                             focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">בחר...</option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : field.type === "textarea" ? (
                <textarea
                  value={(form[field.key] as string) || ""}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, [field.key]: e.target.value }))
                  }
                  required={field.required}
                  rows={4}
                  className="w-full border border-divider rounded-xl px-3 py-2.5 text-base bg-input text-primary
                             focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-y"
                />
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
                  <span className="text-base text-secondary">כן</span>
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
                  className="w-full border border-divider rounded-xl px-3 py-2.5 text-base bg-input text-primary
                             focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              )}
            </div>
          ))}

          {/* Shopping image upload */}
          {entity === "shopping" && (
            <ShoppingImageField
              imageUrl={(form.image_url as string) || ""}
              onChange={(url) => setForm((prev) => ({ ...prev, image_url: url }))}
            />
          )}

          {/* File attachments for inventory, insurance, finance */}
          {(entity === "inventory" || entity === "insurance" || entity === "finance") && (
            <FileUpload
              attachments={((form.attachments as Attachment[]) || [])}
              onChange={(atts) => setForm((prev) => ({ ...prev, attachments: atts }))}
            />
          )}

          {error && (
            <p className="text-base text-red-500 bg-badge-red-bg rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-disabled
                         text-white font-medium py-2.5 rounded-xl transition-colors text-base"
            >
              {saving ? "שומר..." : mode === "create" ? "הוסף" : "שמור"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 border border-divider rounded-xl text-base text-secondary
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
