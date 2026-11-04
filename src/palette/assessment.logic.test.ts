/* The brand assessment ([[brand-assessment]]), on the custom-accent census's named examples, each
   with its expected result per appearance, and the words every caller shows. */
import { describe, expect, it } from "vitest";
import { analyseBrand } from "./brandAnalysis";
import { LESS_SATURATED, assessAnalysis, assessBrand } from "./assessment";
import { parseSeed } from "./parseSeed";

function assessed(s: string) {
  const r = assessBrand(s);
  if (!r.ok) throw new Error(`${s} was refused: ${r.reason}`);
  return r.assessment;
}

describe("the census examples", () => {
  it("#fff59d fails 1a in light, keeps its button, and says its dark text steps merged", () => {
    const a = assessed("#fff59d");
    expect(a.light.page.passes).toBe(false);
    expect([a.light.shortVerdict, a.dark.shortVerdict]).toEqual(["as is", "as is"]);
    expect(a.words).toEqual([
      "Filled buttons and focus rings use your colour as is in light mode and in dark mode.",
      "Strong text and link text in dark mode are the same colour. Your colour is applied as typed.",
    ]);
  });

  it("#0b1a3a fails 1a in dark and keeps its button", () => {
    const a = assessed("#0b1a3a");
    expect(a.dark.page.passes).toBe(false);
    expect(a.words).toEqual(["Works as is."]);
  });

  it("#3b82f6 fails question 2 in both and goes darker, to #2b72e5", () => {
    const a = assessed("#3b82f6");
    for (const ap of [a.light, a.dark]) {
      expect(ap.button).toMatchObject({ fill: "#2b72e5", adjusted: true, direction: "darker" });
      expect(ap.shortVerdict).toBe("darker shade");
    }
    expect(a.words).toEqual(["Filled buttons and focus rings use a darker shade in light mode and in dark mode."]);
  });

  it("#ff6b5e fails question 2 in both and goes darker, to #d4433a, keeping its saturation", () => {
    const a = assessed("#ff6b5e");
    for (const ap of [a.light, a.dark]) expect(ap.button).toMatchObject({ fill: "#d4433a", direction: "darker" });
    expect(a.light.verdict[0]).toEqual({ kind: "shade", direction: "darker", lessSaturated: false });
  });

  it("#ff8c00 goes lighter and less saturated", () => {
    const a = assessed("#ff8c00");
    expect(a.light.shortVerdict).toBe("lighter shade, less saturated");
    expect(a.words).toEqual(["Filled buttons and focus rings use a lighter, less saturated shade in light mode and in dark mode."]);
  });

  it("#6e56cf passes question 2 in both, fails 1a in dark at 3.48:1 and Lc 24.7, and works as is", () => {
    const a = assessed("#6e56cf");
    expect(a.dark.page.ratio).toBeCloseTo(3.48, 2);
    expect(a.dark.page.lc).toBeCloseTo(24.7, 1);
    expect(a.words).toEqual(["Works as is."]);
  });

  it("#c8102e passes question 2 in both and fails 1a in dark at 3.19:1 and Lc 24.1", () => {
    const a = assessed("#c8102e");
    expect(a.light.button.adjusted || a.dark.button.adjusted).toBe(false);
    expect(a.dark.page.ratio).toBeCloseTo(3.19, 2);
    expect(a.dark.page.lc).toBeCloseTo(24.1, 1);
  });
});

describe("a part that takes a shade of its own", () => {
  // The census found no seed where a part needs its own shade, so this row is constructed: a real
  // analysis with one part shade added, which is what the generator would return.
  it("names the part in the short verdict and in its own sentence", () => {
    const p = parseSeed("#6e56cf");
    if (!p.ok) throw new Error("did not parse");
    const analysis = analyseBrand(p.rgb);
    analysis.dark.partShades = [{ part: "thumbStroke", fill: "#5a48b0", direction: "darker" }];
    const a = assessAnalysis(analysis);
    expect(a.dark.shortVerdict).toBe("as is, switch thumbs adjusted");
    expect(a.light.shortVerdict).toBe("as is");
    expect(a.words).toEqual([
      "Filled buttons and focus rings use your colour as is in light mode and in dark mode.",
      "Switch thumbs use a shade of their own in dark mode.",
    ]);
  });
});

describe("refusals", () => {
  it.each([
    ["#3b8z", /not a valid hex colour/],
    ["rgba(1, 2, 3, 0.5)", /solid colour/],
    ["#ffffff", /White has no hue/],
    ["", /empty seed/],
    ["teal", /not an accepted seed syntax|not a valid/],
  ])("%j comes back with the parser's own reason", (input, reason) => {
    const r = assessBrand(input);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    const parsed = parseSeed(input);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(r.reason).toBe(parsed.reason);
    expect(r.reason).toMatch(reason);
  });
});

describe("the assessment only reads the generator", () => {
  it.each(["#3b82f6", "#ff6b5e", "#ff8c00", "#00a86b", "#6e56cf", "#fff59d"])(
    "%s reports the generator's fill and direction, unchanged",
    (s) => {
      const p = parseSeed(s);
      if (!p.ok) throw new Error("did not parse");
      const generated = analyseBrand(p.rgb);
      const a = assessed(s);
      for (const ap of ["light", "dark"] as const) {
        expect(a[ap].button).toEqual(generated[ap].button);
        expect(a[ap].layers).toEqual(generated[ap].layers);
        const clause = a[ap].verdict[0]!;
        if (generated[ap].button.adjusted) {
          expect(clause).toEqual({ kind: "shade", direction: generated[ap].button.direction, lessSaturated: generated[ap].button.chromaLost >= LESS_SATURATED });
        } else {
          expect(clause).toEqual({ kind: "as-is" });
        }
      }
    },
  );
});
