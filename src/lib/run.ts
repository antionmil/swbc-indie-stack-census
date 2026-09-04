import "server-only";
import { SITES, byDomain } from "@/data/sites";
import { sql } from "@/lib/db";
import { canonical } from "@/lib/extra";
import { fetchEach } from "@/lib/fetchsite";
import { fetchRuleset } from "@/lib/ruleset";
import { detect } from "@/lib/wappalyzer";

/**
 * One census run, start to finish. The cron calls this; so does `pnpm census`.
 * There is no second implementation anywhere — a diff between two runs only
 * means something if the same code drew both sides of it.
 */
export type RunSummary = {
  run: number;
  fetched: number;
  failed: string[];
  findings: number;
  changes: { added: number; removed: number };
  /** Surveys whose raw findings were dropped to keep the database small. */
  pruned: number;
  ms: number;
};

export async function runCensus(): Promise<RunSummary> {
  const t0 = Date.now();
  const db = sql();

  /* The ruleset first. If GitHub is down, the run must not start: a census
     matched against half a ruleset would write "dropped Tailwind" across
     fifty sites and the feed would carry the lie for a week. */
  const { techs, cats } = await fetchRuleset();

  const [{ id: runId }] = (await db`
    insert into runs (n_sites, ruleset_size) values (${SITES.length}, ${techs.length})
    returning id`) as { id: number }[];

  /* Fetch, match and DISCARD, one site at a time. The 51-site version held
     every response in an array and matched them afterwards; at 1,224 sites
     that is gigabytes of HTML in a function that does not have it. Rows are
     flushed to Postgres in chunks for the same reason. */
  type FetchRow = { domain: string; kind: string; ok: number; status: number | null; url: string | null; ms: number; error: string | null };
  type FindingRow = { domain: string; tech: string; confidence: number; version: string | null; cats: string; evidence: string };

  const fetchBuf: FetchRow[] = [];
  const findBuf: FindingRow[] = [];
  const failed: string[] = [];
  let ok = 0;
  let findings = 0;

  const flushFetches = async () => {
    if (!fetchBuf.length) return;
    const c = fetchBuf.splice(0, fetchBuf.length);
    await db`
      insert into fetches (run_id, domain, kind, ok, status, final_url, ms, error)
      select ${runId}, * from unnest(
        ${c.map((r) => r.domain)}::text[],
        ${c.map((r) => r.kind)}::text[],
        ${c.map((r) => r.ok)}::int[],
        ${c.map((r) => r.status)}::int[],
        ${c.map((r) => r.url)}::text[],
        ${c.map((r) => r.ms)}::int[],
        ${c.map((r) => r.error)}::text[])
      on conflict do nothing`;
  };

  const flushFindings = async () => {
    if (!findBuf.length) return;
    const c = findBuf.splice(0, findBuf.length);
    await db`
      insert into findings (run_id, domain, tech, confidence, version, cats, evidence)
      select ${runId}, * from unnest(
        ${c.map((r) => r.domain)}::text[],
        ${c.map((r) => r.tech)}::text[],
        ${c.map((r) => r.confidence)}::int[],
        ${c.map((r) => r.version)}::text[],
        ${c.map((r) => r.cats)}::jsonb[],
        ${c.map((r) => r.evidence)}::jsonb[])
      on conflict do nothing`;
  };

  await fetchEach(
    SITES.map((s) => s.domain),
    async (p) => {
      if (!p.ok) {
        failed.push(p.domain);
        fetchBuf.push({ domain: p.domain, kind: byDomain.get(p.domain)?.kind ?? "oss", ok: 0, status: null, url: null, ms: p.ms, error: p.error.slice(0, 300) });
      } else {
        ok++;
        fetchBuf.push({
          domain: p.page.domain, kind: byDomain.get(p.page.domain)?.kind ?? "oss",
          ok: 1, status: p.page.status, url: p.page.url, ms: p.ms, error: null,
        });
        for (const d of detect(p.page, techs, canonical)) {
          findings++;
          findBuf.push({
            domain: p.page.domain,
            tech: d.name,
            confidence: d.confidence,
            version: d.version ?? null,
            cats: JSON.stringify(d.cats),
            evidence: JSON.stringify(d.evidence),
          });
        }
      }
      if (fetchBuf.length >= 200) await flushFetches();
      if (findBuf.length >= 200) await flushFindings();
    },
  );
  await flushFetches();
  await flushFindings();

  const catIds = Object.keys(cats).map(Number);
  await db`
    insert into categories (id, name)
    select * from unnest(${catIds}::int[], ${catIds.map((id) => cats[id].name)}::text[])
    on conflict (id) do update set name = excluded.name`;

  /* The previous FINISHED run, which is not always the previous row: a run
     that crashed half way through leaves an unfinished row behind, and
     diffing against it would report the half it never reached as removed. */
  const prev = (await db`
    select id from runs where finished_at is not null and id < ${runId}
    order by id desc limit 1`) as { id: number }[];

  const counts = prev.length ? await writeChanges(runId, prev[0].id) : { added: 0, removed: 0 };
  const { added, removed } = counts;

  await db`update runs set finished_at = now(), n_fetched = ${ok} where id = ${runId}`;
  const pruned = await prune();

  return {
    run: runId,
    fetched: ok,
    failed,
    findings,
    changes: { added, removed },
    pruned,
    ms: Date.now() - t0,
  };
}

/**
 * Keeps the last KEEP surveys' raw findings and drops the rest.
 *
 * A survey of 1,224 sites writes about ten thousand findings, each carrying its
 * evidence strings. Fifty-two of those a year does not fit in a 0.5 GB free
 * plan, and the site never reads a survey older than the previous one. The
 * `changes` rows are never pruned: they are the history, they are small, and
 * they are the only part that cannot be recomputed.
 */
const KEEP = 6;

async function prune(): Promise<number> {
  const db = sql();
  const old = (await db`
    select id from runs where finished_at is not null
    order by id desc offset ${KEEP}`) as { id: number }[];
  if (!old.length) return 0;
  const ids = old.map((r) => r.id);
  await db`delete from findings where run_id = any(${ids}::int[])`;
  await db`delete from fetches where run_id = any(${ids}::int[])`;
  return ids.length;
}

/**
 * The diff between two runs, written to `changes`.
 *
 * Exported so the gate can fire at it (qa/diff.test.mts) with runs it builds
 * itself — including the case this function exists to survive: a site that
 * failed to answer in one of the two runs. Both directions are guarded on the
 * site having been FETCHED SUCCESSFULLY in BOTH runs. Without that guard one
 * 403 reads as a company throwing away its entire stack in a week, and the
 * feed — the only reason anybody comes back — fills up with fiction.
 */
/**
 * Two signals that flap without anything changing.
 *
 * `alt-svc` advertises HTTP/3 inconsistently — Typeform dropped and regained it
 * between two surveys twenty minutes apart — and HSTS comes and goes with which
 * edge answers. Both stay in the tally, where they are true. Neither belongs in
 * a feed that a reader is meant to trust, and a daily survey would print them
 * every morning.
 */
const NOISY = ["HTTP/3", "HSTS"];

export async function writeChanges(runId: number, prevId: number) {
  const db = sql();
  const added = (await db`
    insert into changes (run_id, prev_run_id, domain, tech, kind, evidence)
    select ${runId}, ${prevId}, f.domain, f.tech, 'added', f.evidence->0->>'detail'
    from findings f
    where f.run_id = ${runId}
      and f.tech <> all(${NOISY}::text[])
      and exists (select 1 from fetches x where x.run_id = ${prevId} and x.domain = f.domain and x.ok = 1)
      and exists (select 1 from fetches y where y.run_id = ${runId} and y.domain = f.domain and y.ok = 1)
      and not exists (select 1 from findings g where g.run_id = ${prevId} and g.domain = f.domain and g.tech = f.tech)
    returning id`) as { id: number }[];
  const removed = (await db`
    insert into changes (run_id, prev_run_id, domain, tech, kind, evidence)
    select ${runId}, ${prevId}, f.domain, f.tech, 'removed', f.evidence->0->>'detail'
    from findings f
    where f.run_id = ${prevId}
      and f.tech <> all(${NOISY}::text[])
      and exists (select 1 from fetches x where x.run_id = ${runId} and x.domain = f.domain and x.ok = 1)
      and exists (select 1 from fetches y where y.run_id = ${prevId} and y.domain = f.domain and y.ok = 1)
      and not exists (select 1 from findings g where g.run_id = ${runId} and g.domain = f.domain and g.tech = f.tech)
    returning id`) as { id: number }[];
  return { added: added.length, removed: removed.length };
}
