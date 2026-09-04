import type { Metadata } from "next";
import Link from "next/link";
import { SITES, byDomain } from "@/data/sites";
import { latestRun, recentChanges, runCount, runSeq, survey, techSlug } from "@/lib/census";
import { nextRun, numericDate } from "@/lib/when";
import { Sheet } from "@/components/Sheet";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "What changed — Stack census",
  description:
    "Every technology that appeared on, or disappeared from, one of the products in the census since yesterday morning.",
};

export default async function Changes() {
  const [run, rows, runs, seqs, s] = await Promise.all([
    latestRun(),
    recentChanges(),
    runCount(),
    runSeq(),
    survey(),
  ]);
  /* A technology that was REMOVED everywhere has no page any more, and the feed
     is the one place that still names it. Linking it produced the only broken
     link on the site: /t/trac, 404, from our own page. So a name is a link only
     while there is something at the other end. */
  const hasPage = new Set((s?.tally ?? []).map((t) => t.tech));
  const inCensus = new Set(SITES.map((x) => x.domain));

  const byRun = new Map<number, typeof rows>();
  for (const r of rows) byRun.set(r.run_id, [...(byRun.get(r.run_id) ?? []), r]);

  return (
    <Sheet run={run?.seq} date={run ? numericDate(run.finished_at) : null}>
      <h1 className="font-display mt-5 max-w-[16ch] text-[34px] leading-[1.1] sm:text-[44px]">
        What changed.
      </h1>
      <p className="font-body mt-4 max-w-[62ch] text-[16px] leading-relaxed text-muted">
        The census runs every morning, and each survey is compared with yesterday&rsquo;s.
        A line appears here when a technology showed up on a product that did not have
        it, or stopped appearing on one that did — and only when that product answered
        properly in both surveys. A product that returned an error is skipped entirely,
        because a failed fetch is not a company throwing its stack away. Two signals are
        left out on purpose: HTTP/3 and HSTS flap on their own, without anything
        changing.
      </p>

      {/* The first run has nothing to compare against, and this page will look
          like this for a week. It says which week, so that it reads as a
          schedule rather than as a page that is broken. */}
      {rows.length === 0 ? (
        <div className="mt-8 border-y border-rule py-8">
          <p className="font-display text-[20px] leading-snug">
            {runs <= 1
              ? "Nothing yet — this is the first survey."
              : "Nothing moved since the last survey."}
          </p>
          <p className="font-body mt-3 max-w-[58ch] text-[15px] leading-relaxed text-muted">
            {runs <= 1
              ? "There is no earlier census to compare against. "
              : "Fifty-one sites, and not one detectable difference. It happens: these are marketing pages, and they change slowly. "}
            {run && (
              <>
                The next survey runs on {numericDate(nextRun(run.finished_at))} at 06:00 UTC — every morning.
              </>
            )}
          </p>
          <p className="font-body mt-3 text-[15px] leading-relaxed text-muted">
            In the meantime, the{" "}
            <Link href="/" className="text-accent underline underline-offset-2">
              census itself
            </Link>{" "}
            is the thing to read.
          </p>
        </div>
      ) : (
        [...byRun.entries()]
          .sort((a, b) => b[0] - a[0])
          .map(([runId, list]) => (
            <section key={runId} className="mt-8">
              <h2 className="font-mono text-[11px] tracking-[0.16em] text-faint uppercase">
                Survey {String(seqs.get(runId) ?? runId).padStart(3, "0")} · {numericDate(list[0].at)}
              </h2>
              <div className="mt-2 border-t border-rule">
                {list.map((c, i) => (
                  <div key={`${c.domain}-${c.tech}-${i}`} className="border-b border-rule-soft py-2.5">
                    <div className="flex flex-wrap items-baseline gap-x-2.5">
                      <span
                        aria-hidden
                        className={`font-mono text-[13px] ${c.kind === "added" ? "text-added" : "text-removed"}`}
                      >
                        {c.kind === "added" ? "+" : "−"}
                      </span>
                      {inCensus.has(c.domain) ? (
                        <Link href={`/s/${c.domain}`} className="font-display text-[17px] hover:text-accent">
                          {byDomain.get(c.domain)?.name ?? c.domain}
                        </Link>
                      ) : (
                        <span className="font-display text-[17px]">{c.domain}</span>
                      )}
                      <span className="font-body text-[15px] text-muted">
                        {c.kind === "added" ? "started using" : "stopped showing"}
                      </span>
                      {hasPage.has(c.tech) ? (
                        <Link href={`/t/${techSlug(c.tech)}`} className="font-display text-[17px] hover:text-accent">
                          {c.tech}
                        </Link>
                      ) : (
                        <span className="font-display text-[17px]">{c.tech}</span>
                      )}
                    </div>
                    {c.evidence && (
                      <p className="mt-1 font-mono text-[11px] leading-relaxed break-all text-faint">
                        {c.kind === "added" ? "now" : "was"} — {c.evidence}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))
      )}
    </Sheet>
  );
}
