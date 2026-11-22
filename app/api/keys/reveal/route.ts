import { sql } from "@/lib/db";
import { decryptValue } from "@/lib/key-vault";
import { NextRequest, NextResponse } from "next/server";

// POST { id } — returns the real value of one saved key.
// The dashboard never receives values; they are fetched here one at a time.
export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    const [row] = await sql`SELECT value FROM keys WHERE id = ${id}`;
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(
      { value: decryptValue(row.value) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("Key reveal error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Reveal failed" }, { status: 500 });
  }
}
