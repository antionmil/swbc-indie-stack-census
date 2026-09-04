/**
 * The 51 hand-picked commercial indie products.
 *
 * Fixed on purpose. A census that gains and loses members between snapshots
 * cannot support a "what changed" feed — every diff would mix a real migration
 * in with a change of population. Sites are added at a version bump, and the
 * page says which version it is looking at.
 *
 * `topic` is a hand classification of what the product DOES. It is not a claim
 * about the company: no revenue, no headcount, no funding. This is the small,
 * commercial group; the open-source group is generated into sites.ts from two
 * public lists by scripts/build-list.mts.
 */
export type CensusSite = {
  domain: string;
  name: string;
  /** "indie" = one of the 51 hand-picked commercial products. "oss" = an
   *  open-source tool from one of the two public lists. */
  kind: "indie" | "oss";
  /** Which list it came from, so a row can be traced to its source. */
  src: string;
  /** What it is. For the 51, my classification. For the rest, the section
   *  heading the source list filed it under. */
  topic: string;
};

export const INDIE: { domain: string; name: string; topic: string }[] = [
  { domain: "plausible.io", name: "Plausible", topic: "Analytics" },
  { domain: "fathomanalytics.com", name: "Fathom", topic: "Analytics" },
  { domain: "simpleanalytics.com", name: "Simple Analytics", topic: "Analytics" },
  { domain: "umami.is", name: "Umami", topic: "Analytics" },
  { domain: "posthog.com", name: "PostHog", topic: "Analytics" },

  { domain: "buttondown.com", name: "Buttondown", topic: "Newsletters & publishing" },
  { domain: "beehiiv.com", name: "beehiiv", topic: "Newsletters & publishing" },
  { domain: "convertkit.com", name: "Kit", topic: "Newsletters & publishing" },
  { domain: "ghost.org", name: "Ghost", topic: "Newsletters & publishing" },
  { domain: "substack.com", name: "Substack", topic: "Newsletters & publishing" },

  { domain: "tally.so", name: "Tally", topic: "Forms" },
  { domain: "typeform.com", name: "Typeform", topic: "Forms" },
  { domain: "fillout.com", name: "Fillout", topic: "Forms" },
  { domain: "formspark.io", name: "Formspark", topic: "Forms" },

  { domain: "cal.com", name: "Cal.com", topic: "Scheduling" },
  { domain: "savvycal.com", name: "SavvyCal", topic: "Scheduling" },
  { domain: "calendly.com", name: "Calendly", topic: "Scheduling" },

  { domain: "linear.app", name: "Linear", topic: "Issue tracking" },
  { domain: "shortcut.com", name: "Shortcut", topic: "Issue tracking" },

  { domain: "railway.app", name: "Railway", topic: "Hosting" },
  { domain: "render.com", name: "Render", topic: "Hosting" },
  { domain: "fly.io", name: "Fly.io", topic: "Hosting" },
  { domain: "netlify.com", name: "Netlify", topic: "Hosting" },
  { domain: "vercel.com", name: "Vercel", topic: "Hosting" },

  { domain: "supabase.com", name: "Supabase", topic: "Databases" },
  { domain: "neon.tech", name: "Neon", topic: "Databases" },
  { domain: "planetscale.com", name: "PlanetScale", topic: "Databases" },
  { domain: "xata.io", name: "Xata", topic: "Databases" },
  { domain: "turso.tech", name: "Turso", topic: "Databases" },

  { domain: "clerk.com", name: "Clerk", topic: "Auth" },
  { domain: "workos.com", name: "WorkOS", topic: "Auth" },
  { domain: "stytch.com", name: "Stytch", topic: "Auth" },

  { domain: "resend.com", name: "Resend", topic: "Transactional email" },
  { domain: "loops.so", name: "Loops", topic: "Transactional email" },
  { domain: "postmarkapp.com", name: "Postmark", topic: "Transactional email" },

  { domain: "lemonsqueezy.com", name: "Lemon Squeezy", topic: "Payments" },
  { domain: "paddle.com", name: "Paddle", topic: "Payments" },
  { domain: "polar.sh", name: "Polar", topic: "Payments" },

  { domain: "raycast.com", name: "Raycast", topic: "Desktop apps" },
  { domain: "arc.net", name: "Arc", topic: "Desktop apps" },
  { domain: "cron.com", name: "Cron", topic: "Desktop apps" },

  { domain: "bannerbear.com", name: "Bannerbear", topic: "Image APIs" },
  { domain: "placid.app", name: "Placid", topic: "Image APIs" },
  { domain: "abyssale.com", name: "Abyssale", topic: "Image APIs" },

  { domain: "screenstudio.com", name: "Screen Studio", topic: "Screen capture" },
  { domain: "cleanshot.com", name: "CleanShot X", topic: "Screen capture" },

  { domain: "nomadlist.com", name: "Nomad List", topic: "Solo-run products" },
  { domain: "remoteok.com", name: "Remote OK", topic: "Solo-run products" },
  { domain: "photoai.com", name: "Photo AI", topic: "Solo-run products" },

  { domain: "indiehackers.com", name: "Indie Hackers", topic: "Communities" },
  { domain: "microacquire.com", name: "Acquire.com", topic: "Communities" },
];
