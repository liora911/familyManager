// Signed login session. The cookie holds "<expiry>.<signature>", where the
// signature is an HMAC only the server can produce (keyed by APP_SECRET).
// Uses Web Crypto so it works in both middleware (edge) and API routes.
// Changing APP_PIN or APP_SECRET invalidates every existing session.

export const SESSION_COOKIE = "home-manager-auth";
export const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // seconds

const encoder = new TextEncoder();

export function hasAppSecret(): boolean {
  return (process.env.APP_SECRET?.length ?? 0) >= 32;
}

async function signingKey(): Promise<CryptoKey | null> {
  if (!hasAppSecret()) return null;
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(process.env.APP_SECRET!),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function payload(expiresAt: number): Uint8Array<ArrayBuffer> {
  return encoder.encode(`session:${expiresAt}:${process.env.APP_PIN ?? ""}`) as Uint8Array<ArrayBuffer>;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[0-9a-f]{64}$/.test(hex)) return null;
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

/** Returns null when APP_SECRET is missing or too short. */
export async function createSessionToken(): Promise<string | null> {
  const key = await signingKey();
  if (!key) return null;
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  const signature = await crypto.subtle.sign("HMAC", key, payload(expiresAt));
  return `${expiresAt}.${toHex(new Uint8Array(signature))}`;
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot < 1) return false;
  const expiresAt = Number(token.slice(0, dot));
  if (!Number.isInteger(expiresAt) || expiresAt < Date.now() / 1000) return false;
  const signature = fromHex(token.slice(dot + 1));
  if (!signature) return false;
  const key = await signingKey();
  if (!key) return false;
  return crypto.subtle.verify("HMAC", key, signature, payload(expiresAt));
}

export function sessionCookie(token: string, maxAge = SESSION_MAX_AGE): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure}`;
}
