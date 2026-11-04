/* The writer of a seeded brand ([[seeded-brand-writer]]): one key list for the write and the
   clean-up, literal values, and, for every seed in the acceptance table, the values the
   assessment reports. */
import { describe, expect, it } from "vitest";
import { assessBrand } from "../palette/assessment";
import { BLACK_A, WHITE_A } from "../palette/helperLayers";
import { parseSeed } from "../palette/parseSeed";
import { customBrandProperties, customBrandPropertyNames, clearCustomBrand, holdCustomBrand } from "./customBrand";

const ACCEPTANCE = ["#fff59d", "#3b82f6", "#0b1a3a", "#6e56cf", "#ff6b5e", "#ff8c00", "#c8102e", "#00a86b"];

function props(seed: string): Record<string, string> {
  const p = parseSeed(seed);
  if (!p.ok) throw new Error(`${seed} did not parse`);
  return customBrandProperties(p.rgb);
}

/** The slice of `HTMLElement` the writer touches, over a plain map. */
function fakeRoot() {
  const map = new Map<string, string>();
  const style = {
    setProperty: (k: string, v: string) => void map.set(k, v),
    removeProperty: (k: string) => { const v = map.get(k) ?? ""; map.delete(k); return v; },
  };
  return { root: { style } as unknown as HTMLElement, map };
}

describe("one key list", () => {
  it.each(ACCEPTANCE)("%s writes exactly the names the clean-up removes", (seed) => {
    const names = customBrandPropertyNames();
    expect(new Set(names).size).toBe(names.length);
    expect(Object.keys(props(seed)).sort()).toEqual([...names].sort());
  });

  it("applying a brand and clearing it leaves no property behind", () => {
    const { root, map } = fakeRoot();
    for (const [k, v] of Object.entries(props("#3b82f6"))) root.style.setProperty(k, v);
    expect(map.size).toBe(customBrandPropertyNames().length);
    clearCustomBrand(root);
    expect([...map.keys()]).toEqual([]);
  });

  it("holding two brands and releasing both leaves no property behind", () => {
    const { root, map } = fakeRoot();
    const outer = holdCustomBrand(root, props("#3b82f6"));
    const inner = holdCustomBrand(root, props("#fff59d"));
    expect(map.get("--ds-brand-solid")).toBe("#fff59d");
    inner();
    expect(map.get("--ds-brand-solid")).toBe("#2b72e5");
    outer();
    expect([...map.keys()]).toEqual([]);
  });
});

describe("what the writer writes", () => {
  it.each(ACCEPTANCE)("%s writes literal colours for its scale, its button and its layers", (seed) => {
    for (const [k, v] of Object.entries(props(seed))) {
      // The status families stay references to the vendor scales; everything else is a literal.
      if (/^--ds-brand-(error|warning|success|info)-a?\d+$/.test(k)) continue;
      expect(v, k).not.toMatch(/var\(/);
    }
  });

  it.each(ACCEPTANCE)("%s writes the filled button and the error family the assessment reports", (seed) => {
    const r = assessBrand(seed);
    if (!r.ok) throw new Error(r.reason);
    const a = r.assessment;
    const p = props(seed);
    expect(p["--ds-brand-solid"]).toBe(a.light.button.fill);
    expect(p["--ds-brand-dark-solid"]).toBe(a.dark.button.fill);
    expect(p["--ds-brand-error-solid"]).toBe(a.light.error.fill);
    expect(a.dark.error.fill).toBe(a.light.error.fill);
    expect(a.light.error.family).toBe(a.statusFamilies.error);
    expect(p["--ds-brand-error-9"]).toBe(`var(--${a.statusFamilies.error}-9)`);
    for (const f of ["warning", "success", "info"] as const) {
      expect(p[`--ds-brand-${f}-9`]).toBe(`var(--${a.statusFamilies[f]}-9)`);
    }
  });
});

describe("the acceptance values", () => {
  const W = (n: number) => WHITE_A[n - 1], B = (n: number) => BLACK_A[n - 1];

  it("#fff59d in light keeps its colour under the dark ink, with a ring, a light-scrim ring and a part edge", () => {
    const p = props("#fff59d");
    expect(p["--ds-brand-solid"]).toBe("#fff59d");
    expect(p["--ds-brand-on-solid"]).toBe("#21201c");
    expect(p["--ds-brand-ring-stack"]).toBe(B(7));
    expect(p["--ds-brand-ring-stack-scrim-light"]).toBe(B(9));
    expect(p["--ds-brand-part-edge"]).toBe(B(7));
  });

  // The plan's census put this stroke at step 6. Answer K's rule, the theme's own, picks step 7, as
  // it does on the named dark yellow.
  it("#fff59d in dark keeps its colour, and the switch thumb takes its solid step 7", () => {
    const p = props("#fff59d");
    expect(p["--ds-brand-dark-solid"]).toBe("#fff59d");
    expect(p["--ds-brand-dark-thumb-stroke"]).toBe(p["--ds-brand-dark-7"]);
  });

  // The plan's census put the dark ring at white-a4. The ring sits on the button's fill, #2b72e5,
  // where the ruled search, held to theme.css on the named accents, picks white-a3.
  it("#3b82f6 paints #2b72e5 under white in both, with no light ring stack and white-a3 in dark", () => {
    const p = props("#3b82f6");
    for (const prefix of ["--ds-brand", "--ds-brand-dark"]) {
      expect(p[`${prefix}-solid`]).toBe("#2b72e5");
      expect(p[`${prefix}-on-solid`]).toBe("#ffffff");
      expect(p[`${prefix}-indicator`]).toBe("#3b82f6");
    }
    expect(p["--ds-brand-ring-stack"]).toBe("rgba(0, 0, 0, 0)");
    expect(p["--ds-brand-dark-ring-stack"]).toBe(W(3));
  });

  it("#0b1a3a in dark keeps its colour under white, with a white-a7 ring and part edge", () => {
    const p = props("#0b1a3a");
    expect(p["--ds-brand-dark-solid"]).toBe("#0b1a3a");
    expect(p["--ds-brand-dark-on-solid"]).toBe("#ffffff");
    expect(p["--ds-brand-dark-ring-stack"]).toBe(W(7));
    expect(p["--ds-brand-dark-part-edge"]).toBe(W(7));
  });

  it("#6e56cf keeps its colour, and the destructive button paints its family's ruled fill", () => {
    const p = props("#6e56cf");
    expect(p["--ds-brand-solid"]).toBe("#6e56cf");
    expect(["#ce2c31", "#ca244d", "#8a2119"]).toContain(p["--ds-brand-error-solid"]);
  });
});
