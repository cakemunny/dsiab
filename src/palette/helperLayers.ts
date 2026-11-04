/* =============================================================================
   helperLayers.ts — THE LAYERS A NAMED ACCENT CARRIES, SEARCHED FOR A SEED
   -----------------------------------------------------------------------------
   Every named accent carries helper layers that `theme.css` picked by hand,
   each by its own ruling: a Radix black or white alpha stacked on a fill so a
   ring, a part or a thumb stays visible on every surface it sits on. A
   generated brand carries none of them today. This module runs each ruling's
   search for any fill ([[generated-helper-layers]]):

     ringStack    [[focus-ring]]: the lightest black (light) or white (dark)
                  alpha whose stack on the ring's fill clears WCAG 3:1 and APCA
                  Lc 30 against all fifteen focus surfaces on all six neutrals.
     scrimStack   [[focus-ring]] on a scrim: the same over grey media 0 to 255
                  under the dark scrim (`--black-a8`, white stack) or the light
                  scrim (`--white-a8`, black stack).
     partEdge     [[part-fill-edge]], [[status-dot-edges]]: the lightest alpha
                  whose stack on the part's fill clears 3:1 and Lc 30 against
                  the page, the subtle recess, a card and a panel, and against a
                  track (`--gray-a3`) on each, on all six neutrals.
     thumbStroke  [[textless-part-fills]]: where the white thumb reads under 3:1
                  on its track, the lightest step of the same colour whose
                  stroke, under Radix's `--black-a1` hairline, clears 3:1
                  against the track the switch paints (`--accent-track`). The
                  alpha scale first, then the solid scale. This is the theme's
                  own wording, and it reproduces step 7 on dark amber, lime,
                  mint, sky and yellow and step 6 on dark orange once it is
                  measured on the painted track rather than step 9.

   A step is named as the token it paints: "none" for the fill alone, then
   `black-a6`, `white-a8`, `accent-a11` or `accent-7`.

   THE MARGIN. The guards read every translucent token back through an 8-bit
   canvas, and three of `theme.css`'s rings sit within 0.03:1 or 0.2 Lc of the
   floor, where that rounding decides. Each search therefore holds a small
   margin above the floors, `LAYER_MARGIN`, so a step it picks also clears as
   the guards measure it. `_internal/Helper layer parity` holds each search to
   `theme.css` on all 27 named accents.

   Pure arithmetic over `surfaces.ts` and `apca.ts`. No DOM.
   ============================================================================= */
import { apcaLcFromY, apcaY } from "./apca";
import { contrastRatio, type Appearance } from "./generate";
import { linearFromByte, type RGB } from "./oklch";
import {
  FLOORS, NEUTRALS, NEUTRAL_STEPS, allSurfaces, asReadBack, layOver, parseColour, type TintSteps,
} from "./surfaces";

/** Radix's black and white alpha scales, steps 1 to 12, in Radix's own `rgba()` form. */
export const BLACK_A = [0.05, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95].map((a) => `rgba(0, 0, 0, ${a})`);
export const WHITE_A = [0.05, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95].map((a) => `rgba(255, 255, 255, ${a})`);

/** How far above the non-text floors a layer is held, for the canvas rounding the guards
 *  measure through. Set by `_internal/Helper layer parity`: see [[generated-helper-layers]]. */
export const LAYER_MARGIN = { wcag: 0.05, lc: 0.5 } as const;

export type LayerStep = "none" | `black-a${number}` | `white-a${number}` | `accent-a${number}` | `accent-${number}`;

const round = (c: RGB): RGB => ({ r: Math.round(c.r), g: Math.round(c.g), b: Math.round(c.b) });

/** A non-text layer `fg` reads against `bg` at the floors plus the margin. */
export function clears(fg: RGB, bg: RGB): boolean {
  const f = luminances(fg), b = luminances(bg);
  const ratio = (Math.max(f.wcag, b.wcag) + 0.05) / (Math.min(f.wcag, b.wcag) + 0.05);
  return ratio >= FLOORS.nonText.wcag + active.wcag && Math.abs(apcaLcFromY(f.apca, b.apca)) >= FLOORS.nonText.lc + active.lc;
}

/** The WCAG relative luminance and the APCA screen luminance of a colour, rounded to the byte that
 *  paints. Cached, because every search measures the same few hundred surfaces over and over: the
 *  256 scrim media alone are re-read for every step of every stack. The same formulas as
 *  `contrastRatio` in `generate.ts` and `apcaY` in `apca.ts`, so a cached value is the value. */
const LUMINANCE = new Map<number, { wcag: number; apca: number }>();
export function luminances(c: RGB): { wcag: number; apca: number } {
  const r = Math.round(c.r), g = Math.round(c.g), b = Math.round(c.b);
  const key = (r << 16) | (g << 8) | b;
  let hit = LUMINANCE.get(key);
  if (!hit) {
    if (LUMINANCE.size > 65536) LUMINANCE.clear();
    hit = {
      wcag: 0.2126 * linearFromByte(r) + 0.7152 * linearFromByte(g) + 0.0722 * linearFromByte(b),
      apca: apcaY([r, g, b]),
    };
    LUMINANCE.set(key, hit);
  }
  return hit;
}

let active: { wcag: number; lc: number } = LAYER_MARGIN;

/** Run `f` with the searches held at the bare floors, no margin. For the parity story only: it
 *  proves that where a search picks a heavier step than the theme, the margin alone is why. */
export function withoutMargin<T>(f: () => T): T {
  const before = active;
  active = { wcag: 0, lc: 0 };
  try {
    return f();
  } finally {
    active = before;
  }
}

/** The fill alone if it clears, else the lightest step of `scale` whose stack on it clears. */
export function firstStack(fill: RGB, scale: readonly string[], prefix: "black" | "white", ok: (c: RGB) => boolean): LayerStep | null {
  if (ok(fill)) return "none";
  for (let i = 0; i < scale.length; i++) if (ok(layOver(asReadBack(scale[i]!), fill))) return `${prefix}-a${i + 1}`;
  return null;
}

/** [[focus-ring]]'s page stack for a ring whose base is `fill`. `tints` are the brand's and the
 *  status families' steps in `appearance`. Null when no step clears. */
export function ringStack(fill: RGB, appearance: Appearance, tints: TintSteps): LayerStep | null {
  const surfaces = NEUTRALS.flatMap((n) => Object.values(allSurfaces(n, appearance, tints, asReadBack)));
  const ok = (ring: RGB) => surfaces.every((s) => clears(ring, s));
  return appearance === "light" ? firstStack(fill, BLACK_A, "black", ok) : firstStack(fill, WHITE_A, "white", ok);
}

/** The veil over grey media 0 to 255, as each scrim composites it. */
function scrimMedia(scrim: "dark" | "light"): RGB[] {
  const veil = scrim === "dark" ? BLACK_A[7]! : WHITE_A[7]!;
  return Array.from({ length: 256 }, (_, m) => layOver(asReadBack(veil), { r: m, g: m, b: m }));
}
const MEDIA = { dark: scrimMedia("dark"), light: scrimMedia("light") };

/** [[focus-ring]]'s stack on a scrim. The veils and the fill keep their colour in both appearances,
 *  so the result does not depend on the appearance. */
export function scrimStack(fill: RGB, scrim: "dark" | "light"): LayerStep | null {
  const ok = (ring: RGB) => MEDIA[scrim].every((m) => clears(ring, m));
  return scrim === "dark" ? firstStack(fill, WHITE_A, "white", ok) : firstStack(fill, BLACK_A, "black", ok);
}

/** The surfaces a part edge is held against: page, subtle, card and panel, and a track on each. */
function edgeSurfaces(appearance: Appearance): RGB[] {
  return NEUTRALS.flatMap((neutral) => {
    const n = NEUTRAL_STEPS[neutral][appearance];
    const page = parseColour(n.s1);
    const four = [page, parseColour(n.s2), parseColour(appearance === "light" ? "#ffffff" : n.s2), parseColour(appearance === "light" ? "#ffffff" : n.s3)];
    return [...four, ...four.map((s) => layOver(asReadBack(n.a3), s))];
  });
}
const EDGE_SURFACES = { light: edgeSurfaces("light"), dark: edgeSurfaces("dark") };

/** [[part-fill-edge]]'s edge for a part that paints `fill`. */
export function partEdge(fill: RGB, appearance: Appearance): LayerStep | null {
  const ok = (c: RGB) => EDGE_SURFACES[appearance].every((s) => clears(c, s));
  return appearance === "light" ? firstStack(fill, BLACK_A, "black", ok) : firstStack(fill, WHITE_A, "white", ok);
}

const WHITE: RGB = { r: 255, g: 255, b: 255 };

/** A dark scale runs from dark step 1 to light step 12. */
function isDarkScale(solid: readonly string[]): boolean {
  const y = (h: string) => contrastRatio(parseColour(h), { r: 0, g: 0, b: 0 });
  return y(solid[0]!) < y(solid[11]!);
}

/** [[textless-part-fills]]'s thumb stroke. `solid` and `alpha` are the
 *  colour's own twelve steps in `appearance`, and `track` the switch track the thumb sits on.
 *  "accent-a4" is Radix's own hairline, which a thumb that already reads keeps. */
export function thumbStroke(solid: readonly string[], alpha: readonly string[], track: RGB): LayerStep | null {
  if (contrastRatio(WHITE, round(track)) >= FLOORS.nonText.wcag) return "accent-a4";
  const under = (stroke: RGB) => contrastRatio(round(layOver(BLACK_A[0]!, stroke)), round(track));
  for (let i = 0; i < alpha.length; i++) {
    if (under(layOver(alpha[i]!, track)) >= FLOORS.nonText.wcag) return `accent-a${i + 1}`;
  }
  // The solid scale, lightest first. In dark the scale lightens toward step 12, so that is the
  // order of the walk; in light no colour reaches this branch, because its alpha scale clears.
  const order = Array.from({ length: solid.length }, (_, i) => i);
  if (isDarkScale(solid)) order.reverse();
  for (const i of order) if (under(parseColour(solid[i]!)) >= FLOORS.nonText.wcag) return `accent-${i + 1}`;
  return null;
}
