import Link from "next/link";
import { Sheet } from "@/components/Sheet";

export default function NotFound() {
  return (
    <Sheet>
      <h1 className="font-display mt-5 max-w-[18ch] text-[34px] leading-[1.1] sm:text-[42px]">
        Not in this census.
      </h1>
      <p className="font-body mt-4 max-w-[58ch] text-[16px] leading-relaxed text-muted">
        Either the technology was not found on any product in the latest survey, or the
        product is not in the census. The population is fixed between surveys — which is
        what makes &ldquo;what changed&rdquo; mean anything.
      </p>
      <p className="font-body mt-4 text-[16px] text-muted">
        <Link href="/" className="text-accent underline underline-offset-2">
          Back to the census
        </Link>
        .
      </p>
    </Sheet>
  );
}
