/* =============================================================================
   lineageTerms.ts — THE SINGLE SOURCE OF TRUTH FOR BANNED PORTING-LINEAGE PROSE
   -----------------------------------------------------------------------------
   User-facing Storybook prose carries ZERO porting/planning lineage: no
   Astryx/commit-hash/"lifted"/upstream/named-deferral/"agent-gap" vocabulary,
   and no citation of the agent-gap ruling. That context lives in DECISIONS.md
   and the .tsx source-header notices ONLY — never in a rendered story.

   This module is the ONE place the banned vocabulary is defined, so the strip
   pass (which removes the prose) and the guard (no-lineage.node-check.ts, which
   fails if it comes back) can never drift apart. Import `findLineageMatches`
   from here; do not re-hardcode a term list anywhere else.

   Two tiers, per the doc-remediation plan:

     Tier A — PHRASES: multi-word / unambiguous strings matched as a
       case-insensitive SUBSTRING. Safe to match loosely because the string
       is long enough to never collide with legitimate prose.

     Tier B — BARE_WORDS: single dangerous words matched WORD-BOUNDARIED and
       case-insensitive, so `Portal` / `transport` / `import` / `export` /
       `support` / `opportunity` and `Wavelength` / `waver` do NOT trip, but
       `port`, `Port`, `wave-3`, `Wave 3` do.

     Plus REGEXES for the two tokenized forms: the agent-gap ruling cited by
       name, `[[component-registry]]`, and a commit-hash reference like
       `@88c95e4`. The ruling holds the port registry and the agent-gap rule,
       and its old section code was banned here for that reason. The codes are
       gone, so the ban now applies to the name.
   ============================================================================= */

/** Tier A — multi-word / unambiguous phrases, matched case-insensitively as a
 *  plain substring. `lifted use` also covers the "lifted useGridFocus" hook form
 *  (it is a prefix substring of every `lifted use<Hook>`). */
export const PHRASES: readonly string[] = [
  "astryx",
  "upstream",
  "named deferral",
  "agent-gap",
  "play suite stayed green",
  "play suite (stayed green)",
  // "hypothesi" stem catches the registry-hypothesis porting saga in every form
  // ("hypothesis" / "hypothesised" / "hypothesized"), incl. "the registry FIRST
  // hypothesised…" where an intervening word defeats a literal "registry hypothesised".
  "hypothesi",
  "buildingBlock corrected",
  "a faithful port",
  "lifted use",
];

/** Tier B — dangerous BARE words, matched \b-word-boundaried + case-insensitive.
 *  `ported` / `porting` are their own entries (not a `port` prefix) so the \b-boundary
 *  keeps `supported` / `reported` / `imported` / `transported` from tripping. */
export const BARE_WORDS: readonly string[] = ["port", "ported", "porting", "wave"];

/** Tokenized forms that need their own pattern (not a plain phrase or a \bword\b). */
export const REGEXES: readonly { term: string; re: RegExp }[] = [
  // The ruling that holds the port registry and the agent-gap rule, cited by name in prose. Its old
  // section code was banned here, and the name is now its only citation form.
  { term: "[[component-registry]] (the agent-gap ruling)", re: /\[\[component-registry\]\]/ },
  // A commit-hash reference, e.g. "@88c95e4" / "[[catalog-as-specification]] @ 88c95e4".
  { term: "commit-hash reference", re: /@[0-9a-f]{7,}\b/ },
];

export interface LineageMatch {
  /** The canonical banned term (the list entry), for the violation report. */
  term: string;
  /** Byte index of the match WITHIN the scanned string (for line resolution). */
  index: number;
  /** The exact substring that matched (for the snippet). */
  matched: string;
}

/** Escape a literal string for embedding in a RegExp. */
function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Find every banned-lineage term in a reader-visible string. Returns one match
 * per occurrence (a line with two banned words yields two matches), each with
 * the index within `text` so the caller can resolve an exact line number.
 *
 * This is the ONLY matcher — both the guard and any strip tooling call it, so
 * the definition of "banned" lives in exactly one place.
 */
export function findLineageMatches(text: string): LineageMatch[] {
  const out: LineageMatch[] = [];

  // Tier A — case-insensitive substring.
  const lower = text.toLowerCase();
  for (const phrase of PHRASES) {
    const needle = phrase.toLowerCase();
    let from = 0;
    let idx: number;
    while ((idx = lower.indexOf(needle, from)) !== -1) {
      out.push({ term: phrase, index: idx, matched: text.slice(idx, idx + phrase.length) });
      from = idx + needle.length;
    }
  }

  // Tier B — \bword\b, case-insensitive.
  for (const word of BARE_WORDS) {
    const re = new RegExp(`\\b${escapeRe(word)}\\b`, "gi");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      out.push({ term: word, index: m.index, matched: m[0] });
    }
  }

  // Tokenized regex forms.
  for (const { term, re } of REGEXES) {
    const flags = re.flags.includes("g") ? re.flags : re.flags + "g";
    const g = new RegExp(re.source, flags);
    let m: RegExpExecArray | null;
    while ((m = g.exec(text)) !== null) {
      out.push({ term, index: m.index, matched: m[0] });
      if (m.index === g.lastIndex) g.lastIndex++; // guard against zero-width loops
    }
  }

  return out;
}
