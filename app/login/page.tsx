"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim() || loading) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pin.trim() }),
      });

      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError("קוד שגוי, נסי שוב");
        setPin("");
      }
    } catch {
      setError("שגיאה, נסי שוב");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="flex items-center justify-center min-h-dvh bg-gray-50 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
        <div className="text-center space-y-2">
          <p className="text-4xl">🏠</p>
          <h1 className="text-xl font-medium text-gray-900">מנהל הבית</h1>
          <p className="text-sm text-gray-500">הזיני קוד גישה</p>
        </div>

        <input
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="קוד גישה"
          autoFocus
          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3
                     text-gray-900 placeholder-gray-400 text-center text-lg tracking-widest
                     focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <button
          type="submit"
          disabled={!pin.trim() || loading}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-200 disabled:text-gray-400
                     text-white font-medium px-6 py-3 rounded-xl transition-colors"
        >
          {loading ? "..." : "כניסה"}
        </button>
      </form>
    </div>
  );
}
