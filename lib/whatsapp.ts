// Server-side WhatsApp delivery through Meta's Cloud API.
//
// Disabled unless WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID and
// WHATSAPP_RECIPIENTS are set. Sends one approved template message per
// recipient, records every attempt in notification_log, and refuses to
// pass a daily cap or to keep going after Meta reports a rate limit.

import { sql } from "@/lib/db";

// Meta error codes after which further sends in this run are pointless
const STOP_CODES = new Set<number>([
  80007,  // throttling
  130429, // rate limit hit
  131048, // spam rate limit
  131056, // pair rate limit
  190,    // invalid or expired access token
  131031, // business account locked by Meta
  131042, // payment / eligibility problem on the account
]);

export interface WhatsAppConfig {
  token: string;
  phoneNumberId: string;
  recipients: string[];
  template: string;
  language: string;
  dailyCap: number;
  graphVersion: string;
}

export interface WhatsAppResult {
  sent: number;
  failed: number;
  /** True when nothing was attempted because WhatsApp is not configured */
  skipped: boolean;
  /** Set when sending stopped early: not_configured | daily_cap | rate_limited */
  reason?: "not_configured" | "daily_cap" | "rate_limited";
  errors: string[];
}

/** Names of the required environment variables that are still empty */
export function missingWhatsAppConfig(): string[] {
  const missing: string[] = [];
  if (!process.env.WHATSAPP_TOKEN) missing.push("WHATSAPP_TOKEN");
  if (!process.env.WHATSAPP_PHONE_NUMBER_ID) missing.push("WHATSAPP_PHONE_NUMBER_ID");
  if (parseRecipients(process.env.WHATSAPP_RECIPIENTS).length === 0) missing.push("WHATSAPP_RECIPIENTS");
  return missing;
}

export function isWhatsAppConfigured(): boolean {
  return missingWhatsAppConfig().length === 0;
}

/** "0545432627, +972 52-357-1279" → ["972545432627", "972523571279"] */
function parseRecipients(raw: string | undefined): string[] {
  return (raw || "")
    .split(",")
    .map((s) => s.replace(/\D/g, ""))
    .map((d) => (d.startsWith("0") ? "972" + d.slice(1) : d))
    .filter((d) => d.length >= 9);
}

function getConfig(): WhatsAppConfig | null {
  if (!isWhatsAppConfigured()) return null;
  return {
    token: process.env.WHATSAPP_TOKEN!,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID!,
    recipients: parseRecipients(process.env.WHATSAPP_RECIPIENTS),
    template: process.env.WHATSAPP_TEMPLATE || "reminder",
    language: process.env.WHATSAPP_TEMPLATE_LANG || "he",
    dailyCap: Math.max(1, Number(process.env.WHATSAPP_DAILY_CAP) || 100),
    graphVersion: process.env.WHATSAPP_GRAPH_VERSION || "v25.0",
  };
}

/**
 * Template parameters may not contain newlines, tabs or 4+ consecutive
 * spaces, and the whole body must stay short.
 */
function sanitizeParam(text: string, max = 900): string {
  return text
    .replace(/[\r\n\t]+/g, " ")
    .replace(/ {4,}/g, "   ")
    .trim()
    .slice(0, max);
}

// ── Delivery log (also used for the daily cap) ──────────────────────

let logTableReady: Promise<unknown> | null = null;

function ensureLogTable(): Promise<unknown> {
  if (!logTableReady) {
    logTableReady = sql`
      CREATE TABLE IF NOT EXISTS notification_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        channel TEXT NOT NULL,
        recipient TEXT,
        status TEXT NOT NULL,
        detail TEXT,
        sent_at TIMESTAMPTZ DEFAULT NOW()
      )
    `.catch((e) => {
      logTableReady = null;
      throw e;
    });
  }
  return logTableReady;
}

async function logDelivery(recipient: string | null, status: string, detail?: string) {
  try {
    await sql`
      INSERT INTO notification_log (channel, recipient, status, detail)
      VALUES ('whatsapp', ${recipient}, ${status}, ${detail ?? null})
    `;
  } catch (e) {
    console.error("[whatsapp] failed to write log:", e);
  }
}

async function sentInLast24h(): Promise<number> {
  const [row] = await sql`
    SELECT COUNT(*)::int AS n
    FROM notification_log
    WHERE channel = 'whatsapp' AND status = 'sent'
      AND sent_at > NOW() - INTERVAL '24 hours'
  `;
  return Number(row?.n ?? 0);
}

// ── Sending ─────────────────────────────────────────────────────────

interface GraphError {
  error?: { code?: number; message?: string; error_subcode?: number };
  messages?: { id: string }[];
}

/**
 * Send the configured template with `text` in its {{1}} slot to every
 * recipient (or the given subset). Never throws for Meta-side failures;
 * inspect the result instead.
 */
export async function sendWhatsAppTemplate(
  text: string,
  recipients?: string[]
): Promise<WhatsAppResult> {
  const result: WhatsAppResult = { sent: 0, failed: 0, skipped: false, errors: [] };

  const cfg = getConfig();
  if (!cfg) {
    return { ...result, skipped: true, reason: "not_configured" };
  }

  await ensureLogTable();
  const targets = recipients && recipients.length > 0 ? recipients : cfg.recipients;
  const param = sanitizeParam(text);
  let used = await sentInLast24h();

  for (const to of targets) {
    if (used >= cfg.dailyCap) {
      result.reason = "daily_cap";
      await logDelivery(to, "capped", `daily cap ${cfg.dailyCap} reached`);
      break;
    }

    let res: Response;
    try {
      res = await fetch(
        `https://graph.facebook.com/${cfg.graphVersion}/${cfg.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${cfg.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to,
            type: "template",
            template: {
              name: cfg.template,
              language: { code: cfg.language },
              components: [
                { type: "body", parameters: [{ type: "text", text: param }] },
              ],
            },
          }),
        }
      );
    } catch (e) {
      const msg = `network: ${e instanceof Error ? e.message : String(e)}`;
      result.failed++;
      result.errors.push(msg);
      await logDelivery(to, "failed", msg);
      continue;
    }

    const body = (await res.json().catch(() => ({}))) as GraphError;

    if (res.ok) {
      result.sent++;
      used++;
      await logDelivery(to, "sent", body.messages?.[0]?.id);
      continue;
    }

    const code = body.error?.code;
    const msg = `${code ?? res.status}: ${body.error?.message ?? res.statusText}`;
    result.failed++;
    result.errors.push(`${to} → ${msg}`);
    await logDelivery(to, "failed", msg);

    if (code !== undefined && STOP_CODES.has(code)) {
      result.reason = "rate_limited";
      break;
    }
  }

  return result;
}
