/**
 * The census is organised by QUESTION, not by the ruleset's 109 categories.
 *
 * "UI frameworks", "Web frameworks" and "Static site generator" are three
 * categories and one question: what is this page built with. A reader wants
 * the question answered; the taxonomy is the tool's, not theirs.
 *
 * Category ids are from the ruleset (categories.json) and are stable. Names
 * are in the comments so a wrong id is visible without a lookup.
 */
export type Section = { slug: string; title: string; blurb: string; cats: number[] };

export const SECTIONS: Section[] = [
  {
    slug: "built-with",
    title: "What the page is built with",
    blurb: "The framework, the CSS, the component layer — whatever left a trace in the HTML or the stylesheet.",
    // JS frameworks 12, Web frameworks 18, UI frameworks 66, SSG 57, JS libraries 59, Programming languages 27, Mobile frameworks 26
    cats: [12, 18, 66, 57, 59, 27, 26],
  },
  {
    slug: "served-from",
    title: "Where it is served from",
    blurb: "Read off the response headers: who answered, and what sat in front of them.",
    // PaaS 62, IaaS 63, CDN 31, Hosting 88, Web servers 22, Reverse proxies 64, Load balancers 65
    cats: [62, 63, 31, 88, 22, 64, 65],
  },
  {
    slug: "email",
    title: "Where their email goes",
    blurb: "From the MX records on the domain. It is the one part of a company's stack that cannot be hidden behind a CDN.",
    // Webmail 30, Email 75
    cats: [30, 75],
  },
  {
    slug: "watching",
    title: "What is watching the visitor",
    blurb: "Analytics, tag managers and ad pixels loaded by the home page itself.",
    // Analytics 10, Tag managers 42, A/B Testing 74, Retargeting 77, Advertising 36, RUM 78, Segmentation 86, Browser fingerprinting 83
    cats: [10, 42, 74, 77, 36, 78, 86, 83],
  },
  {
    slug: "money",
    title: "How they take money",
    blurb: "Only what the marketing page loads. A checkout behind a login is invisible from here, and the counts are low because of it.",
    // Payment processors 41, Ecommerce 6, Buy now pay later 91, Affiliate programs 71
    cats: [41, 6, 91, 71],
  },
  {
    slug: "talking",
    title: "How they answer customers",
    blurb: "Chat widgets, CRM tags and marketing automation — the tools that expect a human on the other end.",
    // Live chat 52, Marketing automation 32, CRM 53, Customer data platform 97, Surveys 73, User onboarding 58
    cats: [52, 32, 53, 97, 73, 58],
  },
  {
    slug: "when-it-breaks",
    title: "What tells them it broke",
    blurb: "Error reporting and performance monitoring, which almost nobody loads on a marketing page.",
    // Issue trackers 13, Performance 92, Feature management 85
    cats: [13, 92, 85],
  },
  {
    slug: "words-and-pictures",
    title: "Where the words and pictures live",
    blurb: "The CMS, the image host and the search box.",
    // CMS 1, Digital asset management 95, Search engines 29, Documentation 4, Blogs 11, Video players 14, Media servers 38
    cats: [1, 95, 29, 4, 11, 14, 38],
  },
  {
    slug: "gates",
    title: "What stands at the door",
    blurb: "Bot management, captchas and cookie banners.",
    // Security 16, Cookie compliance 67, Authentication 69
    cats: [16, 67, 69],
  },
];

const INDEX = new Map<number, Section>();
for (const s of SECTIONS) for (const c of s.cats) if (!INDEX.has(c)) INDEX.set(c, s);

/** First section that claims any of the technology's categories. Order in
 *  SECTIONS is therefore the tie-break: Next.js is four categories and one
 *  answer, and the answer is "what the page is built with". */
export function sectionFor(cats: number[]): Section | null {
  for (const s of SECTIONS) if (cats.some((c) => s.cats.includes(c))) return s;
  void INDEX;
  return null;
}

/** Everything the sections do not claim. Not hidden — it gets its own section
 *  at the bottom, because a census that quietly drops what it cannot file is
 *  not a census. */
export const REST: Section = {
  slug: "everything-else",
  title: "Everything else",
  blurb: "Found, counted, and not part of any question above.",
  cats: [],
};
