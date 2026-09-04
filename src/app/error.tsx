"use client";

import Link from "next/link";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-14 sm:px-8">
      <div className="border-b-2 border-ink pb-2.5 font-mono text-[11px] tracking-[0.16em] uppercase">
        Indie stack census
      </div>
      <h1 className="font-display mt-9 max-w-[18ch] text-[34px] leading-[1.1]">
        This page did not render.
      </h1>
      <p className="font-body mt-4 max-w-[58ch] text-[16px] leading-relaxed text-muted">
        The census data is written once a week and read from a static page, so this is
        almost certainly temporary.
      </p>
      <p className="font-body mt-4 text-[16px] text-muted">
        <button onClick={reset} className="text-accent underline underline-offset-2">
          Try again
        </button>
        {" · "}
        <Link href="/" className="text-accent underline underline-offset-2">
          the census
        </Link>
      </p>
    </main>
  );
}
