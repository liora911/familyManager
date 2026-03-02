"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

const RESOURCES = [
  {
    key: "insurance",
    icon: "🛡️",
    label: "ביטוח",
    description: "פוליסות ביטוח, תוקף, איש קשר",
    color: "from-blue-500/20 to-blue-600/10 border-blue-500/30",
  },
  {
    key: "finance",
    icon: "💰",
    label: "כספים",
    description: "הכנסות, הוצאות, השקעות, חסכונות",
    color: "from-green-500/20 to-green-600/10 border-green-500/30",
  },
  {
    key: "cv",
    icon: "📄",
    label: "קורות חיים",
    description: "השכלה, ניסיון, מיומנויות",
    color: "from-purple-500/20 to-purple-600/10 border-purple-500/30",
  },
  {
    key: "notebook",
    icon: "📓",
    label: "מחברת",
    description: "רעיונות, חלומות, מחשבות, רשימות",
    color: "from-amber-500/20 to-amber-600/10 border-amber-500/30",
  },
];

export default function ResourcesPage() {
  const router = useRouter();

  return (
    <div dir="rtl" className="min-h-dvh bg-surface text-primary">
      <header className="border-b border-border bg-card px-4 sm:px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="text-muted hover:text-primary transition-colors text-sm"
          >
            → חזרה
          </button>
          <div>
            <h1 className="text-xl font-medium">📁 משאבים</h1>
            <p className="text-sm text-secondary">ניהול מסמכים ומידע אישי</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6">
        <div className="grid grid-cols-2 gap-4">
          {RESOURCES.map((r) => (
            <Link
              key={r.key}
              href={`/resources/${r.key}`}
              className={`group block rounded-2xl border bg-gradient-to-br ${r.color}
                         p-6 transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]`}
            >
              <div className="text-4xl sm:text-5xl mb-3">{r.icon}</div>
              <h2 className="text-lg font-semibold">{r.label}</h2>
              <p className="text-xs text-secondary mt-1">{r.description}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
