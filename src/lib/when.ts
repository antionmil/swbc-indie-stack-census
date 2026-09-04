/* Every date on this site is `05.09.2026`. One format, everywhere: a page that
   writes "Saturday 5 September" in one place and 05.09.2026 in another makes a
   reader check whether they are the same date. The long forms were deleted
   rather than left for later, because an unused date formatter is exactly the
   thing that gets picked up again by accident. */

/**
 * The cron runs at 06:00 UTC every day (vercel.json). This says which morning
 * comes next after a given moment, so the page can promise a date rather than
 * "daily" — a vague promise is the same as no return mechanic.
 *
 * It was weekly for the first day of this site's life. Daily is the point of a
 * page somebody checks: a feed that fills once a week is a page you bookmark
 * and forget.
 */
export function nextRun(after: Date | string): Date {
  const x = new Date(typeof after === "string" ? after : after.getTime());
  const d = new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate(), 6, 0, 0));
  if (d.getTime() <= x.getTime()) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

/** 05.09.2026. Zero-padded, so a column of these lines up. */
export function numericDate(d: Date | string): string {
  const x = typeof d === "string" ? new Date(d) : d;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(x.getUTCDate())}.${p(x.getUTCMonth() + 1)}.${x.getUTCFullYear()}`;
}
