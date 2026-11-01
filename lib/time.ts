// Israel time helpers. The app thinks in Israeli wall-clock time, while the
// database stores absolute instants, so every conversion goes through here
// to get daylight saving right (+02:00 in winter, +03:00 in summer).

export const APP_TIME_ZONE = "Asia/Jerusalem";

const WALL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

/** UTC offset in Israel at the given moment, e.g. "+02:00" or "+03:00" */
export function israelOffset(date: Date = new Date()): string {
  const name =
    new Intl.DateTimeFormat("en-US", { timeZone: APP_TIME_ZONE, timeZoneName: "longOffset" })
      .formatToParts(date)
      .find((p) => p.type === "timeZoneName")?.value ?? "";
  const m = name.match(/([+-]\d{2}):?(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : "+02:00";
}

/** Israeli wall-clock time without an offset, e.g. "2026-11-01T20:00:00" */
export function israelWallTime(date: Date = new Date()): string {
  return date
    .toLocaleString("sv-SE", {
      timeZone: APP_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
    .replace(" ", "T");
}

/** True for "YYYY-MM-DDTHH:MM" or "YYYY-MM-DDTHH:MM:SS" with no offset or Z */
export function isWallTime(value: unknown): value is string {
  return typeof value === "string" && WALL_RE.test(value);
}

/**
 * Attach the correct Israeli offset to a wall-clock time:
 * "2026-04-10T20:00" → "2026-04-10T20:00:00+03:00".
 * Strings that are not plain wall times are returned unchanged.
 */
export function withIsraelOffset(wall: string): string {
  const m = wall.match(WALL_RE);
  if (!m) return wall;
  const base = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6] ?? "00"}`;
  let offset = israelOffset(new Date(base + "Z"));
  const check = israelOffset(new Date(base + offset));
  if (check !== offset) offset = check;
  return base + offset;
}

/** Add days or months while keeping the same Israeli wall-clock time across DST changes */
export function addIsraelTime(date: Date, unit: "day" | "month", amount: number): Date {
  const m = israelWallTime(date).match(WALL_RE);
  if (!m) return new Date(date.getTime() + (unit === "day" ? amount * 86_400_000 : 0));
  const naive = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] ?? 0)));
  if (unit === "day") naive.setUTCDate(naive.getUTCDate() + amount);
  else naive.setUTCMonth(naive.getUTCMonth() + amount);
  return new Date(withIsraelOffset(naive.toISOString().slice(0, 19)));
}
