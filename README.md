# Stack census

**[stackcensus.onedaybuilt.com](https://stackcensus.onedaybuilt.com)** — day 4 of
[26](https://onedaybuilt.com).

**1,224 software products** are fetched every morning, read, and tallied: what
the page is built with, where it is served, where the email goes. One census,
one column. 51 of the products were picked by hand and 1,173 come from two
public lists, which is a fact about where the names came from and is on
`/sites` — it is not two populations to be reported separately.

Every figure on the site links to the string in the response that produced it,
and every survey is diffed against the one before.

## How it works

```
Every morning, 06:00 UTC
  /api/cron/census                     secret-gated, fra1, maxDuration 300
    fetchRuleset()      src/lib/ruleset.ts   GPL rules, fetched, never stored
    fetchEach()         src/lib/fetchsite.ts 1,224 GETs, streamed, 40 wide
    detect()            src/lib/wappalyzer.ts the matcher
    -> runs / fetches / findings / changes   Neon, Frankfurt
    prune()             keeps the last 6 surveys' raw findings
Pages
  revalidate 3600 + generateStaticParams on every dynamic segment
```

There is **one** implementation of a census run (`src/lib/run.ts`). `pnpm census`
and the daily cron both call it, because a diff between two surveys only
means something if the same code drew both sides of it.

## The parts worth knowing

| Thing | Where | Why it is like that |
|---|---|---|
| The matcher | `src/lib/wappalyzer.ts` | Wappalyzer closed its engine in 2023. The rules live on under GPL-3.0; this is a fresh matcher for them, HTTP-only. |
| The ruleset | `src/lib/ruleset.ts` | Fetched at run time and **never committed**. The rules are GPL-3.0 and this repo is public; storing them here would drag a copyleft file into a repo that does not carry that licence. |
| The supplement | `src/lib/extra.ts` | The public ruleset detects the modern front end through `js`/`dom` rules that need a browser. On those alone Next.js showed on 11 of 51 sites while `/_next/static/` sat in the HTML of twice as many. These 51 rules match strings that are actually in the response, and every one is printed on `/method`. |
| The list | `src/data/sites.ts` | **Generated** by `pnpm list:build` from two public lists plus `src/data/indie.ts`. A thousand entries I typed myself would be unauditable; these can each be traced to a line in somebody else's repository. Fixed between surveys. |
| Streaming | `src/lib/fetchsite.ts` | `fetchEach` hands each response to a callback and forgets it. The 51-site version returned an array; at 1,224 sites that array is gigabytes of HTML in a function that does not have it. |
| The change feed ignores two signals | `src/lib/run.ts` | HTTP/3 and HSTS flap on their own — `alt-svc` is advertised inconsistently and HSTS depends on which edge answers. They stay in the tally, where they are true. A daily feed would otherwise print them every morning. |
| Who is here | `src/app/api/here/` | A salted one-way hash of the IP address, deleted after five minutes. No cookie, nothing written to the visitor's browser, and no way back to the address. Keyed on the address rather than on a number the browser invents, because that number can be invented a thousand times and this figure is shown to everybody. |
| One scheme | `src/app/globals.css` | The site is dark, not scheme-following. One palette to measure, and no second set of contrast figures to fall out of date. |
| MX, not TXT | `src/lib/fetchsite.ts` | The first production run found 689 things where the laptop found 443. 244 of the 246 extra were domain-verification TXT records, which prove an account existed, not that the page runs anything — and which resolve differently depending on who asks. |
| Seeded from production | — | Survey 001 was drawn by the deployed cron, not from a laptop, so that survey 002 is diffed against something drawn in the same place by the same code. |
| The diff | `src/lib/run.ts` | Both directions are guarded on the site having been fetched **successfully in both runs**. Without that guard one 403 reads as a company throwing away its whole stack in a week. |
| The palette | `src/app/globals.css` | One file, every colour a token, both schemes, and every contrast ratio measured against the colour the text actually sits on — `pnpm qa` fails under 4.5:1. |

## What it cannot see

Anything that needs a browser to appear, anything behind a login, anything a CDN
hides, and anything about the company — no revenue, no headcount, no funding.
`/method` says all of this on the site itself, which is the point.

## Gates

```bash
pnpm list:build         # regenerate the population from the two public lists
pnpm qa                 # contrast ratios, the diff gate, then every rule against a fixed sample
pnpm qa:cron <url>      # fires four unauthorised shapes at the cron and expects four 401s
pnpm typecheck
pnpm build              # read the route table: a page that is `ƒ` is a bug
```

`pnpm qa` fetches a fixed 121-site sample — the 51 commercial products plus an
evenly spaced slice of the open-source group — so it takes about a minute and
needs a network. It samples rather than running the whole census because a gate
that takes five minutes stops being run. It fails if a rule matches every site (too loose), if two technologies
collide on one URL slug, or if any site detects nothing at all.

## Setup

1. `pnpm install`
2. A Neon project of its **own** — never point this at another site's database.
   Region **Frankfurt (eu-central-1)**, to match `"regions": ["fra1"]` in
   `vercel.json`.
3. `cp .env.example .env.local`, fill in `DATABASE_URL` and `CRON_SECRET`.
4. `pnpm db:push`
5. `pnpm census` — the first survey. Takes about a minute. (It runs under
   `--conditions=react-server` so that `server-only` resolves the way Next
   resolves it on the server, instead of throwing.)
6. `pnpm dev`
