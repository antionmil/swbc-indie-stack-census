import { ImageResponse } from "next/og";
import { latestRun, tally } from "@/lib/census";
import { longDate } from "@/lib/when";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Indie stack census — what fifty-one indie products actually run on";

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
  const run = await latestRun();
  const rows = run ? (await tally(run.id)).slice(0, 5) : [];
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
          background: "#f6f2e9",
          color: "#221e17",
          padding: 68,
          fontFamily: font ? "Serif" : "serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, color: "#6b6152", borderBottom: "3px solid #221e17", paddingBottom: 14 }}>
          <span>INDIE STACK CENSUS</span>
          <span>{run ? `Run ${String(run.seq).padStart(3, "0")} · ${longDate(run.finished_at)}` : "Run 001"}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map((r) => (
            <div key={r.tech} style={{ display: "flex", justifyContent: "space-between", fontSize: 40, borderBottom: "1px solid #d8cfbc", paddingBottom: 8 }}>
              <span>{r.tech}</span>
              <span style={{ color: "#8a3a1c" }}>
                {r.n}
                <span style={{ color: "#6b6152" }}>/{run?.n_fetched ?? 51}</span>
              </span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", fontSize: 30, color: "#5c5344" }}>
          {run ? `${run.n_fetched} indie products, fetched the same morning.` : "Fifty-one indie products, counted."}
        </div>
      </div>
    ),
    { ...size, fonts: font ? [{ name: "Serif", data: font, style: "normal", weight: 400 }] : undefined },
  );
}
