/* =============================================================================
   surfaces.ts — THE FLOORS, INKS AND SURFACES A GENERATED BRAND IS MEASURED ON
   -----------------------------------------------------------------------------
   The generator and the custom-accent assessment have to measure a seed the
   way the browser guards measure a named accent: against the same floors,
   with the same two label inks, under the same hover overlays and press
   filter, on the same fifteen surfaces, for all six neutrals in both
   appearances. Each of those lived only in the guards (`_assert.ts`) or the
   token CSS, and code in this folder cannot read either at runtime: the
   guards are the test lane, and the CSS does not exist in a pure function.
   This module is the one copy the palette code reads ([[palette-surface-table]]).

   THREE KINDS OF VALUE, kept apart on purpose:

     STATIC     The floors, the inks, the overlays and the press filter, and
                the neutral surfaces: page, subtle, sunken, card, panel, track,
                track on a card and highlighted row. They depend only on the
                neutral and the appearance, so they are written here as the
                Radix Themes 3.3 values the docs render.
     ACCENT     The accent tint on the page and on a card (alpha step 3) and
                the selected tint (alpha step 5). They come from the brand's
                own alpha scale, so `tintSurfaces` computes them from it.
     STATUS     The error, warning, success and info tints (each family's
                alpha step 3). A brand can move a status family to another
                scale ([[seeded-brand-collisions]]), so the caller passes the
                family's step and `tintSurfaces` composes it.

   HOW IT STAYS TRUE. `_internal/Surface table` in
   `src/foundations/_surface-table.stories.tsx` reads every static value off a
   live theme root, for each neutral and appearance, and composes the fifteen
   surfaces the way the focus-ring guards do. It also feeds the ACCENT and
   STATUS recipes each named accent's live steps and holds the result to that
   accent's rendered tints. A Radix upgrade that moves one value turns it red.

   Pure data and arithmetic. No DOM, and no import from the theme folder or
   the test lane (`palette-imports.node-check.ts`).
   ============================================================================= */
import type { RGB } from "./oklch";

export type SurfaceAppearance = "light" | "dark";

/** Radix's six neutrals, in the order the guards sweep them. */
export const NEUTRALS = ["gray", "mauve", "slate", "sage", "olive", "sand"] as const;
export type Neutral = (typeof NEUTRALS)[number];

/* --- floors ---------------------------------------------------------------- */

/** The contrast floors the system's guards hold, by what they hold. */
export const FLOORS = {
  /** Body text and link text on a surface: WCAG AA ([[text-on-solid-fill-contrast]] and TEXT_ON_BG). */
  text: { wcag: 4.5 },
  /** Strong text, step 12: the generator's own floor for its high-contrast step. */
  strongText: { wcag: 7 },
  /** A label on a solid fill: WCAG 4.5:1 and APCA Lc 60 ([[text-on-solid-fill-contrast]]). */
  textOnFill: { wcag: 4.5, lc: 60 },
  /** A part without text, a mark or a focus ring: WCAG 3:1 and APCA Lc 30 ([[focus-ring]], [[part-fill-edge]]). */
  nonText: { wcag: 3, lc: 30 },
} as const;

/* --- inks ------------------------------------------------------------------ */

/** The two label inks the system puts on a solid fill: white, and the system's near-black, the
 *  dark ink Radix's light scales already use. */
export const INKS = {
  white: "#ffffff",
  nearBlack: "#21201c",
} as const;
export type InkName = keyof typeof INKS;

/* --- interaction --------------------------------------------------------- */

/** The overlay a solid fill takes on hover and on open, by the ink on it
 *  ([[text-on-solid-fill-contrast]], `--ds-fill-accent-hover`). A black overlay under a white
 *  label deepens the fill away from the label. Under a dark label a black overlay would darken
 *  the fill toward it, so the white overlay is used, which lightens it. */
export const HOVER_OVERLAY: Record<InkName, string> = {
  white: "rgba(0, 0, 0, 0.1)", // --black-a2
  nearBlack: "rgba(255, 255, 255, 0.2)", // --white-a4
};

/** The filter Radix puts on a solid button while it is pressed, on top of the hover overlay
 *  (`--base-button-solid-active-filter`). `saturate` is 1 where Radix sets none. */
export const PRESS_FILTER: Record<SurfaceAppearance, { brightness: number; saturate: number }> = {
  light: { brightness: 0.92, saturate: 1.1 },
  dark: { brightness: 1.08, saturate: 1 },
};

/* --- the neutral steps ------------------------------------------------------ */

/** The neutral steps the surfaces are made of, as Radix Themes 3.3 ships them in sRGB. */
interface NeutralSteps {
  /** Step 1, the page (`--ds-bg-base`). */
  s1: string;
  /** Step 2: the subtle recess, the light sunken recess and the dark card. */
  s2: string;
  /** Step 3: the dark panel. */
  s3: string;
  /** Alpha step 3, a track (`--ds-fill-weak`). */
  a3: string;
  /** Alpha step 4, a highlighted row (`--ds-fill-hover`). */
  a4: string;
}

export const NEUTRAL_STEPS: Record<Neutral, Record<SurfaceAppearance, NeutralSteps>> = {
  gray: {
    light: { s1: "#fcfcfc", s2: "#f9f9f9", s3: "#f0f0f0", a3: "#0000000f", a4: "#00000017" },
    dark: { s1: "#111111", s2: "#191919", s3: "#222222", a3: "#ffffff12", a4: "#ffffff1b" },
  },
  mauve: {
    light: { s1: "#fdfcfd", s2: "#faf9fb", s3: "#f2eff3", a3: "#30004010", a4: "#20003618" },
    dark: { s1: "#121113", s2: "#1a191b", s3: "#232225", a3: "#ebeaf814", a4: "#eee5f81d" },
  },
  slate: {
    light: { s1: "#fcfcfd", s2: "#f9f9fb", s3: "#f0f0f3", a3: "#0000330f", a4: "#00002d17" },
    dark: { s1: "#111113", s2: "#18191b", s3: "#212225", a3: "#ddeaf814", a4: "#d3edf81d" },
  },
  sage: {
    light: { s1: "#fbfdfc", s2: "#f7f9f8", s3: "#eef1f0", a3: "#002d1e11", a4: "#001f1519" },
    dark: { s1: "#101211", s2: "#171918", s3: "#202221", a3: "#f3f5f412", a4: "#f2fefd1a" },
  },
  olive: {
    light: { s1: "#fcfdfc", s2: "#f8faf8", s3: "#eff1ef", a3: "#00200010", a4: "#00160018" },
    dark: { s1: "#111210", s2: "#181917", s3: "#212220", a3: "#f4f5f312", a4: "#f3fef21a" },
  },
  sand: {
    light: { s1: "#fdfdfc", s2: "#f9f9f8", s3: "#f1f0ef", a3: "#20100010", a4: "#1f150019" },
    dark: { s1: "#111110", s2: "#191918", s3: "#222221", a3: "#f6f6f513", a4: "#fefef31b" },
  },
};

/** The dark sunken recess, `--black-a6` laid over the page ([[dark-override-selectors]]'s block
 *  in semantic.css: base is already the darkest step in dark, so a recess darkens with black). */
const DARK_SUNKEN = "rgba(0, 0, 0, 0.4)";
/** The light card and panel, `--ds-bg-raised` and `--ds-bg-overlay`. */
const LIGHT_RAISED = "#ffffff";

/* --- composing a surface --------------------------------------------------- */

/** A `#rrggbb`, `#rrggbbaa` or `rgba(r, g, b, a)` colour as bytes and an alpha from 0 to 1.
 *  The `rgba()` form exists because Radix writes its black and white alpha steps that way, with
 *  alphas such as 0.1 that no hex byte holds exactly. */
export function parseColour(colour: string): RGB & { a: number } {
  const rgba = /^rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([0-9.]+)\s*\)$/.exec(colour);
  if (rgba) return { r: Number(rgba[1]), g: Number(rgba[2]), b: Number(rgba[3]), a: Number(rgba[4]) };
  if (!/^#(?:[0-9a-f]{6}|[0-9a-f]{8})$/i.test(colour)) throw new Error(`surfaces: cannot read the colour ${colour}`);
  const n = (i: number) => parseInt(colour.slice(i, i + 2), 16);
  return { r: n(1), g: n(3), b: n(5), a: colour.length > 7 ? n(7) / 255 : 1 };
}

/** Lay `top` over the opaque `under`, as the browser blends them. Unrounded, as the guards'
 *  `flatten` and axe compute it. */
export function layOver(top: string, under: RGB): RGB {
  const t = parseColour(top);
  return {
    r: t.r * t.a + under.r * (1 - t.a),
    g: t.g * t.a + under.g * (1 - t.a),
    b: t.b * t.a + under.b * (1 - t.a),
  };
}

/** A translucent colour as an 8-bit canvas hands it back: stored with its alpha in a byte and its
 *  channels premultiplied by that alpha, each rounded, then divided out again. The guards read
 *  every token this way (`parseColor` in `_assert.ts`), so a search that must agree with a guard
 *  on a value near the floor measures the colour the guard sees. An opaque colour is unchanged. */
export function asReadBack(colour: string): string {
  const c = parseColour(colour);
  const A = Math.round(c.a * 255);
  if (A === 255) return `rgba(${c.r}, ${c.g}, ${c.b}, 1)`;
  if (A === 0) return "rgba(0, 0, 0, 0)";
  const back = (v: number) => Math.min(255, Math.round((Math.round((v * A) / 255) * 255) / A));
  return `rgba(${back(c.r)}, ${back(c.g)}, ${back(c.b)}, ${A / 255})`;
}

/** How a layer is read before it is composited: as written, or `asReadBack` to measure as the
 *  guards do. */
export type Read = (colour: string) => string;
const asWritten: Read = (c) => c;

/** Paint `layers`, bottom first. The bottom layer is the page and is opaque. */
function paint(read: Read, ...layers: string[]): RGB {
  const [bottom, ...rest] = layers.map(read);
  const base = parseColour(bottom!);
  if (base.a !== 1) throw new Error(`surfaces: the bottom layer ${bottom} is not opaque`);
  let under: RGB = { r: base.r, g: base.g, b: base.b };
  for (const layer of rest) under = layOver(layer, under);
  return under;
}

/** The eight surfaces that depend only on the neutral and the appearance, named as the focus-ring
 *  guards name them (`FOCUS_SURFACES` in `_assert.ts`), each built from the same layers. */
export function neutralSurfaces(neutral: Neutral, appearance: SurfaceAppearance, read: Read = asWritten): Record<NeutralSurfaceName, RGB> {
  const n = NEUTRAL_STEPS[neutral][appearance];
  const card = appearance === "light" ? LIGHT_RAISED : n.s2;
  const panel = appearance === "light" ? LIGHT_RAISED : n.s3;
  const sunken = appearance === "light" ? n.s2 : DARK_SUNKEN;
  return {
    page: paint(read, n.s1),
    subtle: paint(read, n.s1, n.s2),
    sunken: paint(read, n.s1, sunken),
    card: paint(read, n.s1, card),
    panel: paint(read, n.s1, panel),
    track: paint(read, n.s1, n.a3),
    "track on a card": paint(read, n.s1, card, n.a3),
    "highlighted row": paint(read, n.s1, panel, n.a4),
  };
}

export const NEUTRAL_SURFACE_NAMES = [
  "page", "subtle", "sunken", "card", "panel", "track", "track on a card", "highlighted row",
] as const;
export type NeutralSurfaceName = (typeof NEUTRAL_SURFACE_NAMES)[number];

/** What the tinted surfaces are made of: the brand's alpha steps 3 and 5, and each status
 *  family's alpha step 3, all as `#rrggbbaa` for the appearance in question. */
export interface TintSteps {
  accentA3: string;
  accentA5: string;
  errorA3: string;
  warningA3: string;
  successA3: string;
  infoA3: string;
}

export const TINT_SURFACE_NAMES = [
  "error tint", "warning tint", "success tint", "info tint", "accent tint", "accent tint on a card", "selected tint",
] as const;
export type TintSurfaceName = (typeof TINT_SURFACE_NAMES)[number];

/** The seven tinted surfaces, from the brand's and the status families' own steps. */
export function tintSurfaces(neutral: Neutral, appearance: SurfaceAppearance, t: TintSteps, read: Read = asWritten): Record<TintSurfaceName, RGB> {
  const n = NEUTRAL_STEPS[neutral][appearance];
  const card = appearance === "light" ? LIGHT_RAISED : n.s2;
  return {
    "error tint": paint(read, n.s1, t.errorA3),
    "warning tint": paint(read, n.s1, t.warningA3),
    "success tint": paint(read, n.s1, t.successA3),
    "info tint": paint(read, n.s1, t.infoA3),
    "accent tint": paint(read, n.s1, t.accentA3),
    "accent tint on a card": paint(read, n.s1, card, t.accentA3),
    "selected tint": paint(read, n.s1, t.accentA5),
  };
}

export type SurfaceName = NeutralSurfaceName | TintSurfaceName;

/** All fifteen surfaces a focus ring or a mark is measured on, in the guards' order. */
export function allSurfaces(neutral: Neutral, appearance: SurfaceAppearance, t: TintSteps, read: Read = asWritten): Record<SurfaceName, RGB> {
  return { ...neutralSurfaces(neutral, appearance, read), ...tintSurfaces(neutral, appearance, t, read) };
}
