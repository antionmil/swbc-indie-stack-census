import type { Metadata } from "next";
import Link from "next/link";
import { SITES } from "@/data/sites";
import { INDIE } from "@/data/indie";
import { EXTRA } from "@/lib/extra";
import { canonical } from "@/lib/extra";
import { survey } from "@/lib/census";
import { numericDate } from "@/lib/when";
import { Sheet } from "@/components/Sheet";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Method and limits — Stack census",
  description:
    "How fifty-one sites are fingerprinted, which rules are used, and the four things this census cannot see.",
};

/** The supplementary rules, printed. A rule nobody can read is a rule nobody
 *  can argue with, and every figure on this site rests on these. */
function rulesOf(raw: (typeof EXTRA)[string]): string[] {
  const out: string[] = [];
  const push = (label: string, v: unknown) => {
    if (!v) return;
    for (const s of Array.isArray(v) ? v : [v]) out.push(`${label} ${s}`);
  };
  push("script src", raw.scriptSrc);
  push("in the html", raw.html);
  push("in a stylesheet", raw.css);
  for (const [k, v] of Object.entries(raw.meta ?? {})) push(`<meta ${k}>`, v);
  for (const [k, v] of Object.entries(raw.headers ?? {})) push(`header ${k}:`, v);
  return out;
}

export default async function Method() {
  const s = await survey();
  const run = s?.run ?? null;
  const entries = Object.entries(EXTRA);

  /* Which of our own rules found nothing this week. Worth printing: "looked
     for and not found" is a result, and a rule that has quietly stopped
     matching anything looks exactly the same from the outside as a technology
     nobody uses. Naming them puts both in front of the reader. */
  const seen = new Set(s ? s.tally.map((r) => r.tech) : []);
  const silent = run ? entries.map(([n]) => n).filter((n) => !seen.has(canonical(n))) : [];
  /* One string, built here rather than assembled out of JSX expressions: a
     `{list}`, `{maybe}`, `.` sequence puts a space in front of the comma and
     the full stop, and the page then reads "Umami , or of 22 other things ." */
  const silentLine =
    silent.length === 0
      ? ""
      : `${silent.length} of them matched nothing at all in this survey, which is itself a ` +
        `result: not one home page in the whole census carried a trace of ${silent.slice(0, 3).join(", ")}` +
        (silent.length > 3 ? `, or of ${silent.length - 3} other things looked for` : "") +
        ". They are marked below.";

  return (
    <Sheet run={run?.seq} date={run ? numericDate(run.finished_at) : null}>
      <h1 className="font-display mt-5 max-w-[18ch] text-[34px] leading-[1.1] sm:text-[44px]">
        How it is measured, and what it misses.
      </h1>
      <p className="font-body mt-4 max-w-[62ch] text-[16px] leading-relaxed text-muted">
        A census is only worth the method. This one is small enough to describe in full,
        so here it is — including the parts that would make a figure wrong if you read
        it as more than it is.
      </p>

      <Block title="Who is counted">
        <p>
          One census of {SITES.length.toLocaleString("en-GB")} products, counted together.
          The names came from two places, and that is worth knowing because it is the part
          you can check — but it is where a name came from, not two things reported
          separately.
        </p>
        <p>
          <strong className="font-semibold">{INDIE.length} were picked by hand</strong>:
          Plausible, Linear, Cal.com, Resend and the rest of the commercial tools an indie
          founder already reads about. That is a choice I made, and it is not a sample of
          anything. It is a named list, and it is on{" "}
          <Link href="/sites" className="text-accent underline underline-offset-2">
            the population page
          </Link>{" "}
          in full.
        </p>
        <p>
          <strong className="font-semibold">The other{" "}
          {(SITES.length - INDIE.length).toLocaleString("en-GB")} are open-source
          tools</strong> taken from two public lists,{" "}
          <a className="text-accent underline underline-offset-2" href="https://github.com/awesome-selfhosted/awesome-selfhosted">
            awesome-selfhosted
          </a>{" "}
          and{" "}
          <a className="text-accent underline underline-offset-2" href="https://github.com/awesome-foss/awesome-sysadmin">
            awesome-sysadmin
          </a>
          . They were chosen because they are curated by other people, they are public,
          and every row here can be traced back to a line in somebody else&rsquo;s
          repository. I did not assemble this list, which is the point: a list of a
          thousand entries that I typed out myself would be unauditable.
        </p>
        <p>
          Entries pointing at GitHub, GitLab, an app store or Read the Docs are dropped
          before the survey runs — 306 of them. Fingerprinting a code host tells you what
          the code host runs, and nothing about the product.
        </p>
        <p>
          The population is fixed between surveys. It changes only when the source lists
          change and the list is rebuilt, and a product that joins is never reported as
          having adopted anything: the change feed only compares products that answered
          in both surveys.
        </p>
      </Block>

      <Block title="What actually happens">
        <p>
          Every morning at 06:00 UTC, each of the {SITES.length.toLocaleString("en-GB")}{" "}
          domains gets one HTTPS GET of its home page, with a normal browser user-agent
          and redirects followed.
          From the response we keep the headers, the cookies, the HTML, the script tags,
          the meta tags and up to two of the stylesheets it links to. We also ask DNS
          for the domain&rsquo;s MX records. That is the whole input: no login, no crawl,
          no second page.
        </p>
        <p>
          Those inputs are matched against the fingerprint rules from{" "}
          <a className="text-accent underline underline-offset-2" href="https://github.com/enthec/webappanalyzer">
            enthec/webappanalyzer
          </a>
          , which carries on the ruleset Wappalyzer closed in August 2023. The rules are
          GPL-3.0. They are fetched at the start of every run and never stored here, so
          this repository redistributes none of them — and the census always matches
          against current rules rather than a copy going stale in a data folder.
        </p>
      </Block>

      <Block title="The four things it cannot see">
        <p>
          <strong className="font-semibold">Anything that needs a browser.</strong> Most
          of the public ruleset&rsquo;s modern front-end detection is written as{" "}
          <code className="font-mono text-[13px]">js</code> and{" "}
          <code className="font-mono text-[13px]">dom</code> rules, which only exist
          after a page has executed. A serverless function has no browser, so those rules
          are skipped rather than half-run. That is why the supplement below exists.
        </p>
        <p>
          <strong className="font-semibold">Anything behind a login.</strong> This is the
          marketing page. The application a company actually ships may be built on
          something else entirely, and often is.
        </p>
        <p>
          <strong className="font-semibold">Anything the CDN hides.</strong> A site
          fronted by Cloudflare tells you about Cloudflare. What answers behind it is
          frequently invisible from the outside.
        </p>
        <p>
          <strong className="font-semibold">Anything about the company.</strong> No
          revenue, no headcount, no funding, no ranking. This census counts what a
          response contained. It does not make claims about the people behind it.
        </p>
      </Block>

      <Block title="Reading the figures">
        <p>
          A count is &ldquo;how many of the sites that answered had this in the
          response&rdquo;. It is not market share, and it is not a recommendation. Two
          detections are kept only when the rules put confidence at 50 or above, which is
          the ruleset&rsquo;s own threshold for a weak signal.
        </p>
        <p>
          Some rows are inferred rather than seen: the ruleset says Next.js implies React,
          so React is counted wherever Next.js was found. Those lines say{" "}
          <span className="font-mono text-[13px]">implied</span> in their evidence, and
          the census prefers a directly observed example when it has one.
        </p>
        <p>
          <strong className="font-semibold">TXT records are not read</strong>, though the
          rules would happily match them. The first production run found 689 things where
          the same code on a laptop had found 443, and 244 of the 246 extra were domain
          verification records — every <span className="font-mono text-[13px]">
          openai-domain-verification</span> and{" "}
          <span className="font-mono text-[13px]">slack-domain-verification</span> line a
          company has ever been asked to add. A verification record proves somebody once
          proved they owned the domain. It is not the page running anything, one of them
          resolved to &ldquo;Apple iCloud Mail&rdquo; on nineteen sites that do not use it,
          and different resolvers return different amounts of it — which would have filled
          the weekly feed with hundreds of changes that never happened. MX is read, because
          it is where the mail actually goes.
        </p>
        <p>
          <strong className="font-semibold">Two signals are kept out of the change
          feed.</strong> HTTP/3 and HSTS flap on their own: a server advertises{" "}
          <span className="font-mono text-[13px]">alt-svc</span> inconsistently, and which
          edge answers decides whether HSTS appears. Both stay in the tally, where they
          are true. Neither belongs in a feed that is read as news.
        </p>
        <p>
          The ruleset ships a few products under two spellings — Sanity and Sanity.io are
          the same thing, matching the same evidence. Those are merged before counting, or
          the tally would show one product twice.
        </p>
      </Block>

      <Block title={`The ${entries.length} rules this census adds`}>
        <p>
          On the public ruleset alone, Next.js was found on 11 of the first 51 sites while{" "}
          <span className="font-mono text-[13px]">/_next/static/</span> sat in the HTML of
          twice as many — the rest of its rules need a browser. So the census adds rules
          of its own. Every one matches a string that is present in the response, and
          every one is printed here, because a fingerprint you cannot read is one you
          cannot argue with.
        </p>
      </Block>

      {silent.length > 0 && (
        <p className="font-body mt-3 max-w-[62ch] text-[15px] leading-relaxed text-muted">
          {silentLine}
        </p>
      )}

      <div className="mt-4 border-t border-rule">
        {entries.map(([name, raw]) => (
          <div key={name} className="border-b border-rule-soft py-2.5">
            <p className="font-display text-[16px]">
              {name}
              {silent.includes(name) && (
                <span className="ml-2 font-mono text-[10px] tracking-[0.12em] text-faint uppercase">
                  found nothing
                </span>
              )}
            </p>
            <ul className="mt-0.5 space-y-0.5">
              {rulesOf(raw).map((r, i) => (
                <li key={i} className="font-mono text-[11px] leading-relaxed break-all text-faint">
                  {r}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <Block title="Corrections">
        <p>
          If a line is wrong about your site, it is wrong in public and I would rather fix
          it: the evidence string on each row says exactly what was matched, so a
          correction takes one message.{" "}
          <a className="text-accent underline underline-offset-2" href="https://x.com/antionmil">
            @antionmil
          </a>
          .
        </p>
        <p>
          <Link href="/" className="text-accent underline underline-offset-2">
            Back to the census
          </Link>
          .
        </p>
      </Block>
    </Sheet>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-mono text-[11px] tracking-[0.16em] text-faint uppercase">{title}</h2>
      <div className="font-body mt-2 max-w-[62ch] space-y-3 border-t border-rule pt-3 text-[15px] leading-relaxed text-muted">
        {children}
      </div>
    </section>
  );
}
