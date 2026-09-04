import "server-only";
import { hasDb, sql } from "@/lib/db";

/* Re-exported so pages have one import for census things. The function itself
   lives in slug.ts, which has no server-only import — the QA gate uses it. */
export { techSlug } from "@/lib/slug";

/**
 * Every read the site does. All of them run at BUILD time or during an ISR
 * revalidation — never while a visitor waits. Neon's free plan scales the
 * compute to zero after five minutes idle and that cannot be turned off, so a
 * query on the request path would hand the first visitor after a quiet hour a
 * cold Postgres.
 */

export type Run = {
  id: number;
  /** What the site calls it: "survey 003". NOT the row id — the diff gate
   *  creates and deletes synthetic runs, and a serial column keeps the numbers
   *  it hands out even when the rows are gone. Left as the id, a site that had
   *  run two surveys would announce "Run 001" and then "Run 004". */
  seq: number;
  started_at: string;
  finished_at: string;
  n_sites: number;
  n_fetched: number;
  ruleset_size: number;
};

export type Evidence = { kind: string; detail: string };

export type TallyRow = {
  tech: string;
  /** Movement since the previous survey, counted only on the products that
   *  answered in BOTH — see `deltas()`. Absent on the first survey, and on the
   *  two signals that flap. */
  delta?: number;
  /** Both groups, and the total. The comparison IS the census: what 51
   *  commercial products chose, beside what 1,173 open-source ones chose. */
  n: number;
  n_indie: number;
  n_oss: number;
  cats: number[];
  /** One real example, so a count is never printed without something to check
   *  it against. */
  sample: Evidence | null;
  sample_domain: string;
};

export async function latestRun(): Promise<Run | null> {
  if (!hasDb()) return null;
  const r = (await sql()`
    select id, started_at, finished_at, n_sites, n_fetched, ruleset_size,
           (select count(*) from runs p where p.finished_at is not null and p.id <= runs.id)::int as seq
    from runs where finished_at is not null order by id desc limit 1`) as Run[];
  return r[0] ?? null;
}

export async function runCount(): Promise<number> {
  if (!hasDb()) return 0;
  const r = (await sql()`select count(*)::int as n from runs where finished_at is not null`) as { n: number }[];
  return r[0]?.n ?? 0;
}

export async function tally(runId: number): Promise<TallyRow[]> {
  const rows = (await sql()`
    select f.tech,
           count(*)::int as n,
           count(*) filter (where x.kind = 'indie')::int as n_indie,
           count(*) filter (where x.kind = 'oss')::int as n_oss,
           (array_agg(f.cats order by f.confidence desc))[1] as cats,
           /* Prefer a sample that was actually SEEN over one that was inferred:
              "implied by Next.js" is true but it is not evidence a reader can
              go and check, and the row is meant to be checkable. */
           (array_agg(f.evidence order by (f.evidence->0->>'kind' = 'implied'), f.confidence desc, f.domain))[1] as ev,
           (array_agg(f.domain order by (f.evidence->0->>'kind' = 'implied'), f.confidence desc, f.domain))[1] as sample_domain
    from findings f
    join fetches x on x.run_id = f.run_id and x.domain = f.domain
    where f.run_id = ${runId}
    group by f.tech
    order by n desc, f.tech asc`) as {
    tech: string; n: number; n_indie: number; n_oss: number;
    cats: number[]; ev: Evidence[]; sample_domain: string;
  }[];
  return rows.map((r) => ({
    tech: r.tech,
    n: r.n,
    n_indie: r.n_indie,
    n_oss: r.n_oss,
    cats: r.cats ?? [],
    sample: r.ev?.[0] ?? null,
    sample_domain: r.sample_domain,
  }));
}

/** How many of each group actually answered. Every figure on the site is out
 *  of one of these two numbers, never out of the number asked. */
export type Denominators = { indie: number; oss: number; total: number };

export async function answered(runId: number): Promise<Denominators> {
  const r = (await sql()`
    select count(*) filter (where kind = 'indie' and ok = 1)::int as indie,
           count(*) filter (where kind = 'oss' and ok = 1)::int as oss,
           count(*) filter (where ok = 1)::int as total
    from fetches where run_id = ${runId}`) as Denominators[];
  return r[0] ?? { indie: 0, oss: 0, total: 0 };
}

export type SiteFinding = { domain: string; tech: string; version: string | null; cats: number[]; evidence: Evidence[] };

/**
 * Who runs it. The hand-picked group comes first, then the open-source group,
 * because a reader looking at "who uses Sentry" wants the commercial products
 * they recognise before nine hundred self-hosted tools.
 *
 * `limit` exists because a technology can now be on a thousand sites, and a
 * page that prints a thousand rows of evidence is not a page.
 */
export async function findingsForTech(runId: number, tech: string, limit = 160): Promise<SiteFinding[]> {
  return (await sql()`
    select f.domain, f.tech, f.version, f.cats, f.evidence
    from findings f
    join fetches x on x.run_id = f.run_id and x.domain = f.domain
    where f.run_id = ${runId} and f.tech = ${tech}
    order by (x.kind = 'indie') desc, f.domain
    limit ${limit}`) as SiteFinding[];
}

export async function findingsForSite(runId: number, domain: string): Promise<SiteFinding[]> {
  return (await sql()`
    select domain, tech, version, cats, evidence from findings
    where run_id = ${runId} and domain = ${domain}
    order by confidence desc, tech`) as SiteFinding[];
}

export type FetchRow = { domain: string; ok: number; status: number | null; final_url: string | null; ms: number; error: string | null };

/** One row. The whole table is 1,224 rows and no page needs all of it. */
export async function fetchRow(runId: number, domain: string): Promise<FetchRow | null> {
  const r = (await sql()`
    select domain, ok, status, final_url, ms, error from fetches
    where run_id = ${runId} and domain = ${domain}`) as FetchRow[];
  return r[0] ?? null;
}

/** Only the ones that did not answer. Named on the census page, and there are
 *  never many. */
export async function silentSites(runId: number, limit = 40): Promise<FetchRow[]> {
  return (await sql()`
    select domain, ok, status, final_url, ms, error from fetches
    where run_id = ${runId} and ok = 0 order by domain limit ${limit}`) as FetchRow[];
}

export type Change = { domain: string; tech: string; kind: string; evidence: string | null; run_id: number; at: string };

export async function recentChanges(limit = 200): Promise<Change[]> {
  if (!hasDb()) return [];
  return (await sql()`
    select domain, tech, kind, evidence, run_id, at from changes
    order by run_id desc, domain, tech limit ${limit}`) as Change[];
}

/** run id -> the survey number the site prints. */
export async function runSeq(): Promise<Map<number, number>> {
  if (!hasDb()) return new Map();
  const rows = (await sql()`
    select id, (row_number() over (order by id))::int as seq
    from runs where finished_at is not null`) as { id: number; seq: number }[];
  return new Map(rows.map((r) => [r.id, r.seq]));
}

export async function categoryNames(): Promise<Map<number, string>> {
  const rows = (await sql()`select id, name from categories`) as { id: number; name: string }[];
  return new Map(rows.map((r) => [r.id, r.name]));
}

/* ------------------------------------------------------------------------ *
 * The whole survey, once.
 * ------------------------------------------------------------------------ */

export type Survey = {
  run: Run;
  n: Denominators;
  tally: TallyRow[];
  /** tech -> the products carrying it, commercial group first. */
  byTech: Map<string, SiteFinding[]>;
  /** domain -> everything found on it. */
  bySite: Map<string, SiteFinding[]>;
  fetches: Map<string, FetchRow>;
  cats: Map<number, string>;
  silent: FetchRow[];
  /** The survey this one is compared against. Null on the first. */
  prevRun: number | null;
};

/**
 * ONE query per process instead of three per page.
 *
 * At 51 products the pages each ran their own queries and it did not matter.
 * At 1,224 that is about 2,400 queries in a build, run from thirteen workers
 * at once, and Neon answered with `53300: too many connections for role` —
 * the build failed on /s/guacamole.apache.org with no other symptom.
 *
 * So the survey is loaded whole and indexed in memory: 7,800 findings is a few
 * megabytes. The cache is a module-level promise with a short life, not React's
 * `cache()`, which memoises per request and would not be shared between the
 * pages of a build. The life is short because the same module is reused by a
 * warm serverless instance, and a cache with no expiry would serve last week's
 * survey for as long as the instance lived.
 */
const TTL_MS = 120_000;
let cached: { at: number; value: Promise<Survey | null> } | null = null;

export function survey(): Promise<Survey | null> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value;
  const value = load();
  cached = { at: Date.now(), value };
  /* A failed load must not be cached, or one blip poisons every page for two
     minutes. */
  value.catch(() => {
    if (cached?.value === value) cached = null;
  });
  return value;
}

/**
 * Two signals that flap without anything changing, so they get no movement
 * figure. Kept in step with NOISY in run.ts, which keeps them out of the
 * change feed for the same reason.
 */
const NO_DELTA = new Set(["HTTP/3", "HSTS"]);

/**
 * How far each figure moved since the previous survey.
 *
 * Counted ONLY on the products that answered in both surveys. Without that
 * restriction a morning where forty sites time out reads as forty products
 * dropping their framework overnight, and the arrows would be reporting the
 * weather rather than the web.
 */
async function deltas(runId: number, prevId: number): Promise<Map<string, number>> {
  const rows = (await sql()`
    select f.tech,
           count(*) filter (where f.run_id = ${runId})::int as now,
           count(*) filter (where f.run_id = ${prevId})::int as before
    from findings f
    join fetches a on a.run_id = ${runId} and a.domain = f.domain and a.ok = 1
    join fetches b on b.run_id = ${prevId} and b.domain = f.domain and b.ok = 1
    where f.run_id in (${runId}, ${prevId})
    group by f.tech`) as unknown as { tech: string; now: number; before: number }[];
  const out = new Map<string, number>();
  for (const r of rows) if (r.now !== r.before) out.set(r.tech, r.now - r.before);
  return out;
}

async function load(): Promise<Survey | null> {
  const run = await latestRun();
  if (!run) return null;
  const db = sql();

  const prev = (await db`
    select id from runs where finished_at is not null and id < ${run.id}
    order by id desc limit 1`) as unknown as { id: number }[];
  const prevRun = prev[0]?.id ?? null;
  const moved = prevRun ? await deltas(run.id, prevRun) : new Map<string, number>();

  const [rowsRaw, fetchRaw, catRaw] = await Promise.all([
    db`
      select f.domain, f.tech, f.version, f.cats, f.evidence, f.confidence, x.kind
      from findings f
      join fetches x on x.run_id = f.run_id and x.domain = f.domain
      where f.run_id = ${run.id}`,
    db`select domain, kind, ok, status, final_url, ms, error from fetches where run_id = ${run.id}`,
    db`select id, name from categories`,
  ]);
  const rows = rowsRaw as unknown as (SiteFinding & { kind: string; confidence: number })[];
  const fetchRows = fetchRaw as unknown as (FetchRow & { kind: string })[];
  const catRows = catRaw as unknown as { id: number; name: string }[];

  const n: Denominators = { indie: 0, oss: 0, total: 0 };
  const fetches = new Map<string, FetchRow>();
  const silent: FetchRow[] = [];
  for (const f of fetchRows) {
    fetches.set(f.domain, f);
    if (f.ok) {
      n.total++;
      if (f.kind === "indie") n.indie++;
      else n.oss++;
    } else silent.push(f);
  }

  const byTech = new Map<string, SiteFinding[]>();
  const bySite = new Map<string, SiteFinding[]>();
  const counts = new Map<string, { n: number; indie: number; oss: number; cats: number[]; sample: Evidence | null; sampleDomain: string; seen: boolean }>();

  for (const r of rows) {
    const finding: SiteFinding = {
      domain: r.domain, tech: r.tech, version: r.version, cats: r.cats, evidence: r.evidence,
    };
    byTech.set(r.tech, [...(byTech.get(r.tech) ?? []), finding]);
    bySite.set(r.domain, [...(bySite.get(r.domain) ?? []), finding]);

    const c = counts.get(r.tech) ?? { n: 0, indie: 0, oss: 0, cats: r.cats ?? [], sample: null, sampleDomain: "", seen: false };
    c.n++;
    if (r.kind === "indie") c.indie++;
    else c.oss++;
    /* Prefer a sample that was actually SEEN over one that was inferred:
       "implied by Next.js" is true, but it is not something a reader can go and
       check, and the row exists to be checkable. */
    const seen = r.evidence?.[0]?.kind !== "implied";
    if (!c.sample || (seen && !c.seen)) {
      c.sample = r.evidence?.[0] ?? null;
      c.sampleDomain = r.domain;
      c.seen = seen;
    }
    counts.set(r.tech, c);
  }

  /* The commercial products first on every technology page: a reader looking at
     "who runs Sentry" wants the names they recognise before nine hundred
     self-hosted tools. */
  const kindOf = new Map(fetchRows.map((f) => [f.domain, f.kind]));
  for (const [, list] of byTech)
    list.sort((a, b) => {
      const ka = kindOf.get(a.domain) === "indie" ? 0 : 1;
      const kb = kindOf.get(b.domain) === "indie" ? 0 : 1;
      return ka - kb || a.domain.localeCompare(b.domain);
    });

  const tally: TallyRow[] = [...counts.entries()]
    .map(([tech, c]) => ({
      tech, n: c.n, n_indie: c.indie, n_oss: c.oss, cats: c.cats,
      sample: c.sample, sample_domain: c.sampleDomain,
      delta: NO_DELTA.has(tech) ? undefined : moved.get(tech),
    }))
    .sort((a, b) => b.n - a.n || a.tech.localeCompare(b.tech));

  return {
    run, n, tally, byTech, bySite, fetches, prevRun,
    cats: new Map(catRows.map((c) => [c.id, c.name])),
    silent: silent.sort((a, b) => a.domain.localeCompare(b.domain)),
  };
}
