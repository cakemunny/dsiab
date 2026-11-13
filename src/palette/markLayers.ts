/* =============================================================================
   markLayers.ts — THE REST OF THE HELPER LAYERS, AND A PART'S OWN SHADE
   -----------------------------------------------------------------------------
   The second half of [[generated-helper-layers]]: the layers on marks, dashes,
   the Slider thumb and the status dots, each searched by the rule `theme.css`
   states for it, with the read-back and the margin of `helperLayers.ts`.

     markEdge         [[mark-on-tint-edge]]: the stack on a mark's fill that
                      clears its tint and the surface around it: the today bar
                      on the selected tint, on the page and on a panel; the
                      Outline bar on its rail (`--gray-a6`) on the page; the
                      chart line on its area (accent alpha 3) on a card.
     dashStack        [[drop-target-dash]]: the stack on accent step 7 that clears
                      the drop tint (accent alpha 3) and the surface, on the page,
                      the subtle recess, a card and a panel.
     sliderThumbStack [[neutral-part-stacks]]: the stack on the Slider thumb's ring,
                      drawn over Radix's `--black-a4` over the range, such that the
                      thumb reads against its range, its track and the surfaces,
                      by its white face or by its ring.
     dotEdge          [[status-dot-edges]]: the stack on a status dot's fill that
                      clears the page, the subtle recess, a card and a panel.

   And `ownShade`: where no step of a layer's scale makes a part visible, the
   part's own colour is moved by lightness, at its hue and as much chroma as
   the gamut allows, to the nearest value that clears its surfaces alone.

   Pure arithmetic. No DOM.
   ============================================================================= */
import type { Appearance } from "./generate";
import { BLACK_A, WHITE_A, clears, firstStack, type LayerStep } from "./helperLayers";
import { type RGB, gamutClamp, oklabToOklch, oklabToSrgb, oklchToOklab, srgbToOklab } from "./oklch";
import { NEUTRALS, NEUTRAL_STEPS, asReadBack, layOver, parseColour, type Neutral } from "./surfaces";

const WHITE: RGB = { r: 255, g: 255, b: 255 };

/** The page, the subtle recess, a card and a panel of one neutral. */
function fourSurfaces(neutral: Neutral, appearance: Appearance): { page: RGB; subtle: RGB; card: RGB; panel: RGB } {
  const n = NEUTRAL_STEPS[neutral][appearance];
  return {
    page: parseColour(n.s1),
    subtle: parseColour(n.s2),
    card: appearance === "light" ? WHITE : parseColour(n.s2),
    panel: appearance === "light" ? WHITE : parseColour(n.s3),
  };
}

/** The stack scale an appearance uses: black in light, white in dark. */
function stackOn(fill: RGB, appearance: Appearance, ok: (c: RGB) => boolean): LayerStep | null {
  return appearance === "light" ? firstStack(fill, BLACK_A, "black", ok) : firstStack(fill, WHITE_A, "white", ok);
}

/** The gray alpha step the Outline rail paints, `--ds-stroke-weak` (`--gray-a6`) of each neutral. */
export const RAIL: Record<Neutral, Record<Appearance, string>> = {
  gray: { light: "#00000026", dark: "#ffffff2c" },
  mauve: { light: "#14003527", dark: "#f1e6fd30" },
  slate: { light: "#00002f26", dark: "#d6ebfd30" },
  sage: { light: "#00140d28", dark: "#edfbf42d" },
  olive: { light: "#00140028", dark: "#f4faed2c" },
  sand: { light: "#19130029", dark: "#fffaed2d" },
};

/** [[mark-on-tint-edge]]'s edge for a mark that paints `fill`. `accentA3` and `accentA5` are the
 *  colour's alpha steps 3 and 5 in `appearance`. */
export function markEdge(fill: RGB, appearance: Appearance, accentA3: string, accentA5: string): LayerStep | null {
  const pairs: RGB[][] = NEUTRALS.map((neutral) => {
    const s = fourSurfaces(neutral, appearance);
    const band = asReadBack(accentA5), area = asReadBack(accentA3), rail = asReadBack(RAIL[neutral][appearance]);
    return [s.page, layOver(band, s.page), s.panel, layOver(band, s.panel), layOver(rail, s.page), s.card, layOver(area, s.card)];
  });
  return stackOn(fill, appearance, (c) => pairs.every((ss) => ss.every((s) => clears(c, s))));
}

/** [[drop-target-dash]]'s stack on step 7 (`step7`), against the drop tint (`accentA3`) and the
 *  surface. */
export function dashStack(step7: RGB, appearance: Appearance, accentA3: string): LayerStep | null {
  const all = NEUTRALS.flatMap((neutral) => {
    const s = fourSurfaces(neutral, appearance);
    return [s.page, s.subtle, s.card, s.panel].flatMap((x) => [x, layOver(asReadBack(accentA3), x)]);
  });
  return stackOn(step7, appearance, (c) => all.every((s) => clears(c, s)));
}

/** [[neutral-part-stacks]]'s stack on the Slider thumb's ring. The thumb is white; its ring is
 *  the stack over Radix's `--black-a4` hairline, a black alpha in both appearances, because a
 *  white stack cannot separate a white thumb from a light range. The ring is 1px outside the
 *  thumb, so it lies over the neighbour it is read against, as the guard
 *  (`_internal/Non-text contrast` → GreyAndWhiteParts) flattens it: the range, the track (the
 *  neutral's alpha step 3 on each surface) and each surface. The thumb reads against a neighbour
 *  when its face or its ring clears it. */
export function sliderThumbStack(range: RGB, appearance: Appearance): LayerStep | null {
  const neighbours = NEUTRALS.flatMap((neutral) => {
    const s = fourSurfaces(neutral, appearance);
    const a3 = asReadBack(NEUTRAL_STEPS[neutral][appearance].a3);
    const four = [s.page, s.subtle, s.card, s.panel];
    return [range, ...four.map((x) => layOver(a3, x)), ...four];
  });
  const hairline = asReadBack(BLACK_A[3]!);
  const reads = (stack: string | null) => neighbours.every((n) => {
    if (clears(WHITE, n)) return true;
    const ring = layOver(hairline, n);
    return clears(stack ? layOver(asReadBack(stack), ring) : ring, n);
  });
  if (reads(null)) return "none";
  for (let i = 0; i < BLACK_A.length; i++) if (reads(BLACK_A[i]!)) return `black-a${i + 1}`;
  return null;
}

/** [[status-dot-edges]]'s edge for a status dot that paints `fill`. */
export function dotEdge(fill: RGB, appearance: Appearance): LayerStep | null {
  const all = NEUTRALS.flatMap((neutral) => Object.values(fourSurfaces(neutral, appearance)));
  return stackOn(fill, appearance, (c) => all.every((s) => clears(c, s)));
}

/** A part's own shade: `seed` moved by OKLCH lightness, at its hue and the chroma the gamut allows,
 *  to the nearest lightness at which `reads` holds. Darker wins a tie. Null when none does. */
export function ownShade(seed: RGB, reads: (c: RGB) => boolean): { fill: string; direction: "darker" | "lighter" } | null {
  const lch = oklabToOklch(srgbToOklab(seed));
  for (let k = 1; k <= 400; k++) {
    for (const [direction, sign] of [["darker", -1], ["lighter", 1]] as const) {
      const L = lch.L + sign * k * 0.0025;
      if (L <= 0 || L >= 1) continue;
      const c = oklabToSrgb(oklchToOklab(gamutClamp({ L, C: lch.C, h: lch.h }).lch));
      const rgb = { r: Math.round(c.r), g: Math.round(c.g), b: Math.round(c.b) };
      if (reads(rgb)) {
        return { fill: `#${[rgb.r, rgb.g, rgb.b].map((v) => v.toString(16).padStart(2, "0")).join("")}`, direction };
      }
    }
  }
  return null;
}
