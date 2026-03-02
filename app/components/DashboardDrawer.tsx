"use client";

import { useEffect, useRef, type ReactNode } from "react";

export default function DashboardDrawer({
  isOpen,
  onClose,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);

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

  // Swipe-down to close
  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    currentY.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const delta = e.touches[0].clientY - startY.current;
    currentY.current = delta;
    const sheet = sheetRef.current;
    if (sheet && delta > 0 && sheet.scrollTop <= 0) {
      sheet.style.transform = `translateY(${delta}px)`;
      sheet.style.transition = "none";
    }
  };

  const handleTouchEnd = () => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    sheet.style.transition = "";
    if (currentY.current > 100) {
      onClose();
    }
    sheet.style.transform = "";
    currentY.current = 0;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-overlay z-40 transition-opacity duration-300 lg:hidden ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Bottom sheet — slides up from bottom, full width */}
      <div
        ref={sheetRef}
        dir="rtl"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`fixed inset-x-0 bottom-0 z-50 bg-surface rounded-t-2xl flex flex-col
                    transition-transform duration-300 ease-in-out lg:hidden
                    ${isOpen ? "translate-y-0" : "translate-y-full"}`}
        style={{ height: "92dvh", maxHeight: "92dvh" }}
      >
        {/* Drag handle + close */}
        <div className="flex-shrink-0 pt-2 pb-1 px-4">
          <div className="w-10 h-1 bg-divider rounded-full mx-auto mb-2" />
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-secondary">דשבורד ניהול</h2>
            <button
              onClick={onClose}
              className="text-muted hover:text-primary text-xs px-3 py-1.5 rounded-lg
                         bg-tag border border-border transition-colors"
            >
              ✕ סגור
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </>
  );
}
