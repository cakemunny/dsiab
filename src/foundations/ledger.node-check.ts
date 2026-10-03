/* =============================================================================
   ledger.node-check.ts: THE GUARD ON `docs/DECISIONS.md` ITSELF
   -----------------------------------------------------------------------------
   The other guards in this directory check CODE against DECLARATIONS: the
   registry against the barrel, the story spine against its rulings, the token
   rows against the paint. This one checks the ledger, because a citation is a
   claim like any other. Before this guard existed, [[dark-override-selectors]]
   stood as binding law in three shipped token files with no entry behind it,
   and the custom-brand feature shipped with no ruling at all until
   [[seeded-brand-collisions]] closed the hole. No check read the ledger, so
   both gaps went unseen. A ledger is the only enforcement this system has for
   its decisions, and an unguarded ledger decays like unguarded code.

   A RULING IS A NAME. Each entry is a `### name` heading, and the name is
   permanent. Stories, code and the other documents cite a ruling as
   `[[name]]`, and the ledger cites one as a Markdown link to the heading
   anchor, `[name](#name)`. The section codes the ledger used until 2026-10-01
   are gone, and the LEGACY arm keeps them gone.

   THE ARMS, because each fails for a different reason:

     NAMES    Every `### ` heading in the ledger is a name of two to five
              lower-case words joined by hyphens, and no name heads two
              entries. A count floor stops the arm from passing over an empty
              set when the heading format drifts.
     SHAPE    The first non-blank line under each heading is the tags and date
              line: one to three tags from TAGS, comma-separated, then the date
              of the ruling or the words "No date recorded". TAGS must equal
              the list the ledger's opening paragraph declares, so the two
              lists stay equal.
     LINKS    Every `[[name]]` in the scanned files resolves to an entry. An
              unresolved `[[name]]` reads as law and points at nothing.
     ANCHORS  Every `](#name)` link inside the ledger resolves to an entry
              heading.
     LEGACY   No section code (one of the letters A, C, K, T and X, then one to
              three digits) remains in the scanned files or anywhere in the
              ledger, Evidence parts included. The pattern catches an uppercase
              code that no letter or digit precedes, so a code after a hyphen or
              an underscore counts, and so does a code with a clause letter or
              an identifier suffix after it. It also catches a lowercase code of
              two or three digits written as an id. Hex literals are blanked
              first, because `#C8102E`, the seed [[seeded-brand-collisions]]
              measured, contains a run of code shape. NOT_A_RULING lists the
              code-shaped tokens that belong to another namespace, each with its
              reason, and its anti-rot arm fails when a rule excuses no live
              site.
     TOKEN FILES  Every `.css` file in `src/tokens` is named somewhere in the
              ledger. The custom-brand hole was a whole feature, a Provider
              prop, a palette directory and a stylesheet, with no ruling naming
              it, and this is the arm that would have caught it.
              UNRULED_TOKENS is the dated allow-list, with its own anti-rot
              arm.

   TWO ARMS RETIRED WITH THE CODES. The reservation arm allowed a gap in a
   code sequence only when the ledger declared the gap reserved. Names carry
   no sequence, so a gap cannot exist, and the arm has nothing to check. The
   register of known dangling citations went too. Its one entry ever was a
   plan id that shared a letter with the section codes, and names share no
   namespace with plan ids. An unresolved `[[name]]` is a defect to fix where
   it stands.

   WHAT THIS GUARD CANNOT SEE, stated because a rule whose reach is overstated
   is the defect this guard exists to prevent:
     · It reads `src/**` (.ts, .tsx, .css, .mjs), the shipped Markdown in
       SHIPPED_MD and `registry.json`. A citation in any other file is
       invisible to it.
     · It proves a name EXISTS, never that the citation is apt.
       `[[motion-tokens]]` beside a paragraph about colour passes.
     · A name without the brackets is not a citation here, and a bracketed
       single word is not a name, so `[[focusring]]` passes unread.
     · Three or more hex-shaped codes separated by single spaces read as a
       byte dump and pass. Prose separates citations with commas.
     · TOKEN FILES proves a filename is MENTIONED, not that the mention rules
       on it. A ruling that names a file in passing satisfies it.
     · It skips this file, because the file quotes the code shapes as
       examples.
     · A lowercase code with one digit passes. Loop timers (`t0`), SVG
       coordinates (`x1`), Radix alpha steps (`a3`) and test ids (`c1`) fill
       that shape, and every lowercase code the census of 2 October 2026
       found carried two or three digits.
   ============================================================================= */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { describe, expect, it } from "vitest";

const LEDGER = "docs/DECISIONS.md";
const ledger = readFileSync(LEDGER, "utf8");

/** A ruling's name: two to five lower-case words joined by hyphens. */
const NAME = /^[a-z0-9]+(?:-[a-z0-9]+){1,4}$/;

/** The tags an entry may carry. SHAPE holds this list equal to the ledger's own declaration. */
const TAGS = [
  "ACCESSIBILITY",
  "COLOUR",
  "COMPONENTS",
  "CONTRIBUTING",
  "DOCUMENTATION",
  "FOUNDATIONS",
  "INSTALL",
  "LAYOUT",
  "MOTION",
  "SIZING",
  "TOKENS",
  "TYPOGRAPHY",
] as const;

/**
 * Token files with no ruling naming them.
 *
 * EMPTY as of 2026-08-12: the icon box ([[icon-size-follows-leading]]), the
 * spacing and radius scales ([[spacing-and-radius-scales]]) and the type ramp
 * ([[type-ramp]]) are ruled, which closed the last three entries.
 *
 * NOTE ON WHICH ARM GATES THIS. With the map empty the anti-rot arm below is
 * `Object.keys({}).filter(...)` and passes vacuously. The arm that holds the
 * line is the forward TOKEN FILES arm, which walks `readdirSync("src/tokens")`
 * and requires each .css filename to appear verbatim in the ledger. A token
 * file added without a ruling that names it fails there, not here.
 */
const UNRULED_TOKENS: Record<string, string> = {};

/**
 * Code-shaped tokens that are not ruling citations. Each rule matches a SPAN of
 * text, and a code inside a span is excused. The anti-rot arm fails when a rule
 * excuses nothing, so the list cannot keep a rule its reason no longer needs.
 */
const NOT_A_RULING: { what: string; span: RegExp; why: string }[] = [
  {
    what: "a W3C technique id",
    span: /\btechniques?\s+[ACKTX]\d{1,3}\b/gi,
    why:
      "W3C numbers its sufficient techniques in the same letter-and-digits shape, so the technique C43 " +
      "(scroll padding under a sticky header) reads as a code. The word technique in front of the token " +
      "names the namespace.",
  },
  {
    what: "a byte in a hex byte dump",
    span: /(?<![0-9A-Za-z])[0-9A-F]{2}(?: [0-9A-F]{2}){2,}(?![0-9A-Za-z])/g,
    why:
      "A byte sequence such as `20 C2 B7 20`, the UTF-8 bytes of a space, a middle dot and a space, holds " +
      "two-character bytes that read as codes. Three or more space-separated hex bytes in a row are data, " +
      "not a citation.",
  },
  {
    what: "the accessibility numeronym A11y",
    span: /a11y/gi,
    why:
      "A11y abbreviates accessibility, with the eleven letters between the a and the y counted. An uppercase " +
      "code may carry letters after its digits, so A11 before the y reads as a code.",
  },
  {
    what: "a review label from a plan",
    span: /\bA\d+-review\b/g,
    why:
      "A plan names a review after the task it reviews, such as the A3-review that `_dateinput.stories.tsx` " +
      "cites. Plan task ids share the letter-and-digits shape, and the word review after the hyphen names the " +
      "namespace.",
  },
  {
    what: "a pixel coordinate range",
    span: /\bx\d{3,}-\d+\b/g,
    why:
      "A measurement note gives an x position range in pixels, such as x277-280 on the project rail, which " +
      "reads as a lowercase code with a hyphen after it. The old X section stopped at X49, so an x followed by " +
      "three digits or more is a pixel position and never a ruling code, while x16-2 is still caught.",
  },
  {
    what: "a Radix alpha step",
    span: /(?<![A-Za-z0-9])a1[0-2](?![A-Za-z0-9])/g,
    why:
      "Radix Themes numbers the steps of each alpha scale a1 to a12, as in `--gray-a12`, so a lowercase a10, " +
      "a11 or a12 names one of those steps. The A section of the old codes held nine rulings, so no ruling " +
      "code takes that shape.",
  },
];

/* ---- the ledger's own shape ---------------------------------------------- */

/** Every `### ` heading, with its 1-based line. */
function headings(): { name: string; line: number }[] {
  const out: { name: string; line: number }[] = [];
  ledger.split("\n").forEach((text, i) => {
    const m = /^### (.*)$/.exec(text);
    if (m) out.push({ name: m[1], line: i + 1 });
  });
  return out;
}

const entries = new Set(headings().map((h) => h.name));

const TAG_ALT = TAGS.join("|");
const TAGS_LINE = new RegExp(
  `^\\*\\*Tags\\.\\*\\* \`(?:${TAG_ALT})\`(?:, \`(?:${TAG_ALT})\`){0,2}\\. ` +
    `\\*\\*Ruled\\.\\*\\* (?:(\\d{4}-\\d{2}-\\d{2})|No date recorded)\\.$`,
);

/* ---- what the guard scans ------------------------------------------------- */

const SCAN_EXT = new Set([".ts", ".tsx", ".css", ".mjs"]);
/** The markdown the package ships, plus the README a reader meets first. The
 *  root `AGENTS.md` is the contributor file and no longer ships
 *  ([[agent-files-and-docs-layout]]). */
const SHIPPED_MD = [
  "README.md",
  "CHANGELOG.md",
  "docs/GUIDELINES.md",
  "docs/AGENT-SETUP.md",
  "docs/REFERENCES.md",
  "skills/dsiab/SKILL.md",
  "skills/dsiab/references/rules.md",
  "skills/design-system-steward/SKILL.md",
];

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) sourceFiles(p, acc);
    else if (SCAN_EXT.has(extname(p))) acc.push(p);
  }
  return acc;
}

/** Every file LINKS and LEGACY read, apart from the ledger. This file quotes the
 *  code shapes as examples, so it is left out. */
const SCANNED = [
  ...sourceFiles("src").filter((f) => !f.endsWith("ledger.node-check.ts")),
  ...SHIPPED_MD.filter((f) => existsSync(f)),
  "registry.json",
];

/** A name-shaped wiki link: hyphenated words in double brackets. Nested array
 *  literals such as `[["a", 1]]` hold quotes or commas and never match. */
const WIKI = /\[\[([A-Za-z0-9]+(?:-[A-Za-z0-9]+)+)\]\]/g;

/** A section code. An uppercase code is one of the five letters and one to three digits, after no
 *  letter or digit and before no further digit, so `pre-C98`, `C15a`, `X14_SIZES` and `X43Frame` all
 *  match. A lowercase code is an id of two or three digits before no letter or digit, so `x14-scope`
 *  and `c104` match, while `a11y` and the one-digit `t0` do not. */
const CODE = /(?<![A-Za-z0-9])(?:[ACKTX]\d{1,3}(?!\d)|[ackxt]\d{2,3}(?![A-Za-z0-9]))/g;

type Site = { file: string; line: number; code: string };

/** Section codes in one text, split into live sites and a count of the sites each
 *  NOT_A_RULING rule excuses. Hex literals are blanked to spaces of the same
 *  length first, so lines and columns hold. */
function legacyIn(file: string, text: string, excused: Map<string, number>): Site[] {
  const found: Site[] = [];
  text
    .replace(/#[0-9a-fA-F]{3,8}\b/g, (m) => " ".repeat(m.length))
    .replace(/\b0x[0-9a-fA-F]+\b/g, (m) => " ".repeat(m.length))
    .split("\n")
    .forEach((line, i) => {
      const spans = NOT_A_RULING.map((rule) =>
        [...line.matchAll(rule.span)].map((m) => [m.index, m.index + m[0].length] as const),
      );
      for (const m of line.matchAll(CODE)) {
        const at = m.index;
        const rule = spans.findIndex((list) => list.some(([s, e]) => at >= s && at < e));
        if (rule >= 0) {
          const what = NOT_A_RULING[rule].what;
          excused.set(what, (excused.get(what) ?? 0) + 1);
        } else found.push({ file, line: i + 1, code: m[0] });
      }
    });
  return found;
}

/* ---- the rules ------------------------------------------------------------ */

describe("ledger: the guard on docs/DECISIONS.md itself", () => {
  it("NAMES: every entry heading is a valid name, and no name heads two entries", () => {
    const all = headings();
    expect(
      all.length,
      "the ledger holds almost no `### ` headings, so the entry format drifted and every arm here reads an empty set",
    ).toBeGreaterThan(100);

    const malformed = all.filter((h) => !NAME.test(h.name)).map((h) => `line ${h.line}: "### ${h.name}"`);
    expect(malformed, "an entry heading is not a name of two to five lower-case words joined by hyphens").toEqual([]);

    const seen = new Map<string, number>();
    const doubled: string[] = [];
    for (const h of all) {
      const first = seen.get(h.name);
      if (first === undefined) seen.set(h.name, h.line);
      else doubled.push(`${h.name} heads line ${first} and line ${h.line}`);
    }
    expect(doubled, "a name heads two entries, so a citation of it resolves to either").toEqual([]);
  });

  it("SHAPE: each entry opens with its tags and the date of the ruling", () => {
    const lines = ledger.split("\n");
    const bad: string[] = [];
    for (const h of headings()) {
      let j = h.line;
      while (j < lines.length && !lines[j].trim()) j++;
      const text = lines[j] ?? "";
      const m = TAGS_LINE.exec(text);
      const tags = [...text.matchAll(/`([A-Z]+)`/g)].map((t) => t[1]);
      // A real calendar day survives a round trip through Date unchanged. 2026-02-30 does not.
      const day = m?.[1] ? new Date(`${m[1]}T00:00:00Z`) : null;
      if (!m) bad.push(`${h.name} (line ${j + 1}): "${text.slice(0, 120)}"`);
      else if (new Set(tags).size !== tags.length) bad.push(`${h.name} (line ${j + 1}) repeats a tag`);
      else if (day && (Number.isNaN(day.getTime()) || day.toISOString().slice(0, 10) !== m[1])) {
        bad.push(`${h.name} (line ${j + 1}) names no real day: ${m[1]}`);
      }
    }
    expect(
      bad,
      "the first non-blank line under an entry heading must read **Tags.** `TAG`, `TAG`. **Ruled.** YYYY-MM-DD. " +
        "(one to three tags from TAGS, or **Ruled.** No date recorded.)",
    ).toEqual([]);

    // The opening paragraph declares the vocabulary. The guard's list and the ledger's list stay equal.
    const firstEntry = lines.findIndex((l) => l.startsWith("### "));
    const declaration = lines.slice(0, firstEntry).find((l) => l.startsWith("**Tags.**")) ?? "";
    const declared = [...declaration.matchAll(/`([A-Z]+)`/g)].map((t) => t[1]).sort();
    expect(declared, "the ledger's opening **Tags.** paragraph and TAGS name different tags").toEqual(
      [...TAGS].sort(),
    );
  });

  it("LINKS: every [[name]] outside the ledger resolves to an entry", () => {
    const unresolved: string[] = [];
    for (const file of SCANNED) {
      readFileSync(file, "utf8")
        .split("\n")
        .forEach((line, i) => {
          for (const m of line.matchAll(WIKI)) {
            if (!entries.has(m[1])) unresolved.push(`${file}:${i + 1} cites [[${m[1]}]]`);
          }
        });
    }
    expect(unresolved, "a citation names a ruling the ledger has no `### ` heading for").toEqual([]);
  });

  it("ANCHORS: every link inside the ledger resolves to an entry heading", () => {
    const unresolved: string[] = [];
    ledger.split("\n").forEach((line, i) => {
      for (const m of line.matchAll(/\]\(#([^)\s]*)\)/g)) {
        if (!entries.has(m[1])) unresolved.push(`line ${i + 1}: ](#${m[1]})`);
      }
    });
    expect(unresolved, "a link in the ledger points at no `### ` heading").toEqual([]);
  });

  // The ledger is read whole, Evidence parts included, so a reported line number is the line on disk.
  const excused = new Map<string, number>();
  const legacy = [
    ...SCANNED.flatMap((file) => legacyIn(file, readFileSync(file, "utf8"), excused)),
    ...legacyIn(LEDGER, ledger, excused),
  ];

  it("LEGACY: no section code remains in the scanned files or the ledger", () => {
    const byType = new Map<string, number>();
    for (const s of legacy) {
      const type = extname(s.file) || s.file;
      byType.set(type, (byType.get(type) ?? 0) + 1);
    }
    const summary = [...byType].map(([type, n]) => `${type} ${n}`).join(", ");
    const first = legacy.slice(0, 40).map((s) => `  ${s.file}:${s.line} ${s.code}`);
    expect(
      legacy.length,
      `${legacy.length} section code(s) remain (${summary}). Convert each to [[name]], or to ` +
        `[name](#name) inside the ledger. A token from another namespace takes a NOT_A_RULING rule ` +
        `with its reason. First sites:\n${first.join("\n")}`,
    ).toBe(0);
  });

  it("LEGACY(anti-rot): every NOT_A_RULING rule still excuses a live site", () => {
    const idle = NOT_A_RULING.filter((rule) => !excused.has(rule.what)).map((rule) => rule.what);
    expect(idle, "remove these rules from NOT_A_RULING, because no scanned text needs them now").toEqual([]);
  });

  it("TOKEN FILES: every token file is named by some ruling", () => {
    const unnamed: string[] = [];
    for (const name of readdirSync("src/tokens")) {
      if (extname(name) !== ".css") continue;
      if (name in UNRULED_TOKENS) continue;
      if (!ledger.includes(name)) unnamed.push(name);
    }
    expect(unnamed, "a token layer ships with nothing in the ledger naming it").toEqual([]);
  });

  it("TOKEN FILES(anti-rot): an allow-listed token file that is now ruled leaves the list", () => {
    const ruled = Object.keys(UNRULED_TOKENS).filter((n) => ledger.includes(n));
    expect(ruled, "remove these from UNRULED_TOKENS, because the ledger names them now").toEqual([]);
  });
});
