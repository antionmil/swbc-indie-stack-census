import { EXTRA } from "@/lib/extra";
import { compile, type RawTech, type Tech } from "@/lib/wappalyzer";

/**
 * The GPL-3.0 fingerprint ruleset, fetched at run time — never committed.
 *
 * enthec/webappanalyzer carries on the rules Wappalyzer closed in August 2023.
 * They are GPL-3.0. This repository is public and is not GPL, so the rules stay
 * out of it: the weekly cron pulls them, matches with them in memory, and
 * stores only the RESULT — which is a fact about a website, not a derivative of
 * the ruleset. Keeping the fetch in the loop also means the census re-runs
 * against current rules rather than a copy that ages in a data folder.
 */
const BASE = "https://raw.githubusercontent.com/enthec/webappanalyzer/main/src";
const SHARDS = "_abcdefghijklmnopqrstuvwxyz".split("");

export type Categories = Record<number, { name: string; priority: number }>;

async function json<T>(url: string): Promise<T> {
  const r = await fetch(url, {
    headers: { "user-agent": "stackcensus.onedaybuilt.com (+one website a day)" },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return (await r.json()) as T;
}

export async function fetchRuleset(): Promise<{ techs: Tech[]; cats: Categories }> {
  const [cats, ...shards] = await Promise.all([
    json<Categories>(`${BASE}/categories.json`),
    ...SHARDS.map((c) => json<Record<string, RawTech>>(`${BASE}/technologies/${c}.json`).catch(() => ({}))),
  ]);
  const raws = new Map<string, RawTech>();
  for (const shard of shards)
    for (const [name, raw] of Object.entries(shard)) raws.set(name, raw);
  if (raws.size < 2000) throw new Error(`ruleset looks truncated: ${raws.size} technologies`);

  /* The supplement MERGES into the public rule rather than replacing it: a
     technology detected by both should keep the public rule's categories and
     implications, and gain our HTTP-visible patterns on top. */
  for (const [name, extra] of Object.entries(EXTRA)) {
    const base = raws.get(name);
    raws.set(name, base ? merge(base, extra) : extra);
  }

  const techs = [...raws.entries()].map(([name, raw]) => compile(name, raw));
  return { techs, cats };
}

const cat = (a: unknown, b: unknown): string[] => [
  ...(Array.isArray(a) ? a : a ? [a as string] : []),
  ...(Array.isArray(b) ? b : b ? [b as string] : []),
];

function merge(base: RawTech, extra: RawTech): RawTech {
  return {
    ...base,
    cats: base.cats?.length ? base.cats : extra.cats,
    html: cat(base.html, extra.html),
    scriptSrc: cat(base.scriptSrc, extra.scriptSrc),
    scripts: cat(base.scripts, extra.scripts),
    text: cat(base.text, extra.text),
    url: cat(base.url, extra.url),
    css: cat(base.css, extra.css),
    meta: { ...(base.meta ?? {}), ...(extra.meta ?? {}) },
    headers: { ...(base.headers ?? {}), ...(extra.headers ?? {}) },
    cookies: { ...(base.cookies ?? {}), ...(extra.cookies ?? {}) },
    implies: cat(base.implies, extra.implies),
  };
}
