"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";

/**
 * The way in.
 *
 * Everything this filters is already on the page: 51 products and every
 * technology in the survey, passed in from the server. So it is a filter, not
 * a search — no request, nothing to rate-limit, nothing to go stale, and it
 * works the moment the static page paints. It exists because the roll of
 * products used to sit nine screens down, which made the first thing a visitor
 * wants — one product — the hardest thing to reach.
 */
export type JumpItem = {
  href: string;
  label: string;
  /** The domain for a product, the count for a technology. */
  sub: string;
  kind: "product" | "technology";
};

const MAX = 8;

export function Jump({ items }: { items: JumpItem[] }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hits = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    const scored = items
      .map((it) => {
        const hay = `${it.label} ${it.sub}`.toLowerCase();
        const at = hay.indexOf(needle);
        if (at < 0) return null;
        /* A prefix match on the name beats a match buried in the domain, so
           typing "cal" offers Cal.com before Abyssale's calendly evidence. */
        const rank = it.label.toLowerCase().startsWith(needle) ? 0 : at === 0 ? 1 : 2;
        return { it, rank, at };
      })
      .filter(Boolean) as { it: JumpItem; rank: number; at: number }[];
    return scored
      .sort((a, b) => a.rank - b.rank || a.at - b.at || a.it.label.localeCompare(b.it.label))
      .slice(0, MAX)
      .map((s) => s.it);
  }, [items, q]);

  /* Down-arrow from the field moves into the results, and Escape comes back
     out — otherwise a keyboard visitor has to tab through every option to
     leave the box. */
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setQ("");
      setOpen(false);
      inputRef.current?.focus();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const links = listRef.current?.querySelectorAll("a");
      if (!links?.length) return;
      const i = [...links].indexOf(document.activeElement as HTMLAnchorElement);
      (links[Math.min(i + 1, links.length - 1)] as HTMLAnchorElement).focus();
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const links = listRef.current?.querySelectorAll("a");
      if (!links?.length) return;
      const i = [...links].indexOf(document.activeElement as HTMLAnchorElement);
      if (i <= 0) inputRef.current?.focus();
      else (links[i - 1] as HTMLAnchorElement).focus();
    }
  };

  const showing = open && q.trim().length > 0;

  return (
    <div className="mt-7" onKeyDown={onKeyDown}>
      <label htmlFor="jump" className="font-mono text-[10px] tracking-[0.14em] text-faint uppercase">
        find a product or a technology
      </label>
      <input
        id="jump"
        ref={inputRef}
        type="text"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        autoComplete="off"
        spellCheck={false}
        placeholder="linear, tailwind, cloudflare…"
        aria-describedby="jump-note"
        className="mt-1.5 w-full border-b border-ink bg-transparent pb-1.5 font-mono text-[15px] text-ink placeholder:text-faint focus:border-accent focus:outline-none"
      />
      <p id="jump-note" className="mt-1.5 font-mono text-[11px] text-faint">
        {showing
          ? hits.length === 0
            ? `Nothing in this survey matches “${q.trim()}”. The list is 51 products, fixed for the run.`
            : `${hits.length} of ${items.length}`
          : "Any of the 51 products, or anything found on them."}
      </p>

      {showing && hits.length > 0 && (
        <ul ref={listRef} className="mt-2 border-t border-rule">
          {hits.map((it) => (
            <li key={it.href}>
              <Link
                href={it.href}
                className="flex items-baseline gap-3 border-b border-rule-soft py-2 hover:bg-surface focus:bg-surface"
              >
                <span className="font-display text-[16px]">{it.label}</span>
                <span aria-hidden className="leader" />
                {/* The kind is not decoration. "Calendly" is both a product in
                    the census and a technology found on another product, and
                    two identical-looking rows would send half the visitors to
                    the wrong page. */}
                <span className="font-mono text-[11px] whitespace-nowrap text-faint">
                  {it.kind} · {it.sub}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
