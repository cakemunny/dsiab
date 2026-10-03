/* =============================================================================
   wcag-citation.node-check.ts — A CITED CRITERION NUMBER MATCHES ITS NAME
   -----------------------------------------------------------------------------
   WHY THIS EXISTS. The ledger's first focus-ring contrast entry, the earlier
   deferral of the two-tone ring, wrote "Focus-appearance (2.4.11)" for the
   neutral focus ring, `GUIDELINES.md` §9 copied the pairing, and both shipped to
   readers: §9 in the package, the ledger through `dist/DECISIONS.md`. The number
   is wrong twice over: 2.4.11 is *Focus Not Obscured (Minimum)* at AA, and *Focus
   Appearance* is 2.4.13 at AAA. What the ring evidences is 2.4.7.
   [[focus-criterion-numbers]] corrects it.

   Nothing caught that for months, because every check the repo owns measures the
   system against ITSELF — the token guards compare CSS to CSS, the story suite
   compares a render to an assertion, and a criterion number is a claim about an
   external document that none of them reads. So the error was self-consistent and
   invisible: both sites agreed with each other and neither agreed with W3C.

   WHAT THIS GUARD DOES. It scans the shipped documents for WCAG criterion numbers
   and, where a criterion NAME appears next to one, asserts the pairing is the one
   W3C publishes. It does not check prose that cites a number alone: a bare
   "(1.4.3)" carries no claim this guard can falsify, and demanding a name beside
   every number would be a style rule wearing a guard's clothes.

   THE THREE ARMS, because they fail differently:

     PAIRING  — every number-and-name pairing in the docs is correct. The arm that
       would have caught the earlier deferral on the day it was written.
     KNOWN    — every number the docs cite is a real WCAG 2.2 criterion. Catches a
       typo'd or invented number, which reads as authoritative and is unfalsifiable
       by eye.
     REVERSE  — the table still matches real pairings in the real documents. A
       guard whose patterns stop matching anything passes vacuously forever, which
       is the failure mode `dist-decisions.node-check.ts` documents at length.

   MAINTENANCE. `CRITERIA` is the WCAG 2.2 A and AA set, plus the five AAA criteria
   the documents name. Adding a row is how you teach the guard a criterion the docs
   have started citing. Names are W3C's own, lowercased for comparison; the
   parenthetical qualifier ("(Minimum)", "(Prerecorded)") is optional at the call
   site because the docs reasonably drop it in prose.
   ============================================================================= */

import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

/** Every `.ts`/`.tsx` under a directory, relative to `ROOT`. Hand-rolled rather than
 *  `fs.globSync`, which is still flagged experimental and prints a warning on every
 *  guard-lane run. */
function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...sourceFiles(full));
    else if (/\.tsx?$/.test(e.name)) out.push(relative(ROOT, full));
  }
  return out;
}

const ROOT = join(import.meta.dirname, "..", "..");

/**
 * WHERE CLAIMS LIVE, and why the two arms have different reach.
 *
 * The two shipped documents are where a criterion claim reaches a reader, and
 * every number in them is a citation, so both arms read them.
 *
 * Source comments cite criteria constantly (57 mentions of 4.1.2 alone) and the
 * defect [[focus-criterion-numbers]] corrected had a third site in `_assert.ts`
 * that a docs-only guard missed. So
 * the PAIRING arm reads source too. The KNOWN arm does NOT: source also holds
 * package versions and demo copy that match the same shape — `2.14.0` in the
 * generated changelog, "Build 4.2.1" in a Dialog story — and a number-shaped
 * string is only a claim when a criterion name sits beside it. Pairing is immune
 * to both, because no criterion name ever sits next to a version.
 */
const DOCS = ["docs/GUIDELINES.md", "docs/DECISIONS.md"] as const;
const SOURCE_DIR = "src";

/**
 * WCAG 2.2, level A and AA in full, plus the AAA criteria these documents name.
 * Level is carried because a claim that cites an AAA criterion as evidence for an
 * AA conformance claim is the second half of the defect [[focus-criterion-numbers]] corrected.
 */
const CRITERIA: Record<string, { name: string; level: "A" | "AA" | "AAA" }> = {
  "1.1.1": { name: "Non-text Content", level: "A" },
  "1.2.1": { name: "Audio-only and Video-only (Prerecorded)", level: "A" },
  "1.2.2": { name: "Captions (Prerecorded)", level: "A" },
  "1.2.3": { name: "Audio Description or Media Alternative (Prerecorded)", level: "A" },
  "1.2.4": { name: "Captions (Live)", level: "AA" },
  "1.2.5": { name: "Audio Description (Prerecorded)", level: "AA" },
  "1.3.1": { name: "Info and Relationships", level: "A" },
  "1.3.2": { name: "Meaningful Sequence", level: "A" },
  "1.3.3": { name: "Sensory Characteristics", level: "A" },
  "1.3.4": { name: "Orientation", level: "AA" },
  "1.3.5": { name: "Identify Input Purpose", level: "AA" },
  "1.4.1": { name: "Use of Color", level: "A" },
  "1.4.2": { name: "Audio Control", level: "A" },
  "1.4.3": { name: "Contrast (Minimum)", level: "AA" },
  "1.4.4": { name: "Resize Text", level: "AA" },
  "1.4.5": { name: "Images of Text", level: "AA" },
  "1.4.6": { name: "Contrast (Enhanced)", level: "AAA" },
  "1.4.10": { name: "Reflow", level: "AA" },
  "1.4.11": { name: "Non-text Contrast", level: "AA" },
  "1.4.12": { name: "Text Spacing", level: "AA" },
  "1.4.13": { name: "Content on Hover or Focus", level: "AA" },
  "2.1.1": { name: "Keyboard", level: "A" },
  "2.1.2": { name: "No Keyboard Trap", level: "A" },
  "2.1.4": { name: "Character Key Shortcuts", level: "A" },
  "2.2.1": { name: "Timing Adjustable", level: "A" },
  "2.2.2": { name: "Pause, Stop, Hide", level: "A" },
  "2.3.1": { name: "Three Flashes or Below Threshold", level: "A" },
  "2.3.3": { name: "Animation from Interactions", level: "AAA" },
  "2.4.1": { name: "Bypass Blocks", level: "A" },
  "2.4.2": { name: "Page Titled", level: "A" },
  "2.4.3": { name: "Focus Order", level: "A" },
  "2.4.4": { name: "Link Purpose (In Context)", level: "A" },
  "2.4.5": { name: "Multiple Ways", level: "AA" },
  "2.4.6": { name: "Headings and Labels", level: "AA" },
  "2.4.7": { name: "Focus Visible", level: "A" },
  "2.4.8": { name: "Location", level: "AAA" },
  "2.4.11": { name: "Focus Not Obscured (Minimum)", level: "AA" },
  "2.4.13": { name: "Focus Appearance", level: "AAA" },
  "2.5.1": { name: "Pointer Gestures", level: "A" },
  "2.5.2": { name: "Pointer Cancellation", level: "A" },
  "2.5.3": { name: "Label in Name", level: "A" },
  "2.5.4": { name: "Motion Actuation", level: "A" },
  "2.5.5": { name: "Target Size (Enhanced)", level: "AAA" },
  "2.5.7": { name: "Dragging Movements", level: "AA" },
  "2.5.8": { name: "Target Size (Minimum)", level: "AA" },
  "3.1.1": { name: "Language of Page", level: "A" },
  "3.1.2": { name: "Language of Parts", level: "AA" },
  "3.2.1": { name: "On Focus", level: "A" },
  "3.2.2": { name: "On Input", level: "A" },
  "3.2.3": { name: "Consistent Navigation", level: "AA" },
  "3.2.4": { name: "Consistent Identification", level: "AA" },
  "3.2.6": { name: "Consistent Help", level: "A" },
  "3.3.1": { name: "Error Identification", level: "A" },
  "3.3.2": { name: "Labels or Instructions", level: "A" },
  "3.3.3": { name: "Error Suggestion", level: "AA" },
  "3.3.4": { name: "Error Prevention (Legal, Financial, Data)", level: "AA" },
  "3.3.7": { name: "Redundant Entry", level: "A" },
  "3.3.8": { name: "Accessible Authentication (Minimum)", level: "AA" },
  "4.1.2": { name: "Name, Role, Value", level: "A" },
  "4.1.3": { name: "Status Messages", level: "AA" },
};

/**
 * The comparable form of a criterion name: lowercase, the parenthetical qualifier
 * dropped, punctuation that prose varies on normalised away. "Focus-appearance",
 * "Focus appearance" and "focus  appearance" all collapse to one key, because the
 * defect this guard catches is a wrong NUMBER, never a hyphen.
 */
function normalise(name: string): string {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z]+/g, " ")
    .trim();
}

/** Every criterion name, longest first so "Target Size (Enhanced)" is tried
 *  before a hypothetical "Target Size". */
const NAME_KEYS = Object.entries(CRITERIA)
  .map(([number, { name }]) => ({ number, key: normalise(name) }))
  .sort((a, b) => b.key.length - a.key.length);

/** How far from a number to look for a name. One clause, not one paragraph. */
const WINDOW = 48;

/**
 * What counts as ADJACENT, and why it is this strict.
 *
 * The first draft looked only for a name ending the window before a number, and
 * misread two shapes in the real documents. §9's out-of-scope list runs
 * "3.3.4 error prevention, 3.3.7 redundant entry" — NUMBER then name — so every
 * name got attributed to the number after it rather than the one before. And
 * the corrected text of the earlier deferral ran "2.4.7 Focus Visible (A)**; 2.4.11 is …",
 * where the qualifier-stripping in `normalise` ate the "(A)" and left the two touching.
 *
 * So adjacency is decided on the RAW gap between name and number, before any
 * normalising: whitespace and at most an opening bracket. A comma, a semicolon
 * or a word in between means the two are not a pairing, they are a list.
 */
const GAP_BEFORE = /^[\s([]*$/; //  Focus appearance (2.4.11)
const GAP_AFTER = /^[\s)\]]*$/; //  3.3.4 error prevention

type Citation = { doc: string; line: number; number: string; claimedName: string };

/** Find the name paired with a number, in either order, or nothing. */
function pairedName(line: string, at: number, numberLength: number): string | undefined {
  // NUMBER then name: "3.3.4 error prevention".
  const after = line.slice(at + numberLength, at + numberLength + WINDOW);
  for (const { key } of NAME_KEYS) {
    const idx = normalise(after).indexOf(key);
    if (idx !== 0) continue;
    // Re-find the name in raw text to measure the true gap.
    const raw = after.search(/[A-Za-z]/);
    if (raw >= 0 && GAP_AFTER.test(after.slice(0, raw))) return key;
  }
  // Name then NUMBER: "Focus appearance (2.4.11)".
  const before = line.slice(Math.max(0, at - WINDOW), at);
  for (const { key } of NAME_KEYS) {
    if (!normalise(before).endsWith(key)) continue;
    const lastLetter = before.search(/[A-Za-z][^A-Za-z]*$/);
    if (lastLetter >= 0 && GAP_BEFORE.test(before.slice(lastLetter + 1))) return key;
  }
  return undefined;
}

/** Every place a file pairs a criterion name with a number. */
function findCitations(): Citation[] {
  const found: Citation[] = [];
  // This file quotes the wrong pairing repeatedly, as the worked example of what
  // it catches. Scanning itself would make it permanently red for documenting
  // its own reason to exist.
  const self = "src/foundations/wcag-citation.node-check.ts";
  const files = [...DOCS, ...sourceFiles(join(ROOT, SOURCE_DIR))].filter((f) => f !== self);
  for (const doc of files) {
    const text = readFileSync(join(ROOT, doc), "utf8");
    text.split("\n").forEach((line, i) => {
      for (const m of line.matchAll(/\b([1-4]\.\d+\.\d+)\b/g)) {
        const claimedName = pairedName(line, m.index, m[1].length);
        if (claimedName) found.push({ doc, line: i + 1, number: m[1], claimedName });
      }
    });
  }
  return found;
}

/**
 * The sites that carry a WRONG pairing ON PURPOSE, each citing the ruling that
 * makes it deliberate, by name. On the precedent of [[scenario-axe-carve-outs]]: a
 * carve-out is permitted only by citing a ruling, and a guard checks the citation
 * rather than believing it.
 *
 * EMPTY since 2026-10-01. The register held one entry. The earlier focus-ring
 * contrast deferral kept its original wrong pairing so the propagation stayed
 * visible, and [[focus-criterion-numbers]] quoted that text to correct it. The
 * deferral left the public ledger when the rulings took names, and
 * [[focus-criterion-numbers]] was reworded to state the right numbers without
 * restating the wrong pairing, so no shipped sentence carries it now.
 *
 * With the register empty, both checks in the register arm below pass
 * vacuously. The arm that holds the line is PAIRING, which now reports every
 * wrong pairing in the documents with no exception. An entry added here must
 * cite a ruling whose `### name` heading exists, and the register arm then
 * holds it to a live site.
 */
const PRESERVED: { doc: string; number: string; claimedName: string; ruling: string }[] = [];

describe("WCAG citations in the shipped documents", () => {
  const citations = findCitations();
  const isPreserved = (c: Citation) =>
    PRESERVED.some(
      (p) => p.doc === c.doc && p.number === c.number && p.claimedName === c.claimedName,
    );

  it("pairs every criterion name with the number W3C gives it", () => {
    const wrong = citations
      .filter((c) => normalise(CRITERIA[c.number]?.name ?? "") !== c.claimedName)
      .filter((c) => !isPreserved(c))
      .map((c) => {
        const actual = CRITERIA[c.number];
        const shouldBe = NAME_KEYS.find((k) => k.key === c.claimedName)?.number;
        return (
          `${c.doc}:${c.line} cites "${c.claimedName}" as ${c.number}, ` +
          `but ${c.number} is "${actual?.name ?? "not a WCAG 2.2 criterion"}"` +
          (shouldBe ? ` and "${c.claimedName}" is ${shouldBe}` : "")
        );
      });
    expect(wrong, wrong.join("\n")).toEqual([]);
  });

  it("keeps the preserved-error register honest in both directions", () => {
    // A register entry that no longer matches anything is rot: somebody rewrote
    // the quoted text and the carve-out now excuses a site that does not exist.
    const dead = PRESERVED.filter(
      (p) =>
        !citations.some(
          (c) => c.doc === p.doc && c.number === p.number && c.claimedName === p.claimedName,
        ),
    ).map((p) => `${p.doc} no longer pairs "${p.claimedName}" with ${p.number} (${p.ruling})`);
    expect(dead, dead.join("\n")).toEqual([]);

    // And every cited ruling must resolve to a real ledger entry, matched as a
    // `### name` heading rather than a mention in prose, the third arm of
    // [[scenario-axe-carve-outs]].
    const ledger = readFileSync(join(ROOT, "docs/DECISIONS.md"), "utf8");
    const unresolved = [...new Set(PRESERVED.map((p) => p.ruling))].filter(
      (name) => !new RegExp(`^### ${name}$`, "m").test(ledger),
    );
    expect(unresolved, `no such ruling: ${unresolved.join(", ")}`).toEqual([]);
  });

  it("cites only real WCAG 2.2 criterion numbers", () => {
    const unknown: string[] = [];
    for (const doc of DOCS) {
      const text = readFileSync(join(ROOT, doc), "utf8");
      text.split("\n").forEach((line, i) => {
        // Skip measured ratios and version strings: a criterion number is cited,
        // never computed, so it never sits next to ":1" or a decimal tail.
        for (const m of line.matchAll(/\b([1-4]\.\d+\.\d+)\b(?!:1)(?!\.\d)/g)) {
          if (!CRITERIA[m[1]]) unknown.push(`${doc}:${i + 1} cites ${m[1]}`);
        }
      });
    }
    expect(unknown, unknown.join("\n")).toEqual([]);
  });

  it("can still go red — the documents really do pair names with numbers", () => {
    // Without this, a reformat that separated every name from its number would
    // leave the PAIRING arm passing over an empty set, forever.
    expect(citations.length).toBeGreaterThanOrEqual(6);
    // And the table must be reachable: at least one pairing resolves through it.
    expect(citations.some((c) => CRITERIA[c.number])).toBe(true);
  });
});
