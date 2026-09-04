import Link from "next/link";

/**
 * One line of the ledger: a name, a leader, a figure — and underneath, in small
 * type, the string in the response that put the name there.
 *
 * The evidence is not decoration. A census that prints a count and asks to be
 * believed is an assertion. One that prints the header it read is checkable.
 */
export function Row({
  href,
  name,
  note,
  evidence,
  count,
  of,
}: {
  href: string;
  name: string;
  note?: string | null;
  evidence?: string | null;
  count: number;
  of: number;
}) {
  return (
    <Link
      href={href}
      className="group block border-b border-rule-soft py-2.5 last:border-b-0 hover:bg-surface"
    >
      <span className="flex items-baseline gap-3">
        <span className="font-display text-[17px] leading-snug group-hover:text-accent">{name}</span>
        <span aria-hidden className="leader" />
        <span className="tnum font-mono text-[15px] font-semibold whitespace-nowrap">
          {count}
          <span className="font-normal text-faint">/{of.toLocaleString("en-GB")}</span>
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
