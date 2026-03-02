"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, ActionButtons, Tag, Empty } from "@/app/components/DashboardCards";
import FormModal, { crudRequest, FORM_FIELDS } from "@/app/components/FormModal";
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

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("he-IL", { day: "numeric", month: "short", year: "numeric" });
}

// ── Component ────────────────────────────────────────────────────────

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
      <div className="flex-shrink-0 border-b border-border bg-card px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-muted hover:text-primary transition-colors text-sm px-2 py-1 rounded-lg hover:bg-hover"
            >
              → חזרה
            </button>
            <h2 className="text-lg font-medium">🏠 מלאי הבית</h2>
            <span className="text-xs text-muted bg-tag px-2 py-0.5 rounded-full">
              {items.length} פריטים
            </span>
          </div>
          <button
            onClick={() => setModal({ entity: "inventory", mode: "create" })}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <span className="text-base leading-none">+</span>
            הוסף פריט
          </button>
        </div>

        {/* Search + filter bar */}
        <div className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש לפי שם, מותג, דגם, מיקום..."
            className="flex-1 border border-divider rounded-lg px-3 py-2 text-sm bg-input text-primary
                       focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="border border-divider rounded-lg px-3 py-2 text-sm bg-input text-primary
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
        {loading ? (
          <div className="text-center py-12 text-muted text-sm">טוען...</div>
        ) : filtered.length === 0 ? (
          <Empty text={search || filterCategory !== "all" ? "לא נמצאו פריטים" : "אין פריטים במלאי הבית. הוסף את הפריט הראשון!"} />
        ) : (
          <div className="space-y-6">
            {Object.entries(groups).map(([category, categoryItems]) => {
              const catInfo = INVENTORY_CATEGORIES.find((c) => c.key === category);
              const catLabel = catInfo?.label || category;
              const catIcon = catInfo?.icon || "📦";
              return (
                <div key={category}>
                  <h3 className="text-sm font-medium text-secondary mb-2 flex items-center gap-1.5">
                    <span>{catIcon}</span>
                    <span>{catLabel}</span>
                    <span className="text-xs text-muted">({categoryItems.length})</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {categoryItems.map((item) => {
                      const subInfo = item.sub_category ? findCategoryBySubKey(item.sub_category) : undefined;
                      return (
                        <Card
                          key={item.id}
                          onEdit={() => openEdit(item)}
                          onDelete={() => handleDelete(item.id, item.name)}
                        >
                          <div>
                            <p className="font-medium text-sm">
                              {subInfo?.sub.icon || "📦"} {item.name}
                            </p>

                            {/* Brand / model line */}
                            {(item.brand || item.model) && (
                              <p className="text-xs text-secondary mt-1">
                                {[item.brand, item.model].filter(Boolean).join(" • ")}
                              </p>
                            )}

                            {/* Tags row */}
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {subInfo && <Tag>{subInfo.sub.label}</Tag>}
                              {item.location && <Tag>📍 {item.location}</Tag>}
                              {item.serial_number && (
                                <Tag>
                                  <span className="font-mono text-[10px]" dir="ltr">{item.serial_number}</span>
                                </Tag>
                              )}
                            </div>

                            {/* Specs */}
                            {item.specs && Object.keys(item.specs).length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {Object.entries(item.specs).map(([k, v]) => {
                                  const specLabel = subInfo?.sub.predefinedFields?.find((f) => f.key === k)?.label || k;
                                  return (
                                    <span key={k} className="text-[10px] px-1.5 py-0.5 rounded bg-tag text-muted">
                                      {specLabel}: {v}
                                    </span>
                                  );
                                })}
                              </div>
                            )}

                            {/* Bottom row: warranty, cost, attachments */}
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {item.warranty_expiry && (
                                <Tag>
                                  {isPast(item.warranty_expiry) ? "⚠️" : "🛡️"}{" "}
                                  אחריות עד {formatShortDate(item.warranty_expiry)}
                                </Tag>
                              )}
                              {item.cost && <Tag>💰 {item.cost}</Tag>}
                              {item.purchase_date && (
                                <Tag>🛒 {formatShortDate(item.purchase_date)}</Tag>
                              )}
                              {item.attachments && item.attachments.length > 0 && (
                                <a
                                  href={item.attachments[0].url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Tag>📎 {item.attachments.length} קבצים</Tag>
                                </a>
                              )}
                            </div>

                            {item.notes && (
                              <p className="text-xs text-muted mt-2 line-clamp-2">{item.notes}</p>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
