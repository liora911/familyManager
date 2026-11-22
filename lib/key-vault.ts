import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "crypto";
import { sql } from "@/lib/db";

// Saved keys/passwords are encrypted in the database with AES-256-GCM.
// The encryption key is derived from APP_SECRET, which lives only in the
// server environment — a leaked database alone does not reveal the values.
// Losing or changing APP_SECRET makes the saved values unreadable.

const PREFIX = "enc:v1:";

function vaultKey(): Buffer {
  const secret = process.env.APP_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("APP_SECRET is missing or shorter than 32 characters");
  }
  return createHmac("sha256", secret).update("keys-encryption").digest();
}

export function encryptValue(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", vaultKey(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const parts = [iv, cipher.getAuthTag(), data].map((b) => b.toString("base64"));
  return PREFIX + parts.join(":");
}

/** Values saved before encryption was added are returned as they are. */
export function decryptValue(stored: string): string {
  if (!stored.startsWith(PREFIX)) return stored;
  const [iv, tag, data] = stored
    .slice(PREFIX.length)
    .split(":")
    .map((p) => Buffer.from(p, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", vaultKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

let legacyDone = false;

/** Encrypts rows that were saved as plain text before encryption existed. */
export async function encryptLegacyKeys() {
  if (legacyDone) return;
  const rows = await sql`SELECT id, value FROM keys WHERE value NOT LIKE ${PREFIX + "%"}`;
  for (const row of rows) {
    await sql`
      UPDATE keys SET value = ${encryptValue(row.value)}
      WHERE id = ${row.id} AND value = ${row.value}
    `;
  }
  legacyDone = true;
}
