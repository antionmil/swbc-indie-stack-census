import Link from "next/link";
import { SITES } from "@/data/sites";
import { INDIE } from "@/data/indie";
import { survey, techSlug } from "@/lib/census";
import { REST, SECTIONS, sectionFor } from "@/lib/sections";
import { dayAndDate, longDate, nextRun } from "@/lib/when";
import { Heads, Row } from "@/components/Row";
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
    <Sheet run={run.seq} date={longDate(run.finished_at)}>
      <h1 className="font-display mt-9 max-w-[15ch] text-[34px] leading-[1.1] sm:text-[44px]">
        {n.total.toLocaleString("en-GB")} products, counted.
      </h1>
      <p className="font-body mt-4 max-w-[62ch] text-[16px] leading-relaxed text-muted">
        Every line below is something that was in the response — a header, a script
        tag, a stylesheet, an MX record — and the figures are how many products had
        it. Two populations, counted separately, because they disagree: {n.indie}{" "}
        commercial indie products, and {n.oss.toLocaleString("en-GB")} open-source
        tools. No opinions, no ranking, and nothing about revenue. This is a tally.
      </p>

      <Jump
        items={jump}
        hint={`Any of the ${SITES.length.toLocaleString("en-GB")} products, or any of the ${rows.length} things found on them.`}
      />

      <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-3 border-y border-rule py-3.5 sm:grid-cols-4">
        <Stat k="asked" v={run.n_sites.toLocaleString("en-GB")} />
        <Stat k="answered" v={n.total.toLocaleString("en-GB")} />
        <Stat k="things found" v={rows.length.toLocaleString("en-GB")} />
        <Stat k="next survey" v={dayAndDate(next)} />
      </dl>

      <p className="font-body mt-4 max-w-[62ch] text-[14px] leading-relaxed text-muted">
        The <span className="text-ink">indie</span> column is {n.indie} commercial
        products, picked by hand: Plausible, Linear, Cal.com, Resend and the rest of
        the tools an indie founder already reads about. The{" "}
        <span className="text-ink">open source</span> column is{" "}
        {n.oss.toLocaleString("en-GB")} tools from two public lists,{" "}
        <a className="underline underline-offset-2 hover:text-accent" href="https://github.com/awesome-selfhosted/awesome-selfhosted">
          awesome-selfhosted
        </a>{" "}
        and{" "}
        <a className="underline underline-offset-2 hover:text-accent" href="https://github.com/awesome-foss/awesome-sysadmin">
          awesome-sysadmin
        </a>
        , so that any row can be traced back to somebody else&rsquo;s list.{" "}
        <Link href="/sites" className="text-accent underline underline-offset-2">
          The whole population is listed here
        </Link>
        .
      </p>

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
            <div className="mt-3">
              <Heads a="indie" b="open source" />
              {shown.map((r) => (
                <Row
                  key={r.tech}
                  href={`/t/${techSlug(r.tech)}`}
                  name={r.tech}
                  note={r.cats.map((c) => cats.get(c)).find(Boolean)?.toLowerCase() ?? null}
                  evidence={r.sample ? `${r.sample_domain} — ${r.sample.detail}` : null}
                  a={r.n_indie}
                  aOf={n.indie}
                  b={r.n_oss}
                  bOf={n.oss}
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
          The indie {INDIE.length}
        </h2>
        <p className="font-body mt-1.5 max-w-[58ch] text-[14px] leading-relaxed text-muted">
          The smaller column, in full. These are commercial products with a price
          list, which is what makes them worth comparing against a thousand
          open-source tools.
        </p>
        <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 border-t border-rule pt-3 font-mono text-[12px] leading-relaxed">
          {INDIE.map((s) => (
            <Link key={s.domain} href={`/s/${s.domain}`} className="hover:text-accent">
              {s.name}
            </Link>
          ))}
        </p>
      </section>

      <p className="font-body mt-8 max-w-[62ch] text-[14px] leading-relaxed text-muted">
        The population is fixed between surveys: a census that gains and loses members
        cannot tell a migration from a change of population.{" "}
        {silent.length === 0
          ? `All ${run.n_sites.toLocaleString("en-GB")} answered this time. `
          : `${run.n_sites - n.total} did not answer this time and are left out of every figure above. `}
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
