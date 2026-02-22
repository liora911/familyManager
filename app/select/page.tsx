"use client";

import { useRouter } from "next/navigation";
import HouseIcon from "@/app/components/HouseIcon";

const profiles = [
  {
    key: "yarin",
    name: "ירין",
    emoji: "👨",
    color: "from-blue-500 to-blue-600",
    hoverColor: "hover:from-blue-400 hover:to-blue-500",
    shadow: "shadow-blue-500/20",
    description: "אבא",
  },
  {
    key: "shared",
    name: "משותף",
    emoji: "🏠",
    color: "from-emerald-500 to-emerald-600",
    hoverColor: "hover:from-emerald-400 hover:to-emerald-500",
    shadow: "shadow-emerald-500/20",
    description: "כל המשפחה",
  },
  {
    key: "liora",
    name: "ליאורה",
    emoji: "👩",
    color: "from-purple-500 to-purple-600",
    hoverColor: "hover:from-purple-400 hover:to-purple-500",
    shadow: "shadow-purple-500/20",
    description: "אמא",
  },
];

export default function SelectPage() {
  const router = useRouter();

  const handleSelect = (key: string) => {
    document.cookie = `home-manager-user=${key}; Path=/; Max-Age=${30 * 24 * 60 * 60}; SameSite=Lax`;
    router.push("/");
    router.refresh();
  };

  return (
    <div
      dir="rtl"
      className="flex flex-col items-center justify-center min-h-dvh bg-surface px-4"
    >
      <div className="text-center mb-10">
        <HouseIcon size={64} className="text-link mx-auto mb-3" />
        <h1 className="text-2xl font-semibold text-primary">מנהל הבית</h1>
        <p className="text-secondary mt-2">מי משתמש/ת?</p>
      </div>

      <div className="flex gap-4 flex-wrap justify-center max-w-lg w-full">
        {profiles.map((p) => (
          <button
            key={p.key}
            onClick={() => handleSelect(p.key)}
            className={`flex-1 min-w-[140px] max-w-[180px] bg-gradient-to-br ${p.color} ${p.hoverColor}
                       text-white rounded-2xl p-6 shadow-lg ${p.shadow}
                       transition-all duration-200 hover:scale-105 hover:shadow-xl
                       active:scale-95 cursor-pointer`}
          >
            <p className="text-4xl mb-3">{p.emoji}</p>
            <p className="text-lg font-semibold">{p.name}</p>
            <p className="text-sm opacity-80 mt-1">{p.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
