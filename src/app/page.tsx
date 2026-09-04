import Link from "next/link";
import { SITES } from "@/data/sites";
import { categoryNames, fetchRows, latestRun, tally, techSlug } from "@/lib/census";
import { REST, SECTIONS, sectionFor } from "@/lib/sections";
import { dayAndDate, longDate, nextRun } from "@/lib/when";
import { Row } from "@/components/Row";
import { Sheet } from "@/components/Sheet";

/**
 * The census.
 *
 * Everything on this page is read at build time or during a revalidation, and
 * never while somebody waits: Neon's free plan parks the compute after five
 * minutes idle, so the first visitor after a quiet hour would pay for a cold
 * Postgres. An hour is well under the weekly cadence of the data.
 */
export const revalidate = 3600;

/** Per section, before "and n more". Enough to show the shape of the answer,
 *  short enough that the page is still a page. */
const TOP = 8;

export default async function Home() {
  const run = await latestRun();
  if (!run) return <Pending />;

  const [rows, cats, fetched] = await Promise.all([
    tally(run.id),
    categoryNames(),
    fetchRows(run.id),
  ]);
  const n = run.n_fetched;
  const silent = fetched.filter((f) => !f.ok);
  const next = nextRun(run.finished_at);

  const grouped = new Map<string, typeof rows>();
  for (const r of rows) {
    const s = sectionFor(r.cats) ?? REST;
    grouped.set(s.slug, [...(grouped.get(s.slug) ?? []), r]);
  }

  return (
    <Sheet run={run.id} date={longDate(run.finished_at)}>
      <h1 className="font-display mt-9 max-w-[16ch] text-[34px] leading-[1.1] sm:text-[44px]">
        Fifty-one products, counted.
      </h1>
      <p className="font-body mt-4 max-w-[62ch] text-[16px] leading-relaxed text-muted">
        Fifty-one indie products, fetched the same way on the same morning. Every line
        below is something that was in the response — a header, a script tag, a
        stylesheet, an MX record — and the figure is how many of the {n} it was found
        on. No opinions, no ranking, and nothing about revenue: this is a tally.
      </p>

      <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-3 border-y border-rule py-3.5 sm:grid-cols-4">
        <Stat k="asked" v={String(run.n_sites)} />
        <Stat k="answered" v={String(run.n_fetched)} />
        <Stat k="things found" v={String(rows.length)} />
        <Stat k="next survey" v={dayAndDate(next)} />
      </dl>

      {SECTIONS.map((s) => {
        const list = grouped.get(s.slug) ?? [];
        if (!list.length) return null;
        const shown = list.slice(0, TOP);
        return (
          <section key={s.slug} id={s.slug} className="mt-10">
            <h2 className="font-mono text-[11px] tracking-[0.16em] text-faint uppercase">
              {s.title}
            </h2>
            <p className="font-body mt-1.5 max-w-[58ch] text-[14px] leading-relaxed text-muted">
              {s.blurb}
            </p>
            <div className="mt-3 border-t border-rule">
              {shown.map((r) => (
                <Row
                  key={r.tech}
                  href={`/t/${techSlug(r.tech)}`}
                  name={r.tech}
                  note={r.cats.map((c) => cats.get(c)).find(Boolean)?.toLowerCase() ?? null}
                  evidence={r.sample ? `${r.sample_domain} — ${r.sample.detail}` : null}
                  count={r.n}
                  of={n}
                />
              ))}
            </div>
            {list.length > shown.length && (
              <p className="mt-2 font-mono text-[11px] text-faint">
                and {list.length - shown.length} more found on fewer sites.
              </p>
            )}
          </section>
        );
      })}

      {(grouped.get(REST.slug) ?? []).length > 0 && (
        <section id={REST.slug} className="mt-10">
          <h2 className="font-mono text-[11px] tracking-[0.16em] text-faint uppercase">
            {REST.title}
          </h2>
          <p className="font-body mt-1.5 max-w-[58ch] text-[14px] leading-relaxed text-muted">
            Found and counted, and not part of any question above. Nothing is dropped
            for being awkward to file.
          </p>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 border-t border-rule pt-3 font-mono text-[12px]">
            {(grouped.get(REST.slug) ?? []).map((r) => (
              <Link key={r.tech} href={`/t/${techSlug(r.tech)}`} className="hover:text-accent">
                {r.tech} <span className="tnum text-faint">{r.n}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-12">
        <h2 className="font-mono text-[11px] tracking-[0.16em] text-faint uppercase">
          The fifty-one
        </h2>
        <p className="font-body mt-1.5 max-w-[58ch] text-[14px] leading-relaxed text-muted">
          The list is fixed for the run. A census that gains and loses members between
          surveys cannot tell a migration from a change of population.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-x-6 border-t border-rule sm:grid-cols-2">
          {SITES.map((s) => {
            const f = fetched.find((x) => x.domain === s.domain);
            return (
              <Link
                key={s.domain}
                href={`/s/${s.domain}`}
                className="flex items-baseline gap-3 border-b border-rule-soft py-2 hover:bg-surface"
              >
                <span className="font-display text-[15px]">{s.name}</span>
                <span aria-hidden className="leader" />
                <span className="font-mono text-[11px] text-faint">
                  {f && !f.ok ? "no answer" : s.group.toLowerCase()}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <p className="font-body mt-8 max-w-[62ch] text-[14px] leading-relaxed text-muted">
        {silent.length === 0
          ? `All ${run.n_sites} answered this time. `
          : `${silent.length} did not answer this time (${silent.map((s) => s.domain).join(", ")}) and are left out of every figure above. `}
        The next survey runs on {dayAndDate(next)} at 06:00 UTC, and anything that moves
        between now and then lands on{" "}
        <Link href="/changes" className="text-accent underline underline-offset-2">
          what changed
        </Link>
        . How this is measured, and the four things it cannot see, are on{" "}
        <Link href="/method" className="text-accent underline underline-offset-2">
          the method page
        </Link>
        .
      </p>
    </Sheet>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] tracking-[0.14em] text-faint uppercase">{k}</dt>
      <dd className="tnum font-display mt-0.5 text-[19px]">{v}</dd>
    </div>
  );
}

/**
 * Before the first run finishes there is no census, and the page says so.
 * The alternative — rendering zeroes and empty sections — reads as a broken
 * site rather than a young one.
 */
function Pending() {
  return (
    <Sheet>
      <h1 className="font-display mt-9 max-w-[18ch] text-[34px] leading-[1.1] sm:text-[44px]">
        The first survey has not finished yet.
      </h1>
      <p className="font-body mt-4 max-w-[60ch] text-[16px] leading-relaxed text-muted">
        Fifty-one indie products get fetched, read, and tallied — what they are built
        with, where they are served, where their email goes. Nothing is published until
        a full run completes, because a half-finished census would read as fifty-one
        companies dropping their stack at once.
      </p>
      <p className="font-body mt-4 max-w-[60ch] text-[16px] leading-relaxed text-muted">
        Come back shortly, or read{" "}
        <Link href="/method" className="text-accent underline underline-offset-2">
          how it is measured
        </Link>{" "}
        in the meantime.
      </p>
    </Sheet>
  );
}
