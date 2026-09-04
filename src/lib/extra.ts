import type { RawTech } from "@/lib/wappalyzer";

/**
 * Rules this census adds on top of the webappanalyzer ruleset.
 *
 * WHY THESE EXIST. The public ruleset detects the modern front end almost
 * entirely through `js` and `dom` rules — Next.js, for example, is `__NEXT_DATA__`
 * and `next.version`, both of which only exist once a browser has run the page.
 * A census that runs in a serverless function has no browser, so on the raw
 * ruleset alone Next.js appeared on 11 of 51 sites when the `/_next/static/`
 * script tags are sitting in the HTML of far more.
 *
 * Every rule below therefore matches something PRESENT IN THE RESPONSE: a
 * script URL, a tag in the document, a custom property in a stylesheet. Each
 * one is printed on the site's method page exactly as written here, so a
 * reader can check a claim against the page it came from instead of trusting
 * the tally.
 *
 * NAMES MATCH THE PUBLIC RULESET where the public ruleset has the technology
 * under a name of its own — `Fathom`, not `Fathom Analytics`; `Crisp Live Chat`,
 * not `Crisp`. A near-miss does not merge, it forks: the tally then carries the
 * same product twice under two spellings, which is exactly what `Sanity` and
 * `Sanity.io` do inside the ruleset itself (see ALIASES).
 *
 * The bar for adding one: it must be a string that the technology puts there
 * and that nothing else does. "The word appears somewhere on the page" is not
 * a fingerprint — a blog post about Sentry is not a site running Sentry.
 */
export const EXTRA: Record<string, RawTech> = {
  /* ---- frameworks and build output ---- */
  "Next.js": {
    scriptSrc: ["/_next/static/"],
    html: ['<script[^>]+id="__NEXT_DATA__"', "self\\.__next_f"],
  },
  "SvelteKit": { scriptSrc: ["/_app/immutable/"], html: ["__sveltekit_"], implies: ["Svelte"] },
  "Astro": { html: ["<astro-island", '/_astro/[^"\']+\\.(?:css|js)'] },
  "Remix": { html: ["window\\.__remixContext"], implies: ["React"] },
  "Gatsby": { html: ['id="___gatsby"', "/page-data/(?:sq/)?"], implies: ["React"] },
  "Nuxt.js": { scriptSrc: ["/_nuxt/"] },

  /* ---- interface layer ---- */
  "Radix UI": { html: ["data-radix-[a-z-]+", 'data-radix-scroll-area-viewport'] },
  "shadcn/ui": { html: ['data-slot="(?:button|card|badge|input|dialog|tabs)"\;confidence:50'] },
  "Framer Sites": { meta: { generator: "Framer" }, html: ["framerusercontent\\.com"] },

  /* ---- analytics ---- */
  "Plausible": { scriptSrc: ["plausible\\.io/js/", "/js/plausible[^\"']*\\.js"], cats: [10] },
  "Fathom": { scriptSrc: ["cdn\\.usefathom\\.com/"], cats: [10] },
  "Simple Analytics": { scriptSrc: ["simpleanalyticscdn\\.com", "sa\\.simpleanalytics"], cats: [10] },
  "Umami": { html: ['data-website-id="[0-9a-f-]{36}"\;confidence:50'], cats: [10] },
  "PostHog": {
    scriptSrc: ["(?:app|eu|us)(?:-assets)?\\.(?:i\\.)?posthog\\.com", "posthog-js"],
    scripts: ["(?:app|eu|us)(?:-assets)?\\.(?:i\\.)?posthog\\.com", "posthog\\.init\\("],
    html: ["posthog\\.init\\("],
  },
  "Vercel Analytics": { scriptSrc: ["/_vercel/insights/script\\.js"], cats: [10] },
  "Vercel Speed Insights": { scriptSrc: ["/_vercel/speed-insights/script\\.js"], cats: [10] },
  "Amplitude": { scriptSrc: ["cdn\\.amplitude\\.com", "amplitude-js"], scripts: ["cdn\\.amplitude\\.com"], cats: [10] },
  "Mixpanel": { scriptSrc: ["cdn\\.mxpnl\\.com"], scripts: ["cdn\\.mxpnl\\.com"], cats: [10] },
  "Statsig": { scriptSrc: ["cdn\\.statsig\\.com"], scripts: ["cdn\\.statsig\\.com"], cats: [10] },
  "Koala": { scriptSrc: ["cdn\\.getkoala\\.com"], scripts: ["cdn\\.getkoala\\.com"], cats: [10] },
  "Common Room": { scriptSrc: ["cdn\\.cr-relay\\.com"], scripts: ["cdn\\.cr-relay\\.com"], cats: [10] },

  /* Third-party tags are almost never a plain <script src>. They are a loader
     snippet INSIDE an inline script, which is why the scriptSrc patterns above
     each have a `scripts` twin: savvycal.com loads Help Scout that way,
     shortcut.com loads Segment, loops.so and typeform.com load Amplitude. The
     host is always the CDN host, never the marketing domain — loops.so lists
     "https://www.klaviyo.com" in a JSON blob of competitors, and matching that
     would put Klaviyo in the tally for a page that merely names it. */
  "Segment": { scripts: ["cdn\\.segment\\.com/analytics"] },

  /* ---- support and chat ---- */
  "Intercom": { html: ["widget\\.intercom\\.io", "intercom-frame"], scripts: ["widget\\.intercom\\.io", "intercomSettings"] },
  "Crisp Live Chat": { scriptSrc: ["client\\.crisp\\.chat"], scripts: ["client\\.crisp\\.chat"], cats: [52] },
  "Plain": { scriptSrc: ["chat\\.cdn-plain\\.com"], scripts: ["chat\\.cdn-plain\\.com"], cats: [52] },
  "Front Chat": { scriptSrc: ["chat-assets\\.frontapp\\.com"], scripts: ["chat-assets\\.frontapp\\.com"], cats: [52] },
  "Help Scout": { scriptSrc: ["beacon-v2\\.helpscout\\.net"], scripts: ["beacon-v2\\.helpscout\\.net"], cats: [52] },

  /* ---- money ---- */
  "Stripe": { scriptSrc: ["js\\.stripe\\.com"], scripts: ["js\\.stripe\\.com"], html: ["(?:checkout|billing)\\.stripe\\.com"] },
  "Paddle": { scriptSrc: ["cdn\\.paddle\\.com", "sandbox-cdn\\.paddle\\.com"] },
  "Lemon Squeezy": { scriptSrc: ["lemonsqueezy\\.com/js", "assets\\.lemonsqueezy\\.com"], cats: [41] },

  /* ---- embeds a small team reaches for instead of building ---- */
  "Cal.com": { scriptSrc: ["cal\\.com/embed"], scripts: ["cal\\.com/embed"], cats: [72] },
  "Calendly": { scriptSrc: ["assets\\.calendly\\.com"], scripts: ["assets\\.calendly\\.com"] },
  "Typeform": { scriptSrc: ["embed\\.typeform\\.com"], scripts: ["embed\\.typeform\\.com"] },
  "ConvertKit": { scriptSrc: ["f\\.convertkit\\.com", "ck\\.page"], html: ["app\\.convertkit\\.com/(?:landing_pages|forms)"], cats: [32] },
  "Klaviyo": { scriptSrc: ["static\\.klaviyo\\.com"], scripts: ["static\\.klaviyo\\.com"] },
  "Customer.io": { scriptSrc: ["assets\\.customer\\.io"], scripts: ["assets\\.customer\\.io"] },
  "Loops": { scriptSrc: ["app\\.loops\\.so"], cats: [32] },

  /* ---- watching it break ---- */
  "Sentry": { scriptSrc: ["browser\\.sentry-cdn\\.com"], html: ["Sentry\\.init\\(", "sentry-trace"] },
  "LogRocket": { scriptSrc: ["cdn\\.log(?:rocket|r)\\.io", "cdn\\.logrocket\\.com"], scripts: ["cdn\\.log(?:rocket|r)\\.io"] },
  "Highlight.io": { scriptSrc: ["highlight\\.run"], scripts: ["highlight\\.run"], cats: [13] },

  /* ---- where the pictures live ---- */
  "Cloudinary": { html: ["res\\.cloudinary\\.com"] },
  "Imgix": { html: ["\\.imgix\\.net"] },
  "Mux": { html: ["(?:stream|image)\\.mux\\.com"] },
  "Vercel Blob": { html: ["\\.public\\.blob\\.vercel-storage\\.com"], cats: [19] },
  "Cloudflare R2": { html: ["r2\\.cloudflarestorage\\.com", "\\.r2\\.dev"], cats: [19] },

  /* ---- content and docs ---- */
  "Sanity": { html: ["cdn\\.sanity\\.io"] },
  "Contentful": { html: ["images\\.ctfassets\\.net"] },
  "Storyblok": { html: ["a\\.storyblok\\.com"] },
  "Mintlify": { html: ["mintcdn\\.com", "mintlify\\.(?:com|s3)"] },
  "Algolia": { html: ["algolia(?:net)?\\.(?:com|net)"], scriptSrc: ["@docsearch"] },

  /* ---- gates ---- */
  "Cloudflare Turnstile": { scriptSrc: ["challenges\\.cloudflare\\.com/turnstile"], cats: [16] },
};

/** Names of the technologies this file can be the sole reason for detecting.
 *  The method page prints them, so nobody has to take the tally on trust. */
export const EXTRA_NAMES = Object.keys(EXTRA);

/**
 * The ruleset ships a few technologies twice under two spellings. Both fire on
 * the same evidence, so a raw tally double-counts the product and the wall
 * shows it in two places. Right-hand side is the name kept.
 */
export const ALIASES: Record<string, string> = {
  "Sanity.io": "Sanity",
  "Fastspring": "FastSpring",
  "Litespeed Cache": "LiteSpeed Cache",
  "framework7": "Framework7",
};

export const canonical = (name: string) => ALIASES[name] ?? name;
