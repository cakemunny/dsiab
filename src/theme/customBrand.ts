/* =============================================================================
   customBrand.ts — writing a generated brand onto the document root
   -----------------------------------------------------------------------------
   The only place that touches `document.documentElement.style` for the colour
   feature. Kept out of `Provider.tsx` so the write, its ordering rules and its
   cleanup live together and can be reasoned about in one screen.
   ============================================================================= */
import { generateBrand } from "../palette/generate";
import { parseSeed, type ParseResult } from "../palette/parseSeed";
import type { RGB } from "../palette/oklch";
import { chooseSemanticScales } from "../palette/collision";
import { LIGHT_TARGET_SCALES, DARK_ON_SOLID, type SemFamily } from "../palette/collisionTable";

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

/** Every property name this module writes — the cleanup list, derived rather
 *  than typed twice, so a token added to the scale cannot be left behind. */
export function customBrandPropertyNames(): string[] {
  const names: string[] = [];
  for (const prefix of ["--ds-brand", "--ds-brand-dark"]) {
    for (let i = 1; i <= 12; i++) names.push(`${prefix}-${i}`, `${prefix}-a${i}`);
    for (const k of ["contrast", "surface", "indicator", "track"]) names.push(`${prefix}-${k}`);
  }
  for (const f of SEM_FAMILIES) {
    for (let i = 1; i <= 12; i++) names.push(`--ds-brand-${f}-${i}`, `--ds-brand-${f}-a${i}`);
    names.push(`--ds-brand-${f}-contrast`);
  }
  return names;
}

/**
 * The semantic shift for a seeded brand, as CSS custom properties.
 *
 * WHY THESE ARE `var()` REFERENCES, NOT COLOUR VALUES. The chooser returns a
 * scale NAME — "error goes to oxblood" — and the vendor already ships every
 * scale in both appearances. Emitting `var(--oxblood-9)` rather than a resolved
 * hex means the dark-mode value comes from the same place the named blocks get
 * theirs, so this path needs no light/dark arm of its own. That is the whole
 * reason `theme.css` writes its twenty blocks as references too.
 *
 * The one literal is the on-solid foreground. A family routed to a pale scale
 * takes the dark ink: white on `orange-9` measures 2.97:1 against a 3.0 gate, so
 * `theme.css` already flips it for every warning->orange and success->lime block.
 * A shift that moved the fill and left the foreground would pass a colour-
 * separation check and still be unreadable.
 */
export function semanticShiftProperties(seed: RGB): Record<string, string> {
  const chosen = chooseSemanticScales(seed);
  const out: Record<string, string> = {};
  for (const family of SEM_FAMILIES) {
    const scale = chosen[family];
    for (let i = 1; i <= 12; i++) {
      out[`--ds-brand-${family}-${i}`] = `var(--${scale}-${i})`;
      out[`--ds-brand-${family}-a${i}`] = `var(--${scale}-a${i})`;
    }
    out[`--ds-brand-${family}-contrast`] =
      LIGHT_TARGET_SCALES.has(scale) ? DARK_ON_SOLID : "#fff";
  }
  return out;
}

/** Build the full property map for a parsed seed. Pure — no DOM. */
export function customBrandProperties(seed: RGB): Record<string, string> {
  const { light, dark } = generateBrand(seed);
  const out: Record<string, string> = {};
  const put = (prefix: string, s: typeof light) => {
    s.solid.forEach((v, i) => (out[`${prefix}-${i + 1}`] = v));
    s.alpha.forEach((v, i) => (out[`${prefix}-a${i + 1}`] = v));
    out[`${prefix}-contrast`] = s.contrast;
    out[`${prefix}-surface`] = s.surface;
    out[`${prefix}-indicator`] = s.indicator;
    out[`${prefix}-track`] = s.track;
  };
  put("--ds-brand", light);
  put("--ds-brand-dark", dark);
  // The semantic shift ships in the SAME map, because this is the function
  // `Provider` calls (`Provider.tsx:88`). Putting it anywhere else — including in
  // `applyCustomBrand` below, which `Provider` never touches — leaves the live
  // path with an accent ramp and no shift, which is the defect being closed.
  Object.assign(out, semanticShiftProperties(seed));
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
