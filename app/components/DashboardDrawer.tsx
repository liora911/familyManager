"use client";

import { useEffect, type ReactNode } from "react";

export default function DashboardDrawer({
  isOpen,
  onClose,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
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
        className={`fixed top-0 left-0 h-full w-[85vw] max-w-[400px] z-50 bg-surface
                    transition-transform duration-300 ease-in-out lg:hidden
                    ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 text-muted hover:text-primary
                     bg-card border border-border rounded-full w-8 h-8
                     flex items-center justify-center text-sm"
        >
          ✕
        </button>
        <div className="h-full overflow-y-auto">
          {children}
        </div>
      </div>
    </>
  );
}
