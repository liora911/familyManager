"use client";

import { useState, useEffect, useRef } from "react";

export default function ClockFooter() {
  const [now, setNow] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    setNow(new Date());
    timerRef.current = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  if (!now) {
    return (
      <footer className="border-t border-border bg-card px-4 py-3 text-center text-secondary">
        <span className="text-lg font-medium tabular-nums">&nbsp;</span>
      </footer>
    );
  }

  const time = now.toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const date = now.toLocaleDateString("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <footer className="border-t border-border bg-card px-4 py-3 text-center text-secondary">
      <span className="text-lg font-medium tabular-nums">{time}</span>
      <span className="mx-2 text-muted">·</span>
      <span className="text-sm">{date}</span>
    </footer>
  );
}
