/* =============================================================================
   _seededLane.ts — THE GENERATED-COLOUR LANE OF THE COLOUR SWEEPS
   -----------------------------------------------------------------------------
   Every sweep that loops over the 27 named accents also loops over a lane of
   seeded brands ([[seeded-brand-writer]]), so what the writer paints for a
   generated colour is held to the same floors as the named accents.

   `withColour(probe, colour)` takes a named accent or a seed. For a seed it
   writes what `Provider` writes, `customBrandProperties`, onto the probe and
   then sets `data-accent-color="ds-custom"`, in the order `Provider` uses. The
   values go on the probe, not the document root, so each probe resolves the
   status-family references under its own appearance, as
   `_seeded-brand-text.stories.tsx` does. The root-level defect
   [[seeded-brand-writer]] records is therefore not what these sweeps measure.

   THE REVERSE ARM. A lane that silently fell back to the base values would
   pass every floor the base values pass, so each seed, once applied, must read
   back as the seed on `--accent-9` and as the writer's filled button on
   `--accent-solid`. Either miss throws, naming the seed.

   The lane: the custom-accent census's named examples, a pale and a very dark
   colour, the two that move darker, the one that moves lighter and less
   saturated, two that pass as typed, and a green that moves lighter.
   ============================================================================= */
import { parseSeed } from "../palette/parseSeed";
import { analyseBrand, type BrandAnalysis } from "../palette/brandAnalysis";
import { semanticShiftDiagnostics } from "../palette/collision";
import type { SemFamily } from "../palette/collisionTable";
import { CUSTOM_ACCENT, customBrandProperties } from "../theme/customBrand";
import { ALL_ACCENTS, parseColor, resolveColor, withAccent } from "./_assert";

export const SEEDED_LANE = ["#fff59d", "#0b1a3a", "#3b82f6", "#ff6b5e", "#ff8c00", "#6e56cf", "#c8102e", "#00a86b"] as const;

/** Every colour a sweep covers: the 27 named accents, then the seeded lane. */
export const SWEEP_COLOURS: readonly string[] = [...ALL_ACCENTS, ...SEEDED_LANE];

export const isSeed = (colour: string): boolean => colour.startsWith("#");

type Seeded = { props: Record<string, string>; analysis: BrandAnalysis };
const cache = new Map<string, Seeded>();

function seeded(seed: string): Seeded {
  let s = cache.get(seed);
  if (!s) {
    const parsed = parseSeed(seed);
    if (!parsed.ok) throw new Error(`the seeded lane holds ${seed}, which the parser refuses: ${parsed.reason}`);
    s = { props: customBrandProperties(parsed.rgb), analysis: analyseBrand(parsed.rgb) };
    cache.set(seed, s);
  }
  return s;
}

/** The status family scales the generator chose for `seed`. */
export function seededFamilies(seed: string): Record<SemFamily, string> {
  return seeded(seed).analysis.statusFamilies;
}

/** The families the collision search reports it could not separate from `seed`
 *  ([[seeded-brand-collisions]]'s accepted degraded default). */
export function seededUnseparated(seed: string): SemFamily[] {
  return semanticShiftDiagnostics(seed);
}

const close = (a: string, b: string) => {
  const x = parseColor(a), y = parseColor(b);
  return Math.abs(x.r - y.r) <= 1 && Math.abs(x.g - y.g) <= 1 && Math.abs(x.b - y.b) <= 1;
};
const show = (c: { r: number; g: number; b: number }) => `rgb(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)})`;

/** Write `colour` onto `el`, a named accent or a seed, before or after `el` is in the document.
 *  A sweep that builds a fresh theme for each colour calls this before it appends the theme, so
 *  no transition starts, then `assertColourInForce` once it is appended. */
export function paintColour(el: HTMLElement, colour: string): void {
  if (!isSeed(colour)) {
    el.setAttribute("data-accent-color", colour);
    return;
  }
  // The values go on before the attribute, as `Provider` writes them.
  for (const [k, v] of Object.entries(seeded(colour).props)) el.style.setProperty(k, v);
  el.setAttribute("data-accent-color", CUSTOM_ACCENT);
}

/** The reverse arm: a seed on `el` must read back as the seed on `--accent-9` and as the writer's
 *  filled button on `--accent-solid`. A named accent needs no check. `el` must be in the document. */
export function assertColourInForce(el: HTMLElement, colour: string): void {
  if (!isSeed(colour)) return;
  const { props } = seeded(colour);
  const nine = resolveColor(el, "--accent-9");
  const solid = resolveColor(el, "--accent-solid");
  const fills = [props["--ds-brand-solid"]!, props["--ds-brand-dark-solid"]!];
  if (!close(show(nine), colour) || !fills.some((f) => close(show(solid), f))) {
    throw new Error(
      `REVERSE: the seeded lane did not take on ${colour}: --accent-9 reads ${show(nine)} and --accent-solid ${show(solid)}, ` +
        `expected the seed and one of ${fills.join(" or ")} ([[seeded-brand-writer]]). Every reading of this seed would be measuring something else.`,
    );
  }
}

/** Put `colour` on `probe`, a probe already in the document, and return the restore. */
export function withColour(probe: HTMLElement, colour: string): () => void {
  if (!isSeed(colour)) return withAccent(probe, colour);
  const { props } = seeded(colour);
  const prev = probe.getAttribute("data-accent-color");
  paintColour(probe, colour);
  const restore = () => {
    for (const k of Object.keys(props)) probe.style.removeProperty(k);
    if (prev == null) probe.removeAttribute("data-accent-color");
    else probe.setAttribute("data-accent-color", prev);
  };
  try {
    assertColourInForce(probe, colour);
  } catch (e) {
    restore();
    throw e;
  }
  return restore;
}
