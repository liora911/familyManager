import { NextResponse } from "next/server";
import { missingWhatsAppConfig, sendWhatsAppTemplate } from "@/lib/whatsapp";

// GET /api/whatsapp/test — sends one test message to the configured
// recipients. Protected by the app's PIN cookie (middleware), so just open
// it in the browser while logged in.
export async function GET() {
  const missing = missingWhatsAppConfig();
  if (missing.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "WhatsApp is not configured yet",
        missing_env_vars: missing,
      },
      { status: 400 }
    );
  }

  const result = await sendWhatsAppTemplate("בדיקת חיבור ממנהל הבית, הכל עובד");
  return NextResponse.json(
    { ok: result.sent > 0 && result.failed === 0, ...result },
    { status: result.sent > 0 ? 200 : 502 }
  );
}
