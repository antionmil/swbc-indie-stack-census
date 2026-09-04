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
  n: number;
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
           (array_agg(f.cats order by f.confidence desc))[1] as cats,
           /* Prefer a sample that was actually SEEN over one that was inferred:
              "implied by Next.js" is true but it is not evidence a reader can
              go and check, and the row is meant to be checkable. */
           (array_agg(f.evidence order by (f.evidence->0->>'kind' = 'implied'), f.confidence desc, f.domain))[1] as ev,
           (array_agg(f.domain order by (f.evidence->0->>'kind' = 'implied'), f.confidence desc, f.domain))[1] as sample_domain
    from findings f where f.run_id = ${runId}
    group by f.tech
    order by n desc, f.tech asc`) as {
    tech: string; n: number; cats: number[]; ev: Evidence[]; sample_domain: string;
  }[];
  return rows.map((r) => ({
    tech: r.tech,
    n: r.n,
    cats: r.cats ?? [],
    sample: r.ev?.[0] ?? null,
    sample_domain: r.sample_domain,
  }));
}

export type SiteFinding = { domain: string; tech: string; version: string | null; cats: number[]; evidence: Evidence[] };

export async function findingsForTech(runId: number, tech: string): Promise<SiteFinding[]> {
  return (await sql()`
    select domain, tech, version, cats, evidence from findings
    where run_id = ${runId} and tech = ${tech} order by domain`) as SiteFinding[];
}

export async function findingsForSite(runId: number, domain: string): Promise<SiteFinding[]> {
  return (await sql()`
    select domain, tech, version, cats, evidence from findings
    where run_id = ${runId} and domain = ${domain}
    order by confidence desc, tech`) as SiteFinding[];
}

export type FetchRow = { domain: string; ok: number; status: number | null; final_url: string | null; ms: number; error: string | null };

export async function fetchRows(runId: number): Promise<FetchRow[]> {
  return (await sql()`
    select domain, ok, status, final_url, ms, error from fetches
    where run_id = ${runId} order by domain`) as FetchRow[];
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
