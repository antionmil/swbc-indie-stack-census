import { ImageResponse } from "next/og";
import { survey } from "@/lib/census";
import { numericDate } from "@/lib/when";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Stack census — what a thousand real websites are built with";

/**
 * THE FONT TRAP, already paid for once in the scaffold: ImageResponse cannot
 * use a CSS font-family, and a modern user-agent gets woff2 from Google, which
 * ImageResponse cannot read. Spoof an old UA to be served a TTF.
 */
async function serif(): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch("https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;600&display=swap", {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; SWBC/1.0)" },
      })
    ).text();
    const url = css.match(/src:\s*url\(([^)]+)\)/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null; // a missing font must never take the image down
  }
}

export default async function OG() {
  const s = await survey();
  const run = s?.run ?? null;
  /* HSTS and HTTP/3 are true and they are transport, not a stack choice. They
     also happen to be the two biggest numbers, so the share card led with them
     and told a reader nothing about what anybody builds with. They stay in the
     tally and stay off the card, for the same reason they are kept out of the
     change feed. */
  const rows = s ? s.tally.filter((r) => r.tech !== "HSTS" && r.tech !== "HTTP/3").slice(0, 5) : [];
  const font = await serif();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#14120f",
          color: "#ece4d5",
          padding: 68,
          fontFamily: font ? "Serif" : "serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, color: "#968878", borderBottom: "3px solid #ece4d5", paddingBottom: 14 }}>
          <span>STACK CENSUS</span>
          <span>{run ? `Survey ${String(run.seq).padStart(3, "0")} · ${numericDate(run.finished_at)}` : ""}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map((r) => (
            <div key={r.tech} style={{ display: "flex", justifyContent: "space-between", fontSize: 40, borderBottom: "1px solid #332c24", paddingBottom: 8 }}>
              <span>{r.tech}</span>
              <span style={{ color: "#e08a5c" }}>
                {r.n}
                <span style={{ color: "#968878" }}>
                  /{(run?.n_fetched ?? 1224).toLocaleString("en-GB")}
                </span>
              </span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", fontSize: 30, color: "#a8998a" }}>
          {run
            ? `${run.n_fetched.toLocaleString("en-GB")} products, fetched this morning and counted.`
            : "A thousand products, fetched every morning and counted."}
        </div>
      </div>
    ),
    { ...size, fonts: font ? [{ name: "Serif", data: font, style: "normal", weight: 400 }] : undefined },
  );
}
