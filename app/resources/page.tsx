"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// ── Types ────────────────────────────────────────────────────────────

interface InsurancePolicy {
  id: string;
  title: string;
  category: string;
  provider?: string;
  end_date?: string;
  monthly_cost?: string;
}

interface FinanceRecord {
  id: string;
  category: string;
  amount?: string;
  is_recurring?: boolean;
}

interface CvSection {
  id: string;
  section_type: string;
  member_id?: string;
  is_current?: boolean;
}

interface NotebookEntry {
  id: string;
  category: string;
  is_pinned?: boolean;
}

interface DashboardData {
  insurance?: InsurancePolicy[];
  finance?: FinanceRecord[];
  cv?: CvSection[];
  notebook?: NotebookEntry[];
}

// ── Helpers ──────────────────────────────────────────────────────────

function isPast(dateStr: string | undefined | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

function isExpiringSoon(dateStr: string | undefined | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  if (d < now) return false;
  return (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24) <= 60;
}

// ── SVG Icons (monochrome) ──────────────────────────────────────────

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M12.516 2.17a.75.75 0 00-1.032 0 11.209 11.209 0 01-7.877 3.08.75.75 0 00-.722.515A12.74 12.74 0 002.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 00.374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.985a.75.75 0 00-.722-.516l-.143.001c-2.996 0-5.717-1.17-7.734-3.08zm3.094 8.016a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
    </svg>
  );
}

function WalletIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M2.273 5.625A4.483 4.483 0 015.25 4.5h13.5c1.141 0 2.183.425 2.977 1.125A3 3 0 0018.75 3H5.25a3 3 0 00-2.977 2.625zM2.273 8.625A4.483 4.483 0 015.25 7.5h13.5c1.141 0 2.183.425 2.977 1.125A3 3 0 0018.75 6H5.25a3 3 0 00-2.977 2.625zM5.25 9a3 3 0 00-3 3v6a3 3 0 003 3h13.5a3 3 0 003-3v-6a3 3 0 00-3-3H15a.75.75 0 00-.75.75 2.25 2.25 0 01-4.5 0A.75.75 0 009 9H5.25z" />
    </svg>
  );
}

function DocIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM7.5 15a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 017.5 15zm.75 2.25a.75.75 0 000 1.5H12a.75.75 0 000-1.5H8.25z" clipRule="evenodd" />
      <path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" />
    </svg>
  );
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.25 4.533A9.707 9.707 0 006 3a9.735 9.735 0 00-3.25.555.75.75 0 00-.5.707v14.25a.75.75 0 001 .707A8.237 8.237 0 016 18.75c1.995 0 3.823.707 5.25 1.886V4.533zM12.75 20.636A8.214 8.214 0 0118 18.75c.966 0 1.89.166 2.75.47a.75.75 0 001-.708V4.262a.75.75 0 00-.5-.707A9.735 9.735 0 0018 3a9.707 9.707 0 00-5.25 1.533v16.103z" />
    </svg>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
    </svg>
  );
}

// ── Stat pill ────────────────────────────────────────────────────────

function Stat({ label, value, warn }: { label: string; value: string | number; warn?: boolean }) {
  return (
    <div className={`flex flex-col items-center px-4 py-2 rounded-xl ${warn ? "bg-red-500/10" : "bg-tag"}`}>
      <span className={`text-lg sm:text-xl font-bold ${warn ? "text-red-500" : "text-primary"}`}>{value}</span>
      <span className="text-[10px] sm:text-xs text-muted">{label}</span>
    </div>
  );
}

// ── Resource rows ───────────────────────────────────────────────────

function InsuranceRow({ data }: { data: InsurancePolicy[] }) {
  const total = data.length;
  const expired = data.filter((p) => isPast(p.end_date)).length;
  const expiring = data.filter((p) => isExpiringSoon(p.end_date)).length;
  const monthlyCost = data.reduce((sum, p) => sum + (parseFloat(p.monthly_cost || "0") || 0), 0);

  return (
    <Link href="/resources/insurance" className="block group">
      <div
        className="bg-card rounded-2xl border border-border p-5 sm:p-7 transition-all
                   hover:border-divider hover:shadow-md active:scale-[0.99]"
        style={{ boxShadow: "0 1px 3px var(--color-shadow)" }}
      >
        <div className="flex items-start gap-5">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
            <ShieldIcon className="w-8 h-8 sm:w-9 sm:h-9 text-blue-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-semibold text-primary">ביטוח</h2>
              <ChevronLeftIcon className="w-5 h-5 text-muted group-hover:text-primary transition-colors" />
            </div>
            <p className="text-sm text-secondary mt-0.5">פוליסות ביטוח, תוקף, איש קשר</p>

            {total > 0 && (
              <div className="flex flex-wrap gap-2 sm:gap-3 mt-4">
                <Stat label="פוליסות" value={total} />
                {monthlyCost > 0 && <Stat label="עלות חודשית" value={`₪${monthlyCost.toLocaleString()}`} />}
                {expiring > 0 && <Stat label="עומדות לפוג" value={expiring} warn />}
                {expired > 0 && <Stat label="פגו" value={expired} warn />}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

function FinanceRow({ data }: { data: FinanceRecord[] }) {
  const total = data.length;
  const income = data.filter((r) => r.category === "income").reduce((s, r) => s + (parseFloat(r.amount || "0") || 0), 0);
  const expense = data.filter((r) => r.category === "expense").reduce((s, r) => s + (parseFloat(r.amount || "0") || 0), 0);
  const recurring = data.filter((r) => r.is_recurring).length;
  const balance = income - expense;

  return (
    <Link href="/resources/finance" className="block group">
      <div
        className="bg-card rounded-2xl border border-border p-5 sm:p-7 transition-all
                   hover:border-divider hover:shadow-md active:scale-[0.99]"
        style={{ boxShadow: "0 1px 3px var(--color-shadow)" }}
      >
        <div className="flex items-start gap-5">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
            <WalletIcon className="w-8 h-8 sm:w-9 sm:h-9 text-emerald-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-semibold text-primary">כספים</h2>
              <ChevronLeftIcon className="w-5 h-5 text-muted group-hover:text-primary transition-colors" />
            </div>
            <p className="text-sm text-secondary mt-0.5">הכנסות, הוצאות, השקעות, חסכונות</p>

            {total > 0 && (
              <div className="flex flex-wrap gap-2 sm:gap-3 mt-4">
                {income > 0 && <Stat label="הכנסות" value={`₪${income.toLocaleString()}`} />}
                {expense > 0 && <Stat label="הוצאות" value={`₪${expense.toLocaleString()}`} />}
                <Stat label="מאזן" value={`${balance >= 0 ? "+" : ""}₪${balance.toLocaleString()}`} warn={balance < 0} />
                {recurring > 0 && <Stat label="חוזרים" value={recurring} />}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

function CvRow({ data }: { data: CvSection[] }) {
  const total = data.length;
  const current = data.filter((s) => s.is_current).length;
  const types = new Set(data.map((s) => s.section_type));

  return (
    <Link href="/resources/cv" className="block group">
      <div
        className="bg-card rounded-2xl border border-border p-5 sm:p-6 transition-all
                   hover:border-divider hover:shadow-md active:scale-[0.99]"
        style={{ boxShadow: "0 1px 3px var(--color-shadow)" }}
      >
        <div className="flex items-start gap-5">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
            <DocIcon className="w-7 h-7 sm:w-8 sm:h-8 text-purple-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-primary">קורות חיים</h2>
              <ChevronLeftIcon className="w-5 h-5 text-muted group-hover:text-primary transition-colors" />
            </div>
            <p className="text-sm text-secondary mt-0.5">השכלה, ניסיון, מיומנויות</p>

            {total > 0 && (
              <div className="flex flex-wrap gap-2 sm:gap-3 mt-3">
                <Stat label="סעיפים" value={total} />
                <Stat label="קטגוריות" value={types.size} />
                {current > 0 && <Stat label="פעילים" value={current} />}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

function NotebookRow({ data }: { data: NotebookEntry[] }) {
  const total = data.length;
  const pinned = data.filter((e) => e.is_pinned).length;

  return (
    <Link href="/resources/notebook" className="block group">
      <div
        className="bg-card rounded-2xl border border-border p-4 sm:p-5 transition-all
                   hover:border-divider hover:shadow-md active:scale-[0.99]"
        style={{ boxShadow: "0 1px 3px var(--color-shadow)" }}
      >
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <BookIcon className="w-6 h-6 sm:w-7 sm:h-7 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-semibold text-primary">מחברת</h2>
              <ChevronLeftIcon className="w-5 h-5 text-muted group-hover:text-primary transition-colors" />
            </div>
            <p className="text-xs sm:text-sm text-secondary">
              {total > 0
                ? `${total} רשומות${pinned > 0 ? ` · ${pinned} נעוצות` : ""}`
                : "רעיונות, חלומות, מחשבות"}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── Main Page ───────────────────────────────────────────────────────

export default function ResourcesPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div dir="rtl" className="min-h-dvh bg-surface text-primary">
      <header className="border-b border-border bg-card px-5 sm:px-8 py-5">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/")}
            className="text-muted hover:text-primary transition-colors p-2.5 rounded-xl hover:bg-hover border border-border"
            title="חזרה לדף הראשי"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.47 3.841a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.061l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.689z" />
              <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.432z" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-semibold">משאבים</h1>
            <p className="text-base text-secondary">ניהול מסמכים ומידע אישי</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 sm:p-6">
        {loading ? (
          <div className="text-center py-16 text-muted text-sm">טוען...</div>
        ) : (
          <div className="space-y-4">
            <InsuranceRow data={data?.insurance || []} />
            <FinanceRow data={data?.finance || []} />
            <CvRow data={data?.cv || []} />
            <NotebookRow data={data?.notebook || []} />
          </div>
        )}
      </main>
    </div>
  );
}
