"use client";

import { useEffect, useState } from "react";

type Counts = { here: number; week: number; ever: number };

/* 1,240 -> "1.2k". Under a thousand keeps its exact figure, because rounding a
   real small number is the first step towards inflating it. */
const short = (n: number) =>
  n < 1000 ? String(n) : n < 10_000 ? `${(n / 1000).toFixed(1)}k` : `${Math.round(n / 1000)}k`;

/* A weekly or all-time figure only appears once it means something. Holding a
   small real number back is allowed. Inflating one is not, so nothing here is
   ever rounded up to look busier. "Reading now" is always shown, including when
   it is 1 — that is true, and it is useful. */
const WEEK_FLOOR = 25;
const EVER_FLOOR = 50;

/**
 * The room, in the masthead.
 *
 * Nothing is claimed until the first heartbeat returns: a bar that renders a
 * number on the server and then corrects itself is the stale flash this project
 * bans, and the honest form of "not known yet" is to show nothing.
 */
export function Here() {
  const [c, setC] = useState<Counts | null>(null);

  useEffect(() => {
    let dead = false;
    const beat = async () => {
      try {
        const r = await fetch("/api/here", { method: "POST" });
        const d = (await r.json()) as Counts;
        if (!dead && typeof d.here === "number" && d.here > 0) setC(d);
      } catch {
        /* silence beats a wrong number */
      }
    };
    beat();
    const id = setInterval(beat, 20_000);
    return () => {
      dead = true;
      clearInterval(id);
    };
  }, []);

  if (!c) return null;

  const stats: string[] = [];
  if (c.week >= WEEK_FLOOR) stats.push(`${short(c.week)} this week`);
  if (c.ever >= EVER_FLOOR) stats.push(`${short(c.ever)} all-time`);

  return (
    <span className="flex items-center gap-2 font-mono text-[11px] text-faint">
      <span className="relative flex h-1.5 w-1.5 shrink-0" aria-hidden>
        <span className="pulse absolute inline-flex h-full w-full rounded-full bg-accent opacity-70" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
      </span>
      <span className="text-ink">{c.here}</span>
      <span>reading now</span>
      {stats.length > 0 && <span aria-hidden>·</span>}
      {stats.map((s, i) => (
        <span key={s}>
          {s}
          {i < stats.length - 1 && <span aria-hidden> ·</span>}
        </span>
      ))}
    </span>
  );
}
