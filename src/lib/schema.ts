import { pgTable, text, integer, timestamp, jsonb, serial, primaryKey, index } from "drizzle-orm/pg-core";

/**
 * One row per census run, and everything that run saw.
 *
 * The tables are append-only on purpose. A census whose old rows get
 * overwritten cannot answer the question the whole site exists for — what
 * changed — and a diff computed against a table that has been mutated is not a
 * diff, it is a guess. Nothing here is ever UPDATEd except `runs.finished_at`.
 */

/** `id` is also the run number the site prints: run 001, run 002. */
export const runs = pgTable("runs", {
  id: serial("id").primaryKey(),
  started_at: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  /** NULL until the run completes. A crashed run stays unfinished and is
   *  ignored by every read, so a half-written census can never be published. */
  finished_at: timestamp("finished_at", { withTimezone: true }),
  n_sites: integer("n_sites").notNull(),
  n_fetched: integer("n_fetched").notNull().default(0),
  /** Size of the ruleset this run matched against. It moves week to week, and
   *  a technology that appears "new" the same week the ruleset grew by 300
   *  rules deserves the caveat. */
  ruleset_size: integer("ruleset_size").notNull().default(0),
});

/** What each site answered with. A failed fetch is recorded, never dropped:
 *  the diff has to be able to tell "stopped using Sentry" from "we got a 403". */
export const fetches = pgTable("fetches", {
  run_id: integer("run_id").notNull(),
  domain: text("domain").notNull(),
  /** "indie" or "oss". Written per run rather than looked up at read time, so
   *  a survey stays readable exactly as it was taken even after the population
   *  list changes underneath it. */
  kind: text("kind").notNull().default("oss"),
  ok: integer("ok").notNull(),               // 1 or 0, so it sums
  status: integer("status"),
  final_url: text("final_url"),
  ms: integer("ms").notNull().default(0),
  error: text("error"),
}, (t) => [primaryKey({ columns: [t.run_id, t.domain] })]);

/** One technology found on one site in one run, with the strings that found it. */
export const findings = pgTable("findings", {
  run_id: integer("run_id").notNull(),
  domain: text("domain").notNull(),
  tech: text("tech").notNull(),
  confidence: integer("confidence").notNull(),
  version: text("version"),
  cats: jsonb("cats").$type<number[]>().notNull(),
  evidence: jsonb("evidence").$type<{ kind: string; detail: string }[]>().notNull(),
}, (t) => [
  primaryKey({ columns: [t.run_id, t.domain, t.tech] }),
  index("findings_tech_idx").on(t.tech, t.run_id),
]);

/** The feed. Written by the run that spotted the change, never recomputed. */
export const changes = pgTable("changes", {
  id: serial("id").primaryKey(),
  run_id: integer("run_id").notNull(),
  prev_run_id: integer("prev_run_id").notNull(),
  domain: text("domain").notNull(),
  tech: text("tech").notNull(),
  kind: text("kind").notNull(),              // "added" | "removed"
  /** The evidence line from whichever side of the change has one. An "added"
   *  row carries the string that proves it; a "removed" row carries the string
   *  that used to be there. */
  evidence: text("evidence"),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("changes_run_idx").on(t.run_id)]);

/** Category id -> name, from the ruleset. Stored so that a page render never
 *  has to fetch a 2.5 MB ruleset to write the word "Analytics". */
export const categories = pgTable("categories", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
});
