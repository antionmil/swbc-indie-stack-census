/** URL-safe, stable, readable: "Next.js" -> "next-js".
 *  Pure, and deliberately in its own module: the QA gate needs it, and the QA
 *  gate must not have to import the database to get a string function. */
export const techSlug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
