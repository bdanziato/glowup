// Runs every minute (UTC cron "* * * * *"): sends task, water and rest-timer reminders.
import type { Config } from "@netlify/functions";
import { store, vapid, send, localNow, hm } from "../lib/shared.mts";

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export default async () => {
  vapid();
  const s = store(), started = Date.now();
  const { blobs } = await s.list({ prefix: "dev/" });
  const rests: Promise<unknown>[] = [];

  for (const b of blobs) {
    const id = b.key.slice(4);
    const dev = (await s.get(b.key, { type: "json" })) as any;
    if (!dev?.sub) continue;
    const sch = dev.schedule || {}, { date, min } = localNow(dev.tz);
    const sent = ((await s.get(`sent/${id}`, { type: "json" })) as any) || {};
    const out: { title: string; body: string; tag: string }[] = [];

    // planner tasks
    if (sch.tasks?.on) for (const t of sch.tasks.items || []) {
      const start = hm(t.time); if (t.date !== date || start == null) continue;
      const lead = Number(sch.tasks.lead) || 0, key = `task:${t.id}:${date}`;
      if (!sent[key] && min >= start - lead && min <= start + 15) {
        sent[key] = Date.now();
        out.push({ title: t.title, body: (lead && min < start ? `Começa às ${t.time}` : `Agora: ${t.time}`) + (t.end ? `–${t.end}` : ""), tag: key });
      }
    }
    // water: on the hour, every N hours after 8h, until 22h, while under the goal
    const w = sch.water;
    if (w?.on) {
      const every = Math.max(1, Number(w.every) || 2), h = Math.floor(min / 60), key = `water:${date}:${h}`;
      const ml = Number(w.ml?.[date]) || 0, goal = Number(w.goal) || 2000;
      if (h > 8 && h <= 22 && (h - 8) % every === 0 && min % 60 < 10 && !sent[key] && ml < goal) {
        sent[key] = Date.now();
        out.push({ title: "Hora de beber água 💧", body: `Hoje: ${ml.toLocaleString("pt-BR")} de ${goal.toLocaleString("pt-BR")} ml`, tag: "water" });
      }
    }

    let alive = true;
    for (const p of out) alive = (await send(dev.sub, p)) && alive;
    if (!alive) { await Promise.all([s.delete(b.key), s.delete(`sent/${id}`), s.delete(`rest/${id}`)]); continue; }
    if (out.length) {
      for (const k in sent) if (Date.now() - sent[k] > 3 * 864e5) delete sent[k];
      await s.setJSON(`sent/${id}`, sent);
    }

    // rest timer: fire at the right second if it ends within this run, otherwise as soon as it is due
    if (sch.rest !== false) {
      const r = (await s.get(`rest/${id}`, { type: "json" })) as any;
      if (r?.end) {
        const wait = r.end - Date.now();
        if (wait < -120e3) await s.delete(`rest/${id}`);
        else if (wait <= 26e3 - (Date.now() - started)) rests.push((async () => {
          if (wait > 0) await sleep(wait);
          const still = (await s.get(`rest/${id}`, { type: "json" })) as any;
          if (still?.end !== r.end) return;
          await s.delete(`rest/${id}`);
          await send(dev.sub, { title: "Descanso acabou", body: "Hora da próxima série! 💪", tag: "rest" });
        })());
      }
    }
  }
  await Promise.all(rests);
};

export const config: Config = { schedule: "* * * * *" };
