# Indie stack census

**[stackcensus.onedaybuilt.com](https://stackcensus.onedaybuilt.com)** — day 4 of
[26](https://onedaybuilt.com).

Fifty-one indie products are fetched every Thursday morning, read, and tallied:
what the page is built with, where it is served, where the company's email goes.
Every figure on the site links to the string in the response that produced it,
and every survey is diffed against the one before it.

## How it works

```
Thursday 06:00 UTC
  /api/cron/census                     secret-gated, fra1, maxDuration 300
    fetchRuleset()      src/lib/ruleset.ts   GPL rules, fetched, never stored
    fetchAll()          src/lib/fetchsite.ts 51 GETs + stylesheets + MX
    detect()            src/lib/wappalyzer.ts the matcher
    -> runs / fetches / findings / changes   Neon, Frankfurt
Pages
  revalidate 3600 + generateStaticParams on every dynamic segment
```

There is **one** implementation of a census run (`src/lib/run.ts`). `pnpm census`
and the Thursday cron both call it, because a diff between two surveys only
means something if the same code drew both sides of it.

## The parts worth knowing

| Thing | Where | Why it is like that |
|---|---|---|
| The matcher | `src/lib/wappalyzer.ts` | Wappalyzer closed its engine in 2023. The rules live on under GPL-3.0; this is a fresh matcher for them, HTTP-only. |
| The ruleset | `src/lib/ruleset.ts` | Fetched at run time and **never committed**. The rules are GPL-3.0 and this repo is public; storing them here would drag a copyleft file into a repo that does not carry that licence. |
| The supplement | `src/lib/extra.ts` | The public ruleset detects the modern front end through `js`/`dom` rules that need a browser. On those alone Next.js showed on 11 of 51 sites while `/_next/static/` sat in the HTML of twice as many. These 51 rules match strings that are actually in the response, and every one is printed on `/method`. |
| The list | `src/data/sites.ts` | Fixed for the run. A census that gains and loses members between surveys cannot tell a migration from a change of population. |
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
pnpm qa                 # contrast ratios, then every supplementary rule against all 51 sites
pnpm qa:cron <url>      # fires four unauthorised shapes at the cron and expects four 401s
pnpm typecheck
pnpm build              # read the route table: a page that is `ƒ` is a bug
```

`pnpm qa` fetches the real fifty-one, so it takes about a minute and needs a
network. It fails if a rule matches every site (too loose), if two technologies
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
