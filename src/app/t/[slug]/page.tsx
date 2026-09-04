import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { byDomain } from "@/data/sites";
import { survey, techSlug } from "@/lib/census";
import { numericDate } from "@/lib/when";
import { Sheet } from "@/components/Sheet";

export const revalidate = 3600;

/**
 * Without this the segment is `ƒ` in the build table and `no-store` in
 * production — server-rendered on every request, cached nowhere. Day 2 of this
 * run shipped exactly that on the pages every shared link pointed at, because
 * `revalidate` alone is not enough for a dynamic segment.
 */
export async function generateStaticParams() {
  const s = await survey();
  return s ? s.tally.map((r) => ({ slug: techSlug(r.tech) })) : [];
}

/** The technology page cap. A row can now be on a thousand products, and a
 *  page of a thousand evidence blocks is not a page. */
const LIST_MAX = 160;

async function resolve(slug: string) {
  const s = await survey();
  if (!s) return null;
  const row = s.tally.find((r) => techSlug(r.tech) === slug);
  return row ? { survey: s, run: s.run, row } : null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const found = await resolve((await params).slug);
  if (!found) return { title: "Not in this census" };
  const { run, row } = found;
  const title = `${row.tech}: ${row.n} of ${run.n_fetched} — Stack census`;
  const description = `${row.n} of ${run.n_fetched} software products were running ${row.tech} on ${numericDate(run.finished_at)}, with the line of the response that says so.`;
  return { title, description, openGraph: { title, description } };
}

export default async function TechPage({ params }: { params: Promise<{ slug: string }> }) {
  const found = await resolve((await params).slug);
  if (!found) notFound();
  const { run, row } = found;
  const { cats, n } = found.survey;
  const rows = (found.survey.byTech.get(row.tech) ?? []).slice(0, LIST_MAX);
  const names = row.cats.map((c) => cats.get(c)).filter(Boolean) as string[];

  return (
    <Sheet run={run.seq} date={numericDate(run.finished_at)}>
      <p className="mt-9 font-mono text-[11px] tracking-[0.16em] text-faint uppercase">
        {names.join(" · ") || "uncategorised"}
      </p>
      <h1 className="font-display mt-2 text-[34px] leading-[1.1] sm:text-[42px]">{row.tech}</h1>
      <p className="font-display mt-3 text-[26px]">
        <span className="tnum">{row.n.toLocaleString("en-GB")}</span>{" "}
        <span className="text-muted text-[19px]">of {n.total.toLocaleString("en-GB")}</span>
      </p>
      <p className="font-body mt-3 max-w-[60ch] text-[15px] leading-relaxed text-muted">
        Found in survey {String(run.seq).padStart(3, "0")}. Each line gives the string in
        that product&rsquo;s response that put it here — go and look, the response is
        public.
      </p>

      <div className="mt-8 border-t border-rule">
        {rows.map((r) => {
          const site = byDomain.get(r.domain);
          return (
            <div key={r.domain} className="border-b border-rule-soft py-3">
              <div className="flex flex-wrap items-baseline gap-x-3">
                <Link href={`/s/${r.domain}`} className="font-display text-[17px] hover:text-accent">
                  {site?.name ?? r.domain}
                </Link>
                <a
                  href={`https://${r.domain}`}
                  rel="nofollow noopener"
                  className="font-mono text-[11px] text-faint underline underline-offset-2 hover:text-accent"
                >
                  {r.domain}
                </a>
                {r.version && (
                  <span className="tnum font-mono text-[11px] text-accent">v{r.version}</span>
                )}
              </div>
              <ul className="mt-1 space-y-0.5">
                {r.evidence.map((e, i) => (
                  <li key={i} className="font-mono text-[11px] leading-relaxed break-all text-faint">
                    <span className="text-muted">{e.kind}</span> — {e.detail}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {row.n > rows.length && (
        <p className="mt-3 font-mono text-[11px] text-faint">
          {(row.n - rows.length).toLocaleString("en-GB")} more products carried it. This
          page lists the first {rows.length}: a page of a thousand evidence lines is not
          a page, and the tally above is the whole count.
        </p>
      )}

      <p className="font-body mt-8 text-[14px] leading-relaxed text-muted">
        <Link href="/" className="text-accent underline underline-offset-2">
          Back to the census
        </Link>
        , or read{" "}
        <Link href="/method" className="text-accent underline underline-offset-2">
          what this cannot see
        </Link>
        .
      </p>
    </Sheet>
  );
}
