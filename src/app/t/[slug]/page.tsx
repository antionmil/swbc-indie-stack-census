import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { byDomain } from "@/data/sites";
import { categoryNames, findingsForTech, latestRun, tally, techSlug } from "@/lib/census";
import { longDate } from "@/lib/when";
import { Sheet } from "@/components/Sheet";

export const revalidate = 3600;

/**
 * Without this the segment is `ƒ` in the build table and `no-store` in
 * production — server-rendered on every request, cached nowhere. Day 2 of this
 * run shipped exactly that on the pages every shared link pointed at, because
 * `revalidate` alone is not enough for a dynamic segment.
 */
export async function generateStaticParams() {
  const run = await latestRun();
  if (!run) return [];
  return (await tally(run.id)).map((r) => ({ slug: techSlug(r.tech) }));
}

async function resolve(slug: string) {
  const run = await latestRun();
  if (!run) return null;
  const rows = await tally(run.id);
  const row = rows.find((r) => techSlug(r.tech) === slug);
  return row ? { run, row } : null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const found = await resolve((await params).slug);
  if (!found) return { title: "Not in this census" };
  const { run, row } = found;
  const title = `${row.tech}: ${row.n} of ${run.n_fetched} — Indie stack census`;
  const description = `${row.n} of ${run.n_fetched} indie products were running ${row.tech} on ${longDate(run.finished_at)}, with the line of the response that says so.`;
  return { title, description, openGraph: { title, description } };
}

export default async function TechPage({ params }: { params: Promise<{ slug: string }> }) {
  const found = await resolve((await params).slug);
  if (!found) notFound();
  const { run, row } = found;
  const [rows, cats] = await Promise.all([findingsForTech(run.id, row.tech), categoryNames()]);
  const names = row.cats.map((c) => cats.get(c)).filter(Boolean) as string[];

  return (
    <Sheet run={run.id} date={longDate(run.finished_at)}>
      <p className="mt-9 font-mono text-[11px] tracking-[0.16em] text-faint uppercase">
        {names.join(" · ") || "uncategorised"}
      </p>
      <h1 className="font-display mt-2 text-[34px] leading-[1.1] sm:text-[42px]">{row.tech}</h1>
      <p className="font-display mt-3 text-[22px]">
        <span className="tnum">{row.n}</span> of{" "}
        <span className="tnum">{run.n_fetched}</span>
      </p>
      <p className="font-body mt-3 max-w-[60ch] text-[15px] leading-relaxed text-muted">
        Found on {row.n === 1 ? "one site" : `${row.n} sites`} in survey{" "}
        {String(run.id).padStart(3, "0")}. Each line gives the string in that site&rsquo;s
        response that put it here — go and look, the response is public.
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
