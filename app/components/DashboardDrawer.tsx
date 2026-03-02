"use client";

import { useState, useEffect, type ReactNode } from "react";

export default function DashboardDrawer({
  isOpen,
  onClose,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);

  // Reset to compact when closed
  useEffect(() => {
    if (!isOpen) setExpanded(false);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-overlay z-40 transition-opacity duration-300 lg:hidden ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer panel — slides from left (secondary side in RTL) */}
      <div
        dir="rtl"
        className={`fixed top-0 left-0 h-full z-50 bg-surface flex flex-col
                    transition-all duration-300 ease-in-out lg:hidden
                    ${expanded ? "w-full" : "w-[85vw] max-w-[400px]"}
                    ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Drawer toolbar */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card flex-shrink-0">
          <button
            onClick={onClose}
            className="text-muted hover:text-primary text-xs px-3 py-1.5 rounded-lg
                       bg-tag border border-border transition-colors"
          >
            ✕ סגור
          </button>
          <button
            onClick={() => setExpanded((p) => !p)}
            className="text-muted hover:text-primary text-xs px-3 py-1.5 rounded-lg
                       bg-tag border border-border transition-colors"
          >
            {expanded ? "↙ צמצם" : "↗ הרחב"}
          </button>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </>
  );
}
