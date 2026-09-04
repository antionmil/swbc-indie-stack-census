/**
 * The census list: 51 products, fixed for the run.
 *
 * Fixed on purpose. A census that gains and loses members between snapshots
 * cannot support a "what changed" feed — every diff would mix a real migration
 * in with a change of population. Sites are added at a version bump, and the
 * page says which version it is looking at.
 *
 * `group` is a hand classification of what the product DOES. It is not a claim
 * about the company: no revenue, no headcount, no funding. n=51 cannot carry
 * those and the brief for this build ruled them out.
 */
export type Group =
  | "Analytics"
  | "Newsletters & publishing"
  | "Forms"
  | "Scheduling"
  | "Issue tracking"
  | "Hosting"
  | "Databases"
  | "Auth"
  | "Transactional email"
  | "Payments"
  | "Desktop apps"
  | "Image APIs"
  | "Screen capture"
  | "Solo-run products"
  | "Communities";

export type CensusSite = { domain: string; name: string; group: Group };

export const SITES: CensusSite[] = [
  { domain: "plausible.io", name: "Plausible", group: "Analytics" },
  { domain: "fathomanalytics.com", name: "Fathom", group: "Analytics" },
  { domain: "simpleanalytics.com", name: "Simple Analytics", group: "Analytics" },
  { domain: "umami.is", name: "Umami", group: "Analytics" },
  { domain: "posthog.com", name: "PostHog", group: "Analytics" },

  { domain: "buttondown.com", name: "Buttondown", group: "Newsletters & publishing" },
  { domain: "beehiiv.com", name: "beehiiv", group: "Newsletters & publishing" },
  { domain: "convertkit.com", name: "Kit", group: "Newsletters & publishing" },
  { domain: "ghost.org", name: "Ghost", group: "Newsletters & publishing" },
  { domain: "substack.com", name: "Substack", group: "Newsletters & publishing" },

  { domain: "tally.so", name: "Tally", group: "Forms" },
  { domain: "typeform.com", name: "Typeform", group: "Forms" },
  { domain: "fillout.com", name: "Fillout", group: "Forms" },
  { domain: "formspark.io", name: "Formspark", group: "Forms" },

  { domain: "cal.com", name: "Cal.com", group: "Scheduling" },
  { domain: "savvycal.com", name: "SavvyCal", group: "Scheduling" },
  { domain: "calendly.com", name: "Calendly", group: "Scheduling" },

  { domain: "linear.app", name: "Linear", group: "Issue tracking" },
  { domain: "shortcut.com", name: "Shortcut", group: "Issue tracking" },

  { domain: "railway.app", name: "Railway", group: "Hosting" },
  { domain: "render.com", name: "Render", group: "Hosting" },
  { domain: "fly.io", name: "Fly.io", group: "Hosting" },
  { domain: "netlify.com", name: "Netlify", group: "Hosting" },
  { domain: "vercel.com", name: "Vercel", group: "Hosting" },

  { domain: "supabase.com", name: "Supabase", group: "Databases" },
  { domain: "neon.tech", name: "Neon", group: "Databases" },
  { domain: "planetscale.com", name: "PlanetScale", group: "Databases" },
  { domain: "xata.io", name: "Xata", group: "Databases" },
  { domain: "turso.tech", name: "Turso", group: "Databases" },

  { domain: "clerk.com", name: "Clerk", group: "Auth" },
  { domain: "workos.com", name: "WorkOS", group: "Auth" },
  { domain: "stytch.com", name: "Stytch", group: "Auth" },

  { domain: "resend.com", name: "Resend", group: "Transactional email" },
  { domain: "loops.so", name: "Loops", group: "Transactional email" },
  { domain: "postmarkapp.com", name: "Postmark", group: "Transactional email" },

  { domain: "lemonsqueezy.com", name: "Lemon Squeezy", group: "Payments" },
  { domain: "paddle.com", name: "Paddle", group: "Payments" },
  { domain: "polar.sh", name: "Polar", group: "Payments" },

  { domain: "raycast.com", name: "Raycast", group: "Desktop apps" },
  { domain: "arc.net", name: "Arc", group: "Desktop apps" },
  { domain: "cron.com", name: "Cron", group: "Desktop apps" },

  { domain: "bannerbear.com", name: "Bannerbear", group: "Image APIs" },
  { domain: "placid.app", name: "Placid", group: "Image APIs" },
  { domain: "abyssale.com", name: "Abyssale", group: "Image APIs" },

  { domain: "screenstudio.com", name: "Screen Studio", group: "Screen capture" },
  { domain: "cleanshot.com", name: "CleanShot X", group: "Screen capture" },

  { domain: "nomadlist.com", name: "Nomad List", group: "Solo-run products" },
  { domain: "remoteok.com", name: "Remote OK", group: "Solo-run products" },
  { domain: "photoai.com", name: "Photo AI", group: "Solo-run products" },

  { domain: "indiehackers.com", name: "Indie Hackers", group: "Communities" },
  { domain: "microacquire.com", name: "Acquire.com", group: "Communities" },
];

export const byDomain = new Map(SITES.map((s) => [s.domain, s]));
