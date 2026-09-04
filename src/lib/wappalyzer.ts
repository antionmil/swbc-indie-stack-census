/**
 * A fingerprint matcher for the webappanalyzer ruleset.
 *
 * Wappalyzer's own engine went closed-source in August 2023. The rules did
 * not: they carry on under GPL-3.0 in enthec/webappanalyzer. This file is the
 * matcher, written here so that ONE implementation produces both the seeded
 * census and every weekly re-run — a diff between two snapshots is only
 * meaningful if the same code drew both of them.
 *
 * The ruleset itself is NEVER committed to this repository. It is GPL-3.0 and
 * this repo is public; fetching it at run time keeps a copyleft data file out
 * of a repository that does not carry that licence, and has the side effect of
 * always matching against current rules. See `ruleset.ts`.
 *
 * What is deliberately NOT implemented: `js` and `dom` patterns. Both need a
 * real browser to evaluate, a headless Chrome does not fit in a Vercel
 * function, and a signal the weekly cron cannot reproduce would poison the
 * diff feed. The site says so on its method page rather than quietly
 * under-reporting.
 */

export type RawTech = {
  cats?: number[];
  description?: string;
  website?: string;
  icon?: string;
  oss?: boolean;
  saas?: boolean;
  implies?: string | string[];
  excludes?: string | string[];
  requires?: string | string[];
  requiresCategory?: number | number[];
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  meta?: Record<string, string | string[]>;
  html?: string | string[];
  text?: string | string[];
  scriptSrc?: string | string[];
  scripts?: string | string[];
  url?: string | string[];
  dns?: Record<string, string | string[]>;
  css?: string | string[];
  js?: Record<string, string>;
  dom?: unknown;
};

export type Pattern = {
  re: RegExp;
  /** `\;version:\1` — the capture-group template, when the rule carries one. */
  version?: string;
  /** `\;confidence:50`. Absent means 100. */
  confidence: number;
  source: string;
};

export type Tech = {
  name: string;
  cats: number[];
  website?: string;
  icon?: string;
  oss?: boolean;
  saas?: boolean;
  implies: { name: string; confidence: number }[];
  excludes: string[];
  requires: string[];
  requiresCategory: number[];
  headers: [string, Pattern][];
  cookies: [string, Pattern][];
  meta: [string, Pattern][];
  html: Pattern[];
  text: Pattern[];
  scriptSrc: Pattern[];
  scripts: Pattern[];
  url: Pattern[];
  dns: [string, Pattern][];
  /** Matched against the stylesheets the page links to. The ruleset uses this
   *  for the one signal a CSS framework leaves behind — Tailwind's `--tw-*`
   *  custom properties, for instance — and it is the only way to see a build
   *  step that never touches the HTML. */
  css: Pattern[];
};

const arr = <T,>(v: T | T[] | undefined): T[] =>
  v === undefined ? [] : Array.isArray(v) ? v : [v];

/**
 * `pattern\;version:\1\;confidence:50`. The separator in the ruleset is a
 * literal backslash followed by a semicolon, so a plain `split(";")` cuts
 * semicolons that belong to the regex itself — an early version of this
 * function did exactly that and turned half the CSS-ish patterns into
 * something that never matched.
 */
export function parsePattern(raw: string): Pattern {
  const parts = raw.split("\\;");
  const body = parts[0];
  const out: Pattern = { re: /$^/, confidence: 100, source: body };
  for (const p of parts.slice(1)) {
    const i = p.indexOf(":");
    if (i < 0) continue;
    const k = p.slice(0, i);
    const v = p.slice(i + 1);
    if (k === "version") out.version = v;
    else if (k === "confidence") out.confidence = Number(v) || 100;
  }
  try {
    out.re = new RegExp(body || ".", "i");
  } catch {
    // A handful of rules use PCRE constructs V8 rejects. Skipping one rule is
    // correct; throwing here would drop the whole shard it lives in.
    out.re = /$^/;
  }
  return out;
}

const pats = (v: string | string[] | undefined): Pattern[] =>
  arr(v).map(parsePattern);

const keyed = (
  v: Record<string, string | string[]> | undefined,
): [string, Pattern][] =>
  Object.entries(v ?? {}).flatMap(([k, val]) =>
    arr(val).map((s) => [k.toLowerCase(), parsePattern(s)] as [string, Pattern]),
  );

export function compile(name: string, raw: RawTech): Tech {
  return {
    name,
    cats: raw.cats ?? [],
    website: raw.website,
    icon: raw.icon,
    oss: raw.oss,
    saas: raw.saas,
    implies: arr(raw.implies).map((s) => {
      const p = parsePattern(s);
      return { name: p.source, confidence: p.confidence };
    }),
    excludes: arr(raw.excludes).map((s) => s.split("\\;")[0]),
    requires: arr(raw.requires).map((s) => s.split("\\;")[0]),
    requiresCategory: arr(raw.requiresCategory).map(Number),
    headers: keyed(raw.headers),
    cookies: keyed(raw.cookies),
    meta: keyed(raw.meta),
    html: pats(raw.html),
    text: pats(raw.text),
    scriptSrc: pats(raw.scriptSrc),
    scripts: pats(raw.scripts),
    url: pats(raw.url),
    dns: keyed(raw.dns),
    css: pats(raw.css),
  };
}

/** Everything one page offers a rule to match against. */
export type PageInput = {
  domain: string;
  url: string;
  status: number;
  /** Lower-cased names; repeated headers keep every value. */
  headers: Record<string, string[]>;
  html: string;
  /** Cookie NAMES from set-cookie, lower-cased, mapped to their value. */
  cookies: Record<string, string>;
  /** Record type -> values, e.g. `{ MX: ["10 aspmx.l.google.com"] }`. */
  dns: Record<string, string[]>;
  /** Contents of the stylesheets the page links to, capped. */
  css: string[];
};

export type Detection = {
  name: string;
  confidence: number;
  version?: string;
  cats: number[];
  /** How it was found, in the reader's words. Every claim on the site can be
   *  traced back to one of these, which is the difference between a census and
   *  an assertion. */
  evidence: { kind: EvidenceKind; detail: string }[];
};

export type EvidenceKind =
  | "header"
  | "cookie"
  | "meta"
  | "script"
  | "html"
  | "url"
  | "dns"
  | "css"
  | "implied";

/** `\1` templating, the way the ruleset writes versions. */
function version(tpl: string | undefined, m: RegExpMatchArray): string | undefined {
  if (!tpl) return undefined;
  // Forms seen in the wild: `\1`, `1`, and `\1?a:b` (ternary on a group).
  const tern = tpl.match(/^\\?(\d+)\?([^:]*):(.*)$/);
  if (tern) {
    const g = m[Number(tern[1])];
    const v = g ? tern[2] : tern[3];
    return v || undefined;
  }
  const out = tpl.replace(/\\?(\d)/g, (_, d) => m[Number(d)] ?? "");
  return out.trim() || undefined;
}

const clip = (s: string, n = 90) =>
  s.length > n ? s.slice(0, n - 1) + "…" : s;

/** `<script src=...>` values, in document order. */
export function scriptSrcs(html: string): string[] {
  const out: string[] = [];
  const re = /<script\b[^>]*?\bsrc\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) out.push(m[2] ?? m[3] ?? m[4] ?? "");
  return out;
}

/** Inline script bodies. Bounded: a bundle inlined into the page can be
 *  megabytes, and no rule needs more than its opening. */
export function inlineScripts(html: string): string[] {
  const out: string[] = [];
  const re = /<script\b(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && out.length < 60) out.push(m[1].slice(0, 20000));
  return out;
}

export function metaTags(html: string): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const re = /<meta\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const tag = m[0];
    const name =
      /\b(?:name|property|http-equiv|itemprop)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(tag);
    const content = /\bcontent\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(tag);
    if (!name || !content) continue;
    const k = (name[2] ?? name[3] ?? name[4] ?? "").toLowerCase();
    const v = content[2] ?? content[3] ?? content[4] ?? "";
    (out[k] ??= []).push(v);
  }
  return out;
}

/** Tags out, entities left alone. Only `text` patterns use this. */
export function visibleText(html: string): string {
  return html
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");
}

export function detect(page: PageInput, techs: Tech[], alias: (n: string) => string = (n) => n): Detection[] {
  const found = new Map<string, Detection>();
  const srcs = scriptSrcs(page.html);
  const inline = inlineScripts(page.html);
  const metas = metaTags(page.html);
  const text = visibleText(page.html).slice(0, 300_000);

  const add = (
    t: Tech,
    kind: EvidenceKind,
    detail: string,
    confidence: number,
    ver?: string,
  ) => {
    const name = alias(t.name);
    const cur = found.get(name);
    if (!cur) {
      found.set(name, {
        name,
        confidence: Math.min(100, confidence),
        version: ver,
        cats: t.cats,
        evidence: [{ kind, detail }],
      });
      return;
    }
    // Two independent signals for the same technology raise confidence the way
    // the ruleset intends: they add, capped at 100.
    cur.confidence = Math.min(100, cur.confidence + confidence);
    cur.version ??= ver;
    /* Four lines, and at most two of a kind. Radix leaves a dozen `--radix-*`
       custom properties in one stylesheet, and a row that repeats the same
       kind of proof twelve times is less readable than one that shows it
       twice — the reader has already believed it by the second line. */
    const sameKind = cur.evidence.filter((e) => e.kind === kind).length;
    if (cur.evidence.length < 4 && sameKind < 2 && !cur.evidence.some((e) => e.detail === detail))
      cur.evidence.push({ kind, detail });
  };

  for (const t of techs) {
    for (const [name, p] of t.headers) {
      for (const v of page.headers[name] ?? []) {
        const m = v.match(p.re);
        if (m) add(t, "header", `${name}: ${clip(v)}`, p.confidence, version(p.version, m));
      }
    }
    for (const [name, p] of t.cookies) {
      const v = page.cookies[name];
      if (v === undefined) continue;
      const m = (v || "").match(p.re);
      if (m || p.source === "") add(t, "cookie", `cookie ${name}`, p.confidence, version(p.version, m ?? ([] as unknown as RegExpMatchArray)));
    }
    for (const [name, p] of t.meta) {
      for (const v of metas[name] ?? []) {
        const m = v.match(p.re);
        if (m) add(t, "meta", `<meta ${name}="${clip(v, 60)}">`, p.confidence, version(p.version, m));
      }
    }
    for (const p of t.scriptSrc) {
      for (const s of srcs) {
        const m = s.match(p.re);
        if (m) add(t, "script", clip(s), p.confidence, version(p.version, m));
      }
    }
    for (const p of t.scripts) {
      for (const s of inline) {
        const m = s.match(p.re);
        if (m) add(t, "script", `inline script matches ${clip(p.source, 50)}`, p.confidence, version(p.version, m));
      }
    }
    for (const p of t.html) {
      const m = page.html.match(p.re);
      if (m) add(t, "html", clip(m[0].replace(/\s+/g, " ")), p.confidence, version(p.version, m));
    }
    for (const p of t.text) {
      const m = text.match(p.re);
      if (m) add(t, "html", clip(m[0]), p.confidence, version(p.version, m));
    }
    for (const p of t.url) {
      const m = page.url.match(p.re);
      if (m) add(t, "url", clip(page.url), p.confidence, version(p.version, m));
    }
    for (const p of t.css) {
      for (const sheet of page.css) {
        const m = sheet.match(p.re);
        if (m) add(t, "css", `stylesheet matches ${clip(p.source, 60)}`, p.confidence, version(p.version, m));
      }
    }
    for (const [rec, p] of t.dns) {
      for (const v of page.dns[rec.toUpperCase()] ?? []) {
        const m = v.match(p.re);
        if (m) add(t, "dns", `${rec.toUpperCase()} ${clip(v, 60)}`, p.confidence, version(p.version, m));
      }
    }
  }

  const byName = new Map(techs.map((t) => [t.name, t]));

  // `implies` runs to a fixed point: Next.js implies React, React implies
  // nothing, but Shopify -> PHP -> ... chains three deep in places.
  for (let pass = 0; pass < 5; pass++) {
    let grew = false;
    for (const d of [...found.values()]) {
      const t = byName.get(d.name);
      if (!t) continue;
      for (const imp of t.implies) {
        const it = byName.get(imp.name);
        if (!it) continue;
        const conf = Math.min(d.confidence, imp.confidence);
        const name = alias(imp.name);
        if (!found.has(name)) {
          found.set(name, {
            name,
            confidence: conf,
            cats: it.cats,
            evidence: [{ kind: "implied", detail: `implied by ${d.name}` }],
          });
          grew = true;
        }
      }
    }
    if (!grew) break;
  }

  // `excludes` is how the ruleset resolves mutually exclusive pairs.
  for (const d of [...found.values()]) {
    const t = byName.get(d.name);
    for (const x of t?.excludes ?? []) found.delete(x);
  }

  // `requires` / `requiresCategory`: a rule that only applies in the presence
  // of something else. Without this, plugin rules fire on any page.
  for (const d of [...found.values()]) {
    const t = byName.get(d.name);
    if (!t) continue;
    if (t.requires.length && !t.requires.some((r) => found.has(r))) found.delete(d.name);
    else if (
      t.requiresCategory.length &&
      ![...found.values()].some((o) => o.name !== d.name && o.cats.some((c) => t.requiresCategory.includes(c)))
    )
      found.delete(d.name);
  }

  return [...found.values()]
    .filter((d) => d.confidence >= 50)
    .sort((a, b) => b.confidence - a.confidence || a.name.localeCompare(b.name));
}
