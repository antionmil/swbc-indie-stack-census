import { SITES } from "../src/data/sites";
import { fetchAll } from "../src/lib/fetchsite";
const NEEDLES: [string, RegExp][] = [
  ["vercel insights", /_vercel\/(insights|speed-insights)/i],
  ["intercom", /intercom/i],
  ["typeform", /typeform/i],
  ["cal.com embed", /cal\.com\/embed|cal\.com\/[a-z]/i],
  ["umami", /umami|data-website-id/i],
  ["statsig", /statsig/i],
  ["amplitude", /amplitude/i],
  ["mixpanel", /mxpnl|mixpanel/i],
  ["segment", /cdn\.segment\.com/i],
  ["mux", /mux\.com/i],
  ["mintlify", /mintlify|mintcdn/i],
  ["contentful", /ctfassets/i],
  ["crisp", /crisp\.chat/i],
  ["plain chat", /cdn-plain|plain\.com/i],
  ["helpscout", /helpscout/i],
  ["logrocket", /logrocket|lr-in/i],
  ["sveltekit", /_app\/immutable|sveltekit/i],
  ["remix", /remixContext|remix-run/i],
  ["r2", /r2\.dev|r2\.cloudflarestorage/i],
  ["loops", /loops\.so/i],
  ["convertkit", /convertkit|ck\.page/i],
  ["storyblok", /storyblok/i],
  ["klaviyo", /klaviyo/i],
  ["customerio", /customer\.io/i],
  ["koala", /getkoala/i],
  ["common room", /cr-relay/i],
  ["highlight", /highlight\.run/i],
];
const pages = await fetchAll(SITES.map((s) => s.domain));
const hit = new Map<string, string[]>();
for (const p of pages) {
  if (!p.ok) continue;
  const hay = p.page.html + "\n" + p.page.css.join("\n") + "\n" + JSON.stringify(p.page.headers);
  for (const [label, re] of NEEDLES) if (re.test(hay)) hit.set(label, [...(hit.get(label) ?? []), p.page.domain]);
}
for (const [label] of NEEDLES) {
  const on = hit.get(label) ?? [];
  console.log(`${label.padEnd(16)} ${String(on.length).padStart(3)}  ${on.slice(0, 6).join(", ")}`);
}
