/* =============================================================================
   customBrand.ts — writing a generated brand onto the document root
   -----------------------------------------------------------------------------
   The only place that touches `document.documentElement.style` for the colour
   feature. Kept out of `Provider.tsx` so the write, its ordering rules and its
   cleanup live together and can be reasoned about in one screen.
   ============================================================================= */
import { analyseBrand, type AppearanceAnalysis, type BrandAnalysis, type LayerName } from "../palette/brandAnalysis";
import { generateBrand, type Appearance, type BrandScale } from "../palette/generate";
import { BLACK_A, WHITE_A, type LayerStep } from "../palette/helperLayers";
import { parseSeed, type ParseResult } from "../palette/parseSeed";
import type { RGB } from "../palette/oklch";
import { apcaLc } from "../palette/apca";
import { LIGHT_TARGET_SCALES, DARK_ON_SOLID, SCALE_STEP_9, type SemFamily } from "../palette/collisionTable";
import { INKS, parseColour, type InkName } from "../palette/surfaces";

/** The attribute value the static block in `tokens/custom-brand.css` keys on. */
export const CUSTOM_ACCENT = "ds-custom";

/** A brand supplied as a colour value rather than chosen from the named scales. */
export interface CustomBrand {
  /** A solid colour: `#rgb`, `#rrggbb`, `rgb()`, `hsl()`, or an in-gamut `oklch()`. */
  seed: string;
}

export const isCustomBrand = (v: unknown): v is CustomBrand =>
  typeof v === "object" && v !== null && typeof (v as CustomBrand).seed === "string";

/** The four semantic families, in the order the shift properties are emitted. */
const SEM_FAMILIES: SemFamily[] = ["error", "warning", "success", "info"];

/* THE KEY LIST ([[seeded-brand-writer]]). Every property this module writes comes from one of the
   tables below, and so does the cleanup list, so a property added to the writer cannot be left
   behind on the root. Each value is a LITERAL colour. A `var()` written on the document root is
   resolved there, under the root's appearance, so `var(--accent-7)` would not resolve at all and
   `var(--red-3)` would paint its light value inside a dark theme. */

/** The helper layer each per-appearance property paints, as `custom-brand.css` routes it. */
const LAYER_KEYS: Record<LayerName, string> = {
  ringStack: "ring-stack",
  darkScrimStack: "ring-stack-scrim",
  lightScrimStack: "ring-stack-scrim-light",
  partEdge: "part-edge",
  thumbStroke: "thumb-stroke",
  markEdge: "mark-edge",
  dashStack: "dash-stack",
  sliderThumbStack: "slider-thumb-stack",
  warningDotEdge: "warning-dot-edge",
  successDotEdge: "success-dot-edge",
  errorDotEdge: "error-dot-edge",
};

/** Where a search finds no step, the layer takes the heaviest step of its own scale, the nearest it
 *  comes to visible. No seed measured reaches this: the assessment names such a part instead. */
function heaviest(layer: LayerName, appearance: Appearance): LayerStep {
  if (layer === "thumbStroke") return "accent-12";
  if (layer === "darkScrimStack") return "white-a12";
  if (layer === "lightScrimStack" || layer === "sliderThumbStack") return "black-a12";
  return appearance === "light" ? "black-a12" : "white-a12";
}

/** The colour a layer step paints, from the appearance's own scale. */
function paint(step: LayerStep, scale: BrandScale): string {
  if (step === "none") return "rgba(0, 0, 0, 0)";
  const m = /^(black-a|white-a|accent-a|accent-)(\d+)$/.exec(step);
  if (!m) throw new Error(`customBrand: no paint for the layer step ${step}`);
  const i = Number(m[2]) - 1;
  const table = { "black-a": BLACK_A, "white-a": WHITE_A, "accent-a": scale.alpha, "accent-": scale.solid }[m[1]!]!;
  const value = table[i];
  if (value === undefined) throw new Error(`customBrand: the layer step ${step} is outside its scale`);
  return value;
}

type Source = { scale: BrandScale; analysis: AppearanceAnalysis; appearance: Appearance };

/** The per-appearance properties, written as `--ds-brand-<key>` and `--ds-brand-dark-<key>`. */
const PER_APPEARANCE: Record<string, (s: Source) => string> = {
  ...Object.fromEntries(Array.from({ length: 12 }, (_, i) => [
    [`${i + 1}`, (s: Source) => s.scale.solid[i]!],
    [`a${i + 1}`, (s: Source) => s.scale.alpha[i]!],
  ]).flat()),
  contrast: (s) => s.scale.contrast,
  surface: (s) => s.scale.surface,
  indicator: (s) => s.scale.indicator,
  track: (s) => s.scale.track,
  // The filled button: the generator's fill, the seed itself wherever question 2 passes on it, and
  // the ink question 2 chose ([[generated-button-fill]]).
  solid: (s) => s.analysis.button.fill,
  "on-solid": (s) => INKS[s.analysis.button.label.ink],
  // The hover overlay question 2 measured the button under: `--black-a2` under the white label and
  // `--white-a4` under the dark one, so the overlay lightens the fill away from a dark label, as
  // semantic.css does for the named accents with a dark label.
  hover: (s) => (s.analysis.button.label.ink === "white" ? BLACK_A[1]! : WHITE_A[3]!),
  ...Object.fromEntries((Object.entries(LAYER_KEYS) as [LayerName, string][]).map(([layer, key]) => [
    key, (s: Source) => paint(s.analysis.layers[layer] ?? heaviest(layer, s.appearance), s.scale),
  ])),
};

/** The properties written once for both appearances. */
const SHARED: Record<string, (a: BrandAnalysis) => string> = {
  // The ruled fill of the error family the generator chose. It is a literal, the same in both
  // appearances, as `theme.css` pins it for the named accents.
  "--ds-brand-error-solid": (a) => a.light.error.fill,
  // The APCA contrast mode's glyph ink on step 9. `contrast.css` reads it in light only, as it
  // overrides every named accent's glyph ink in light only.
  "--ds-brand-apca-contrast": (a) => INKS[a.light.glyphInk],
  // The APCA mode's ink on each status family's step 9, the higher Lc of the two, as `contrast.css`
  // flips the shifted warning for the named accents. Light only, for the same reason.
  ...Object.fromEntries(SEM_FAMILIES.map((f) => [`--ds-brand-apca-${f}-contrast`, (a: BrandAnalysis) => INKS[apcaInk(a.statusFamilies[f]!)]])),
};

/** The ink with the higher APCA Lc on a scale's light step 9. */
function apcaInk(scale: string): InkName {
  const nine = SCALE_STEP_9[scale];
  if (!nine) throw new Error(`customBrand: no step 9 recorded for the scale ${scale}`);
  const bg = parseColour(nine);
  const lc = (ink: InkName) => { const c = parseColour(INKS[ink]); return Math.abs(apcaLc([c.r, c.g, c.b], [bg.r, bg.g, bg.b])); };
  return lc("white") >= lc("nearBlack") ? "white" : "nearBlack";
}

const PREFIX: Record<Appearance, string> = { light: "--ds-brand", dark: "--ds-brand-dark" };

/** Every property name this module writes: the cleanup list, read off the same tables the writer
 *  uses. */
export function customBrandPropertyNames(): string[] {
  const names: string[] = [];
  for (const prefix of Object.values(PREFIX)) for (const key of Object.keys(PER_APPEARANCE)) names.push(`${prefix}-${key}`);
  names.push(...Object.keys(SHARED));
  for (const f of SEM_FAMILIES) {
    for (let i = 1; i <= 12; i++) names.push(`--ds-brand-${f}-${i}`, `--ds-brand-${f}-a${i}`);
    names.push(`--ds-brand-${f}-contrast`);
  }
  return names;
}

/**
 * The semantic shift for a seeded brand, as CSS custom properties, from the scale each family
 * uses (`BrandAnalysis.statusFamilies`, the generator's one choice for the seed and every shade
 * its button paints).
 *
 * They are `var()` references because the choice is a scale NAME, "error goes to oxblood", and
 * the vendor already ships every scale. A reference resolves where it is written, on the document
 * root, so in a theme whose appearance differs from the root's the family tints paint the root's
 * appearance, a defect [[seeded-brand-writer]] records and does not fix.
 *
 * The one literal is the on-solid foreground. A family routed to a pale scale takes the dark ink:
 * white on `orange-9` measures 2.97:1, so `theme.css` already flips it for every warning->orange
 * and success->lime block.
 */
export function semanticShiftProperties(families: Record<SemFamily, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const family of SEM_FAMILIES) {
    const scale = families[family];
    for (let i = 1; i <= 12; i++) {
      out[`--ds-brand-${family}-${i}`] = `var(--${scale}-${i})`;
      out[`--ds-brand-${family}-a${i}`] = `var(--${scale}-a${i})`;
    }
    out[`--ds-brand-${family}-contrast`] = LIGHT_TARGET_SCALES.has(scale) ? DARK_ON_SOLID : "#fff";
  }
  return out;
}

/** Build the full property map for a parsed seed. Pure — no DOM. */
export function customBrandProperties(seed: RGB): Record<string, string> {
  const scales = generateBrand(seed);
  const analysis = analyseBrand(seed);
  const out: Record<string, string> = {};
  for (const appearance of ["light", "dark"] as const) {
    const source: Source = { scale: scales[appearance], analysis: analysis[appearance], appearance };
    for (const [key, value] of Object.entries(PER_APPEARANCE)) out[`${PREFIX[appearance]}-${key}`] = value(source);
  }
  for (const [name, value] of Object.entries(SHARED)) out[name] = value(analysis);
  // The semantic shift ships in the SAME map, because this is the function `Provider` calls.
  Object.assign(out, semanticShiftProperties(analysis.statusFamilies));
  return out;
}

/**
 * Write a generated brand to the document root, or report why not.
 *
 * ORDERING IS THE POINT. The properties go on FIRST and the attribute second,
 * because `--accent-9` is declared in no vendor rule outside a
 * `[data-accent-color=…]` block: an attribute set before its values resolve
 * paints a partly-invisible page (backgrounds transparent, text inherited)
 * rather than an obviously broken one.
 *
 * Returns the parse result so the caller can render a refusal rather than
 * discovering it in a console nobody has open.
 */
export function applyCustomBrand(root: HTMLElement, seedInput: string): ParseResult {
  const parsed = parseSeed(seedInput);
  if (!parsed.ok) return parsed;
  const props = customBrandProperties(parsed.rgb);
  for (const [k, v] of Object.entries(props)) root.style.setProperty(k, v);
  return parsed;
}

/** Remove every property this module writes. A story that swaps the brand for a
 *  preview owns cleaning up after itself — stale properties on the document root
 *  outlive the page that set them. */
export function clearCustomBrand(root: HTMLElement): void {
  for (const name of customBrandPropertyNames()) root.style.removeProperty(name);
}

/* Every seeded `Provider` writes to the same page root, so the root keeps a stack of the brands written to it
   ([[nested-brand-ownership]]). The last brand held is the one on the root, which is the order the writes landed
   in before the stack existed. */
const held = new WeakMap<HTMLElement, { props: Record<string, string> }[]>();

const writeBrand = (root: HTMLElement, props: Record<string, string>) => {
  for (const [k, v] of Object.entries(props)) root.style.setProperty(k, v);
};

/**
 * Write a brand on the root for as long as the caller holds it, and return the release. A release removes only
 * the caller's own brand: when it was on the root, the brand held before it goes back on, and the properties are
 * cleared only when no brand is held. A Provider with no seed holds nothing, so it never clears another
 * Provider's brand.
 */
export function holdCustomBrand(root: HTMLElement, props: Record<string, string>): () => void {
  const stack = held.get(root) ?? [];
  held.set(root, stack);
  const entry = { props };
  stack.push(entry);
  writeBrand(root, props);
  return () => {
    const i = stack.indexOf(entry);
    if (i < 0) return;
    stack.splice(i, 1);
    if (i !== stack.length) return;
    const next = stack[stack.length - 1];
    if (next) writeBrand(root, next.props);
    else clearCustomBrand(root);
  };
}
