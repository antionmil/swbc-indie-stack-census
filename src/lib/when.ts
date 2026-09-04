/** Dates, written the way a person writes them. */
export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function longDate(d: Date | string): string {
  const x = typeof d === "string" ? new Date(d) : d;
  return `${x.getUTCDate()} ${MONTHS[x.getUTCMonth()]} ${x.getUTCFullYear()}`;
}

export function dayAndDate(d: Date | string): string {
  const x = typeof d === "string" ? new Date(d) : d;
  return `${DAYS[x.getUTCDay()]} ${x.getUTCDate()} ${MONTHS[x.getUTCMonth()]}`;
}

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
