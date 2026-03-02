"use client";

import { createContext, useContext, useCallback, useRef, type ReactNode } from "react";

interface DashboardRefreshContextValue {
  triggerRefresh: () => void;
  subscribeRefresh: (callback: () => void) => () => void;
}

const DashboardRefreshContext = createContext<DashboardRefreshContextValue>({
  triggerRefresh: () => {},
  subscribeRefresh: () => () => {},
});

export function DashboardRefreshProvider({ children }: { children: ReactNode }) {
  const subscribersRef = useRef(new Set<() => void>());

  const triggerRefresh = useCallback(() => {
    subscribersRef.current.forEach((cb) => cb());
  }, []);

  const subscribeRefresh = useCallback((callback: () => void) => {
    subscribersRef.current.add(callback);
    return () => {
      subscribersRef.current.delete(callback);
    };
  }, []);

  return (
    <DashboardRefreshContext.Provider value={{ triggerRefresh, subscribeRefresh }}>
      {children}
    </DashboardRefreshContext.Provider>
  );
}

export function useDashboardRefresh() {
  return useContext(DashboardRefreshContext);
}
