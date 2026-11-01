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

function WhatsAppIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export function shareWhatsApp(text: string) {
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
}

/**
 * Card with an action row. The row is revealed on hover on desktop and
 * always visible on touch screens (see .reveal-on-hover in globals.css).
 */
export function Card({
  children,
  onEdit,
  onDelete,
  onShare,
}: {
  children: React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 group" style={{ boxShadow: `0 1px 2px var(--color-shadow)` }}>
      {children}
      {(onEdit || onDelete || onShare) && (
        <div className="flex gap-1 mt-3 pt-2 border-t border-border reveal-on-hover">
          {onShare && (
            <button
              onClick={onShare}
              className="text-xs text-green-600 hover:text-green-500 flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-hover transition-colors"
              aria-label="שיתוף בוואטסאפ"
            >
              <WhatsAppIcon size={12} /> שתף
            </button>
          )}
          {onEdit && (
            <button
              onClick={onEdit}
              className="text-xs text-link hover:text-link-hover flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-hover transition-colors"
            >
              <span aria-hidden="true">✏️</span> עריכה
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="text-xs text-red-500 hover:text-red-400 flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-hover transition-colors"
            >
              <span aria-hidden="true">🗑️</span> מחיקה
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
  onShare,
  small,
}: {
  onEdit: () => void;
  onDelete: () => void;
  onShare?: () => void;
  small?: boolean;
}) {
  const size = small ? "text-xs" : "text-sm";
  const box = "min-w-8 min-h-8 flex items-center justify-center rounded-lg hover:bg-hover transition-colors";
  return (
    <div className="flex gap-0.5">
      {onShare && (
        <button onClick={onShare} className={`${size} ${box} text-green-600 hover:text-green-500`} aria-label="שיתוף בוואטסאפ">
          <WhatsAppIcon size={small ? 12 : 14} />
        </button>
      )}
      <button onClick={onEdit} className={`${size} ${box} text-link hover:text-link-hover`} aria-label="עריכה">
        <span aria-hidden="true">✏️</span>
      </button>
      <button onClick={onDelete} className={`${size} ${box} text-red-500 hover:text-red-400`} aria-label="מחיקה">
        <span aria-hidden="true">🗑️</span>
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
    done: "bg-badge-green-bg text-badge-green-text",
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
