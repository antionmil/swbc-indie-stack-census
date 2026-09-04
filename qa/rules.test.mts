/**
 * The rules gate.
 *
 * A fingerprint rule is a claim about the world, and an untested one fails in
 * both directions silently: a rule that matches NOTHING quietly under-reports a
 * technology for ever, and a rule that matches EVERYTHING quietly invents one.
 * Neither shows up as an error anywhere — the tally just comes out wrong and
 * looks plausible.
 *
 * So: fetch all fifty-one sites once, run the supplement over them, and assert
 * every rule lands somewhere between those two failures.
 */
import { SITES } from "../src/data/sites";
import { EXTRA, canonical } from "../src/lib/extra";
import { fetchAll } from "../src/lib/fetchsite";
import { fetchRuleset } from "../src/lib/ruleset";
import { detect } from "../src/lib/wappalyzer";
import { techSlug } from "../src/lib/slug";

let failures = 0;
const fail = (m: string) => {
  failures++;
  console.log(`  FAIL  ${m}`);
};

const { techs } = await fetchRuleset();
const pages = await fetchAll(SITES.map((s) => s.domain));
const ok = pages.filter((p) => p.ok);
console.log(`fetched ${ok.length}/${pages.length} sites, ruleset ${techs.length} technologies\n`);

if (ok.length < SITES.length * 0.9)
  fail(`only ${ok.length}/${SITES.length} sites answered — too few to judge a rule by`);

const hits = new Map<string, string[]>();
const slugs = new Map<string, string>();
for (const p of ok) {
  for (const d of detect(p.page, techs, canonical)) {
    hits.set(d.name, [...(hits.get(d.name) ?? []), p.page.domain]);
    const s = techSlug(d.name);
    const prev = slugs.get(s);
    if (prev && prev !== d.name) fail(`slug collision: "${prev}" and "${d.name}" both make /t/${s}`);
    slugs.set(s, d.name);
  }
}

console.log("supplementary rules:");
for (const name of Object.keys(EXTRA)) {
  const on = hits.get(canonical(name)) ?? [];
  const line = `${name.padEnd(24)} ${String(on.length).padStart(3)} sites`;
  if (on.length === 0) {
    /* Not fatal on its own: a rule can be right and simply have nobody in this
       fifty-one using it. It IS worth printing, because a rule that never fires
       is indistinguishable from a broken one until somebody looks. */
    console.log(`  ....  ${line}  (never fires — check the pattern is still current)`);
  } else if (on.length === ok.length) {
    fail(`${line}  matches EVERY site, which is what a too-loose pattern looks like`);
  } else {
    console.log(`  ok    ${line}  e.g. ${on.slice(0, 3).join(", ")}`);
  }
}

/* The engine's own arithmetic, on real pages rather than a fixture: a site
   with no detections at all means the matcher silently stopped working. */
const empty = ok.filter((p) => detect(p.page, techs, canonical).length === 0);
if (empty.length) fail(`${empty.length} sites detected nothing at all: ${empty.map((p) => p.page.domain).join(", ")}`);

const per = ok.map((p) => detect(p.page, techs, canonical).length);
console.log(`\ndetections per site: min ${Math.min(...per)} max ${Math.max(...per)} mean ${(per.reduce((a, b) => a + b, 0) / per.length).toFixed(1)}`);
console.log(failures === 0 ? "\nrules gate: PASS" : `\nrules gate: ${failures} FAILURES`);
process.exitCode = failures === 0 ? 0 : 1;
