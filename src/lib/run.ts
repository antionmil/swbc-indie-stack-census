import "server-only";
import { SITES } from "@/data/sites";
import { sql } from "@/lib/db";
import { canonical } from "@/lib/extra";
import { fetchAll } from "@/lib/fetchsite";
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

  const pages = await fetchAll(SITES.map((s) => s.domain));

  await db`
    insert into fetches (run_id, domain, ok, status, final_url, ms, error)
    select ${runId}, * from unnest(
      ${pages.map((p) => (p.ok ? p.page.domain : p.domain))}::text[],
      ${pages.map((p) => (p.ok ? 1 : 0))}::int[],
      ${pages.map((p) => (p.ok ? p.page.status : null))}::int[],
      ${pages.map((p) => (p.ok ? p.page.url : null))}::text[],
      ${pages.map((p) => p.ms)}::int[],
      ${pages.map((p) => (p.ok ? null : p.error))}::text[])`;

  const rows: {
    domain: string; tech: string; confidence: number; version: string | null;
    cats: string; evidence: string;
  }[] = [];
  for (const p of pages) {
    if (!p.ok) continue;
    for (const d of detect(p.page, techs, canonical))
      rows.push({
        domain: p.page.domain,
        tech: d.name,
        confidence: d.confidence,
        version: d.version ?? null,
        cats: JSON.stringify(d.cats),
        evidence: JSON.stringify(d.evidence),
      });
  }

  /* Chunked: one statement with 3,000 array elements is fine, one with 30,000
     is not, and the number of findings grows every time a site is added. */
  for (let i = 0; i < rows.length; i += 200) {
    const c = rows.slice(i, i + 200);
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
  }

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

  const ok = pages.filter((p) => p.ok).length;
  await db`update runs set finished_at = now(), n_fetched = ${ok} where id = ${runId}`;

  return {
    run: runId,
    fetched: ok,
    failed: pages.filter((p) => !p.ok).map((p) => ("domain" in p ? p.domain : "?")),
    findings: rows.length,
    changes: { added, removed },
    ms: Date.now() - t0,
  };
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
export async function writeChanges(runId: number, prevId: number) {
  const db = sql();
  const added = (await db`
    insert into changes (run_id, prev_run_id, domain, tech, kind, evidence)
    select ${runId}, ${prevId}, f.domain, f.tech, 'added', f.evidence->0->>'detail'
    from findings f
    where f.run_id = ${runId}
      and exists (select 1 from fetches x where x.run_id = ${prevId} and x.domain = f.domain and x.ok = 1)
      and exists (select 1 from fetches y where y.run_id = ${runId} and y.domain = f.domain and y.ok = 1)
      and not exists (select 1 from findings g where g.run_id = ${prevId} and g.domain = f.domain and g.tech = f.tech)
    returning id`) as { id: number }[];
  const removed = (await db`
    insert into changes (run_id, prev_run_id, domain, tech, kind, evidence)
    select ${runId}, ${prevId}, f.domain, f.tech, 'removed', f.evidence->0->>'detail'
    from findings f
    where f.run_id = ${prevId}
      and exists (select 1 from fetches x where x.run_id = ${runId} and x.domain = f.domain and x.ok = 1)
      and exists (select 1 from fetches y where y.run_id = ${prevId} and y.domain = f.domain and y.ok = 1)
      and not exists (select 1 from findings g where g.run_id = ${runId} and g.domain = f.domain and g.tech = f.tech)
    returning id`) as { id: number }[];
  return { added: added.length, removed: removed.length };
}
