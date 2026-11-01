"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { DashboardRefreshProvider } from "@/app/contexts/DashboardRefreshContext";
import UnifiedHeader from "@/app/components/UnifiedHeader";
import ChatPanel, { type ChatPanelHandle } from "@/app/components/ChatPanel";
import DashboardPanel from "@/app/components/DashboardPanel";
import DashboardDrawer from "@/app/components/DashboardDrawer";
import InventoryView from "@/app/components/InventoryView";
import { tabs, type TabKey } from "@/app/components/FormModal";

function getUser(): string {
  const match = document.cookie.match(/home-manager-user=(\w+)/);
  return match?.[1] || "shared";
}

const PANEL_STORAGE_KEY = "dashboard-panel-open";
const INVENTORY_HASH = "#inventory";

const PANEL_WIDTH = 380;
const PANEL_WIDTH_EXPANDED = 700;
const PANEL_WIDTH_COLLAPSED = 56;

function Home() {
  const [user, setUser] = useState("shared");
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [hasMessages, setHasMessages] = useState(false);
  const [requestedTab, setRequestedTab] = useState<TabKey | null>(null);
  const chatRef = useRef<ChatPanelHandle>(null);

  useEffect(() => {
    setUser(getUser());

    // Load panel preference
    const stored = localStorage.getItem(PANEL_STORAGE_KEY);
    if (stored !== null) {
      setIsPanelOpen(stored === "true");
    }

    // Detect desktop
    const mq = window.matchMedia("(min-width: 1024px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Inventory lives behind a URL hash, so the phone's back button closes it
  // instead of leaving the app, and a reload keeps it open.
  useEffect(() => {
    const sync = () => setShowInventory(window.location.hash === INVENTORY_HASH);
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const openInventory = useCallback(() => {
    window.location.hash = INVENTORY_HASH.slice(1);
  }, []);

  const closeInventory = useCallback(() => {
    if (window.location.hash === INVENTORY_HASH) {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    setShowInventory(false);
  }, []);

  const handleTogglePanel = useCallback(() => {
    if (isDesktop) {
      setIsPanelOpen((prev) => {
        const next = !prev;
        localStorage.setItem(PANEL_STORAGE_KEY, String(next));
        return next;
      });
    } else {
      setIsDrawerOpen((prev) => !prev);
    }
  }, [isDesktop]);

  const handleSidebarIconClick = useCallback((tabKey: TabKey) => {
    setRequestedTab(tabKey);
    setIsPanelOpen(true);
    localStorage.setItem(PANEL_STORAGE_KEY, "true");
  }, []);

  // Clear requestedTab after panel opens with it
  useEffect(() => {
    if (requestedTab && isPanelOpen) {
      const t = setTimeout(() => setRequestedTab(null), 150);
      return () => clearTimeout(t);
    }
  }, [requestedTab, isPanelOpen]);

  const handleClearChat = useCallback(() => {
    chatRef.current?.clearChat();
    setHasMessages(false);
  }, []);

  const handleHasMessagesChange = useCallback((has: boolean) => {
    setHasMessages(has);
  }, []);

  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

  return (
    <div dir="rtl" className="chat-viewport flex flex-col h-dvh bg-surface text-primary">
      <UnifiedHeader
        user={user}
        isPanelOpen={isDesktop ? isPanelOpen : isDrawerOpen}
        isInventoryOpen={showInventory}
        hasMessages={hasMessages}
        onTogglePanel={handleTogglePanel}
        onClearChat={handleClearChat}
        onOpenInventory={openInventory}
      />

      {showInventory ? (
        <div className="flex-1 overflow-hidden">
          <InventoryView onClose={closeInventory} />
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-hidden flex">
            {/* Chat — always visible, takes remaining space */}
            <ChatPanel
              ref={chatRef}
              className="flex-1 min-w-0"
              user={user}
              onHasMessagesChange={handleHasMessagesChange}
            />

            {/* Dashboard panel — desktop only, collapsible with icon sidebar */}
            {isDesktop && (
              <div className="hidden lg:flex flex-shrink-0 h-full">
                {/* Expand/collapse tongue tab */}
                {isPanelOpen && (
                  <button
                    onClick={() => setIsPanelExpanded((p) => !p)}
                    className="flex-shrink-0 self-start mt-2 w-5 h-9 bg-card
                               border border-border border-l-0 rounded-r-lg
                               flex items-center justify-center
                               text-muted hover:text-primary hover:bg-hover
                               transition-colors z-10"
                    style={{ marginLeft: "-1px" }}
                    title={isPanelExpanded ? "צמצם" : "הרחב"}
                    aria-label={isPanelExpanded ? "צמצום הדשבורד" : "הרחבת הדשבורד"}
                  >
                    <svg
                      width="10" height="10" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.5"
                      strokeLinecap="round" strokeLinejoin="round"
                      className={`transition-transform duration-300 ${isPanelExpanded ? "" : "rotate-180"}`}
                      aria-hidden="true"
                    >
                      <path d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}

                {/* Panel body */}
                <div
                  className="overflow-hidden border-r border-border
                             transition-[width] duration-300 ease-in-out"
                  style={{
                    width: isPanelOpen
                      ? isPanelExpanded
                        ? PANEL_WIDTH_EXPANDED
                        : PANEL_WIDTH
                      : PANEL_WIDTH_COLLAPSED,
                  }}
                >
                  {isPanelOpen ? (
                    <div
                      className="h-full"
                      style={{
                        width: isPanelExpanded ? PANEL_WIDTH_EXPANDED : PANEL_WIDTH,
                      }}
                    >
                      <DashboardPanel requestedTab={requestedTab} />
                    </div>
                  ) : (
                    /* Collapsed icon sidebar */
                    <div
                      className="h-full flex flex-col items-center py-3 gap-1 bg-card"
                      style={{ width: PANEL_WIDTH_COLLAPSED }}
                    >
                      {tabs.map((tab) => (
                        <button
                          key={tab.key}
                          onClick={() => handleSidebarIconClick(tab.key)}
                          className="w-10 h-10 flex items-center justify-center rounded-xl
                                     text-lg text-muted hover:text-primary hover:bg-hover
                                     transition-colors"
                          title={tab.label}
                          aria-label={tab.label}
                        >
                          <span aria-hidden="true">{tab.icon}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Mobile bottom-sheet drawer (only mounted on small screens) */}
          {!isDesktop && (
            <DashboardDrawer isOpen={isDrawerOpen} onClose={closeDrawer}>
              <DashboardPanel />
            </DashboardDrawer>
          )}
        </>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <DashboardRefreshProvider>
      <Home />
    </DashboardRefreshProvider>
  );
}
