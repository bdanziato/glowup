// /api/push — the app registers its push subscription and keeps its reminder schedule here.
import type { Config } from "@netlify/functions";
import { store, vapid, send } from "../lib/shared.mts";

const ID = /^[a-z0-9]{16,40}$/;

export default async (req: Request) => {
  if (req.method === "GET") {
    try { return Response.json({ publicKey: vapid() }); } catch { return Response.json({ error: "not configured" }, { status: 503 }); }
  }
  let body: any;
  try { body = await req.json(); } catch { return Response.json({ error: "bad json" }, { status: 400 }); }
  const id = String(body?.id || "");
  if (!ID.test(id)) return Response.json({ error: "bad id" }, { status: 400 });
  const s = store();

  switch (body.action) {
    case "subscribe": {
      const sub = body.sub;
      if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) return Response.json({ error: "bad subscription" }, { status: 400 });
      const prev = (await s.get(`dev/${id}`, { type: "json" })) as any;
      await s.setJSON(`dev/${id}`, { ...(prev || {}), sub, tz: String(body.tz || "America/Sao_Paulo"), schedule: body.schedule || prev?.schedule || null, updatedAt: Date.now() });
      if (body.test) { vapid(); await send(sub, { title: "Glow Up", body: "Pronto! Os avisos vão chegar mesmo com o app fechado.", tag: "hello" }); }
      return Response.json({ ok: true });
    }
    case "sync": {
      const prev = (await s.get(`dev/${id}`, { type: "json" })) as any;
      if (!prev?.sub) return Response.json({ error: "not subscribed" }, { status: 404 });
      await s.setJSON(`dev/${id}`, { ...prev, tz: String(body.tz || prev.tz), schedule: body.schedule || null, updatedAt: Date.now() });
      return Response.json({ ok: true });
    }
    case "rest": {
      const end = Number(body.end) || 0;
      if (end > Date.now() && end < Date.now() + 15 * 60e3) await s.setJSON(`rest/${id}`, { end });
      else await s.delete(`rest/${id}`);
      return Response.json({ ok: true });
    }
    case "unsubscribe": {
      await Promise.all([s.delete(`dev/${id}`), s.delete(`rest/${id}`), s.delete(`sent/${id}`)]);
      return Response.json({ ok: true });
    }
  }
  return Response.json({ error: "unknown action" }, { status: 400 });
};

export const config: Config = { path: "/api/push", method: ["GET", "POST"] };
