/* =============================================================================
   brandAnalysis.ts — WHAT ONE SEED BECOMES, MEASURED, IN BOTH APPEARANCES
   -----------------------------------------------------------------------------
   `analyseBrand` is the generator's full answer for a seed ([[generated-button-fill]]):
   for each appearance, the fill its filled buttons paint and why, the ink on
   it, the glyph ink the APCA contrast mode uses, how step 9 reads against the
   page, how its text steps did, and the error fill. Across both appearances,
   the status families, chosen once for every brand colour the seed paints.

   It only measures. Nothing here changes what `Provider` writes today: the
   writer adopts these values in a later change, and the custom-accent
   assessment reads them to word its verdict. The two interfaces are fixed
   here so those changes build on one shape:

     BrandAnalysis     what this module returns now.
     BrandAssessment   what the assessment publishes: the analysis plus its
                       verdict, each part's own shade and the text that missed.
                       Declared here, produced later.

   Pure arithmetic. No DOM.
   ============================================================================= */
import { APCA_ALGORITHM, apcaLc } from "./apca";
import { type ButtonFill, type Direction, type LabelOnFill, labelOnFill, searchFill } from "./buttonFill";
import { chooseSemanticScalesFor } from "./collision";
import { SCALE_ALPHA_3, SCALE_STEP_9, type SemFamily } from "./collisionTable";
import { partEdge, ringStack, scrimStack, thumbStroke, type LayerStep } from "./helperLayers";
import { dashStack, dotEdge, markEdge, ownShade, sliderThumbStack } from "./markLayers";
import { contrastRatio, generateBrandScale, type Appearance } from "./generate";
import type { RGB } from "./oklch";
import { FLOORS, INKS, NEUTRALS, NEUTRAL_STEPS, parseColour, type InkName, type Neutral, type TintSteps } from "./surfaces";

/** How step 9 reads against the page, worst case over the six neutrals (question 1a). A miss
 *  keeps the colour: the part edge and the focus-ring stack make it visible. */
export interface PageReading {
  ratio: number;
  /** The weakest |Lc| of step 9 against a page. */
  lc: number;
  passes: boolean;
  /** The neutral each worst value came from. */
  worstRatioOn: Neutral;
  worstLcOn: Neutral;
}

/** The text steps (question 3). A miss is reported and changes nothing. */
export interface TextReading {
  /** Step 11 reached its floor on the soft fill as it paints. */
  elevenMet: boolean;
  /** Step 12 reached 7:1 against step 3. */
  twelveMet: boolean;
  /** Step 11 against step 3, the solid pair. */
  elevenOnStep3: number;
  /** Step 12 against step 3. */
  twelveOnStep3: number;
  /** Step 11 against the page, worst over the six neutrals, the pairing the named accents'
   *  link-text guard holds at 4.39:1. */
  linkOnPage: number;
  /** Steps 11 and 12 differ, so strong text and link text can be told apart. */
  distinct: boolean;
}

/** The fill a destructive button paints under this brand: the ruled fill of the error family the
 *  collision search chose, with white on it ([[text-on-solid-fill-contrast]]). */
export interface ErrorFill {
  family: string;
  fill: string;
  ink: InkName;
  label: LabelOnFill;
}

/** The helper layers a generated brand carries, each the step its ruling's search picks
 *  ([[generated-helper-layers]]). Null where no step makes the part visible: that part then has
 *  its own shade in `partShades`. */
export interface HelperLayers {
  ringStack: LayerStep | null;
  darkScrimStack: LayerStep | null;
  lightScrimStack: LayerStep | null;
  partEdge: LayerStep | null;
  thumbStroke: LayerStep | null;
  markEdge: LayerStep | null;
  dashStack: LayerStep | null;
  sliderThumbStack: LayerStep | null;
  warningDotEdge: LayerStep | null;
  successDotEdge: LayerStep | null;
  errorDotEdge: LayerStep | null;
}
export type LayerName = keyof HelperLayers;

export interface AppearanceAnalysis {
  /** Step 9, the seed as typed. Every part but the filled button paints it. */
  step9: string;
  /** The filled button: its fill, whether and how it was adjusted, and question 2 on it. */
  button: ButtonFill;
  /** The ink a glyph on step 9 takes under the APCA contrast mode: the higher |Lc| of the two. */
  glyphInk: InkName;
  page: PageReading;
  text: TextReading;
  error: ErrorFill;
  layers: HelperLayers;
  /** The parts no helper layer could make visible, each with its own shade. Empty on every seed
   *  the custom-accent census measured. */
  partShades: PartShade[];
}

export interface BrandAnalysis {
  /** The seed as six-digit hex. */
  seed: string;
  /** The APCA base algorithm every Lc here was measured with. */
  apca: string;
  /** The scale each status family uses, chosen once for the seed and every adjusted shade. */
  statusFamilies: Record<SemFamily, string>;
  light: AppearanceAnalysis;
  dark: AppearanceAnalysis;
}

/* --- the published shape, produced by the assessment later ----------------- */

/** One clause of a verdict, as data. The assessment words it; this is what it says. */
export type VerdictClause =
  | { kind: "as-is" }
  | { kind: "shade"; direction: Direction; lessSaturated: boolean }
  | { kind: "part-shade"; part: string }
  | { kind: "text-miss"; text: "link" | "strong" | "link-and-strong-identical"; floor: number | null };

/** A part no helper layer could make visible, and the shade it takes instead. */
export interface PartShade {
  part: LayerName;
  fill: string;
  direction: Direction;
}

export interface AppearanceAssessment extends AppearanceAnalysis {
  verdict: VerdictClause[];
  /** "as is", "darker shade", "lighter shade", with ", less saturated" where the clamp moved
   *  chroma, or "as is, <part> adjusted". */
  shortVerdict: string;
}

export interface BrandAssessment extends Omit<BrandAnalysis, "light" | "dark"> {
  light: AppearanceAssessment;
  dark: AppearanceAssessment;
  /** The long verdict, one sentence per clause, each said once for both appearances where they
   *  agree, the filled-button sentence first. "Works as is." alone when there is nothing to say. */
  words: string[];
}

/* --- the analysis ------------------------------------------------------------- */

/** The ruled error fill of each family the error search may choose, as `theme.css` pins it:
 *  red and ruby at their light step 11, where white on step 9 misses 4.5:1, and oxblood at its
 *  step 9, which passes. `brand-analysis.node-check.ts` reads them back out of `theme.css`. */
export const ERROR_FILL: Readonly<Record<string, string>> = {
  red: "#ce2c31",
  ruby: "#ca244d",
  oxblood: SCALE_STEP_9.oxblood!,
};

const toHex = (c: RGB) => `#${[c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
const bytes = (c: RGB): [number, number, number] => [c.r, c.g, c.b];

/** How `fill` reads against the page, worst over the six neutrals: question 1a. */
export function pageReading(step9: RGB, appearance: Appearance): PageReading {
  let ratio = Infinity, lc = Infinity;
  let worstRatioOn: Neutral = NEUTRALS[0], worstLcOn: Neutral = NEUTRALS[0];
  for (const neutral of NEUTRALS) {
    const page = parseColour(NEUTRAL_STEPS[neutral][appearance].s1);
    const r = contrastRatio(step9, page);
    const l = Math.abs(apcaLc(bytes(step9), bytes(page)));
    if (r < ratio) { ratio = r; worstRatioOn = neutral; }
    if (l < lc) { lc = l; worstLcOn = neutral; }
  }
  return { ratio, lc, passes: ratio >= FLOORS.nonText.wcag && lc >= FLOORS.nonText.lc, worstRatioOn, worstLcOn };
}

function glyphInk(step9: RGB): InkName {
  const lcOf = (ink: InkName) => Math.abs(apcaLc(bytes(parseColour(INKS[ink])), bytes(step9)));
  return lcOf("white") >= lcOf("nearBlack") ? "white" : "nearBlack";
}

function errorFill(family: string, appearance: Appearance): ErrorFill {
  const fill = ERROR_FILL[family];
  if (!fill) throw new Error(`brandAnalysis: no ruled error fill for the family ${family}`);
  return { family, fill, ink: "white", label: labelOnFill(parseColour(fill), appearance) };
}

function textReading(solid: readonly string[], floors: { eleven: boolean; twelve: boolean }, appearance: Appearance): TextReading {
  const s3 = parseColour(solid[2]!), s11 = parseColour(solid[10]!), s12 = parseColour(solid[11]!);
  let linkOnPage = Infinity;
  for (const neutral of NEUTRALS) {
    linkOnPage = Math.min(linkOnPage, contrastRatio(s11, parseColour(NEUTRAL_STEPS[neutral][appearance].s1)));
  }
  return {
    elevenMet: floors.eleven,
    twelveMet: floors.twelve,
    elevenOnStep3: contrastRatio(s11, s3),
    twelveOnStep3: contrastRatio(s12, s3),
    linkOnPage,
    distinct: solid[10] !== solid[11],
  };
}

/** Everything the generator decides and measures for `seed`. */
export function analyseBrand(seed: RGB): BrandAnalysis {
  const buttons = { light: searchFill(seed, "light"), dark: searchFill(seed, "dark") };
  const brandColours: RGB[] = [seed];
  for (const b of Object.values(buttons)) if (b.adjusted) brandColours.push(parseColour(b.fill));
  const statusFamilies = chooseSemanticScalesFor(brandColours);
  // The scrim stacks depend on the button's fill alone, not the appearance, and both appearances
  // usually share one fill, so each fill's pair is searched once per analysis.
  const scrims = new Map<string, { dark: LayerStep | null; light: LayerStep | null }>();

  const per = (appearance: Appearance): AppearanceAnalysis => {
    const scale = generateBrandScale(seed, appearance);
    const step9 = parseColour(scale.solid[8]!);
    const error = errorFill(statusFamilies.error, appearance);
    const { layers, partShades } = helperLayers(scale.solid, scale.alpha, parseColour(buttons[appearance].fill), statusFamilies, error.fill, appearance, scrims);
    return {
      step9: scale.solid[8]!,
      button: buttons[appearance],
      glyphInk: glyphInk(step9),
      page: pageReading(step9, appearance),
      text: textReading(scale.solid, scale.textFloors, appearance),
      error,
      layers,
      partShades,
    };
  };
  return { seed: toHex(seed), apca: APCA_ALGORITHM, statusFamilies, light: per("light"), dark: per("dark") };
}

/** Every helper layer for one appearance of a generated brand, and the own shade of any part no
 *  layer can make visible. The ring sits on the button's fill, which is the adjusted shade where
 *  question 2 moved it ([[focus-ring]]); every other part paints step 9. */
function helperLayers(
  solid: readonly string[], alpha: readonly string[], buttonFill: RGB,
  families: Record<SemFamily, string>, errorFillHex: string, appearance: Appearance,
  scrims: Map<string, { dark: LayerStep | null; light: LayerStep | null }>,
): { layers: HelperLayers; partShades: PartShade[] } {
  const fillKey = `${buttonFill.r},${buttonFill.g},${buttonFill.b}`;
  if (!scrims.has(fillKey)) scrims.set(fillKey, { dark: scrimStack(buttonFill, "dark"), light: scrimStack(buttonFill, "light") });
  const scrimPair = scrims.get(fillKey)!;
  const step9 = parseColour(solid[8]!);
  const a3 = (f: SemFamily) => SCALE_ALPHA_3[families[f]]![appearance];
  const tints: TintSteps = {
    accentA3: alpha[2]!, accentA5: alpha[4]!,
    errorA3: a3("error"), warningA3: a3("warning"), successA3: a3("success"), infoA3: a3("info"),
  };
  // Each search, as a function of the fill it stacks on, so a part it cannot fix can be re-run on
  // a shade of that fill.
  const searches: Record<LayerName, { on: RGB; run: (fill: RGB) => LayerStep | null }> = {
    ringStack: { on: buttonFill, run: (f) => ringStack(f, appearance, tints) },
    darkScrimStack: { on: buttonFill, run: (f) => (f === buttonFill ? scrimPair.dark : scrimStack(f, "dark")) },
    lightScrimStack: { on: buttonFill, run: (f) => (f === buttonFill ? scrimPair.light : scrimStack(f, "light")) },
    partEdge: { on: step9, run: (f) => partEdge(f, appearance) },
    thumbStroke: { on: step9, run: (f) => thumbStroke(solid, alpha, f) },
    markEdge: { on: step9, run: (f) => markEdge(f, appearance, tints.accentA3, tints.accentA5) },
    dashStack: { on: parseColour(solid[6]!), run: (f) => dashStack(f, appearance, tints.accentA3) },
    sliderThumbStack: { on: step9, run: (f) => sliderThumbStack(f, appearance) },
    warningDotEdge: { on: parseColour(SCALE_STEP_9[families.warning]!), run: (f) => dotEdge(f, appearance) },
    successDotEdge: { on: parseColour(SCALE_STEP_9[families.success]!), run: (f) => dotEdge(f, appearance) },
    errorDotEdge: { on: parseColour(errorFillHex), run: (f) => dotEdge(f, appearance) },
  };
  const layers = {} as HelperLayers;
  const partShades: PartShade[] = [];
  for (const name of Object.keys(searches) as LayerName[]) {
    const { on, run } = searches[name];
    const step = run(on);
    layers[name] = step;
    if (step === null) {
      const shade = ownShade(on, (c) => run(c) !== null);
      if (shade) partShades.push({ part: name, ...shade });
    }
  }
  return { layers, partShades };
}
