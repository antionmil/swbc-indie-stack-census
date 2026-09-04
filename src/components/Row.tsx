import Link from "next/link";

/**
 * One line of the ledger: a name, a leader, and TWO figures — what the 51
 * commercial products do, and what the open-source group does.
 *
 * Two columns rather than one total. The total hides the only thing worth
 * knowing: the two populations disagree, often sharply, and a single number
 * averaged over both would report neither.
 *
 * Underneath, in small type, sits the string in the response that put the name
 * there. A census that prints a count and asks to be believed is an assertion.
 * One that prints the header it read is checkable.
 */
export function Heads({ a, b }: { a: string; b: string }) {
  return (
    <div className="flex items-baseline gap-3 border-b border-rule pb-1 font-mono text-[10px] tracking-[0.12em] text-faint uppercase">
      <span className="flex-1" />
      <span className="w-[72px] shrink-0 text-right">{a}</span>
      <span className="w-[84px] shrink-0 text-right">{b}</span>
    </div>
  );
}

export function Row({
  href,
  name,
  note,
  evidence,
  a,
  aOf,
  b,
  bOf,
}: {
  href: string;
  name: string;
  note?: string | null;
  evidence?: string | null;
  a: number;
  aOf: number;
  b: number;
  bOf: number;
}) {
  return (
    <Link
      href={href}
      className="group block border-b border-rule-soft py-2.5 last:border-b-0 hover:bg-surface"
    >
      <span className="flex items-baseline gap-3">
        <span className="font-display flex-1 text-[17px] leading-snug group-hover:text-accent">
          {name}
        </span>
        <span className="tnum w-[72px] shrink-0 text-right font-mono text-[14px] font-semibold whitespace-nowrap">
          {a === 0 ? <span className="text-faint">—</span> : <>{a}<span className="text-faint font-normal">/{aOf}</span></>}
        </span>
        <span className="tnum w-[84px] shrink-0 text-right font-mono text-[14px] font-semibold whitespace-nowrap">
          {b === 0 ? <span className="text-faint">—</span> : <>{b}<span className="text-faint font-normal">/{bOf}</span></>}
        </span>
      </span>
      {(note || evidence) && (
        <span className="mt-0.5 flex flex-wrap items-baseline gap-x-2 font-mono text-[11px] leading-relaxed text-faint">
          {note && <span>{note}</span>}
          {note && evidence && <span aria-hidden>·</span>}
          {evidence && <span className="truncate">{evidence}</span>}
        </span>
      )}
    </Link>
  );
}
