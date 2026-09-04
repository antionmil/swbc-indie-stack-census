import type { MetadataRoute } from "next";
import { SITES } from "@/data/sites";
import { latestRun, tally, techSlug } from "@/lib/census";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://stackcensus.onedaybuilt.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const run = await latestRun();
  const techs = run ? await tally(run.id) : [];
  const at = run ? new Date(run.finished_at) : new Date();

  return [
    { url: BASE, lastModified: at, priority: 1 },
    { url: `${BASE}/changes`, lastModified: at, priority: 0.8 },
    { url: `${BASE}/method`, lastModified: at, priority: 0.5 },
    ...SITES.map((s) => ({ url: `${BASE}/s/${s.domain}`, lastModified: at, priority: 0.6 })),
    ...techs.map((t) => ({ url: `${BASE}/t/${techSlug(t.tech)}`, lastModified: at, priority: 0.6 })),
  ];
}
