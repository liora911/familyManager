// Client-side helpers for Web Push subscriptions.
// enablePush() must be called from a user gesture (a button click),
// otherwise iOS and Chrome silently block the permission prompt.

export type PushStatus = "unsupported" | "denied" | "available" | "subscribed";

function isSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** iOS only delivers push to apps installed on the home screen. */
export function needsHomeScreenInstall(): boolean {
  if (typeof window === "undefined") return false;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = window.matchMedia("(display-mode: standalone)").matches;
  return isIOS && !standalone;
}

export async function getPushStatus(): Promise<PushStatus> {
  if (!isSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub && Notification.permission === "granted") return "subscribed";
  } catch {
    // fall through
  }
  return "available";
}

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function enablePush(): Promise<PushStatus> {
  if (!isSupported()) return "unsupported";

  const permission = await Notification.requestPermission();
  if (permission === "denied") return "denied";
  if (permission !== "granted") return "available";

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const res = await fetch("/api/push");
    const { publicKey } = await res.json();
    if (!publicKey) throw new Error("Push is not configured on the server");
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  await fetch("/api/push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: sub.toJSON() }),
  });
  return "subscribed";
}

export async function disablePush(): Promise<PushStatus> {
  if (!isSupported()) return "unsupported";
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await fetch("/api/push", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    });
    await sub.unsubscribe();
  }
  return "available";
}
