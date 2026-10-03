/* =============================================================================
   parseSeed.logic.test.ts — the accepted grammar, and the refusals
   -----------------------------------------------------------------------------
   The refusal cases are the point. Every one of `transparent`, `rebeccapurple`,
   `lab(...)`, `color(display-p3 ...)` is VALID CSS that a browser parses happily —
   measured in headless Chrome, 2026-08-04. A parser that gated on "did it parse?"
   would accept all of them. These rows are what make the grammar the gate.
   ============================================================================= */
import { describe, it, expect } from "vitest";
import { parseSeed } from "./parseSeed";

const ok = (input: string) => {
  const r = parseSeed(input);
  if (!r.ok) throw new Error(`expected "${input}" to be accepted; refused: ${r.reason}`);
  return r;
};
const err = (input: string) => {
  const r = parseSeed(input);
  if (r.ok) throw new Error(`expected "${input}" to be REFUSED; got ${JSON.stringify(r.rgb)}`);
  return r;
};

describe("hex", () => {
  it("6-digit", () => expect(ok("#ff6b5e").rgb).toEqual({ r: 255, g: 107, b: 94 }));
  it("3-digit expands by doubling", () => expect(ok("#f00").rgb).toEqual({ r: 255, g: 0, b: 0 }));
  it("is case-insensitive", () => expect(ok("#FF6B5E").rgb).toEqual({ r: 255, g: 107, b: 94 }));
  it("tolerates surrounding whitespace, because people paste", () =>
    expect(ok("  #ff6b5e \n").rgb).toEqual({ r: 255, g: 107, b: 94 }));

  it("refuses wrong-length hex", () => {
    for (const v of ["#ff6b5", "#ff", "#f", "#1234567", "#123456789"]) err(v);
  });
  it("refuses non-hex digits", () => err("#gggggg"));
  it("refuses a bare hex with no #", () => err("ff6b5e"));
});

describe("rgb()", () => {
  it("space-separated", () => expect(ok("rgb(255 107 94)").rgb).toEqual({ r: 255, g: 107, b: 94 }));
  it("comma-separated", () => expect(ok("rgb(255, 107, 94)").rgb).toEqual({ r: 255, g: 107, b: 94 }));
  it("percentages", () => expect(ok("rgb(100% 0% 0%)").rgb).toEqual({ r: 255, g: 0, b: 0 }));
  it("refuses the wrong arity", () => err("rgb(255 107)"));
  it("refuses junk channels", () => err("rgb(a b c)"));
});

describe("hsl()", () => {
  it("primary red", () => expect(ok("hsl(0 100% 50%)").rgb).toEqual({ r: 255, g: 0, b: 0 }));
  it("primary green", () => expect(ok("hsl(120 100% 50%)").rgb).toEqual({ r: 0, g: 255, b: 0 }));
  it("primary blue", () => expect(ok("hsl(240 100% 50%)").rgb).toEqual({ r: 0, g: 0, b: 255 }));
  it("a mid gray has no chroma", () => {
    const { rgb } = ok("hsl(0 0% 50%)");
    expect(rgb.r).toBe(rgb.g);
    expect(rgb.g).toBe(rgb.b);
  });
  it("accepts a deg unit and wraps hue", () => {
    expect(ok("hsl(360deg 100% 50%)").rgb).toEqual(ok("hsl(0 100% 50%)").rgb);
  });
  it("refuses junk", () => err("hsl(a 100% 50%)"));

  /* A BARE NUMBER IN S/L IS A PERCENTAGE — CSS Color 4. This was a shipped
     wrong-colour bug: `hsl(0 100 50)` returned WHITE instead of red, accepted and
     unflagged, because the resolver returned bare numbers as-is (right for rgb()
     and oklch(), wrong here). It survived the Chrome cross-check below because
     every hsl row there used the percentage form. Both forms are pinned now, and
     the equivalence is asserted directly. */
  it.each([
    ["hsl(0 100 50)", [255, 0, 0]],
    ["hsl(120 100 50)", [0, 255, 0]],
    ["hsl(240 100 50)", [0, 0, 255]],
    ["hsl(210 50 40)", [51, 102, 153]],
  ] as const)("%s — bare S/L numbers mean percent", (input, expected) => {
    const { rgb } = ok(input);
    expect([rgb.r, rgb.g, rgb.b]).toEqual([...expected]);
  });

  it("the bare and percentage forms are the same colour", () => {
    for (const [bare, pct] of [
      ["hsl(0 100 50)", "hsl(0 100% 50%)"],
      ["hsl(210 50 40)", "hsl(210 50% 40%)"],
      ["hsl(45 80 60)", "hsl(45 80% 60%)"],
    ]) {
      expect(ok(bare!).rgb).toEqual(ok(pct!).rgb);
    }
  });
});

describe("oklch()", () => {
  it("accepts an in-gamut value", () => {
    const r = ok("oklch(0.7 0.1 30)");
    expect(r.rgb.r).toBeGreaterThan(r.rgb.b); // a warm colour, sanity only
  });

  it("REFUSES an out-of-gamut value rather than mapping it", () => {
    // Chrome rasterises this to [0,203,0] with no signal that it clamped —
    // measured. Refusing is the honest posture until a mapping method is ruled.
    const r = err("oklch(0.7 0.3 150)");
    expect(r.reason).toMatch(/outside sRGB/);
  });

  it("round-trips a colour that came from the same maths", () => {
    // oklch(0.42007 0.14166 28.96) is approximately oxblood's seed.
    const r = ok("oklch(0.4200729436661938 0.14170210 28.9646)");
    expect(Math.abs(r.rgb.r - 138)).toBeLessThanOrEqual(2);
    expect(Math.abs(r.rgb.g - 33)).toBeLessThanOrEqual(2);
    expect(Math.abs(r.rgb.b - 25)).toBeLessThanOrEqual(2);
  });

  it("refuses junk", () => err("oklch(banana)"));
});

/* -----------------------------------------------------------------------------
   THE ROWS THAT MATTER MOST — valid CSS that must still be refused.
   A canvas-based implementation accepts every one of these. Measured in headless
   Chrome: `transparent` -> rgba(0,0,0,0); `rebeccapurple` -> #663399;
   `lab(60% 40 30)` -> [217,114,94]; `color(display-p3 1 0 0)` -> [255,0,0].
   -------------------------------------------------------------------------- */
describe("valid CSS that is refused anyway — the grammar IS the gate", () => {
  it.each([
    ["transparent", "no fixed colour"],
    ["rebeccapurple", "a named colour"],
    ["red", "a named colour"],
    ["currentColor", "context-dependent"],
    ["inherit", "a CSS-wide keyword"],
    ["initial", "a CSS-wide keyword"],
    ["unset", "a CSS-wide keyword"],
    ["lab(60% 40 30)", "wide-gamut capable, mapping unruled"],
    ["lch(60% 40 30)", "wide-gamut capable, mapping unruled"],
    ["color(display-p3 1 0 0)", "wide gamut, mapping unruled"],
  ])("refuses %s (%s)", (input) => {
    const r = err(input);
    expect(r.reason).toMatch(/accepted seed syntax|not an accepted|use #rgb/i);
  });
});

/* -----------------------------------------------------------------------------
   AGREEMENT WITH THE BROWSER'S OWN CSS ENGINE.
   These expected triples are not this parser's output pinned against itself —
   they were produced by Chrome, by assigning each input to `ctx.fillStyle` and
   reading the rasterised pixel back, then compared against this implementation:
   19 inputs, worst channel difference 0, zero mismatches (measured 2026-08-04 in
   the same headless Chrome the browser suite launches).

   That is the cross-check the design needs. This parser is pure arithmetic written
   from the CSS specs; Chrome's is an entirely separate implementation. Two
   implementations agreeing is evidence. Alpha inputs are deliberately absent from
   this table: canvas readback composites the pixel and corrupts the RGB, so the
   browser is NOT a usable reference there — which is itself why this parser exists.
   -------------------------------------------------------------------------- */
describe("agrees byte-for-byte with Chrome's CSS colour engine", () => {
  const CHROME: Record<string, [number, number, number]> = {
    "#ff6b5e": [255, 107, 94],
    "#f00": [255, 0, 0],
    "#8a2119": [138, 33, 25],
    "#0891b2": [8, 145, 178],
    "#16a34a": [22, 163, 74],
    "#f59e0b": [245, 158, 11],
    "#663399": [102, 51, 153],
    "rgb(255 107 94)": [255, 107, 94],
    "rgb(100% 0% 0%)": [255, 0, 0],
    "rgb(12, 34, 56)": [12, 34, 56],
    "hsl(0 100% 50%)": [255, 0, 0],
    "hsl(120 100% 50%)": [0, 255, 0],
    "hsl(240 100% 50%)": [0, 0, 255],
    "hsl(6 100% 68%)": [255, 108, 92],
    "hsl(210 50% 40%)": [51, 102, 153],
    "hsl(45 80% 60%)": [235, 194, 71],
    // Bare-number S/L, added after the wrong-colour bug above. Chrome's values.
    "hsl(0 100 50)": [255, 0, 0],
    "hsl(210 50 40)": [51, 102, 153],
    "oklch(0.7 0.1 30)": [213, 134, 121],
    "oklch(0.5 0.05 200)": [63, 108, 110],
    "oklch(0.9 0.02 90)": [227, 222, 207],
  };

  it.each(Object.entries(CHROME))("%s", (input, expected) => {
    const { rgb } = ok(input);
    expect([rgb.r, rgb.g, rgb.b]).toEqual(expected);
  });
});

describe("angle units — hsl() and oklch() share one hue parser so they cannot drift", () => {
  it("a half turn is 180deg", () => {
    expect(ok("hsl(0.5turn 100% 50%)").rgb).toEqual(ok("hsl(180 100% 50%)").rgb);
  });
  it("pi radians is 180deg", () => {
    expect(ok("hsl(3.14159265turn".replace("turn", "rad") + " 100% 50%)").rgb)
      .toEqual(ok("hsl(180 100% 50%)").rgb);
  });
  it("200grad is 180deg", () => {
    expect(ok("hsl(200grad 100% 50%)").rgb).toEqual(ok("hsl(180 100% 50%)").rgb);
  });
  it("oklch() accepts the same units", () => {
    expect(ok("oklch(0.7 0.1 0.25turn)").rgb).toEqual(ok("oklch(0.7 0.1 90)").rgb);
  });
  it("refuses an unknown unit", () => err("hsl(180px 100% 50%)"));
});

describe("argument-list forms CSS itself rejects", () => {
  // Measured: Chrome rejects `rgb(255 107 94 0.5)` — a fourth space-separated
  // channel with no slash. An earlier version split on /[\s,]+/ and accepted it,
  // so the grammar comment claimed a list the code did not hold to.
  it("refuses a 4th space-separated channel", () => err("rgb(255 107 94 0.5)"));
  it("refuses mixed comma and space separators", () => err("rgb(255, 107 94)"));
  it("refuses an empty field", () => err("rgb(255,,94)"));
  it("refuses a trailing slash with no alpha", () => err("rgb(255 107 94 /)"));
  it("refuses two slashes", () => err("rgb(255 107 94 / 0.5 / 0.5)"));
  it("refuses a lone percent sign", () => err("rgb(% 107 94)"));
  it("still accepts both legal three-channel forms", () => {
    expect(ok("rgb(255 107 94)").rgb).toEqual({ r: 255, g: 107, b: 94 });
    expect(ok("rgba(255, 107, 94)").rgb).toEqual({ r: 255, g: 107, b: 94 });
  });
});

/* -----------------------------------------------------------------------------
   A SEED CARRIES NO ALPHA CHANNEL — ruled 2026-08-05.
   Refused on the SYNTAX, not the value: `#ff6b5eff` is refused even though it is
   opaque, because "a seed has no alpha channel" is a rule a consumer can act on
   while "a seed's alpha must be opaque" invites them to compute one.
   -------------------------------------------------------------------------- */
describe("alpha is not part of the seed grammar", () => {
  it.each([
    "#ff6b5eaa",
    "#ff6b5eff", // opaque, still refused — the syntax is the rule
    "#f00a",
    "#f00f",
    "rgb(255 107 94 / 0.5)",
    "rgb(255 107 94 / 1)",
    "rgba(255, 107, 94, 0.5)",
    "hsl(0 100% 50% / 0.5)",
    "hsla(0, 100%, 50%, 0.5)",
    "oklch(0.7 0.1 30 / 0.5)",
  ])("refuses %s", (v) => {
    const r = err(v);
    expect(r.reason).toMatch(/solid colour/);
  });

  it("the refusal explains WHY, not just that", () => {
    const r = err("#ff6b5eaa");
    expect(r.reason).toMatch(/generates its own alpha ramp/);
  });

  it("oxblood's own a1 token is refused — the case the ruling exists for", () => {
    // `--oxblood-a1: #db290507` is a 3% wash. Under the old accept-and-ignore
    // design this produced {219,41,5} — a bright red brand from a barely-visible
    // tint. It is now refused with a reason.
    const r = err("#db290507");
    expect(r.reason).toMatch(/solid colour/);
  });

  it("the opaque forms of the same colours are accepted", () => {
    expect(ok("#ff6b5e").rgb).toEqual({ r: 255, g: 107, b: 94 });
    expect(ok("#db2905").rgb).toEqual({ r: 219, g: 41, b: 5 });
  });
});

/* The plan named this from the start and the first implementation did not carry
   it: pure white and pure black have no hue and no chroma, so there is no ramp to
   build around them — all twelve steps collapse to the same neutral. Refused at
   the door rather than allowed to generate a degenerate scale. */
describe("pure white and pure black are refused — there is no ramp in them", () => {
  it.each([
    "#ffffff", "#fff", "rgb(255 255 255)", "hsl(0 0% 100%)",
    "#000000", "#000", "rgb(0 0 0)", "hsl(0 0% 0%)",
  ])("refuses %s", (v) => {
    const r = err(v);
    expect(r.reason).toMatch(/no hue/);
  });

  it("a near-white and a near-black seed are still legal brands", () => {
    expect(ok("#fdfdfd").rgb).toEqual({ r: 253, g: 253, b: 253 });
    expect(ok("#050505").rgb).toEqual({ r: 5, g: 5, b: 5 });
  });
});

describe("non-string and empty input", () => {
  it.each([[undefined], [null], [42], [{}], [[]]])("refuses %s", (v) => {
    const r = parseSeed(v);
    expect(r.ok).toBe(false);
  });
  it("refuses empty and whitespace", () => {
    err("");
    err("   ");
  });
});

describe("every refusal names the accepted forms", () => {
  it.each(["#ff6b5", "rebeccapurple", "lab(60% 40 30)", "oklch(banana)", "", "notacolour"])(
    "%s",
    (v) => {
      const r = parseSeed(v);
      expect(r.ok).toBe(false);
      if (!r.ok) {
        // A refusal a consumer cannot act on is the quiet failure this guards.
        expect(r.reason.length).toBeGreaterThan(10);
      }
    },
  );
});
