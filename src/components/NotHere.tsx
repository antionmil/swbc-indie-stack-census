import Link from "next/link";
import { Sheet } from "@/components/Sheet";

/**
 * The "not in this census" page, shared by three boundaries.
 *
 * It needs to exist three times because `notFound()` inside a dynamic segment
 * does NOT fall back to the root not-found: an audit found that
 * /t/<unknown> and /s/<unknown> returned a correct 404 status with a
 * completely empty body, while an unmatched path rendered properly. A blank
 * page is what a reader gets when a technology drops out of the census and
 * they open yesterday's link.
 */
export function NotHere() {
  return (
    <Sheet>
      <h1 className="font-display mt-5 max-w-[18ch] text-[34px] leading-[1.1] sm:text-[42px]">
        Not in this census.
      </h1>
      <p className="font-body mt-4 max-w-[58ch] text-[16px] leading-relaxed text-muted">
        Either the technology was not found on any product in the latest survey, or the
        product is not one of the {""}
        <Link href="/sites" className="text-accent underline underline-offset-2">
          named products
        </Link>
        . The census is fixed between surveys, and a technology that nobody runs any more
        loses its page — which is the honest outcome, if an inconvenient one for a link
        you saved last week.
      </p>
      <p className="font-body mt-4 text-[16px] text-muted">
        <Link href="/" className="text-accent underline underline-offset-2">
          Back to the census
        </Link>
        {" · "}
        <Link href="/changes" className="text-accent underline underline-offset-2">
          what changed
        </Link>
      </p>
    </Sheet>
  );
}
