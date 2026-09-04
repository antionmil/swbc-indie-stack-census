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
 * The cron runs at 06:00 UTC every Thursday (vercel.json). This says which
 * Thursday comes next after a given moment, so the page can promise a date
 * rather than "weekly" — a vague promise is the same as no return mechanic.
 */
export function nextRun(after: Date | string): Date {
  const x = new Date(typeof after === "string" ? after : after.getTime());
  const d = new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate(), 6, 0, 0));
  do {
    d.setUTCDate(d.getUTCDate() + 1);
  } while (d.getUTCDay() !== 4);
  return d;
}
