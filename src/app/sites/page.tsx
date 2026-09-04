import type { Metadata } from "next";
import Link from "next/link";
import { SITES } from "@/data/sites";
import { INDIE } from "@/data/indie";
import { latestRun } from "@/lib/census";
import { longDate } from "@/lib/when";
import { Sheet } from "@/components/Sheet";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "The population — Indie stack census",
  description:
    "Every product in the census, and the public list it came from. 51 commercial indie products and 1,173 open-source tools.",
};

/**
 * The whole population, named.
 *
 * A census that will not show you its own membership is asking to be trusted.
 * This page is long on purpose: 1,224 links, grouped by where they came from,
 * so that anybody can check that the list is what the site says it is.
 */
export default async function Sites() {
  const run = await latestRun();
  const oss = SITES.filter((s) => s.kind === "oss");
  const bySrc = new Map<string, typeof oss>();
  for (const s of oss) bySrc.set(s.src, [...(bySrc.get(s.src) ?? []), s]);

  const SOURCE_LINK: Record<string, string> = {
    "awesome-selfhosted": "https://github.com/awesome-selfhosted/awesome-selfhosted",
    "awesome-sysadmin": "https://github.com/awesome-foss/awesome-sysadmin",
  };

  return (
    <Sheet run={run?.seq} date={run ? longDate(run.finished_at) : null}>
      <h1 className="font-display mt-9 max-w-[16ch] text-[34px] leading-[1.1] sm:text-[44px]">
        The population.
      </h1>
      <p className="font-body mt-4 max-w-[62ch] text-[16px] leading-relaxed text-muted">
        {SITES.length.toLocaleString("en-GB")} products, in two groups. The list is
        fixed between surveys. Entries that pointed at GitHub, GitLab, an app store or
        Read the Docs were removed: fingerprinting a code host tells you what the code
        host runs, and nothing about the product.
      </p>

      <section className="mt-9">
        <h2 className="font-mono text-[11px] tracking-[0.16em] text-faint uppercase">
          Indie · {INDIE.length} commercial products · picked by hand
        </h2>
        <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5 border-t border-rule pt-3 font-mono text-[12px] leading-relaxed">
          {INDIE.map((s) => (
            <Link key={s.domain} href={`/s/${s.domain}`} className="hover:text-accent">
              {s.name}
            </Link>
          ))}
        </p>
      </section>

      {[...bySrc.entries()].map(([src, list]) => (
        <section key={src} className="mt-9">
          <h2 className="font-mono text-[11px] tracking-[0.16em] text-faint uppercase">
            Open source · {list.length.toLocaleString("en-GB")} tools ·{" "}
            {SOURCE_LINK[src] ? (
              <a className="underline underline-offset-2 hover:text-accent" href={SOURCE_LINK[src]}>
                {src}
              </a>
            ) : (
              src
            )}
          </h2>
          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5 border-t border-rule pt-3 font-mono text-[12px] leading-relaxed">
            {list.map((s) => (
              <Link key={s.domain} href={`/s/${s.domain}`} className="hover:text-accent">
                {s.name}
              </Link>
            ))}
          </p>
        </section>
      ))}

      <p className="font-body mt-10 text-[14px] leading-relaxed text-muted">
        <Link href="/" className="text-accent underline underline-offset-2">
          Back to the census
        </Link>
        .
      </p>
    </Sheet>
  );
}
