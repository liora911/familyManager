import { createHash, timingSafeEqual } from "crypto";
import { createSessionToken, hasAppSecret, sessionCookie } from "@/lib/session";
import { releaseLoginSlot, takeLoginSlot } from "@/lib/login-limit";

function pinMatches(pin: unknown): boolean {
  const expected = process.env.APP_PIN;
  if (!expected || typeof pin !== "string") return false;
  const a = createHash("sha256").update(pin).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

// POST — check the PIN and start a session
export async function POST(req: Request) {
  if (!hasAppSecret()) {
    console.error("[auth] APP_SECRET is missing or shorter than 32 characters");
    return Response.json({ error: "חסר APP_SECRET בהגדרות השרת" }, { status: 500 });
  }

  let pin: unknown;
  try {
    ({ pin } = await req.json());
  } catch {
    return Response.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  let slot: string | null;
  try {
    slot = await takeLoginSlot(ip);
  } catch (err) {
    // Fail closed: without the attempt counter the PIN could be guessed freely
    console.error("[auth] login limiter failed:", err);
    return Response.json({ error: "שגיאה, נסו שוב" }, { status: 503 });
  }
  if (!slot) {
    return Response.json({ error: "יותר מדי ניסיונות, נסו שוב מאוחר יותר" }, { status: 429 });
  }

  if (!pinMatches(pin)) {
    return Response.json({ error: "קוד שגוי, נסו שוב" }, { status: 401 });
  }

  await releaseLoginSlot(slot).catch(() => {});

  const token = await createSessionToken();
  if (!token) {
    return Response.json({ error: "חסר APP_SECRET בהגדרות השרת" }, { status: 500 });
  }

  const response = Response.json({ success: true });
  response.headers.set("Set-Cookie", sessionCookie(token));
  return response;
}

// DELETE — log out (the cookie is HttpOnly, so the browser cannot clear it itself)
export async function DELETE() {
  const response = Response.json({ success: true });
  response.headers.set("Set-Cookie", sessionCookie("", 0));
  return response;
}
