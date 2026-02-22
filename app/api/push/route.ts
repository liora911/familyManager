import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET — return VAPID public key so the client can subscribe
export async function GET() {
  return NextResponse.json({
    publicKey: process.env.VAPID_PUBLIC_KEY || "",
  });
}

// POST — save a push subscription
export async function POST(req: NextRequest) {
  try {
    const { subscription } = await req.json();
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
    }

    const ua = req.headers.get("user-agent") || null;

    await sql`
      INSERT INTO push_subscriptions (endpoint, keys_p256dh, keys_auth, user_agent)
      VALUES (${subscription.endpoint}, ${subscription.keys.p256dh}, ${subscription.keys.auth}, ${ua})
      ON CONFLICT (endpoint) DO UPDATE SET
        keys_p256dh = EXCLUDED.keys_p256dh,
        keys_auth = EXCLUDED.keys_auth,
        user_agent = EXCLUDED.user_agent
    `;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Push subscribe error:", err);
    return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 });
  }
}

// DELETE — remove a push subscription
export async function DELETE(req: NextRequest) {
  try {
    const { endpoint } = await req.json();
    if (!endpoint) {
      return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
    }

    await sql`DELETE FROM push_subscriptions WHERE endpoint = ${endpoint}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Push unsubscribe error:", err);
    return NextResponse.json({ error: "Failed to remove subscription" }, { status: 500 });
  }
}
