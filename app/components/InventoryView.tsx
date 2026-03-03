"use client";

import { useState, useEffect, useCallback } from "react";
import { Empty } from "@/app/components/DashboardCards";
import FormModal, { crudRequest } from "@/app/components/FormModal";
import { findCategoryBySubKey, INVENTORY_CATEGORIES } from "@/app/components/InventoryCategories";

// ── Types ────────────────────────────────────────────────────────────

interface Attachment {
  url: string;
  filename: string;
  label?: string;
}

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  sub_category?: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  location?: string;
  purchase_date?: string;
  warranty_expiry?: string;
  cost?: string;
  notes?: string;
  specs?: Record<string, string>;
  attachments?: Attachment[];
}

// ── Helpers ──────────────────────────────────────────────────────────

function isPast(dateStr: string | undefined | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

function isExpiringSoon(dateStr: string | undefined | null): boolean {
  if (!dateStr) return false;
  const exp = new Date(dateStr);
  const now = new Date();
  if (exp < now) return false;
  const diffDays = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= 60;
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("he-IL", { day: "numeric", month: "short", year: "numeric" });
}

function daysSince(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 30) return `${days} ימים`;
  if (days < 365) return `${Math.floor(days / 30)} חודשים`;
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  return months > 0 ? `${years} שנים ו-${months} חודשים` : `${years} שנים`;
}

// ── Warranty Badge ──────────────────────────────────────────────────

function WarrantyBadge({ expiry }: { expiry: string }) {
  const expired = isPast(expiry);
  const expiring = !expired && isExpiringSoon(expiry);

  if (expired) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 text-red-500 text-xs font-medium">
        <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
        </svg>
        <span>אחריות פגה</span>
      </div>
    );
  }

  if (expiring) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-yellow-500/10 text-yellow-600 text-xs font-medium">
        <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
        <span>פגה ב-{formatShortDate(expiry)}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 text-xs font-medium">
      <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
      </svg>
      <span>עד {formatShortDate(expiry)}</span>
    </div>
  );
}

// ── Item Card ───────────────────────────────────────────────────────

function ItemCard({
  item,
  onEdit,
  onDelete,
}: {
  item: InventoryItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const subInfo = item.sub_category ? findCategoryBySubKey(item.sub_category) : undefined;
  const icon = subInfo?.sub.icon || "📦";
  const specEntries = item.specs ? Object.entries(item.specs) : [];

  return (
    <div
      className="bg-card rounded-2xl border border-border p-5 sm:p-6 group transition-all duration-200 hover:border-divider"
      style={{ boxShadow: "0 1px 3px var(--color-shadow)" }}
    >
      {/* Top section: icon + info + actions */}
      <div className="flex gap-4 items-start">
        {/* Large icon */}
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-tag flex items-center justify-center text-3xl sm:text-4xl flex-shrink-0">
          {icon}
        </div>

        {/* Name / brand / model */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base sm:text-lg font-semibold text-primary leading-snug truncate">
            {item.name}
          </h3>
          {(item.brand || item.model) && (
            <p className="text-sm text-secondary mt-0.5 truncate">
              {[item.brand, item.model].filter(Boolean).join(" · ")}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {subInfo && (
              <span className="text-xs bg-tag text-secondary px-2.5 py-0.5 rounded-full">
                {subInfo.sub.label}
              </span>
            )}
            {item.location && (
              <span className="text-xs text-muted flex items-center gap-1">
                <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                {item.location}
              </span>
            )}
          </div>
        </div>

        {/* Edit / Delete actions */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            onClick={onEdit}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-link hover:bg-hover transition-colors"
            title="עריכה"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors"
            title="מחיקה"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Specs grid */}
      {specEntries.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 py-3 border-t border-border">
          {specEntries.map(([k, v]) => {
            const specLabel = subInfo?.sub.predefinedFields?.find((f) => f.key === k)?.label || k;
            return (
              <div key={k} className="flex flex-col">
                <span className="text-[10px] text-muted uppercase tracking-wide">{specLabel}</span>
                <span className="text-sm text-primary font-medium">{v}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Serial number */}
      {item.serial_number && (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted">
          <span className="text-[10px] uppercase tracking-wide">S/N</span>
          <span className="font-mono text-xs text-secondary" dir="ltr">{item.serial_number}</span>
        </div>
      )}

      {/* Notes */}
      {item.notes && (
        <p className="mt-3 text-xs text-muted leading-relaxed line-clamp-2 border-t border-border pt-3">
          {item.notes}
        </p>
      )}

      {/* Bottom metadata bar */}
      <div className="mt-4 pt-3 border-t border-border flex flex-wrap items-center gap-3">
        {item.warranty_expiry && <WarrantyBadge expiry={item.warranty_expiry} />}

        {item.cost && (
          <div className="flex items-center gap-1.5 text-xs text-secondary">
            <svg className="w-3.5 h-3.5 text-muted" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.75 10.818v2.614A3.13 3.13 0 0011.888 13c.482-.315.612-.648.612-.875 0-.227-.13-.56-.612-.875a3.13 3.13 0 00-1.138-.432zM8.33 8.62c.053.055.115.11.184.164.208.16.46.284.736.363V6.603c-.481.042-.964.17-1.348.467-.329.254-.543.6-.543 1.03 0 .196.06.39.207.56.134.154.316.296.551.42.116.061.24.116.372.163l-.159-.023z" />
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-6a.75.75 0 01.75.75v.316a3.78 3.78 0 011.653.713c.426.33.744.74.925 1.2a.75.75 0 01-1.395.55 1.35 1.35 0 00-.447-.563 2.187 2.187 0 00-.736-.363V9.3c.514.086 1.003.234 1.413.474.585.344 1.087.876 1.087 1.601 0 .726-.502 1.258-1.087 1.602-.41.24-.899.388-1.413.474v.316a.75.75 0 01-1.5 0v-.316a3.78 3.78 0 01-1.653-.713 2.72 2.72 0 01-.925-1.2.75.75 0 011.395-.55c.12.305.303.54.447.563.232.177.484.309.736.363V9.3a4.22 4.22 0 01-1.413-.474C5.502 8.482 5 7.95 5 7.225c0-.726.502-1.258 1.087-1.602A4.22 4.22 0 017.5 5.15v-.4A.75.75 0 018.25 4h.008a.75.75 0 01.742.75V5.066z" clipRule="evenodd" />
            </svg>
            <span>{item.cost}</span>
          </div>
        )}

        {item.purchase_date && (
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M1 4.25a3.733 3.733 0 012.25-.75h13.5c.844 0 1.623.279 2.25.75A2.25 2.25 0 0016.75 2H3.25A2.25 2.25 0 001 4.25zM1 7.25a3.733 3.733 0 012.25-.75h13.5c.844 0 1.623.279 2.25.75A2.25 2.25 0 0016.75 5H3.25A2.25 2.25 0 001 7.25zM7 8a1 1 0 000 2h.01a1 1 0 000-2H7zm4 0a1 1 0 000 2h.01a1 1 0 000-2H11zm-1.5 4.5a1.5 1.5 0 00-1.488 1.29 21.147 21.147 0 01-.393 2.052A.75.75 0 008.374 17h3.252a.75.75 0 00.756-1.158 21.15 21.15 0 01-.393-2.052A1.5 1.5 0 0010.5 12.5h-1z" />
            </svg>
            <span>נרכש לפני {daysSince(item.purchase_date)}</span>
          </div>
        )}

        {item.attachments && item.attachments.length > 0 && (
          <a
            href={item.attachments[0].url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-link hover:text-link-hover transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M15.621 4.379a3 3 0 00-4.242 0l-7 7a3 3 0 004.241 4.243h.001l.497-.5a.75.75 0 011.064 1.057l-.498.501a4.5 4.5 0 01-6.364-6.364l7-7a4.5 4.5 0 016.368 6.36l-3.455 3.553A2.625 2.625 0 119.52 9.52l3.45-3.451a.75.75 0 111.061 1.06l-3.45 3.451a1.125 1.125 0 001.587 1.595l3.454-3.553a3 3 0 000-4.242z" clipRule="evenodd" />
            </svg>
            <span>{item.attachments.length} {item.attachments.length === 1 ? "קובץ" : "קבצים"}</span>
          </a>
        )}
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────

export default function InventoryView({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [modal, setModal] = useState<{
    entity: string;
    mode: "create" | "edit";
    initial?: Record<string, unknown>;
  } | null>(null);

  const refresh = useCallback(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => setItems(d.inventory || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => setItems(d.inventory || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`למחוק את "${label}"?`)) return;
    try {
      await crudRequest("inventory", "DELETE", { id });
      refresh();
    } catch {
      alert("שגיאה במחיקה");
    }
  };

  const openEdit = (item: InventoryItem) => {
    const editInitial: Record<string, unknown> = {
      id: item.id, name: item.name, category: item.category,
      sub_category: item.sub_category, brand: item.brand, model: item.model,
      serial_number: item.serial_number, location: item.location,
      purchase_date: item.purchase_date, warranty_expiry: item.warranty_expiry,
      cost: item.cost, notes: item.notes, attachments: item.attachments || [],
    };
    if (item.specs) {
      for (const [k, v] of Object.entries(item.specs)) {
        editInitial[`spec_${k}`] = v;
      }
    }
    setModal({ entity: "inventory", mode: "edit", initial: editInitial });
  };

  // Filter items
  const filtered = items.filter((item) => {
    if (filterCategory !== "all" && item.category !== filterCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        (item.brand || "").toLowerCase().includes(q) ||
        (item.model || "").toLowerCase().includes(q) ||
        (item.location || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Group by category
  const groups = filtered.reduce<Record<string, InventoryItem[]>>((acc, item) => {
    const cat = item.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  // Unique categories for filter
  const usedCategories = [...new Set(items.map((i) => i.category || "other"))];

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-card px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="text-muted hover:text-primary transition-colors text-sm px-2 py-1 rounded-lg hover:bg-hover"
            >
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
              </svg>
            </button>
            <div>
              <h2 className="text-lg font-semibold text-primary">מלאי הבית</h2>
              <p className="text-xs text-muted">{items.length} פריטים רשומים</p>
            </div>
          </div>
          <button
            onClick={() => setModal({ entity: "inventory", mode: "create" })}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            הוסף פריט
          </button>
        </div>

        {/* Search + filter bar */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <svg className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש לפי שם, מותג, דגם..."
              className="w-full border border-divider rounded-xl pr-9 pl-3 py-2.5 text-sm bg-input text-primary
                         focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="border border-divider rounded-xl px-3 py-2.5 text-sm bg-input text-primary
                       focus:outline-none focus:border-blue-500"
          >
            <option value="all">כל הקטגוריות</option>
            {usedCategories.map((cat) => {
              const info = INVENTORY_CATEGORIES.find((c) => c.key === cat);
              return (
                <option key={cat} value={cat}>
                  {info ? `${info.icon} ${info.label}` : cat}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <div className="text-center py-12 text-muted text-sm">טוען...</div>
          ) : filtered.length === 0 ? (
            <Empty text={search || filterCategory !== "all" ? "לא נמצאו פריטים" : "אין פריטים במלאי הבית. הוסף את הפריט הראשון!"} />
          ) : (
            <div className="space-y-8">
              {Object.entries(groups).map(([category, categoryItems]) => {
                const catInfo = INVENTORY_CATEGORIES.find((c) => c.key === category);
                const catLabel = catInfo?.label || category;
                const catIcon = catInfo?.icon || "📦";
                return (
                  <div key={category}>
                    {/* Category header with divider */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{catIcon}</span>
                        <h3 className="text-sm font-semibold text-primary">{catLabel}</h3>
                        <span className="text-xs text-muted bg-tag px-2 py-0.5 rounded-full">
                          {categoryItems.length}
                        </span>
                      </div>
                      <div className="flex-1 h-px bg-border" />
                    </div>

                    {/* 2-column grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {categoryItems.map((item) => (
                        <ItemCard
                          key={item.id}
                          item={item}
                          onEdit={() => openEdit(item)}
                          onDelete={() => handleDelete(item.id, item.name)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* FormModal for create/edit */}
      {modal && (
        <FormModal
          entity={modal.entity}
          mode={modal.mode}
          initial={modal.initial}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
