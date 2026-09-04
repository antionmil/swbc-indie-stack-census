import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SITES, byDomain } from "@/data/sites";
import { categoryNames, fetchRows, findingsForSite, latestRun, techSlug } from "@/lib/census";
import { REST, SECTIONS, sectionFor } from "@/lib/sections";
import { longDate } from "@/lib/when";
import { Sheet } from "@/components/Sheet";

export const revalidate = 3600;

/** The census list is fixed, so every one of these is known at build time and
 *  none of them needs a request-time render. See the note in t/[slug]. */
export function generateStaticParams() {
  return SITES.map((s) => ({ domain: s.domain }));
}

export async function generateMetadata({ params }: { params: Promise<{ domain: string }> }): Promise<Metadata> {
  const site = byDomain.get((await params).domain);
  if (!site) return { title: "Not in this census" };
  const title = `What ${site.name} runs — Indie stack census`;
  const description = `Everything found in ${site.domain}'s response: framework, host, email, analytics — with the line that gave each one away.`;
  return { title, description, openGraph: { title, description } };
}

export default async function SitePage({ params }: { params: Promise<{ domain: string }> }) {
  const domain = (await params).domain;
  const site = byDomain.get(domain);
  if (!site) notFound();

  const run = await latestRun();
  if (!run) notFound();

  const [rows, cats, fetched] = await Promise.all([
    findingsForSite(run.id, domain),
    categoryNames(),
    fetchRows(run.id),
  ]);
  const me = fetched.find((f) => f.domain === domain);

  const grouped = new Map<string, typeof rows>();
  for (const r of rows) {
    const s = sectionFor(r.cats) ?? REST;
    grouped.set(s.slug, [...(grouped.get(s.slug) ?? []), r]);
  }
  const order = [...SECTIONS, REST];

  return (
    <Sheet run={run.id} date={longDate(run.finished_at)}>
      <p className="mt-9 font-mono text-[11px] tracking-[0.16em] text-faint uppercase">
        {site.group}
      </p>
      <h1 className="font-display mt-2 text-[34px] leading-[1.1] sm:text-[42px]">{site.name}</h1>
      <p className="mt-2 font-mono text-[12px] text-faint">
        <a
          href={`https://${site.domain}`}
          rel="nofollow noopener"
          className="underline underline-offset-2 hover:text-accent"
        >
          {site.domain}
        </a>
        {/* Compare HOSTS, not strings: fetch resolves `https://linear.app` to
            `https://linear.app/`, and a naive string comparison then printed
            "answered as linear.app" on every site that simply added a slash. */}
        {me?.final_url && new URL(me.final_url).host !== site.domain && (
          <> · answered as {new URL(me.final_url).host}</>
        )}
        {me?.ok === 1 && <> · HTTP {me.status} in {me.ms.toLocaleString("en-GB")} ms</>}
      </p>

      {me && !me.ok ? (
        <p className="font-body mt-6 max-w-[60ch] text-[15px] leading-relaxed text-muted">
          This site did not answer in survey {String(run.id).padStart(3, "0")}
          {me.error ? ` (${me.error})` : ""}. It is counted in neither the totals nor the
          changes — a fetch that failed is not evidence that anything was dropped.
        </p>
      ) : (
        <>
          <p className="font-body mt-4 max-w-[60ch] text-[15px] leading-relaxed text-muted">
            {rows.length} things were found in the response on{" "}
            {longDate(run.finished_at)}. This is the front door only: whatever runs
            behind a login, and anything a browser would have to execute to reveal, is
            not here.
          </p>

          {order.map((s) => {
            const list = grouped.get(s.slug) ?? [];
            if (!list.length) return null;
            return (
              <section key={s.slug} className="mt-8">
                <h2 className="font-mono text-[11px] tracking-[0.16em] text-faint uppercase">
                  {s.title}
                </h2>
                <div className="mt-2 border-t border-rule">
                  {list.map((r) => (
                    <div key={r.tech} className="border-b border-rule-soft py-2.5">
                      <div className="flex flex-wrap items-baseline gap-x-3">
                        <Link
                          href={`/t/${techSlug(r.tech)}`}
                          className="font-display text-[17px] hover:text-accent"
                        >
                          {r.tech}
                        </Link>
                        {r.version && (
                          <span className="tnum font-mono text-[11px] text-accent">v{r.version}</span>
                        )}
                        <span className="font-mono text-[11px] text-faint">
                          {r.cats.map((c) => cats.get(c)).filter(Boolean).join(" · ").toLowerCase()}
                        </span>
                      </div>
                      <ul className="mt-1 space-y-0.5">
                        {r.evidence.map((e, i) => (
                          <li key={i} className="font-mono text-[11px] leading-relaxed break-all text-faint">
                            <span className="text-muted">{e.kind}</span> — {e.detail}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </>
      )}

      <p className="font-body mt-8 text-[14px] leading-relaxed text-muted">
        <Link href="/" className="text-accent underline underline-offset-2">
          Back to the census
        </Link>
        .
      </p>
    </Sheet>
  );
}
