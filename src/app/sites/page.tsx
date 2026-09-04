import type { Metadata } from "next";
import Link from "next/link";
import { SITES } from "@/data/sites";
import { INDIE } from "@/data/indie";
import { latestRun } from "@/lib/census";
import { numericDate } from "@/lib/when";
import { Sheet } from "@/components/Sheet";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "The products — Stack census",
  description:
    "Every product in the census, and where its name came from: 51 picked by hand, the rest from two public lists.",
};

/**
 * Every product in the census, named.
 *
 * A census that will not show you its own membership is asking to be trusted.
 * The page is long on purpose. It is grouped by SOURCE rather than by type,
 * because the source is the part a reader can check: each name traces back to a
 * line in a public list, or to the fifty-one I chose myself.
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
    <Sheet run={run?.seq} date={run ? numericDate(run.finished_at) : null}>
      <h1 className="font-display mt-5 max-w-[16ch] text-[34px] leading-[1.1] sm:text-[44px]">
        The {SITES.length.toLocaleString("en-GB")} products.
      </h1>
      <p className="font-body mt-4 max-w-[62ch] text-[16px] leading-relaxed text-muted">
        One census, counted together. They are grouped below by where the name came
        from, because that is the part you can check. The list is fixed between
        surveys. Entries pointing at GitHub, GitLab, an app store or Read the Docs were
        removed: fingerprinting a code host tells you what the code host runs, and
        nothing about the product.
      </p>

      <section className="mt-9">
        <h2 className="font-mono text-[11px] tracking-[0.16em] text-faint uppercase">
          {INDIE.length} picked by hand · commercial products
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
            {list.length.toLocaleString("en-GB")} from{" "}
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
