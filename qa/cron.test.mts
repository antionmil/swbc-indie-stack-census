/**
 * The cron gate, tested by attempting what it exists to stop.
 *
 * Day 1 of this run shipped a rate limiter that compiled, deployed and did
 * nothing: 95 parallel requests against a limit of 80 all returned 200. The
 * lesson was not about rate limiters. Anything meant to PREVENT something has
 * to be fired at.
 *
 * Usage: pnpm qa:cron <base-url>   (defaults to the local dev server)
 */
const base = process.argv[2] ?? "http://localhost:3000";
let failures = 0;

async function expect(label: string, url: string, init: RequestInit, want: number) {
  const r = await fetch(url, init);
  const got = r.status;
  const pass = got === want;
  if (!pass) failures++;
  console.log(`  ${pass ? "ok  " : "FAIL"}  ${label.padEnd(46)} want ${want}, got ${got}`);
}

console.log(`firing at ${base}\n`);
await expect("no Authorization header", `${base}/api/cron/census`, {}, 401);
await expect("wrong secret", `${base}/api/cron/census`, { headers: { authorization: "Bearer not-the-secret" } }, 401);
await expect("right shape, unknown job", `${base}/api/cron/nope`, { headers: { authorization: "Bearer not-the-secret" } }, 401);
await expect("secret in a query string instead", `${base}/api/cron/census?secret=x`, {}, 401);

console.log(failures === 0 ? "\ncron gate: PASS — every unauthorised shape was refused" : `\ncron gate: ${failures} FAILURES`);
process.exitCode = failures === 0 ? 0 : 1;
