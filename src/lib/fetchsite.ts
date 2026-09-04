import dns from "node:dns/promises";
import type { PageInput } from "@/lib/wappalyzer";

/**
 * One page, fetched the way a browser would ask for it.
 *
 * A default Node user-agent gets a 403 from several of these sites, and a
 * blocked fetch reads downstream as "this site dropped its whole stack this
 * week" — the diff feed would report a fiction. So the UA is a real one and
 * every failure is recorded as a failure rather than as an empty result.
 */
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const MAX_HTML = 1_500_000;

export type Fetched =
  | { ok: true; page: PageInput; ms: number }
  | { ok: false; domain: string; error: string; ms: number };

/** MX and TXT only: the two that carry a fingerprint (mail host, domain
 *  verification records). A lookup that fails is not an error — plenty of
 *  domains have no MX at all. */
async function dnsRecords(host: string): Promise<Record<string, string[]>> {
  const out: Record<string, string[]> = {};
  const [mx, txt] = await Promise.all([
    dns.resolveMx(host).catch(() => []),
    dns.resolveTxt(host).catch(() => []),
  ]);
  if (mx.length) out.MX = mx.map((r) => `${r.priority} ${r.exchange}`);
  if (txt.length) out.TXT = txt.map((r) => r.join(""));
  return out;
}

/** The stylesheets a page links to, absolute, in document order. */
export function styleSheetHrefs(html: string, base: string): string[] {
  const out: string[] = [];
  const re = /<link\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const tag = m[0];
    if (!/\brel\s*=\s*("stylesheet"|'stylesheet'|stylesheet)/i.test(tag)) continue;
    const href = /\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(tag);
    const v = href?.[2] ?? href?.[3] ?? href?.[4];
    if (!v) continue;
    try {
      out.push(new URL(v, base).toString());
    } catch {
      /* a malformed href is not worth failing a site over */
    }
  }
  return out;
}

/**
 * Up to `max` stylesheets, because that is where a CSS framework is visible
 * and nowhere else. Tailwind leaves `--tw-*` custom properties in the compiled
 * sheet and NOTHING in the HTML, so a census that reads only the document says
 * "no CSS framework" about a page built entirely out of one.
 */
async function fetchStyles(hrefs: string[], max = 3, cap = 600_000): Promise<string[]> {
  const out: string[] = [];
  for (const href of hrefs.slice(0, max)) {
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 12_000);
      const r = await fetch(href, { headers: { "user-agent": UA }, signal: ctl.signal, cache: "no-store" });
      clearTimeout(timer);
      if (r.ok) out.push((await r.text()).slice(0, cap));
    } catch {
      /* one unreachable stylesheet is not a failed site */
    }
  }
  return out;
}

export async function fetchSite(domain: string, timeoutMs = 25_000): Promise<Fetched> {
  const started = Date.now();
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(`https://${domain}`, {
      headers: {
        "user-agent": UA,
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      signal: ctl.signal,
      cache: "no-store",
    });
    const html = (await res.text()).slice(0, MAX_HTML);
    /* Stopped HERE, before the stylesheets and the DNS lookups. The site page
       prints this figure as "answered in N ms", and a number that quietly
       included three more requests would be a lie in small type. */
    const ms = Date.now() - started;

    const headers: Record<string, string[]> = {};
    res.headers.forEach((v, k) => {
      (headers[k.toLowerCase()] ??= []).push(v);
    });
    // `getSetCookie` is the only way to see repeated Set-Cookie headers; the
    // iterator above folds them into one comma-joined string, which splits a
    // cookie value in half wherever a date lives inside it.
    const setCookies = res.headers.getSetCookie?.() ?? [];
    if (setCookies.length) headers["set-cookie"] = setCookies;

    const cookies: Record<string, string> = {};
    for (const c of setCookies) {
      const eq = c.indexOf("=");
      if (eq > 0) cookies[c.slice(0, eq).trim().toLowerCase()] = c.slice(eq + 1).split(";")[0];
    }

    const page: PageInput = {
      domain,
      url: res.url || `https://${domain}`,
      status: res.status,
      headers,
      html,
      cookies,
      dns: await dnsRecords(domain),
      css: await fetchStyles(styleSheetHrefs(html, res.url || `https://${domain}`)),
    };
    return { ok: true, page, ms };
  } catch (e) {
    return {
      ok: false,
      domain,
      error: e instanceof Error ? e.message : String(e),
      ms: Date.now() - started,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Bounded concurrency: 51 sites at once is a burst that some hosts answer
 *  with a rate-limit page, and a rate-limit page fingerprints as nothing. */
export async function fetchAll(domains: string[], width = 8): Promise<Fetched[]> {
  const out: Fetched[] = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(width, domains.length) }, async () => {
      while (i < domains.length) out.push(await fetchSite(domains[i++]));
    }),
  );
  return out;
}
