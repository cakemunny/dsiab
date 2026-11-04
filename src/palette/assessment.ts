/* =============================================================================
   assessment.ts — WHAT A BRAND COLOUR DOES TO THE SYSTEM, IN WORDS
   -----------------------------------------------------------------------------
   `assessBrand` takes the colour someone typed and says what the system will
   do with it ([[brand-assessment]]): for each appearance, whether filled
   buttons and focus rings use it as typed or a darker or lighter shade, which
   part, if any, takes a shade of its own, and which text step missed its
   floor. A colour the parser refuses comes back with the parser's reason.

   It is a pure reading of `analyseBrand`. It runs no search of its own, so the
   shade it reports is the shade the generator found, and the two cannot
   disagree. `assessAnalysis` is that reading on its own, for a caller that
   already holds an analysis.

   THE WORDS are Jason's answer M, and every caller (the docs toolbar, the
   Customize page, a consumer's settings screen) shows these and no others:

     long, per appearance   "Filled buttons and focus rings use your colour as
                            is in light mode." / "... use a darker shade ..." /
                            "... a lighter, less saturated shade ..."
     both, nothing to say   "Works as is."
     short, per appearance  "as is", "darker shade", "lighter shade", with
                            ", less saturated", or "as is, switch thumbs
                            adjusted".
     a text miss            "Strong text and link text in dark mode are the
                            same colour. Your colour is applied as typed."

   Helper layers are never named, because the named accents carry them silently
   too. A miss on question 1a is not named either: the part edge and the ring
   stack already fix it.

   Pure. No DOM.
   ============================================================================= */
import {
  analyseBrand, type AppearanceAnalysis, type AppearanceAssessment, type BrandAnalysis, type BrandAssessment,
  type LayerName, type VerdictClause,
} from "./brandAnalysis";
import type { Appearance } from "./generate";
import { parseSeed } from "./parseSeed";
import { FLOORS } from "./surfaces";

/** The chroma a shade must lose before the words call it less saturated. Rounding the painted hex
 *  alone moves chroma by about 0.0001, which is not a change anyone can see, so the clause needs a
 *  threshold well above that. 2% of the seed's chroma is the smallest loss the census measured
 *  from the gamut clamp itself. */
export const LESS_SATURATED = 0.02;

export type AssessmentResult = { ok: true; assessment: BrandAssessment } | { ok: false; reason: string };

/** What the system does with `input`, a colour as a person typed it. */
export function assessBrand(input: unknown): AssessmentResult {
  const parsed = parseSeed(input);
  if (!parsed.ok) return { ok: false, reason: parsed.reason };
  return { ok: true, assessment: assessAnalysis(analyseBrand(parsed.rgb)) };
}

/** Each part a shade of its own can land on, as the words name it. */
const PART_NAMES: Record<LayerName, string> = {
  ringStack: "focus rings",
  darkScrimStack: "focus rings on a dark scrim",
  lightScrimStack: "focus rings on a light scrim",
  partEdge: "checkboxes, radios and switches",
  thumbStroke: "switch thumbs",
  markEdge: "calendar and outline marks",
  dashStack: "drop targets",
  sliderThumbStack: "slider thumbs",
  warningDotEdge: "warning dots",
  successDotEdge: "success dots",
  errorDotEdge: "error dots",
};

/** The clauses one appearance's analysis amounts to, in the order the words give them. */
function clausesFor(a: AppearanceAnalysis): VerdictClause[] {
  const clauses: VerdictClause[] = [];
  const b = a.button;
  clauses.push(b.adjusted && b.direction
    ? { kind: "shade", direction: b.direction, lessSaturated: b.chromaLost >= LESS_SATURATED }
    : { kind: "as-is" });
  for (const shade of a.partShades) clauses.push({ kind: "part-shade", part: PART_NAMES[shade.part] });
  if (!a.text.distinct) clauses.push({ kind: "text-miss", text: "link-and-strong-identical", floor: null });
  else {
    if (!a.text.elevenMet) clauses.push({ kind: "text-miss", text: "link", floor: FLOORS.text.wcag });
    if (!a.text.twelveMet) clauses.push({ kind: "text-miss", text: "strong", floor: FLOORS.strongText.wcag });
  }
  return clauses;
}

/** The toolbar's few words for one appearance. */
function shortVerdict(clauses: readonly VerdictClause[]): string {
  const button = clauses[0]!;
  const head = button.kind === "shade"
    ? `${button.direction} shade${button.lessSaturated ? ", less saturated" : ""}`
    : "as is";
  const parts = clauses.flatMap((c) => (c.kind === "part-shade" ? [c.part] : []));
  return parts.length ? `${head}, ${listOf(parts)} adjusted` : head;
}

function listOf(items: readonly string[]): string {
  return items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

const MODE: Record<Appearance, string> = { light: "in light mode", dark: "in dark mode" };
const BOTH = "in light mode and in dark mode";
const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The words for one clause, without the appearance. */
function phrase(c: VerdictClause): string {
  switch (c.kind) {
    case "as-is":
      return "Filled buttons and focus rings use your colour as is";
    case "shade":
      return `Filled buttons and focus rings use a ${c.direction}${c.lessSaturated ? ", less saturated" : ""} shade`;
    case "part-shade":
      return `${capitalise(c.part)} use a shade of their own`;
    case "text-miss":
      return c.text === "link-and-strong-identical" ? "Strong text and link text are the same colour"
        : c.text === "link" ? `Link text reads under ${c.floor}:1 on its tint`
        : `Strong text reads under ${c.floor}:1 on its tint`;
  }
}

/** One sentence for a phrase, said once for both appearances when they agree. */
function sentence(c: VerdictClause, where: string): string {
  const p = phrase(c);
  if (c.kind !== "text-miss") return `${p} ${where}.`;
  // A text miss names the appearance inside the sentence, then says the colour still applies.
  const [subject, rest] = p.startsWith("Strong text and link text")
    ? ["Strong text and link text", p.slice("Strong text and link text".length)]
    : p.startsWith("Link text") ? ["Link text", p.slice("Link text".length)] : ["Strong text", p.slice("Strong text".length)];
  return `${subject} ${where}${rest}. Your colour is applied as typed.`;
}

const key = (c: VerdictClause) => JSON.stringify(c);

/** The long verdict: every clause of both appearances, each said once, the button first. */
function longVerdict(light: readonly VerdictClause[], dark: readonly VerdictClause[]): string[] {
  const nothing = (cs: readonly VerdictClause[]) => cs.length === 1 && cs[0]!.kind === "as-is";
  if (nothing(light) && nothing(dark)) return ["Works as is."];
  const out: string[] = [];
  const darkKeys = new Set(dark.map(key));
  const lightKeys = new Set(light.map(key));
  for (const c of light) out.push(sentence(c, darkKeys.has(key(c)) ? BOTH : MODE.light));
  for (const c of dark) if (!lightKeys.has(key(c))) out.push(sentence(c, MODE.dark));
  // The button sentence leads, whichever appearance it came from.
  return out.sort((a, b) => Number(!a.startsWith("Filled buttons")) - Number(!b.startsWith("Filled buttons")));
}

/** The assessment of an analysis the generator already returned. */
export function assessAnalysis(analysis: BrandAnalysis): BrandAssessment {
  const light = clausesFor(analysis.light);
  const dark = clausesFor(analysis.dark);
  const per = (a: AppearanceAnalysis, clauses: VerdictClause[]): AppearanceAssessment => ({
    ...a, verdict: clauses, shortVerdict: shortVerdict(clauses),
  });
  return {
    ...analysis,
    light: per(analysis.light, light),
    dark: per(analysis.dark, dark),
    words: longVerdict(light, dark),
  };
}
