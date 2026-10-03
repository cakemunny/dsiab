/* =============================================================================
   loose-values.node-check.ts — THE "NO LOOSE VALUES" GUARD
   -----------------------------------------------------------------------------
   A source-scanning test (Node, not browser — it reads files) that enforces the
   five drift vectors the design system otherwise leaves to author discipline:

     1. font-weight ∈ {400, 600, 700} (or a var) — the system's 3-weight ramp
        (Base / Strong / Strongest). Bans 300/500/800 sprawl at the source.
     2. no raw hex colours in the COMPONENT layer — paint from --ds-* / Radix
        scale tokens, never a literal #rrggbb (which can't follow a brand shift).
     3. spacing properties (padding / margin / gap) snap to the --space / --ds-space
        scale — no raw `13px` gaps.
     4. no `transition: all` / `transition-property: all` — a wildcard transition
        animates whatever happens to change (layout included) and silently absorbs
        every property a later edit adds. Name the properties.
     5. `will-change` ∈ {transform, opacity, filter, auto} — the compositor hint is
        for compositor properties; a layout property (or `all`) asks the browser to
        hold a layer it cannot cheaply promote, for no gain.

   Enforcement here is a TEST, not a stylelint rule: this repo has no lint tooling
   and its whole QA model is tests (axe on every story + the contrast harness in
   _assert.ts). This runs in Node (browser mode has no fs), through its own config
   (vitest.node.config.ts) so it never touches the fragile browser suite; `npm test`
   runs it via the `pretest` hook, and `npm run test:tokens` runs it alone.

   Scope = the SHIPPED system surface. Story files (*.stories.tsx) and the story
   spine (_storyKit.tsx) are documentation scaffolding, exempt like the stories
   themselves. The token-DEFINITION files (semantic/theme/oxblood/… .css) legitimately
   hold the palette + backstop hexes and the scale itself — only components.css (the
   component-override layer) is held to the component rules.

   Rules 4-5 deliberately scan WIDER than that. The token-file exemption is a claim
   about palettes and the spacing scale; neither rationale reaches a transition or a
   compositor hint, so motion hygiene has no reason to exempt a token file. Rules 4-5
   therefore also cover src/tokens/*.css, src/theme/** and src/powersearch/** — the
   stories/_storyKit exemption still applies. Rules 1-3 keep the component-layer scope
   (widening THEM is a named follow-up, not this change).

   What the scanner CANNOT see. Stated here because a directory named as "in scope" is
   not the same claim as a file being read, and no surface should overstate the reach:
     · FILE TYPES — sourceFiles() opens .tsx and .css ONLY. A .ts file is invisible to
       EVERY rule, 1-5. Nine of the ten files in src/powersearch are .ts, so "the search
       layer" is ~90% unscanned in practice. Widening to .ts is a scope decision that
       lands on rules 1-3 as well, so it is a named follow-up, not this change.
     · TEMPLATE LITERALS — the TSX matcher requires a '- or "-quoted value, so
       `willChange: ` + a backticked value, and any CSS authored inside a template
       literal (a <style> block), evade rules 4-5. No non-story file under the scanned
       directories contains such a block today, so this is a latent gap, not a live one.
   ============================================================================= */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, basename, relative } from "node:path";
import { test, expect } from "vitest";

const ROOT = process.cwd();

/** KNOWN DEBT — sites that fail a rule below, each awaiting a named ruling. The guard still scans
 *  them and still prints the finding; only the failure is suppressed, and an entry that stops
 *  matching is itself reported so the list cannot rot. Same posture as token-rows' work-list. */
const KNOWN_DEBT = new Map<string, string>([
  [
    "src/tokens/components.css|spacing margin-block: calc(var(--ds-space-4) * 1.5)",
    "the tokenizer chip's large-tier margin: (40px box − 28px chip) / 2 = 6px, a value the spacing scale does not name. Whether 6 becomes a rung, a derivation, or the wrapped-row rhythm changes needs a ruling (pattern-steward G2, 2026-07-31).",
  ],
]);
const COMPONENTS_DIR = join(ROOT, "src/components");
const OVERRIDE_CSS = join(ROOT, "src/tokens/components.css");
/** The extra surface rules 4-5 reach into (see the Scope note in the header). */
const TOKENS_DIR = join(ROOT, "src/tokens");
const THEME_DIR = join(ROOT, "src/theme");
const POWERSEARCH_DIR = join(ROOT, "src/powersearch");

const isExempt = (file: string) =>
  file.endsWith(".stories.tsx") || basename(file) === "_storyKit.tsx";

/** Recursively list .tsx/.css under a dir, minus the exempt scaffolding. */
function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...sourceFiles(p));
    else if (/\.(tsx|css)$/.test(p) && !isExempt(p)) out.push(p);
  }
  return out;
}

/** Blank out /* *​/ and // comments while preserving newlines + column positions,
    so line/column-based checks below don't false-positive on prose that mentions a
    hex or a pixel value, and reported line numbers stay accurate. */
function blankComments(src: string): string {
  let out = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
  // Line comments — but not the // in a URL scheme (http://). Guard on a non-colon lead.
  out = out.replace(/(^|[^:])\/\/[^\n]*/g, (m, lead: string) => lead + " ".repeat(m.length - lead.length));
  return out;
}

interface Violation {
  file: string;
  line: number;
  rule: string;
  text: string;
}

const WEIGHTS_OK = new Set(["400", "600", "700"]);
/** Rule 5 allowlist. `auto` is will-change's initial value — declaring it resets a hint, it never
 *  asks for a layer, so it stays legal alongside the three compositor properties. */
const WILL_CHANGE_OK = new Set(["transform", "opacity", "filter", "auto"]);
/** CSS-wide keywords are legal on every property and say nothing about compositing. */
const CSS_WIDE = new Set(["inherit", "initial", "unset", "revert", "revert-layer"]);

/** mode "all" runs every rule; mode "motion" runs 4-5 only — the widened surface (token /
 *  theme / powersearch files) is scanned for motion hygiene WITHOUT rules 1-3, whose
 *  component-layer scope is a deliberate ruling (the palettes hold the hexes and the scale). */
function scan(file: string, mode: "all" | "motion" = "all"): Violation[] {
  const raw = readFileSync(file, "utf8");
  const code = blankComments(raw);
  const isCss = file.endsWith(".css");
  const rel = relative(ROOT, file);
  const v: Violation[] = [];
  const lines = code.split("\n");

  // Rules 1-3 — the component-layer rules, line by line.
  if (mode === "all") lines.forEach((ln, i) => {
    const at = (rule: string) => v.push({ file: rel, line: i + 1, rule, text: ln.trim() });

    // 1. font-weight — the CSS property, the JSX `fontWeight:` style, and the
    //    `weight={N}` / weight="N" prop. Custom-prop defs (--ds-font-weight-*: 600)
    //    don't match `font-weight:` (the "-strong" breaks the colon adjacency).
    for (const m of ln.matchAll(/(?:font-weight|fontWeight)\s*:\s*(\d+)/g)) {
      if (!WEIGHTS_OK.has(m[1])) at(`font-weight ${m[1]} not in {400,600,700}`);
    }
    for (const m of ln.matchAll(/\bweight\s*=\s*["'{]?\s*(\d+)/g)) {
      if (!WEIGHTS_OK.has(m[1])) at(`weight=${m[1]} not in {400,600,700}`);
    }

    // 2. raw hex — any #rgb / #rrggbb / #rrggbbaa in the component layer.
    for (const m of ln.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
      at(`raw hex ${m[0]} — use a --ds-* / scale token`);
    }

    // 3. spacing must snap to the scale.
    if (isCss) {
      // CSS: a spacing PROPERTY whose value carries a raw pixel length. Border /
      //  outline / min-size / offset props are out of scope (legit sub-grid px).
      // (?:^|[{;]) rather than ^ alone: a one-line rule (`.sel { margin-block: … }`) puts the
      //  property mid-line, and the anchored form silently skipped every such declaration.
      const m = ln.match(
        /(?:^|[{;])\s*(padding|margin|gap|row-gap|column-gap|(?:padding|margin)-(?:top|right|bottom|left|inline|block|inline-start|inline-end|block-start|block-end))\s*:\s*([^;}]+)/,
      );
      if (m && /\d+px/.test(m[2]) && !/var\(--(?:ds-)?space/.test(m[2])) {
        at(`spacing ${m[1]}: ${m[2].trim()} — snap to --space / --ds-space`);
      }
      // 3b. A token does not launder a multiplier: `calc(var(--ds-space-4) * 1.5)` lands on 6px —
      //  a value the scale does not name — while carrying no raw px for rule 3 to see. A bare
      //  numeric factor beside a space token inside calc() is off-scale by construction (an
      //  fractional factor on a step cannot land on the scale by arithmetic; integer factors and
      //  divisions are left alone — they can legitimately land on a real step).
      if (m && /calc\([^)]*var\(--(?:ds-)?space-[^)]*\)\s*\*\s*\d+\.\d+/.test(m[2])) {
        at(`spacing ${m[1]}: ${m[2].trim()} — a multiplier on a space token lands off the scale; use a real step or derive from two system values`);
      }
    } else {
      // TSX inline style: `gap: 2` (bare number = px) or `padding: "7px …"` without a
      //  space token. `padding="2"` (Radix size prop) uses `=`, not `:`, so is untouched.
      for (const m of ln.matchAll(
        /\b(padding[A-Za-z]*|margin[A-Za-z]*|gap|rowGap|columnGap)\s*:\s*(\d+|["'][^"']*\d+px[^"']*["'])/g,
      )) {
        if (!/var\(--(?:ds-)?space/.test(m[2])) at(`spacing ${m[1]}: ${m[2]} — use a --ds-space token`);
      }
    }
  });

  // Rules 4 + 5 — motion hygiene, matched against the WHOLE comment-blanked text rather than line
  //  by line. components.css writes multi-line declarations (a bare `transition:` with one property
  //  per following line — :749, :1272, :3346), and a per-line regex is blind to exactly those; the
  //  CSS value class below spans newlines, so the whole declaration is one match. The line number
  //  comes back from the match offset, and the reported text is the declaration collapsed to a line.
  //  Reading `code` (not `raw`) is what will stop COMMENTED-OUT CODE reporting: a rule block parked
  //  inside a /* */ (`/* .sel { will-change: height; } */`) puts a real `{`-anchored declaration into
  //  the raw text, which blanking suppresses. No such block exists today — swapping `code` for `raw`
  //  changes nothing for rules 4-5 right now — so this is the guard against one landing, not a live
  //  dependency. (Blanking IS load-bearing today for rules 1-3: nine prose comments carry hexes.)
  //  (Prose that merely NAMES a property mid-sentence needs no blanking — the declaration-boundary
  //  anchor already excludes it; components.css:5284's "…and `will-change: height` cannot composite
  //  it" is preceded by a backtick, not by `^`/`;`/`{`, so it never matched either way.)
  const lineAt = (index: number) => code.slice(0, index).split("\n").length;
  const atDecl = (index: number, rule: string, text: string) =>
    v.push({ file: rel, line: lineAt(index), rule, text: text.replace(/\s+/g, " ").trim() });

  // CSS: property at a declaration boundary (line start, `;` or `{`), value up to `;`/`}`. The `i`
  //  flag is load-bearing, not cosmetic: CSS property names AND keyword values are case-INSENSITIVE
  //  per spec, so `TRANSITION: all` and `WILL-CHANGE: top` are live, browser-honoured declarations.
  // TSX/JS: the camelCase spelling with a quoted value (rule 3's quoted-value idiom) — deliberately
  //  NO `i` flag, because a JS object key IS case-sensitive: `WILLCHANGE: "top"` in a style object
  //  sets nothing, so matching it would report a non-defect. Its VALUE is still CSS, and is folded.
  const declRe = isCss
    ? /(?:^|[;{])\s*(transition-property|transition|will-change)\s*:\s*([^;}]+)/gim
    : /\b(transitionProperty|transition|willChange)\s*:\s*(["'][^"']*["'])/g;

  for (const m of code.matchAll(declRe)) {
    // Case-folded for MATCHING only. `decl` below is sliced from the raw match, so the REPORTED text
    //  keeps the author's original casing and points at exactly what they wrote.
    const prop = m[1].toLowerCase();
    const value = m[2].replace(/^["']|["']$/g, "").toLowerCase();
    const start = m[0].indexOf(m[1]); // drop the consumed `;`/`{` lead from the offset AND the report
    const offset = (m.index ?? 0) + start;
    const decl = m[0].slice(start);

    if (prop === "will-change" || prop === "willchange") {
      // 5. will-change is a COMMA LIST — every entry must be a compositor property (or `auto`).
      //    CSS-wide keywords (inherit/initial/unset/revert/revert-layer) are legal on any property.
      for (const part of value.split(",").map((s) => s.trim()).filter(Boolean)) {
        if (!WILL_CHANGE_OK.has(part) && !CSS_WIDE.has(part)) {
          atDecl(offset, `will-change: ${part} — only {transform, opacity, filter, auto} may be hinted; the browser cannot cheaply promote anything else`, decl);
        }
      }
    } else if (/(?<![\w-])all(?![\w-])/.test(value)) {
      // 4. the bare TOKEN `all`, not the substring — the hyphen guards keep `all-scroll` and any
      //    `--ds-…-all` custom property from false-positiving. The message names the property the
      //    author actually wrote (the camelCase spelling folds back to the CSS one), so a
      //    `transition-property` hit does not read as a `transition` one.
      const propLabel = prop === "transitionproperty" ? "transition-property" : prop;
      atDecl(offset, `${propLabel}: all — list the explicit properties; a wildcard transition animates whatever happens to change, layout included`, decl);
    }
  }
  return v;
}

test("no loose values — weight / hex / spacing in the component layer, transition / will-change across the wider system surface", () => {
  const componentFiles = [...sourceFiles(COMPONENTS_DIR), OVERRIDE_CSS];
  // The motion-only surface: the token CSS, the theme providers and the search layer, minus what the
  //  component pass already scans (components.css is in both lists). Honest measure of what the
  //  widening buys TODAY: zero findings. src/powersearch holds exactly one .tsx — the other nine
  //  files are .ts, which the .tsx/.css filter drops — and src/theme holds four .tsx and no .css.
  //  It is future-proofing, not a cleanup.
  const motionOnlyFiles = [
    ...sourceFiles(TOKENS_DIR),
    ...sourceFiles(THEME_DIR),
    ...sourceFiles(POWERSEARCH_DIR),
  ].filter((f) => !componentFiles.includes(f));
  const all = [
    ...componentFiles.flatMap((f) => scan(f, "all")),
    ...motionOnlyFiles.flatMap((f) => scan(f, "motion")),
  ];
  const debtKey = (x: { file: string; rule: string }) =>
    [...KNOWN_DEBT.keys()].find((k) => {
      const [kFile, kRulePrefix] = k.split("|");
      return x.file.endsWith(kFile) && x.rule.startsWith(kRulePrefix);
    });
  const violations = all.filter((x) => !debtKey(x));
  const matchedDebt = new Set(all.map(debtKey).filter(Boolean));
  for (const [k, why] of KNOWN_DEBT) {
    if (matchedDebt.has(k)) console.warn(`KNOWN DEBT (suppressed): ${k} — ${why}`);
  }
  // A debt entry that no longer matches anything is itself a failure — the list cannot rot.
  const stale = [...KNOWN_DEBT.keys()].filter((k) => !matchedDebt.has(k));
  const report = violations.map((x) => `  ${x.file}:${x.line}  [${x.rule}]\n    ${x.text}`).join("\n");
  expect(violations, violations.length ? `Loose values found:\n${report}` : "").toEqual([]);
  expect(stale, stale.length ? `KNOWN_DEBT entries that no longer match (remove them): ${stale.join(", ")}` : "").toEqual([]);
});
