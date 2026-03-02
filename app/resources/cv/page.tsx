"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import FormModal, { crudRequest, FAMILY_MEMBERS } from "@/app/components/FormModal";

interface CvSection {
  id: string;
  member_id?: string;
  member_name?: string;
  section_type: string;
  title: string;
  organization?: string;
  start_date?: string;
  end_date?: string;
  is_current?: boolean;
  description?: string;
  sort_order?: number;
}

const SECTION_CONFIG: Record<string, { label: string; icon: string }> = {
  personal: { label: "אישי", icon: "👤" },
  education: { label: "השכלה", icon: "🎓" },
  experience: { label: "ניסיון", icon: "💼" },
  skill: { label: "מיומנויות", icon: "⚡" },
  language: { label: "שפות", icon: "🌐" },
  certification: { label: "הסמכות", icon: "📜" },
  other: { label: "אחר", icon: "📋" },
};

const SECTION_ORDER = ["personal", "education", "experience", "skill", "language", "certification", "other"];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("he-IL", {
    month: "short",
    year: "numeric",
  });
}

export default function CvPage() {
  const router = useRouter();
  const [items, setItems] = useState<CvSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMember, setActiveMember] = useState(FAMILY_MEMBERS[0]);
  const [modal, setModal] = useState<{
    mode: "create" | "edit";
    initial?: Record<string, unknown>;
  } | null>(null);

  const refresh = useCallback(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => setItems(d.cv || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`למחוק את "${label}"?`)) return;
    try {
      await crudRequest("cv", "DELETE", { id });
      refresh();
    } catch {
      alert("שגיאה במחיקה");
    }
  };

  const memberSections = items.filter((s) => s.member_name === activeMember);

  // Group by section type in predefined order
  const grouped = SECTION_ORDER.reduce<Record<string, CvSection[]>>((acc, type) => {
    const sections = memberSections.filter((s) => s.section_type === type);
    if (sections.length > 0) acc[type] = sections;
    return acc;
  }, {});

  return (
    <div dir="rtl" className="min-h-dvh bg-surface text-primary">
      <header className="border-b border-border bg-card px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/resources")}
              className="text-muted hover:text-primary transition-colors text-sm"
            >
              → חזרה
            </button>
            <div>
              <h1 className="text-xl font-medium">📄 קורות חיים</h1>
              <p className="text-sm text-secondary">ניהול קורות חיים אישיים</p>
            </div>
          </div>
          <button
            onClick={() =>
              setModal({
                mode: "create",
                initial: { member_name: activeMember },
              })
            }
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
          >
            + הוסף סעיף
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 sm:p-6">
        {/* Member tabs */}
        <div className="flex gap-1 bg-tag rounded-lg p-1 w-fit mb-6">
          {FAMILY_MEMBERS.map((name) => (
            <button
              key={name}
              onClick={() => setActiveMember(name)}
              className={`text-sm px-4 py-2 rounded-md transition-colors ${
                activeMember === name
                  ? "bg-card text-primary shadow-sm font-medium"
                  : "text-secondary hover:text-primary"
              }`}
            >
              {name}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted text-sm">טוען...</div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="text-center py-12 text-muted">
            <div className="text-4xl mb-2">📄</div>
            <p className="text-sm">אין נתוני קורות חיים עבור {activeMember}</p>
            <button
              onClick={() =>
                setModal({
                  mode: "create",
                  initial: { member_name: activeMember },
                })
              }
              className="mt-3 text-link hover:underline text-sm"
            >
              הוסף סעיף ראשון
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([type, sections]) => {
              const conf = SECTION_CONFIG[type] || SECTION_CONFIG.other;
              return (
                <div key={type}>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-medium text-muted">
                      {conf.icon} {conf.label}
                    </h2>
                    <button
                      onClick={() =>
                        setModal({
                          mode: "create",
                          initial: { member_name: activeMember, section_type: type },
                        })
                      }
                      className="text-xs text-link hover:underline"
                    >
                      + הוסף
                    </button>
                  </div>
                  <div className="space-y-2">
                    {sections.map((s) => (
                      <div
                        key={s.id}
                        className="bg-card rounded-xl border border-border p-4"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{s.title}</p>
                            {s.organization && (
                              <p className="text-sm text-secondary mt-0.5">{s.organization}</p>
                            )}
                            <div className="flex flex-wrap gap-2 mt-1.5 text-xs text-muted">
                              {s.start_date && (
                                <span>
                                  {formatDate(s.start_date)}
                                  {s.is_current
                                    ? " — היום"
                                    : s.end_date
                                      ? ` — ${formatDate(s.end_date)}`
                                      : ""}
                                </span>
                              )}
                            </div>
                            {s.description && (
                              <p className="text-sm text-secondary mt-2 whitespace-pre-wrap">
                                {s.description}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() =>
                                setModal({
                                  mode: "edit",
                                  initial: {
                                    id: s.id,
                                    member_name: s.member_name,
                                    section_type: s.section_type,
                                    title: s.title,
                                    organization: s.organization,
                                    start_date: s.start_date,
                                    end_date: s.end_date,
                                    is_current: s.is_current,
                                    description: s.description,
                                    sort_order: s.sort_order,
                                  },
                                })
                              }
                              className="text-xs text-muted hover:text-primary p-1.5 rounded-lg hover:bg-hover transition-colors"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDelete(s.id, s.title)}
                              className="text-xs text-muted hover:text-red-500 p-1.5 rounded-lg hover:bg-hover transition-colors"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {modal && (
        <FormModal
          entity="cv"
          mode={modal.mode}
          initial={modal.initial}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
