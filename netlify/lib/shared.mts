// Shared helpers for the Glow Up push functions.
import webpush from "web-push";
import { getStore } from "@netlify/blobs";

export const store = () => getStore({ name: "glowup-push", consistency: "strong" });

export function vapid() {
  const pub = Netlify.env.get("VAPID_PUBLIC_KEY"), priv = Netlify.env.get("VAPID_PRIVATE_KEY");
  if (!pub || !priv) throw new Error("VAPID keys are not configured");
  webpush.setVapidDetails("https://glowup-planner.netlify.app", pub, priv);
  return pub;
}

/** Sends one notification. Returns false when the subscription is gone and should be deleted. */
export async function send(sub: webpush.PushSubscription, payload: { title: string; body: string; tag: string }) {
  try {
    await webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 600, urgency: "high" });
    return true;
  } catch (e: any) {
    if (e?.statusCode === 404 || e?.statusCode === 410) return false;
    console.error("push failed", e?.statusCode, e?.body);
    return true;
  }
}

/** Local date (YYYY-MM-DD) and minutes since midnight in the device's time zone. */
export function localNow(tz: string, at = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: tz || "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(at).map(p => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, min: Number(parts.hour) * 60 + Number(parts.minute) };
}
export const hm = (t?: string) => { if (!t) return null; const [h, m] = t.split(":").map(Number); return h * 60 + m; };
