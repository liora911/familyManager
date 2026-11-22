import { sql } from "@/lib/db";

// Limits wrong PIN attempts. Each attempt takes a "slot" before the PIN is
// checked; a correct PIN gives the slot back. Slots are counted per IP and
// globally (so rotating IPs does not help), under a lock so parallel
// requests cannot slip past the limit.

const PER_IP_LIMIT = 5; // per 15 minutes
const GLOBAL_LIMIT = 50; // per hour

let tableReady: Promise<unknown> | null = null;

function ensureTable() {
  tableReady ??= (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS login_attempts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ip TEXT NOT NULL,
        attempted_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_login_attempts_time ON login_attempts(attempted_at)`;
  })().catch((err) => {
    tableReady = null;
    throw err;
  });
  return tableReady;
}

/** Returns the slot id when an attempt is allowed, or null when locked out. */
export async function takeLoginSlot(ip: string): Promise<string | null> {
  await ensureTable();
  const results = await sql.transaction([
    sql`SELECT pg_advisory_xact_lock(727274)`,
    sql`DELETE FROM login_attempts WHERE attempted_at < NOW() - INTERVAL '1 day'`,
    sql`
      INSERT INTO login_attempts (ip)
      SELECT ${ip}
      WHERE (SELECT COUNT(*) FROM login_attempts
             WHERE ip = ${ip} AND attempted_at > NOW() - INTERVAL '15 minutes') < ${PER_IP_LIMIT}
        AND (SELECT COUNT(*) FROM login_attempts
             WHERE attempted_at > NOW() - INTERVAL '1 hour') < ${GLOBAL_LIMIT}
      RETURNING id
    `,
  ]);
  const inserted = results[2] as { id: string }[];
  return inserted[0]?.id ?? null;
}

/** A correct PIN does not count against the limit. */
export async function releaseLoginSlot(id: string) {
  await sql`DELETE FROM login_attempts WHERE id = ${id}`;
}
