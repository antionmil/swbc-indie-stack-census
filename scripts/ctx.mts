import { SITES } from "../src/data/sites";
import { fetchAll } from "../src/lib/fetchsite";
const NEEDLES: [string, RegExp][] = [
  ["intercom", /.{0,60}intercom.{0,60}/gi],
  ["typeform", /.{0,50}typeform.{0,60}/gi],
  ["amplitude", /.{0,50}amplitude.{0,60}/gi],
  ["mintlify", /.{0,50}mint(lify|cdn).{0,60}/gi],
  ["helpscout", /.{0,50}helpscout.{0,60}/gi],
  ["convertkit", /.{0,50}(convertkit|ck\.page).{0,60}/gi],
  ["klaviyo", /.{0,50}klaviyo.{0,60}/gi],
  ["sveltekit", /.{0,50}(_app\/immutable|sveltekit).{0,60}/gi],
  ["calcom", /.{0,50}cal\.com\/embed.{0,60}/gi],
  ["umami", /.{0,50}(umami|data-website-id).{0,60}/gi],
  ["mixpanel", /.{0,50}(mxpnl|mixpanel).{0,60}/gi],
  ["segment", /.{0,50}cdn\.segment\.com.{0,60}/gi],
  ["logrocket", /.{0,50}logrocket.{0,60}/gi],
  ["contentful", /.{0,50}ctfassets.{0,60}/gi],
  ["storyblok", /.{0,50}storyblok.{0,60}/gi],
  ["plain", /.{0,50}(cdn-plain|plain\.com).{0,60}/gi],
  ["customerio", /.{0,50}customer\.io.{0,60}/gi],
  ["loops", /.{0,50}loops\.so\/.{0,60}/gi],
];
const want = process.argv.slice(2);
const pages = await fetchAll(SITES.map((s) => s.domain));
for (const [label, re] of NEEDLES) {
  if (want.length && !want.includes(label)) continue;
  console.log(`\n===== ${label}`);
  for (const p of pages) {
    if (!p.ok) continue;
    const hay = p.page.html + "\n" + p.page.css.join("\n");
    const m = hay.match(re);
    if (m) console.log(`  ${p.page.domain}: ${m.slice(0, 2).map((x) => x.replace(/\s+/g, " ").slice(0, 150)).join("\n      ")}`);
  }
}
