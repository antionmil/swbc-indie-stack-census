/**
 * The contrast figures written into globals.css. Run it after touching a token
 * and paste the output back into the comments — a documented ratio that was
 * never measured is worse than none, because it stops anyone re-checking.
 *
 * Every pair is measured against the colour the text ACTUALLY SITS ON, which
 * is the thing day 2 got wrong: three tokens were measured against the page
 * and used on a card.
 */
const lin = (c: number) => (c / 255 <= 0.04045 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
const lum = (hex: string) => {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
const ratio = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const THEMES = {
  light: { ground: "#f6f2e9", surface: "#fffdf8", ink: "#221e17", muted: "#5c5344", faint: "#6b6152", accent: "#8a3a1c", added: "#2c5f3f" },
  dark: { ground: "#14120f", surface: "#1c1915", ink: "#ece4d5", muted: "#a8998a", faint: "#968878", accent: "#e08a5c", added: "#7fc39a" },
};

let worst = 99;
for (const [theme, t] of Object.entries(THEMES)) {
  for (const key of ["ink", "muted", "faint", "accent", "added"] as const) {
    const g = ratio(t[key], t.ground);
    const s = ratio(t[key], t.surface);
    worst = Math.min(worst, g, s);
    console.log(`${theme.padEnd(6)} ${key.padEnd(7)} ${t[key]}  ground ${g.toFixed(2).padStart(5)}  surface ${s.toFixed(2).padStart(5)}  ${Math.min(g, s) >= 4.5 ? "AA" : "FAILS AA"}`);
  }
}
console.log(`\nworst pair: ${worst.toFixed(2)}:1 ${worst >= 4.5 ? "— passes AA" : "— FAILS AA"}`);
process.exitCode = worst >= 4.5 ? 0 : 1;
