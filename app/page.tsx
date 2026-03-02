"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { DashboardRefreshProvider } from "@/app/contexts/DashboardRefreshContext";
import UnifiedHeader from "@/app/components/UnifiedHeader";
import ChatPanel, { type ChatPanelHandle } from "@/app/components/ChatPanel";
import DashboardPanel from "@/app/components/DashboardPanel";
import DashboardDrawer from "@/app/components/DashboardDrawer";
import InventoryView from "@/app/components/InventoryView";

function getUser(): string {
  const match = document.cookie.match(/home-manager-user=(\w+)/);
  return match?.[1] || "shared";
}

const PANEL_STORAGE_KEY = "dashboard-panel-open";

const PANEL_WIDTH = 380;
const PANEL_WIDTH_EXPANDED = 700;

function Home() {
  const [user, setUser] = useState("shared");
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [hasMessages, setHasMessages] = useState(false);
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

  // Track hasMessages from chatRef
  useEffect(() => {
    const interval = setInterval(() => {
      if (chatRef.current) {
        setHasMessages(chatRef.current.hasMessages);
      }
    }, 500);
    return () => clearInterval(interval);
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

  const handleClearChat = useCallback(() => {
    chatRef.current?.clearChat();
    setHasMessages(false);
  }, []);

  return (
    <div dir="rtl" className="flex flex-col h-dvh bg-surface text-primary">
      <UnifiedHeader
        user={user}
        isPanelOpen={isDesktop ? isPanelOpen : isDrawerOpen}
        hasMessages={hasMessages}
        onTogglePanel={handleTogglePanel}
        onClearChat={handleClearChat}
        onOpenInventory={() => setShowInventory(true)}
      />

      {showInventory ? (
        <div className="flex-1 overflow-hidden">
          <InventoryView onClose={() => setShowInventory(false)} />
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-hidden flex">
            {/* Chat — always visible, takes remaining space */}
            <ChatPanel ref={chatRef} className="flex-1 min-w-0" user={user} />

            {/* Dashboard panel — desktop only, collapsible */}
            <div
              className="hidden lg:block overflow-hidden border-r border-border flex-shrink-0
                         transition-[width] duration-300 ease-in-out"
              style={{
                width: isPanelOpen
                  ? isPanelExpanded
                    ? PANEL_WIDTH_EXPANDED
                    : PANEL_WIDTH
                  : 0,
              }}
            >
              <div
                className="h-full"
                style={{
                  width: isPanelExpanded ? PANEL_WIDTH_EXPANDED : PANEL_WIDTH,
                }}
              >
                <DashboardPanel
                  expanded={isPanelExpanded}
                  onToggleExpand={() => setIsPanelExpanded((p) => !p)}
                />
              </div>
            </div>
          </div>

          {/* Mobile drawer */}
          <DashboardDrawer
            isOpen={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
          >
            <DashboardPanel />
          </DashboardDrawer>

          {/* Mobile FAB to open dashboard */}
          {!isDesktop && !isDrawerOpen && (
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="fixed bottom-20 left-4 z-30 bg-blue-600 hover:bg-blue-500
                         text-white w-12 h-12 rounded-full shadow-lg
                         flex items-center justify-center text-xl
                         transition-transform active:scale-95 lg:hidden"
              title="דשבורד ניהול"
            >
              📋
            </button>
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
