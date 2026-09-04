import type { MetadataRoute } from "next";
import { SITES } from "@/data/sites";
import { survey, techSlug } from "@/lib/census";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://stackcensus.onedaybuilt.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const s = await survey();
  const techs = s?.tally ?? [];
  const at = s ? new Date(s.run.finished_at) : new Date();

  return [
    { url: BASE, lastModified: at, priority: 1 },
    { url: `${BASE}/changes`, lastModified: at, priority: 0.8 },
    { url: `${BASE}/sites`, lastModified: at, priority: 0.7 },
    { url: `${BASE}/method`, lastModified: at, priority: 0.5 },
    ...SITES.map((s) => ({ url: `${BASE}/s/${s.domain}`, lastModified: at, priority: 0.6 })),
    ...techs.map((t) => ({ url: `${BASE}/t/${techSlug(t.tech)}`, lastModified: at, priority: 0.6 })),
  ];
}
