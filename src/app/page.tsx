import Link from "next/link";
import { SITES } from "@/data/sites";
import { survey, techSlug } from "@/lib/census";
import { REST, SECTIONS, sectionFor } from "@/lib/sections";
import { nextRun, numericDate } from "@/lib/when";
import { Row } from "@/components/Row";
import { Jump, type JumpItem } from "@/components/Jump";
import { Sheet } from "@/components/Sheet";

/**
 * The census.
 *
 * Read at build time or during a revalidation, never while somebody waits:
 * Neon's free plan parks the compute after five minutes idle, so the first
 * visitor after a quiet hour would pay for a cold Postgres. An hour is well
 * under the weekly cadence of the data.
 */
export const revalidate = 3600;

/** Per section, before "and n more". */
const TOP = 10;
/** The unfiled list at the bottom. It is a few hundred rows long now. */
const REST_MAX = 90;

export default async function Home() {
  const s = await survey();
  if (!s) return <Pending />;
  const { run, tally: rows, cats, n, silent } = s;
  const next = nextRun(run.finished_at);

  const grouped = new Map<string, typeof rows>();
  for (const r of rows) {
    const s = sectionFor(r.cats) ?? REST;
    grouped.set(s.slug, [...(grouped.get(s.slug) ?? []), r]);
  }

  const jump: JumpItem[] = [
    ...SITES.map((s) => ({
      href: `/s/${s.domain}`,
      label: s.name,
      sub: s.domain,
      kind: "product" as const,
    })),
    ...rows.map((r) => ({
      href: `/t/${techSlug(r.tech)}`,
      label: r.tech,
      sub: `${r.n} of ${n.total}`,
      kind: "technology" as const,
    })),
  ];

  return (
    <Sheet run={run.seq} date={numericDate(run.finished_at)}>
      <h1 className="font-display mt-5 max-w-[17ch] text-[34px] leading-[1.1] sm:text-[44px]">
        What {n.total.toLocaleString("en-GB")} real websites are built with.
      </h1>
      <p className="font-body mt-4 max-w-[60ch] text-[17px] leading-relaxed text-muted">
        Fetched every morning, read, and counted. Every figure links to the line of the
        response that proves it.
      </p>

      <Jump
        items={jump}
        hint={`Any of the ${SITES.length.toLocaleString("en-GB")} products, or any of the ${rows.length} things found on them.`}
      />

      <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-3 border-y border-rule py-3.5 sm:grid-cols-4">
        <Stat k="products asked" v={run.n_sites.toLocaleString("en-GB")} />
        <Stat k="answered" v={n.total.toLocaleString("en-GB")} />
        <Stat k="things found" v={rows.length.toLocaleString("en-GB")} />
        {/* The format is spelled out because 05.09.2026 is the fifth of
            September to half the world and the ninth of May to the other half,
            and a census that publishes a date it has to be asked about has
            wasted the date. */}
        <Stat k="next survey" v={numericDate(next)} sub="dd.mm.yyyy · 06:00 UTC" />
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
                  of={n.total}
                />
              ))}
            </div>
            {list.length > shown.length && (
              <p className="mt-2 font-mono text-[11px] text-faint">
                and {list.length - shown.length} more found on fewer products.
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
            {(grouped.get(REST.slug) ?? []).slice(0, REST_MAX).map((r) => (
              <Link key={r.tech} href={`/t/${techSlug(r.tech)}`} className="hover:text-accent">
                {r.tech} <span className="tnum text-faint">{r.n}</span>
              </Link>
            ))}
          </div>
          {(grouped.get(REST.slug) ?? []).length > REST_MAX && (
            <p className="mt-2 font-mono text-[11px] text-faint">
              and {(grouped.get(REST.slug) ?? []).length - REST_MAX} more. The filter at
              the top reaches all of them.
            </p>
          )}
        </section>
      )}

      <section className="mt-12">
        <h2 className="font-mono text-[11px] tracking-[0.16em] text-faint uppercase">
          Where the {SITES.length.toLocaleString("en-GB")} products come from
        </h2>
        <p className="font-body mt-1.5 max-w-[60ch] text-[15px] leading-relaxed text-muted">
          51 commercial products picked by hand — the tools an indie founder already
          reads about — and {(SITES.length - 51).toLocaleString("en-GB")} more taken from
          two public lists,{" "}
          <a className="underline underline-offset-2 hover:text-accent" href="https://github.com/awesome-selfhosted/awesome-selfhosted">
            awesome-selfhosted
          </a>{" "}
          and{" "}
          <a className="underline underline-offset-2 hover:text-accent" href="https://github.com/awesome-foss/awesome-sysadmin">
            awesome-sysadmin
          </a>
          , so that every row traces back to somebody else&rsquo;s list rather than to a
          list I typed myself.{" "}
          <Link href="/sites" className="text-accent underline underline-offset-2">
            All {SITES.length.toLocaleString("en-GB")} are named here
          </Link>
          .
        </p>
      </section>

      <p className="font-body mt-8 max-w-[62ch] text-[14px] leading-relaxed text-muted">
        The list is fixed between surveys: a census that gains and loses members cannot
        tell a real change from a change of population.{" "}
        {silent.length === 0
          ? `All ${run.n_sites.toLocaleString("en-GB")} answered this time. `
          : `${run.n_sites - n.total} did not answer this time and are left out of every figure above. `}
        The next survey runs on {numericDate(next)} at 06:00 UTC, and anything that moves
        overnight lands on{" "}
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

function Stat({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] tracking-[0.14em] text-faint uppercase">{k}</dt>
      {/* The figure, then anything qualifying it underneath. The next survey
          used to print "Saturday 5 September", which wrapped onto two lines and
          knocked the row of figures out of line with each other. */}
      <dd className="tnum font-display mt-0.5 text-[19px] leading-tight">
        {v}
        {sub && (
          <span className="mt-0.5 block font-mono text-[11px] font-normal text-faint">
            {sub}
          </span>
        )}
      </dd>
    </div>
  );
}

/**
 * Before the first run finishes there is no census, and the page says so. The
 * alternative — zeroes and empty sections — reads as a broken site rather than
 * a young one.
 */
function Pending() {
  return (
    <Sheet>
      <h1 className="font-display mt-9 max-w-[18ch] text-[34px] leading-[1.1] sm:text-[44px]">
        The first survey has not finished yet.
      </h1>
      <p className="font-body mt-4 max-w-[60ch] text-[16px] leading-relaxed text-muted">
        Over a thousand software products get fetched, read and tallied — what they are
        built with, where they are served, where their email goes. Nothing is published
        until a full run completes, because a half-finished census would read as a
        thousand companies dropping their stack at once.
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
