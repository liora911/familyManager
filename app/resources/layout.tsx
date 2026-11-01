"use client";

import { useEffect, useState } from "react";
import UnifiedHeader from "@/app/components/UnifiedHeader";

function getUser(): string {
  const match = document.cookie.match(/home-manager-user=(\w+)/);
  return match?.[1] || "shared";
}

export default function ResourcesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState("shared");

  useEffect(() => {
    setUser(getUser());
  }, []);

  return (
    <>
      {/* Same top bar as the home page, pinned while the page scrolls */}
      <div className="sticky top-0 z-40">
        <UnifiedHeader user={user} active="resources" />
      </div>
      {children}
    </>
  );
}
