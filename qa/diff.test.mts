/**
 * The diff gate — the return mechanic, fired at.
 *
 * "What changed" is the only reason anybody comes back, and every way it can
 * be wrong is silent: a diff that reports nothing looks like a quiet week, and
 * a diff that reports a company abandoning its stack looks like news. So this
 * builds two synthetic surveys with known differences, runs the REAL
 * writeChanges() over them, and asserts on what comes out — including the case
 * the guard exists for: a site that did not answer in one of the two runs must
 * produce no change rows at all.
 *
 * It writes to the real database and deletes everything it wrote. The synthetic
 * domains are prefixed so a failed cleanup is obvious rather than silent.
 */
import { sql } from "../src/lib/db";
import { writeChanges } from "../src/lib/run";

try {
  process.loadEnvFile(".env.local");
} catch {
  /* already in the environment */
}

const db = sql();
let failures = 0;
const check = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failures++;
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${label.padEnd(58)} want ${JSON.stringify(want)}, got ${JSON.stringify(got)}`);
};

const P = "qa-test-";
const mkRun = async () => {
  const [r] = (await db`insert into runs (n_sites, finished_at) values (0, now()) returning id`) as { id: number }[];
  return r.id;
};
const fetched = (run: number, domain: string, ok: number) =>
  db`insert into fetches (run_id, domain, ok, status, ms) values (${run}, ${domain}, ${ok}, ${ok ? 200 : null}, 1)`;
const found = (run: number, domain: string, tech: string) =>
  db`insert into findings (run_id, domain, tech, confidence, cats, evidence)
     values (${run}, ${domain}, ${tech}, 100, '[]'::jsonb, ${JSON.stringify([{ kind: "header", detail: `x-test: ${tech}` }])}::jsonb)`;

const before = await mkRun();
const after = await mkRun();

try {
  /* steady: same technology in both runs, and no change should be reported. */
  await fetched(before, `${P}steady.example`, 1);
  await fetched(after, `${P}steady.example`, 1);
  await found(before, `${P}steady.example`, "Steady");
  await found(after, `${P}steady.example`, "Steady");

  /* adopted / dropped: one each way, both sites answering in both runs. */
  await fetched(before, `${P}adopter.example`, 1);
  await fetched(after, `${P}adopter.example`, 1);
  await found(after, `${P}adopter.example`, "Sentry");

  await fetched(before, `${P}dropper.example`, 1);
  await fetched(after, `${P}dropper.example`, 1);
  await found(before, `${P}dropper.example`, "Algolia");

  /* THE GUARD: answered before, blocked after. Its whole stack is missing from
     the later run, and none of it is a change. */
  await fetched(before, `${P}blocked.example`, 1);
  await fetched(after, `${P}blocked.example`, 0);
  await found(before, `${P}blocked.example`, "Cloudflare");
  await found(before, `${P}blocked.example`, "Next.js");

  /* And the mirror: a site that was down before and answers now must not have
     its entire stack announced as newly adopted. */
  await fetched(before, `${P}recovered.example`, 0);
  await fetched(after, `${P}recovered.example`, 1);
  await found(after, `${P}recovered.example`, "Vercel");
  await found(after, `${P}recovered.example`, "Tailwind CSS");

  const counts = await writeChanges(after, before);
  const rows = (await db`
    select domain, tech, kind from changes where run_id = ${after} order by domain, tech`) as
    { domain: string; tech: string; kind: string }[];

  check("one adoption and one drop, and nothing else", counts, { added: 1, removed: 1 });
  check("the adoption is the right row", rows.filter((r) => r.kind === "added").map((r) => `${r.domain}/${r.tech}`), [`${P}adopter.example/Sentry`]);
  check("the drop is the right row", rows.filter((r) => r.kind === "removed").map((r) => `${r.domain}/${r.tech}`), [`${P}dropper.example/Algolia`]);
  check("a site that stopped answering reports nothing", rows.filter((r) => r.domain.includes("blocked")).length, 0);
  check("a site that started answering reports nothing", rows.filter((r) => r.domain.includes("recovered")).length, 0);
  check("an unchanged site reports nothing", rows.filter((r) => r.domain.includes("steady")).length, 0);
} finally {
  await db`delete from changes where run_id = ${after} or prev_run_id = ${before}`;
  await db`delete from findings where run_id in (${before}, ${after})`;
  await db`delete from fetches where run_id in (${before}, ${after})`;
  await db`delete from runs where id in (${before}, ${after})`;
  const left = (await db`select count(*)::int as n from fetches where domain like ${P + "%"}`) as { n: number }[];
  if (left[0].n !== 0) {
    failures++;
    console.log(`  FAIL  cleanup left ${left[0].n} synthetic rows behind`);
  }
}

console.log(failures === 0 ? "\ndiff gate: PASS" : `\ndiff gate: ${failures} FAILURES`);
process.exitCode = failures === 0 ? 0 : 1;
