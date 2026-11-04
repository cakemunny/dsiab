/* =============================================================================
   buttonFill.ts — QUESTION 2, AND THE SHADE A FILLED BUTTON TAKES WHEN IT FAILS
   -----------------------------------------------------------------------------
   A label on a filled button owes WCAG 4.5:1 and APCA Lc 60, at rest, under the
   hover overlay and under Radix's press filter ([[text-on-solid-fill-contrast]]).
   The named accents meet it by pinning a deeper fill on the 16 whose step 9
   cannot. A generated brand meets it the same way, with a shade the generator
   finds here ([[generated-button-fill]]):

     QUESTION 2   `labelOnFill`: does one of the two inks, white or `#21201c`,
                  reach both floors on the fill in all three states? This is the
                  only question that moves the button.
     THE SEARCH   `searchFill`: where it does not, walk lightness away from the
                  seed in both directions, at the seed's hue and chroma, gamut-
                  clamped, to the nearest lightness that passes. Of the two,
                  take the one that keeps more chroma (Jason's answer I, option
                  b); within 0.005 of chroma take the nearer; still level, the
                  darker. The clamp may lower chroma, and the loss is measured on
                  the hex that paints (answer F).

   The step is 0.0025 of OKLCH lightness, the census's, so its measured shades
   (#3b82f6 to #2b72e5) are this function's output and not an approximation of it.

   Pure arithmetic over `surfaces.ts` and `apca.ts`. No DOM.
   ============================================================================= */
import { apcaLc } from "./apca";
import { contrastRatio, type Appearance } from "./generate";
import {
  type RGB, deltaEOK, gamutClamp, oklabToOklch, oklabToSrgb, oklchToOklab, srgbToOklab,
} from "./oklch";
import { FLOORS, HOVER_OVERLAY, INKS, PRESS_FILTER, layOver, parseColour, type InkName } from "./surfaces";

/** One state of a label on a fill: the WCAG ratio and the signed APCA Lc of the ink on it. */
export interface LabelReading {
  ratio: number;
  lc: number;
}

/** One ink on one fill, in each state. */
export interface InkReading {
  ink: InkName;
  rest: LabelReading;
  hover: LabelReading;
  press: LabelReading;
  /** All three states reach both floors. */
  passes: boolean;
  /** The weakest |Lc| across the three states, which ranks two passing inks. */
  worstLc: number;
}

export interface LabelOnFill {
  /** One ink passes in every state. */
  passes: boolean;
  /** The ink the button takes: the passing ink with the higher worst |Lc|, or, when none
   *  passes, the one that comes nearer. */
  ink: InkName;
  inks: Record<InkName, InkReading>;
}

const STEP = 0.0025;
const CHROMA_TIE = 0.005;

const round = (c: RGB): RGB => ({ r: Math.round(c.r), g: Math.round(c.g), b: Math.round(c.b) });
const bytes = (c: RGB): [number, number, number] => [Math.round(c.r), Math.round(c.g), Math.round(c.b)];

/** A colour under Radix's press filter. CSS `brightness()` scales each sRGB channel, and
 *  `saturate()` is the Filter Effects matrix, both on the encoded values, as the census measured. */
export function pressed(c: RGB, appearance: Appearance): RGB {
  const { brightness, saturate: s } = PRESS_FILTER[appearance];
  const r = c.r * brightness, g = c.g * brightness, b = c.b * brightness;
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  if (s === 1) return { r: clamp(r), g: clamp(g), b: clamp(b) };
  return {
    r: clamp((0.213 + 0.787 * s) * r + (0.715 - 0.715 * s) * g + (0.072 - 0.072 * s) * b),
    g: clamp((0.213 - 0.213 * s) * r + (0.715 + 0.285 * s) * g + (0.072 - 0.072 * s) * b),
    b: clamp((0.213 - 0.213 * s) * r + (0.715 - 0.715 * s) * g + (0.072 + 0.928 * s) * b),
  };
}

function reading(ink: RGB, fill: RGB): LabelReading {
  return { ratio: contrastRatio(round(ink), round(fill)), lc: apcaLc(bytes(ink), bytes(fill)) };
}

const clears = (r: LabelReading) => r.ratio >= FLOORS.textOnFill.wcag && Math.abs(r.lc) >= FLOORS.textOnFill.lc;

/** Question 2 on one fill. */
export function labelOnFill(fill: RGB, appearance: Appearance): LabelOnFill {
  const inks = {} as Record<InkName, InkReading>;
  for (const name of Object.keys(INKS) as InkName[]) {
    const ink = parseColour(INKS[name]);
    const hover = layOver(HOVER_OVERLAY[name], fill);
    const r: InkReading = {
      ink: name,
      rest: reading(ink, fill),
      hover: reading(ink, hover),
      press: reading(pressed(ink, appearance), pressed(hover, appearance)),
      passes: false,
      worstLc: 0,
    };
    r.passes = clears(r.rest) && clears(r.hover) && clears(r.press);
    r.worstLc = Math.min(Math.abs(r.rest.lc), Math.abs(r.hover.lc), Math.abs(r.press.lc));
    inks[name] = r;
  }
  const ranked = (Object.values(inks) as InkReading[]).sort((a, b) =>
    a.passes !== b.passes ? (a.passes ? -1 : 1) : b.worstLc - a.worstLc,
  );
  return { passes: ranked[0]!.passes, ink: ranked[0]!.ink, inks };
}

export type Direction = "darker" | "lighter";

export interface ButtonFill {
  /** The fill the filled button paints, `#rrggbb`. */
  fill: string;
  /** False when the seed itself passes question 2. */
  adjusted: boolean;
  /** Set only when adjusted. */
  direction: Direction | null;
  /** The share of the seed's OKLCH chroma the painted fill lost, 0 when none. */
  chromaLost: number;
  /** ΔE-OK between the seed and the painted fill. */
  deltaE: number;
  /** Question 2 on the painted fill. */
  label: LabelOnFill;
}

const toHex = (c: RGB) => `#${[c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

function chroma(c: RGB): number {
  return oklabToOklch(srgbToOklab(c)).C;
}

interface Candidate {
  rgb: RGB;
  direction: Direction;
  steps: number;
  keptChroma: number;
}

/** The nearest lightness in one direction that passes question 2, or null. */
function walk(seed: RGB, direction: Direction, appearance: Appearance): Candidate | null {
  const lch = oklabToOklch(srgbToOklab(seed));
  const sign = direction === "darker" ? -1 : 1;
  for (let k = 1; k <= 400; k++) {
    const L = lch.L + sign * k * STEP;
    if (L <= 0 || L >= 1) return null;
    const rgb = round(oklabToSrgb(oklchToOklab(gamutClamp({ L, C: lch.C, h: lch.h }).lch)));
    if (labelOnFill(rgb, appearance).passes) return { rgb, direction, steps: k, keptChroma: chroma(rgb) };
  }
  return null;
}

/** The fill a filled button paints for `seed` in `appearance`: the seed when it passes question 2,
 *  otherwise the shade rule (b) picks. When no lightness passes in either direction, the seed is
 *  returned unadjusted and its `label.passes` is false, so the caller reports the miss. */
export function searchFill(seed: RGB, appearance: Appearance): ButtonFill {
  const seedLabel = labelOnFill(seed, appearance);
  if (seedLabel.passes) {
    return { fill: toHex(seed), adjusted: false, direction: null, chromaLost: 0, deltaE: 0, label: seedLabel };
  }
  const found = (["darker", "lighter"] as const).map((d) => walk(seed, d, appearance)).filter((c): c is Candidate => !!c);
  if (!found.length) {
    return { fill: toHex(seed), adjusted: false, direction: null, chromaLost: 0, deltaE: 0, label: seedLabel };
  }
  found.sort((a, b) =>
    Math.abs(a.keptChroma - b.keptChroma) > CHROMA_TIE ? b.keptChroma - a.keptChroma
    : a.steps !== b.steps ? a.steps - b.steps
    : a.direction === "darker" ? -1 : 1,
  );
  const w = found[0]!;
  const seedChroma = chroma(seed);
  return {
    fill: toHex(w.rgb),
    adjusted: true,
    direction: w.direction,
    chromaLost: seedChroma > 1e-6 ? Math.max(0, 1 - w.keptChroma / seedChroma) : 0,
    deltaE: deltaEOK(srgbToOklab(seed), srgbToOklab(w.rgb)),
    label: labelOnFill(w.rgb, appearance),
  };
}
