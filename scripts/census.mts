/**
 * A census run from the command line — the same function the Thursday cron
 * calls, so the seeded survey and every later one are drawn by one
 * implementation. Needs DATABASE_URL.
 *
 * `--conditions=react-server` is load-bearing (it is in the pnpm script). The
 * database module imports `server-only`, whose default export exists to throw —
 * that is the whole point of it, and it is what stops the connection string
 * being pulled into a client bundle. Under that condition the package resolves
 * to the empty module instead, which is exactly how Next resolves it on the
 * server. Without the flag this script dies with "cannot be imported from a
 * Client Component".
 */
import { runCensus } from "../src/lib/run";

try {
  process.loadEnvFile(".env.local");
} catch {
  // already in the environment, which is how CI has it
}

const s = await runCensus();
console.log(`run ${String(s.run).padStart(3, "0")}: ${s.fetched} sites answered, ${s.findings} findings, ` +
  `+${s.changes.added} / -${s.changes.removed} changes, ${(s.ms / 1000).toFixed(1)}s`);
if (s.failed.length) console.log(`did not answer: ${s.failed.join(", ")}`);
