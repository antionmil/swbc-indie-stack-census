import Link from "next/link";
import { Here } from "@/components/Here";

/** The masthead and the footer rule, on every page. A ledger page is only
 *  legible if you can see which survey it belongs to. */
export function Sheet({
  run,
  date,
  children,
}: {
  run?: number | null;
  date?: string | null;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
      <div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1 border-b-2 border-ink pb-2.5">
        <Link
          href="/"
          className="font-mono text-[11px] tracking-[0.16em] uppercase hover:text-accent"
        >
          Stack census
        </Link>
        <span className="tnum font-mono text-[11px] text-faint">
          {run ? `Survey ${String(run).padStart(3, "0")}` : "Survey 001"}
          {date ? ` · ${date}` : ""}
        </span>
      </div>
      <div className="mt-4">
        <Here />
      </div>
      {children}
      <footer className="mt-14 border-t-2 border-ink pt-3 font-mono text-[11px] leading-relaxed text-faint">
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          <Link href="/" className="hover:text-accent">the census</Link>
          <Link href="/changes" className="hover:text-accent">what changed</Link>
          <Link href="/sites" className="hover:text-accent">the products</Link>
          <Link href="/method" className="hover:text-accent">method &amp; limits</Link>
          <a href="https://onedaybuilt.com" className="hover:text-accent">one website a day</a>
        </div>
        <p className="mt-3 max-w-prose">
          Fingerprint rules from{" "}
          <a className="underline underline-offset-2 hover:text-accent" href="https://github.com/enthec/webappanalyzer">
            enthec/webappanalyzer
          </a>
          , GPL-3.0, fetched at run time and never redistributed here. Nothing is stored
          in your browser. Day 4 of{" "}
          <a className="underline underline-offset-2 hover:text-accent" href="https://onedaybuilt.com">
            26
          </a>
          , by{" "}
          <a className="underline underline-offset-2 hover:text-accent" href="https://x.com/antionmil">
            @antionmil
          </a>
          .
        </p>
      </footer>
    </main>
  );
}
