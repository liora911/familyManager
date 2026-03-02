"use client";

import React from "react";

const statusLabels: Record<string, string> = {
  scheduled: "מתוכנן",
  completed: "הושלם",
  cancelled: "בוטל",
  pending: "ממתין",
  in_progress: "בתהליך",
  done: "בוצע",
};

export function Card({
  children,
  onEdit,
  onDelete,
}: {
  children: React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 group" style={{ boxShadow: `0 1px 2px var(--color-shadow)` }}>
      {children}
      {(onEdit || onDelete) && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-border opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <button
              onClick={onEdit}
              className="text-xs text-link hover:text-link-hover flex items-center gap-1"
            >
              ✏️ עריכה
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="text-xs text-red-500 hover:text-red-400 flex items-center gap-1"
            >
              🗑️ מחיקה
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function ActionButtons({
  onEdit,
  onDelete,
  small,
}: {
  onEdit: () => void;
  onDelete: () => void;
  small?: boolean;
}) {
  const size = small ? "text-xs" : "text-sm";
  return (
    <div className="flex gap-1">
      <button onClick={onEdit} className={`${size} text-link hover:text-link-hover p-1`}>
        ✏️
      </button>
      <button onClick={onDelete} className={`${size} text-red-500 hover:text-red-400 p-1`}>
        🗑️
      </button>
    </div>
  );
}

export function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs bg-tag text-secondary px-2 py-0.5 rounded-full">
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    scheduled: "bg-badge-blue-bg text-badge-blue-text",
    completed: "bg-badge-green-bg text-badge-green-text",
    cancelled: "bg-badge-neutral-bg text-badge-neutral-text",
    pending: "bg-badge-yellow-bg text-badge-yellow-text",
    in_progress: "bg-badge-purple-bg text-badge-purple-text",
  };
  return (
    <span
      className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
        colors[status] || colors.pending
      }`}
    >
      {statusLabels[status] || status}
    </span>
  );
}

export function Empty({ text }: { text: string }) {
  return (
    <div className="text-center py-16 text-muted">
      <p className="text-lg">{text}</p>
    </div>
  );
}
