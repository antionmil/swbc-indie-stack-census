import { NextResponse } from "next/server";
import { runCensus } from "@/lib/run";

export const runtime = "nodejs";
/** 1,224 products plus their stylesheets took 103 seconds in production. 300 is
 *  the Pro ceiling and leaves room for a slow site to hit its own timeout
 *  without taking the run down. */
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const JOBS: Record<string, () => Promise<unknown>> = {
  census: runCensus,
};

/**
 * Secret-gated. Vercel Cron sends `Authorization: Bearer $CRON_SECRET`; anyone
 * else gets a 401 and no hint about which jobs exist.
 *
 * A guard is only a guard once you have fired the thing it exists to stop, so
 * this one is tested by calling it unauthenticated and watching it refuse —
 * see qa/gate.test.mts.
 */
export async function GET(req: Request, { params }: { params: Promise<{ job: string }> }) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not set" }, { status: 500 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { job } = await params;
  const fn = JOBS[job];
  if (!fn) return NextResponse.json({ error: "Unknown job" }, { status: 404 });

  const started = Date.now();
  try {
    return NextResponse.json({ ok: true, job, ms: Date.now() - started, result: await fn() });
  } catch (e) {
    return NextResponse.json(
      { ok: false, job, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
