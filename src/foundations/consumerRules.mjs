/**
 * consumerRules.mjs — the rule engine behind `ds-check`, the check a CONSUMER runs over their
 * own product code.
 *
 * WHY THIS IS A SEPARATE, SMALLER RULE SET THAN THE SYSTEM'S OWN (D9).
 *   `loose-values.node-check.ts` is this repo's AUTHORING guard: a vitest test, in TypeScript,
 *   rooted at `process.cwd()`, carrying a `KNOWN_DEBT` map keyed to this repo's file paths with an
 *   anti-rot arm that fails when an entry stops matching. Point it at a consumer's repo and it goes
 *   red on install, citing debt they have never heard of — so they stop running it, and every rule
 *   is lost including the good ones. Its font-weight / raw-hex / spacing-step rules are also OURS:
 *   they say a product's marketing gradient is a defect, which it is not.
 *
 *   So this file ships only rules that pass one test: **would this be a defect in a codebase that
 *   had never heard of this design system?** Four do. Each rule below states the case in `why`.
 *   A FORK of the system needs none of this — a fork has the vitest suite, and `npm test` is
 *   already its authoring gate.
 *
 * WHAT IT REFUSES TO DO: pretend. A check that reads two file extensions and reports "0 problems"
 *   has told the consumer something false. Every run prints its own reach — the extensions it read,
 *   the extensions present that it did NOT read, and the limits inside the files it did read.
 *
 * THE ESCAPE HATCH is `ds-allow`, the same posture as the system's `data-size-lesson="<reason>"`
 *   (see `boxLaw.ts`): the marker exists to carry the REASON, not to silence the check. An empty
 *   or bare marker does not satisfy the contract, the finding is still printed when it is allowed,
 *   and an allowance whose line stopped violating anything FAILS — the list cannot rot.
 *
 * Plain ESM, `node:` imports only. No dependency, no TypeScript, no vitest: it has to run in a
 * consumer's repo with nothing installed but this package.
 */
import { readdirSync, readFileSync, statSync, lstatSync } from "node:fs";
import { join, relative, extname, sep } from "node:path";

/* ------------------------------------------------------------------------------------------------
   THE RULES
   ---------------------------------------------------------------------------------------------- */

/** @typedef {{id:string,title:string,why:string,fix:string,reads:string}} Rule */

/** @type {Rule[]} */
export const RULES = [
  {
    id: "transition-all",
    title: "a transition animates `all`",
    why:
      "A wildcard transition animates every property that happens to change — layout included — and " +
      "silently absorbs every property a later edit adds. The jank it causes usually appears in a " +
      "change that did not touch the transition, which is why it survives review.",
    fix: "Name the properties you animate, e.g. `transition: opacity 150ms ease, transform 150ms ease;`",
    reads: "CSS syntax, JS/JSX style objects with a quoted value, and tagged CSS-in-JS templates.",
  },
  {
    id: "will-change-misuse",
    title: "`will-change` hints a property the browser cannot cheaply promote",
    why:
      "`will-change` buys a compositor layer. Only transform, opacity and filter are composited, so " +
      "hinting anything else — or `all` — makes the browser hold a layer it can gain nothing from, " +
      "costing memory and sometimes text rendering, permanently.",
    fix: "Hint only transform / opacity / filter, or drop the line. `will-change: auto` resets a hint.",
    reads: "CSS syntax, JS/JSX style objects with a quoted value, and tagged CSS-in-JS templates.",
  },
  {
    id: "focus-outline-removed",
    title: "the focus outline is removed with no visible replacement",
    why:
      "Removing the outline with nothing in its place leaves a keyboard user with no idea where they " +
      "are — WCAG 2.4.7 Focus Visible (AA). It passes every type check and every mouse-driven review, " +
      "and CSS is outside the reach of most JS linters.",
    fix:
      "Keep the outline, or give the same rule a visible focus indicator (box-shadow, a real outline, " +
      "or a border change). Use `:focus-visible` if you only want it for keyboard focus.",
    reads:
      "CSS syntax only — a JS style object cannot be read for a focus alternative reliably, so " +
      "`style={{ outline: \"none\" }}` is NOT caught.",
  },
  {
    id: "tabindex-positive",
    title: "a positive tabindex",
    why:
      "A positive tabindex pulls its element ahead of every element in document order — it reorders " +
      "the WHOLE page, not just this component, and each new one makes the order harder to reason " +
      "about. WCAG 2.4.3 Focus Order. No component can be correct in isolation once one exists.",
    fix: "`tabIndex={0}` to make it focusable, `tabIndex={-1}` for programmatic focus, DOM order for sequence.",
    reads: "JS/JSX (`tabIndex={2}`) and markup attributes (`tabindex=\"2\"`).",
  },
  {
    id: "aschild-nonint",
    title: "`asChild` hands a keyboard-operable control to an element that is not one",
    why:
      "`asChild` renders YOUR element in place of the component's own, and Slot merges className and " +
      "style onto it, so the control still paints exactly right. What does not survive is everything " +
      "the ELEMENT carried: keyboard activation, the focus ring, the disabled state and the pointer " +
      "target. A button rendered as a bare div cannot be reached by Tab or fired by Enter, and nothing " +
      "reports it: not the type checker, not the console, not the rendered page. WCAG 2.1.1 Keyboard, " +
      "2.4.7 Focus Visible and 4.1.2 Name, Role, Value.",
    fix:
      "Slot a real interactive element (`<a href=\"…\">`, `<button>`, your router's link component), or " +
      "put `role` AND `tabIndex` on the child and write the keyboard behaviour yourself.",
    reads:
      "JSX and markup, and only where the child is a literal lowercase tag written next to the parent. " +
      "A child that is a component renders a tag this cannot see, and a child built at runtime is " +
      "invisible to it. The parent names it knows are listed in ASCHILD_CONTROLS.",
  },
];

export const RULE_IDS = RULES.map((r) => r.id);
const RULE_BY_ID = new Map(RULES.map((r) => [r.id, r]));

/** Rule 2's allowlist. `auto` is will-change's initial value — declaring it RESETS a hint rather than
 *  asking for a layer, so it is legal beside the three compositor properties. */
const WILL_CHANGE_OK = new Set(["transform", "opacity", "filter", "auto"]);
/** CSS-wide keywords are legal on every property and say nothing about compositing. */
const CSS_WIDE = new Set(["inherit", "initial", "unset", "revert", "revert-layer"]);
/** Values that mean "no outline". `transparent` is deliberately absent: a transparent outline is a
 *  real forced-colors technique, not a removal. */
const OUTLINE_REMOVED = new Set(["none", "hidden", "0", "0px", "0rem", "0em"]);

/** Rule 5's law, in three tables.
 *
 *  WHY THIS RULE PASSES THIS FILE'S OWN TEST. The defect is universal: handing a keyboard-operable
 *  control's element to a `<div>` breaks Tab, Enter, the focus ring and the disabled state in ANY
 *  codebase, and `asChild` is not this system's idea. It is Radix's, and Ark UI, Chakra v3 and
 *  Base UI all ship the same seam. What is scoped to this package is only the list of PARENT names,
 *  in the same way every rule here is scoped to a repo that installed this package.
 *
 *  THE TAG TABLES ARE THE SAME LAW AS `asChildContract.ts`, which carries them for the dev-time
 *  detector. Two hand-kept copies of "which tags are operable" would drift the first time one was
 *  edited, and the drift would be silent in both directions, so `aschild-contract.node-check.ts`
 *  holds them in step. They are `Set`s here and `Record`s there because each file follows its own
 *  language's convention, and the guard compares sorted key lists rather than the containers. */
export const ASCHILD_OPERABLE_TAGS = new Set(["button", "input", "select", "textarea", "summary"]);
/** Operable only WITH an `href`. An anchor without one is not focusable and not activatable. */
export const ASCHILD_OPERABLE_WITH_HREF = new Set(["a", "area"]);
/** Parent name -> the element it renders when `asChild` is absent. Every name here publishes
 *  `asChild` and roots on a `<button>` or an `<a>`, so a lowercase non-operable child under one of
 *  them is a lost control rather than a style choice. Adding a name is a deliberate act: a parent
 *  whose root is a `<div>` belongs nowhere near this list, because swapping ITS element costs
 *  nothing, and a parent that REFUSES the prop belongs nowhere near it either, because the refusal
 *  ignores the spread and nothing is lost. `ToggleButton` was here until it declared `asChild?: never`
 *  and started destructuring the prop away, which is why it is not here now. */
export const ASCHILD_CONTROLS = new Map([
  ["Button", "button"],
  ["IconButton", "button"],
  ["Link", "a"],
]);

/* ------------------------------------------------------------------------------------------------
   THE ESCAPE HATCH — `ds-allow`
   ---------------------------------------------------------------------------------------------- */

/** Minimum reason length, in non-space characters. Long enough that "temp", "later" and "ok" do not
 *  clear it; short enough that a real half-sentence does. */
export const ALLOW_MIN_REASON = 12;

/** The grammar, stated rather than implied. Printed by `--help` verbatim. */
export const ALLOW_GRAMMAR = [
  "  /* ds-allow <rule-id> — <reason> */",
  "",
  "  <rule-id>   exactly one of the ids listed above.",
  "  <separator> an em dash (—), an en dash (–), a colon (:), or a double hyphen (--) with a",
  "              space on each side. One is required; without it the allowance is rejected.",
  `  <reason>    at least ${ALLOW_MIN_REASON} non-space characters, containing at least one letter.`,
  "              Missing, empty and whitespace-only reasons are all rejected.",
  "  comment     /* … */ anywhere; // … in .ts/.tsx/.js/.jsx/.mjs/.cjs/.scss/.less;",
  "              <!-- … --> in .html/.vue/.svelte/.astro. `//` is not a comment in plain .css,",
  "              so it is not accepted there.",
  "  placement   on the violating line, or alone on the line directly above it (blank lines and",
  "              other comment lines in between are skipped).",
  "",
  "  It suppresses the FAILURE, never the finding: an allowed deviation is still printed, under",
  "  ALLOWED, with its reason. An allowance on a line that no longer violates that rule FAILS, so",
  "  allowances cannot pile up as permanent, meaningless exemptions.",
];

const ALLOW_RE = /(\/\*|\/\/|<!--)[ \t]*ds-allow\b([^\n]*)/g;
const ALLOW_PARSE_RE = /^[ \t]*([A-Za-z0-9][A-Za-z0-9-]*)?[ \t]*(—|–|:|--(?=[ \t]))?([\s\S]*)$/;

/* ------------------------------------------------------------------------------------------------
   REACH — what this check can and cannot read. Stated, never assumed.
   ---------------------------------------------------------------------------------------------- */

export const STYLE_EXT = [".css", ".scss", ".less", ".pcss", ".postcss"];
export const SCRIPT_EXT = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts"];
export const MARKUP_EXT = [".html", ".htm", ".vue", ".svelte", ".astro"];
export const SCANNED_EXT = [...STYLE_EXT, ...SCRIPT_EXT, ...MARKUP_EXT];

/** Extensions that can hold styles or markup and that this check does NOT read. Reported by name
 *  whenever one is present in the tree, because "0 problems" over a repo of `.sass` is a lie.
 *  `.sass` is the indented syntax: it has no `;`/`{}`, so the declaration matcher cannot bound a
 *  value in it — half-reading it would be worse than declaring it unread. */
export const STYLE_OR_MARKUP_LIKE_UNSCANNED = [
  ".sass", ".styl", ".stylus", ".pug", ".jade", ".haml", ".slim", ".hbs", ".handlebars",
  ".ejs", ".njk", ".liquid", ".twig", ".erb", ".php", ".jsp", ".cshtml", ".razor",
  ".mdx", ".md", ".markdown", ".xml", ".xhtml",
];

/** Per-file-type limits inside the files this check DOES read. */
export const WITHIN_FILE_LIMITS = [
  `${SCRIPT_EXT.join(" ")} — style objects whose value is a quoted string ('…', "…" or \`…\`), plus ` +
    "CSS inside a TAGGED template literal (styled.x`…`, styled(X)`…`, css`…`, createGlobalStyle`…`, " +
    "keyframes`…`). An UNTAGGED template holding CSS is not read, and a value that is a variable or " +
    "a call (`transition: theme.motion`) is invisible to this check.",
  `${MARKUP_EXT.join(" ")} — <style> blocks, <script> blocks, style="…" attributes and markup ` +
    "attributes. A framework style BINDING (:style, style:prop, class directives) is not read.",
  `${STYLE_EXT.join(" ")} — read whole. Values built by a preprocessor variable or mixin resolve ` +
    "after this check runs, so a mixin that expands to `transition: all` is not seen.",
  "Any file — a value assembled at runtime from strings cannot be seen by a source scan, in any " +
    "extension. This check is a source scan, not a renderer.",
];

const DIR_IGNORE = new Set([
  "node_modules", "dist", "build", "out", "coverage", "vendor", "tmp", "temp",
  "storybook-static", "__snapshots__",
]);
/** Files above this are generated or vendored in practice; reading them produces noise, not findings. */
const MAX_FILE_BYTES = 2_000_000;

/* ------------------------------------------------------------------------------------------------
   MASKING — split a file into the region each matcher may read, preserving offsets
   ---------------------------------------------------------------------------------------------- */

const blankLine = (s) => s.replace(/[^\n]/g, " ");

/** Same length, same newlines: every char outside `spans` becomes a space, and each span is CLOSED
 *  with a `;`.
 *
 *  The sentinel is not cosmetic. A CSS value is matched as "everything up to `;` or a brace", and a
 *  style attribute has no trailing `;` — so without it, `style="transition: all 100ms"` in a .vue
 *  file ran on into the `<style>` block below and swallowed the `will-change: top` living there,
 *  reporting one confused finding instead of two clear ones. */
function keepOnly(src, spans) {
  const out = blankLine(src).split("");
  for (const [s, e] of spans) {
    for (let i = Math.max(0, s); i < Math.min(src.length, e); i++) out[i] = src[i];
    const close = Math.min(src.length - 1, e);
    if (close >= 0 && out[close] !== "\n") out[close] = ";";
  }
  return out.join("");
}

/** Same length, same newlines: every char INSIDE `spans` becomes a space. */
function blankSpans(src, spans) {
  const out = src.split("");
  for (const [s, e] of spans) {
    for (let i = Math.max(0, s); i < Math.min(src.length, e); i++) if (out[i] !== "\n") out[i] = " ";
  }
  return out.join("");
}

/** Is this template literal CSS? Only when a style tag sits in front of it — `styled.div\`…\``,
 *  `styled(Card)\`…\``, `css\`…\``, `createGlobalStyle\`…\``, `keyframes\`…\``.
 *
 *  WHY TAGGED ONLY, measured: reading every template literal as CSS reported
 *  `loose-values.node-check.ts:212` — a MESSAGE string that happens to contain
 *  "will-change: … only {transform, opacity, filter, auto} may be hinted". Error messages, SQL,
 *  HTML and prose all live in template literals, and a rule that fires on them is a rule a team
 *  turns off. The cost is stated in WITHIN_FILE_LIMITS: an UNTAGGED template holding CSS is not
 *  read. Precision is worth more than reach here, because a false positive costs every rule. */
const CSS_TAG_RE =
  /(?:^|[^\w$.])(?:styled(?:\.[A-Za-z][\w$]*|\([^()]*\))(?:\.[A-Za-z][\w$]*(?:\([^()]*\))?)*|styled|css|createGlobalStyle|keyframes|injectGlobal|cssText|tw|sx)\s*$/;
const isStyleTagged = (src, backtickIndex) =>
  CSS_TAG_RE.test(src.slice(Math.max(0, backtickIndex - 160), backtickIndex));

/** A character scanner rather than a regex, because comments, strings and template literals nest:
 *  a `//` inside a string is not a comment, and a backtick inside a `${}` is not the end of the
 *  template. Returns comment spans (for blanking AND for deciding whether a `ds-allow` is really in
 *  a comment) and template-literal TEXT spans `[start, end, isCss]`, split around each `${…}`. */
/** Where a `/` can legally begin a regex literal rather than a division. Punctuation is enough for
 *  the shapes that matter (`= /…/`, `.replace(/…/, …)`, `[/…/, /…/]`); after an identifier or a
 *  closing paren it is division.
 *
 *  `<` is deliberately ABSENT. A regex after a less-than (`a < /x/.source.length`) is legal and
 *  vanishingly rare; a JSX closing tag is on every second line of a .tsx file, and reading the `/`
 *  of one as a regex start makes the scanner swallow forward to the next `/` on that line. When
 *  that next `/` is the one opening a block comment, the comment never enters the comment list and
 *  an allowance written inside it is silently ignored. Measured: a closing tag followed on the same
 *  line by a block-comment allowance failed the run instead of allowing the line. */
const REGEX_MAY_START_AFTER = new Set([
  undefined, "(", ",", "=", ":", "[", "!", "&", "|", "?", "{", "}", ";", "+", "-", "*", "%", "~", "^", ">", "\n",
]);

/** The second half of the same defect, for the `/` that CLOSES a self-closing element. There the
 *  `<` is far behind and `prev` is whatever preceded the tag's last attribute — `}` after
 *  `<Foo bar={x} />` is in the set above — so the candidate is judged by its BODY instead: a body
 *  that opens on `>` (the tail of `/>`) or reads as `name>` is markup, not a pattern. */
const JSX_TAG_BODY_RE = /^\s*>|^[A-Za-z][\w.:-]*\s*\/?>/;

function scanJs(src, base = 0) {
  const comments = [];
  const templates = [];
  const strings = [];
  const n = src.length;
  let i = 0;
  /** Last significant character seen in CODE, for the regex-vs-division question below. */
  let prev;
  while (i < n) {
    const c = src[i];
    const d = src[i + 1];
    // A regex literal, consumed whole. WITHOUT this, the quote inside `/["'`]/` opens a phantom
    // string and every comment, string and template span after it is wrong — measured: this file's
    // own JSDoc stopped being recognised as a comment, and was reported as a violation.
    if (c === "/" && d !== "/" && d !== "*" && REGEX_MAY_START_AFTER.has(prev)) {
      let j = i + 1;
      let inClass = false;
      let closed = false;
      while (j < n) {
        const ch = src[j];
        if (ch === "\\") { j += 2; continue; }
        if (ch === "\n") break;
        if (ch === "[") inClass = true;
        else if (ch === "]") inClass = false;
        else if (ch === "/" && !inClass) { closed = true; j++; break; }
        j++;
      }
      if (closed && !JSX_TAG_BODY_RE.test(src.slice(i + 1, j - 1))) {
        while (j < n && /[a-z]/.test(src[j])) j++; // flags
        prev = "/";
        i = j;
        continue;
      }
    }
    if (c === "/" && d === "/") {
      const s = i;
      while (i < n && src[i] !== "\n") i++;
      comments.push([base + s, base + i]);
      continue;
    }
    if (c === "/" && d === "*") {
      const s = i;
      i += 2;
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) i++;
      i = Math.min(n, i + 2);
      comments.push([base + s, base + i]);
      continue;
    }
    if (c === '"' || c === "'") {
      const q = c;
      i++;
      const from = i;
      while (i < n) {
        if (src[i] === "\\") { i += 2; continue; }
        if (src[i] === q) { break; }
        if (src[i] === "\n") break;
        i++;
      }
      strings.push([base + from, base + Math.min(i, n)]);
      if (src[i] === q) i++;
      prev = q;
      continue;
    }
    if (c === "`") {
      const isCss = isStyleTagged(src, i);
      i++;
      let start = i;
      while (i < n) {
        if (src[i] === "\\") { i += 2; continue; }
        if (src[i] === "`") { templates.push([base + start, base + i, isCss]); i++; break; }
        if (src[i] === "$" && src[i + 1] === "{") {
          templates.push([base + start, base + i, isCss]);
          i += 2;
          let depth = 1;
          while (i < n && depth > 0) {
            const ch = src[i];
            if (ch === "{") { depth++; i++; continue; }
            if (ch === "}") { depth--; i++; continue; }
            if (ch === "`") {
              i++;
              while (i < n) {
                if (src[i] === "\\") { i += 2; continue; }
                if (src[i] === "`") { i++; break; }
                i++;
              }
              continue;
            }
            if (ch === '"' || ch === "'") {
              const q = ch;
              i++;
              while (i < n) {
                if (src[i] === "\\") { i += 2; continue; }
                if (src[i] === q) { i++; break; }
                if (src[i] === "\n") break;
                i++;
              }
              continue;
            }
            i++;
          }
          start = i;
          continue;
        }
        i++;
      }
      prev = "`";
      continue;
    }
    if (!/\s/.test(c)) prev = c;
    i++;
  }
  return { comments, templates, strings };
}

/** CSS comments. `//` is included for the preprocessor syntaxes where it IS a comment. */
function scanCssComments(src, base = 0, lineComments = false) {
  const spans = [];
  for (const m of src.matchAll(/\/\*[\s\S]*?(?:\*\/|$)/g)) spans.push([base + m.index, base + m.index + m[0].length]);
  if (lineComments) {
    for (const m of src.matchAll(/(^|[^:])\/\/[^\n]*/g)) {
      const off = m.index + m[1].length;
      spans.push([base + off, base + off + (m[0].length - m[1].length)]);
    }
  }
  return spans;
}

const inAnySpan = (index, spans) => spans.some(([s, e]) => index >= s && index < e);

/**
 * Split one file into:
 *   css      — CSS-syntax text, everything else blanked
 *   code     — script + markup text, comments blanked
 *   comments — every real comment span, for `ds-allow` validity
 */
function regionsFor(ext, src) {
  if (STYLE_EXT.includes(ext)) {
    const comments = scanCssComments(src, 0, ext !== ".css");
    return { css: blankSpans(src, comments), code: blankLine(src), comments, strings: [] };
  }
  if (SCRIPT_EXT.includes(ext)) {
    const { comments, templates, strings } = scanJs(src);
    const styleTemplates = templates.filter((t) => t[2]);
    const cssRaw = keepOnly(src, styleTemplates);
    // A CSS comment inside a styled-components template is a real comment, both for matching and
    // for a `ds-allow` sitting in one.
    const cssComments = [];
    for (const [s, e] of styleTemplates) cssComments.push(...scanCssComments(src.slice(s, e), s, false));
    return {
      css: blankSpans(cssRaw, cssComments),
      code: blankSpans(src, comments),
      comments: [...comments, ...cssComments],
      strings,
    };
  }
  if (MARKUP_EXT.includes(ext)) {
    const styleBlocks = [];
    const scriptBlocks = [];
    for (const m of src.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)) {
      const inner = m.index + m[0].indexOf(">") + 1;
      styleBlocks.push([inner, inner + m[1].length]);
    }
    for (const m of src.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)) {
      const inner = m.index + m[0].indexOf(">") + 1;
      scriptBlocks.push([inner, inner + m[1].length]);
    }
    const styleAttrs = [];
    for (const m of src.matchAll(/\bstyle\s*=\s*(["'])([\s\S]*?)\1/gi)) {
      const off = m.index + m[0].indexOf(m[1]) + 1;
      styleAttrs.push([off, off + m[2].length]);
    }
    const htmlComments = [...src.matchAll(/<!--[\s\S]*?(?:-->|$)/g)].map((m) => [m.index, m.index + m[0].length]);
    const jsComments = [];
    const jsTemplates = [];
    const jsStrings = [];
    for (const [s, e] of scriptBlocks) {
      const r = scanJs(src.slice(s, e), s);
      jsComments.push(...r.comments);
      jsTemplates.push(...r.templates.filter((t) => t[2]));
      jsStrings.push(...r.strings);
    }
    const cssSpans = [...styleBlocks, ...styleAttrs, ...jsTemplates];
    const cssComments = [];
    for (const [s, e] of cssSpans) cssComments.push(...scanCssComments(src.slice(s, e), s, false));
    return {
      css: blankSpans(keepOnly(src, cssSpans), cssComments),
      code: blankSpans(src, [...styleBlocks, ...htmlComments, ...jsComments]),
      comments: [...htmlComments, ...jsComments, ...cssComments],
      strings: jsStrings,
    };
  }
  return null;
}

/* ------------------------------------------------------------------------------------------------
   THE MATCHERS
   ---------------------------------------------------------------------------------------------- */

// CSS property names and keyword values are case-INSENSITIVE per spec, so `TRANSITION: ALL` is a
// live declaration. The JS matchers are deliberately case-SENSITIVE: `WILLCHANGE: "top"` in a style
// object sets nothing, so reporting it would be reporting a non-defect.
const CSS_MOTION_RE = /(?:^|[;{])[ \t]*(transition-property|transition|will-change)\s*:\s*([^;{}]+)/gim;
const JS_MOTION_RE = /\b(transitionProperty|transition|willChange)\s*:\s*(["'`][^"'`]*["'`])/g;
const CSS_OUTLINE_RE = /(?:^|[;{])[ \t]*(outline|outline-style|outline-width)\s*:\s*([^;{}]+)/gim;
const CSS_REPLACEMENT_RE =
  /(?:^|[;{])[ \t]*(box-shadow|outline|outline-color|outline-style|outline-width|border|border-color|border-bottom|border-block-end)\s*:\s*([^;{}]+)/gim;
const JSX_TABINDEX_RE = /\btabIndex\s*[=:]\s*\{?\s*["']?\s*(\d+)/g;
const HTML_TABINDEX_RE = /\btabindex\s*=\s*["']?\s*(\d+)/gi;

/** Rule 5. An opening tag whose name starts uppercase is a component in JSX and in every markup
 *  dialect this reads. Captured on its own so the attribute list can be bounded by a scanner
 *  instead of by a regex: a `>` inside `onClick={() => run()}` is not the end of the tag. */
const ASCHILD_PARENT_RE = /<([A-Z][A-Za-z0-9_$.]*)/g;
/** A blanked JSX comment. `regionsFor` turns `{/* … *\/}` into `{` + spaces + `}`, so this is what a
 *  comment between a parent and its child looks like by the time the matchers run. */
const BLANKED_COMMENT_RE = /^\{\s*\}/;
const CHILD_TAG_RE = /^<([a-z][a-z0-9-]*)/;

const collapse = (s) => s.replace(/\s+/g, " ").trim();
const isRemoval = (value) =>
  value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((t) => OUTLINE_REMOVED.has(t));

/** Does this declaration block provide a visible focus indicator of its own? */
function hasVisibleIndicator(body) {
  for (const m of body.matchAll(CSS_REPLACEMENT_RE)) {
    const value = m[2].toLowerCase().trim();
    if (value === "none" || value === "0" || isRemoval(value)) continue;
    return true;
  }
  return false;
}

/** The `{ … }` block containing `index`, plus the selector in front of it. Null inside a style
 *  attribute, which has no block. */
function enclosingBlock(text, index) {
  let depth = 0;
  let open = -1;
  for (let i = index; i >= 0; i--) {
    const ch = text[i];
    if (ch === "}") depth++;
    else if (ch === "{") {
      if (depth === 0) { open = i; break; }
      depth--;
    }
  }
  if (open < 0) return null;
  let s = open - 1;
  while (s >= 0 && !"{};".includes(text[s])) s--;
  let d = 0;
  let end = text.length;
  for (let i = open; i < text.length; i++) {
    if (text[i] === "{") d++;
    else if (text[i] === "}") { d--; if (d === 0) { end = i; break; } }
  }
  return { selector: collapse(text.slice(s + 1, open)), body: text.slice(open + 1, end) };
}

/** A file that restores a visible indicator under `:focus-visible` has made the progressive-
 *  enhancement move (`:focus { outline: none }` + `:focus-visible { outline: … }`) and is not the
 *  defect this rule is about. File-scoped on purpose: the two rules are rarely in one block. */
function fileRestoresFocusVisible(css) {
  // The `includes` guard is load-bearing, not a micro-optimisation: `[^{}]*` over a large
  // brace-free text backtracks quadratically, and a masked .tsx file is exactly that (all spaces).
  // Measured on this repo's own src: 61s before, 2s after.
  if (!css.includes(":focus-visible")) return false;
  for (const m of css.matchAll(/([^{}]*:focus-visible[^{}]*)\{([^{}]*)\}/g)) {
    if (hasVisibleIndicator(m[2])) return true;
  }
  return false;
}

function lineIndexer(src) {
  const starts = [0];
  for (let i = 0; i < src.length; i++) if (src[i] === "\n") starts.push(i + 1);
  return (index) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= index) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };
}

/** Index of the `>` that closes the opening tag whose attribute list starts at `i`, or -1 when this
 *  is not a complete opening tag. A scanner rather than a regex because JSX puts arbitrary
 *  expressions in an attribute list: the `>` in `onClick={() => run()}` and the one in
 *  `title="a > b"` are both inside the tag, not the end of it. */
function openingTagEnd(src, i) {
  let depth = 0;
  let quote = "";
  for (let j = i; j < src.length; j++) {
    const ch = src[j];
    if (quote) {
      if (ch === quote) quote = "";
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if (ch === "{") depth++;
    else if (ch === "}") { if (depth > 0) depth--; }
    else if (depth === 0 && ch === ">") return j;
    else if (depth === 0 && ch === "<") return -1;
  }
  return -1;
}

/** Every `asChild` parent in `code` that hands its element to a literal lowercase tag, yielding
 *  `{ index, parent, element, tag, childAttrs }`.
 *
 *  WHAT IT REFUSES TO GUESS. A child that is a component (`<NextLink>`, `<RouterLink>`) renders a
 *  tag that is not in this file, so it is skipped rather than assumed either way, and a child built
 *  at runtime is not there to read. That is stated in the rule's `reads` and it is why the dev-time
 *  detector exists as well: it sees the element, and this sees the code that never ran. */
function* asChildSwaps(code) {
  for (const m of code.matchAll(ASCHILD_PARENT_RE)) {
    const element = ASCHILD_CONTROLS.get(m[1]);
    if (!element) continue;
    const attrsStart = m.index + m[0].length;
    const tagEnd = openingTagEnd(code, attrsStart);
    if (tagEnd < 0) continue;
    // A self-closing parent has no child to slot at all. Slot renders nothing, which is a different
    // defect and belongs to the runtime detector, which can tell "nothing" from "not written here".
    if (code[tagEnd - 1] === "/") continue;
    if (!/\basChild\b/.test(code.slice(attrsStart, tagEnd))) continue;

    let pos = tagEnd + 1;
    for (;;) {
      const rest = code.slice(pos);
      const blank = /^\s+/.exec(rest);
      if (blank) { pos += blank[0].length; continue; }
      const comment = BLANKED_COMMENT_RE.exec(rest);
      if (comment) { pos += comment[0].length; continue; }
      break;
    }
    const child = CHILD_TAG_RE.exec(code.slice(pos));
    if (!child) continue;
    const childAttrsStart = pos + child[0].length;
    const childEnd = openingTagEnd(code, childAttrsStart);
    yield {
      index: m.index,
      parent: m[1],
      element,
      tag: child[1],
      childAttrs: childEnd < 0 ? "" : code.slice(childAttrsStart, childEnd),
    };
  }
}

/** The same law as `rendersOperable` in `asChildContract.ts`, read off source text instead of off a
 *  React element. `role` alone is not enough and `tabIndex` alone is not enough: a role with no tab
 *  stop cannot be reached, and a tab stop with no role has no name or state to announce. */
function childIsOperable(tag, attrs) {
  if (ASCHILD_OPERABLE_TAGS.has(tag)) return true;
  if (ASCHILD_OPERABLE_WITH_HREF.has(tag)) return /\bhref\s*=/.test(attrs);
  return /\brole\s*=/.test(attrs) && /\btabIndex\s*=/i.test(attrs);
}

/* ------------------------------------------------------------------------------------------------
   CHECK ONE SOURCE
   ---------------------------------------------------------------------------------------------- */

/**
 * @param {string} rel   path as it should be reported
 * @param {string} src   file contents
 * @returns {null | {file:string, findings:Array, allowed:Array, allowIssues:Array, stale:Array}}
 *          null when the extension is outside the scanned set.
 */
export function checkSource(rel, src) {
  const ext = extname(rel).toLowerCase();
  const regions = regionsFor(ext, src);
  if (!regions) return null;
  const { css, code, comments, strings } = regions;
  /** A match in the `code` region must START outside a string literal. `transition: "all 200ms"`
   *  starts at the property, outside the quotes — a defect. `"…tabIndex={2}…"` inside a sentence
   *  starts INSIDE the string: it is documentation, a test fixture or an error message, and this
   *  file's own rule descriptions were the first thing an unfiltered version reported. */
  const inCode = (index) => !inAnySpan(index, strings);
  const lineOf = lineIndexer(src);
  const rawLines = src.split("\n");
  const found = [];
  const add = (ruleId, index, text, detail) =>
    found.push({ file: rel, line: lineOf(index), rule: ruleId, text: collapse(text).slice(0, 160), detail });

  // A file with no CSS region at all (the common .ts/.tsx case) skips every CSS pass.
  const hasCss = /\S/.test(css);

  // Rules 1 + 2 — CSS syntax. Matched against the whole masked text, not line by line: a
  // declaration written one property per line is exactly the shape a per-line regex is blind to.
  if (hasCss) for (const m of css.matchAll(CSS_MOTION_RE)) {
    const prop = m[1].toLowerCase();
    const value = m[2].toLowerCase();
    const lead = m[0].indexOf(m[1]);
    const index = m.index + lead;
    const text = m[0].slice(lead);
    if (prop === "will-change") {
      for (const part of value.split(",").map((s) => s.trim()).filter(Boolean)) {
        if (!WILL_CHANGE_OK.has(part) && !CSS_WIDE.has(part)) {
          add("will-change-misuse", index, text, `hints \`${part}\`, which the browser cannot cheaply promote`);
        }
      }
    } else if (/(?<![\w-])all(?![\w-])/.test(value)) {
      add("transition-all", index, text, `${prop === "transition-property" ? "transition-property" : "transition"}: all`);
    }
  }

  // Rules 1 + 2 — JS/JSX style objects.
  for (const m of code.matchAll(JS_MOTION_RE)) {
    if (!inCode(m.index)) continue;
    const prop = m[1];
    const value = m[2].replace(/^["'`]|["'`]$/g, "").toLowerCase();
    if (prop === "willChange") {
      for (const part of value.split(",").map((s) => s.trim()).filter(Boolean)) {
        if (!WILL_CHANGE_OK.has(part) && !CSS_WIDE.has(part)) {
          add("will-change-misuse", m.index, m[0], `hints \`${part}\`, which the browser cannot cheaply promote`);
        }
      }
    } else if (/(?<![\w-])all(?![\w-])/.test(value)) {
      add("transition-all", m.index, m[0], `${prop === "transitionProperty" ? "transitionProperty" : "transition"}: all`);
    }
  }

  // Rule 3 — focus outline removed, CSS syntax only (see the rule's `reads`).
  const restores = hasCss && css.includes("outline") ? fileRestoresFocusVisible(css) : false;
  if (hasCss && css.includes("outline")) for (const m of css.matchAll(CSS_OUTLINE_RE)) {
    const value = m[2].trim();
    if (!isRemoval(value)) continue;
    const lead = m[0].indexOf(m[1]);
    const index = m.index + lead;
    const block = enclosingBlock(css, index);
    if (block) {
      if (/:not\(\s*:focus-visible\s*\)|:-moz-focusring|::-moz-focus-inner/i.test(block.selector)) continue;
      if (hasVisibleIndicator(block.body)) continue;
      if (restores) continue;
    }
    const where = block?.selector ? `\`${block.selector}\`` : "an inline style attribute";
    add("focus-outline-removed", index, m[0].slice(lead), `${where} removes the outline and declares no visible focus indicator`);
  }

  // Rule 4 — positive tabindex, in script and markup. Reported with its whole source line: the
  // match itself stops mid-attribute (`tabindex="4`), which reads like a typo in our own output.
  for (const re of [JSX_TABINDEX_RE, HTML_TABINDEX_RE]) {
    for (const m of code.matchAll(re)) {
      if (!inCode(m.index)) continue;
      const n = Number(m[1]);
      if (n > 0) {
        add("tabindex-positive", m.index, rawLines[lineOf(m.index) - 1] ?? m[0], `tabindex ${n} jumps ahead of the document's own order`);
      }
    }
  }

  // Rule 5 — `asChild` handing a control to a non-operable element. Reported on the PARENT's line,
  // because that is the line that carries `asChild` and the line a reader has to change.
  for (const swap of asChildSwaps(code)) {
    if (!inCode(swap.index)) continue;
    if (childIsOperable(swap.tag, swap.childAttrs)) continue;
    const lost = ASCHILD_OPERABLE_WITH_HREF.has(swap.tag)
      ? `an \`<${swap.tag}>\` with no \`href\``
      : `a \`<${swap.tag}>\` with no \`role\` and no \`tabIndex\``;
    add(
      "aschild-nonint",
      swap.index,
      rawLines[lineOf(swap.index) - 1] ?? `<${swap.parent} asChild>`,
      `\`${swap.parent}\` renders \`<${swap.element}>\`, and this hands its element to ${lost}, ` +
        `which cannot be tabbed to or fired from the keyboard`,
    );
  }

  // De-dupe: a `transition: all` inside a styled-components template is legitimately visible to both
  // the CSS and the JS matcher.
  const seen = new Set();
  const findings = found.filter((f) => {
    const k = `${f.line}|${f.rule}|${f.detail}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  findings.sort((a, b) => a.line - b.line || a.rule.localeCompare(b.rule));

  const { allows, allowIssues } = parseAllows(rel, src, rawLines, comments, lineOf);
  const kept = [];
  const allowed = [];
  for (const f of findings) {
    const allow = allows.find((a) => a.rule === f.rule && a.covers.includes(f.line));
    if (allow) {
      allow.claimed++;
      allowed.push({ ...f, reason: allow.reason, allowLine: allow.line });
    } else {
      kept.push(f);
    }
  }
  const stale = allows
    .filter((a) => a.claimed === 0)
    .map((a) => ({
      file: rel,
      line: a.line,
      rule: a.rule,
      text: collapse(a.raw).slice(0, 160),
      detail:
        `nothing on line${a.covers.length > 1 ? "s" : ""} ${a.covers.join(" or ")} violates \`${a.rule}\` any more`,
    }));

  return { file: rel, findings: kept, allowed, allowIssues, stale };
}

/** Parse every `ds-allow` in the file, validate it against the grammar, and work out which lines it
 *  covers. An INVALID allowance suppresses nothing — the violation under it is still reported. */
function parseAllows(rel, src, rawLines, comments, lineOf) {
  const allows = [];
  const allowIssues = [];
  const issue = (line, raw, detail) =>
    allowIssues.push({ file: rel, line, rule: "ds-allow", text: collapse(raw).slice(0, 160), detail });

  for (const m of src.matchAll(ALLOW_RE)) {
    // Only a real comment can carry an allowance. This is what keeps a `ds-allow` example inside a
    // string literal — this file has several — from being read as one.
    if (!inAnySpan(m.index, comments)) continue;
    const line = lineOf(m.index);
    const rawText = m[0];
    let tail = m[2].replace(/\*\/[\s\S]*$/, "").replace(/-->[\s\S]*$/, "");
    const parsed = ALLOW_PARSE_RE.exec(tail);
    const rule = parsed?.[1];
    const sep = parsed?.[2];
    const reason = (parsed?.[3] ?? "").trim();

    if (!rule) {
      issue(line, rawText, `no rule id. Write \`ds-allow <rule-id> — <reason>\`; ids: ${RULE_IDS.join(", ")}`);
      continue;
    }
    if (!RULE_BY_ID.has(rule)) {
      // The common near-miss: `ds-allow transition-all--reason`. The id swallows the separator, so
      // the honest message names what was parsed AND why it went wrong.
      const hint = rule.includes("--") ? " — a `--` separator needs a space on each side" : "";
      issue(line, rawText, `unknown rule id \`${rule}\`${hint}. Known ids: ${RULE_IDS.join(", ")}`);
      continue;
    }
    if (!sep && reason === "") {
      issue(line, rawText, "bare allowance — it names the rule but gives no reason. A reason is the whole point of the marker");
      continue;
    }
    if (!sep) {
      issue(line, rawText, "no separator between the rule id and the reason. Use an em dash (—), an en dash (–), a colon (:), or ` -- `");
      continue;
    }
    if (reason === "") {
      issue(line, rawText, "the reason is empty or whitespace only");
      continue;
    }
    const dense = reason.replace(/\s+/g, "");
    if (dense.length < ALLOW_MIN_REASON) {
      issue(line, rawText, `the reason is ${dense.length} characters; ${ALLOW_MIN_REASON} is the minimum. Say why this line is right, not that it is`);
      continue;
    }
    if (!/[A-Za-z]/.test(dense)) {
      issue(line, rawText, "the reason contains no letters");
      continue;
    }

    // Coverage: its own line, plus — when the comment is alone on its line — the first line below
    // that carries something other than a comment.
    const covers = [line];
    const before = rawLines[line - 1].slice(0, m.index - (src.lastIndexOf("\n", m.index - 1) + 1));
    if (before.trim() === "") {
      for (let i = line; i < rawLines.length; i++) {
        const t = rawLines[i].trim();
        // A leading `*` is a comment continuation — UNLESS the line opens a block, in which case it
        // is the universal selector and the rule under an allowance is exactly the line we are
        // looking for. Without the `{` test, `* { transition: all }` under its allowance was never
        // the covered line: the violation was reported AND the allowance was called stale.
        const commentTail = t.startsWith("*") && !t.includes("{");
        if (t === "" || t.startsWith("//") || t.startsWith("/*") || commentTail || t.startsWith("<!--")) continue;
        covers.push(i + 1);
        break;
      }
    }
    allows.push({ line, rule, reason, raw: rawText, covers, claimed: 0 });
  }
  return { allows, allowIssues };
}

/* ------------------------------------------------------------------------------------------------
   WALK A TREE
   ---------------------------------------------------------------------------------------------- */

/** @returns {{files:string[], scannedByExt:Map<string,number>, skippedByExt:Map<string,number>,
 *             skippedDirs:number, tooLarge:string[], unreadable:string[]}} */
export function collectFiles(root) {
  const files = [];
  const scannedByExt = new Map();
  const skippedByExt = new Map();
  const tooLarge = [];
  const unreadable = [];
  let skippedDirs = 0;

  const bump = (map, ext) => map.set(ext, (map.get(ext) ?? 0) + 1);

  // A root that cannot be stat'd — missing, or not permitted — is reported the way an unreadable
  // directory inside the tree already is: it joins `unreadable` and the run ends on NOTHING READ.
  // `checkTree` is a library entry point as well as the CLI's, and the CLI's own path check cannot
  // cover a directory deleted between the check and the walk; either way a caller gets a report
  // rather than an ENOENT stack trace.
  let rootStat;
  try {
    rootStat = statSync(root);
  } catch {
    unreadable.push(root);
    return { files, scannedByExt, skippedByExt, skippedDirs, tooLarge, unreadable };
  }
  if (rootStat.isFile()) {
    const ext = extname(root).toLowerCase();
    if (SCANNED_EXT.includes(ext)) { files.push(root); bump(scannedByExt, ext); }
    else bump(skippedByExt, ext || "(no extension)");
    return { files, scannedByExt, skippedByExt, skippedDirs, tooLarge, unreadable };
  }

  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      unreadable.push(dir);
      return;
    }
    for (const entry of entries) {
      const p = join(dir, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        if (DIR_IGNORE.has(entry.name) || entry.name.startsWith(".")) { skippedDirs++; continue; }
        walk(p);
        continue;
      }
      if (!entry.isFile()) continue;
      const ext = extname(entry.name).toLowerCase();
      if (!SCANNED_EXT.includes(ext)) { bump(skippedByExt, ext || "(no extension)"); continue; }
      if (/\.min\.(css|js)$/i.test(entry.name)) { bump(skippedByExt, ".min" + ext); continue; }
      let size = 0;
      try {
        size = lstatSync(p).size;
      } catch {
        unreadable.push(p);
        continue;
      }
      if (size > MAX_FILE_BYTES) { tooLarge.push(p); continue; }
      files.push(p);
      bump(scannedByExt, ext);
    }
  };
  walk(root);
  files.sort();
  return { files, scannedByExt, skippedByExt, skippedDirs, tooLarge, unreadable };
}

/** Run every rule over a directory (or a single file). */
export function checkTree(root) {
  const inventory = collectFiles(root);
  const results = [];
  const unreadable = [...inventory.unreadable];
  for (const file of inventory.files) {
    let src;
    try {
      src = readFileSync(file, "utf8");
    } catch {
      unreadable.push(file);
      continue;
    }
    const rel = relative(root, file) || file.split(sep).pop();
    const r = checkSource(rel, src);
    if (r && (r.findings.length || r.allowed.length || r.allowIssues.length || r.stale.length)) results.push(r);
  }
  const counts = {
    findings: results.reduce((n, r) => n + r.findings.length, 0),
    allowed: results.reduce((n, r) => n + r.allowed.length, 0),
    allowIssues: results.reduce((n, r) => n + r.allowIssues.length, 0),
    stale: results.reduce((n, r) => n + r.stale.length, 0),
  };
  counts.failures = counts.findings + counts.allowIssues + counts.stale;
  return { root, results, counts, reach: { ...inventory, unreadable } };
}

/* ------------------------------------------------------------------------------------------------
   FORMATTING — every failure carries its own paste-ready fix
   ---------------------------------------------------------------------------------------------- */

/** The exact comment to paste, with the reason left blank. The rule's identifier must never be
 *  something a consumer has to go find in our source. */
export const allowSnippet = (ruleId) =>
  `/* ds-allow ${ruleId} — <why this line is right, ${ALLOW_MIN_REASON}+ characters> */`;

function formatFinding(f, { withFix = true } = {}) {
  const rule = RULE_BY_ID.get(f.rule);
  const out = [`  ${f.file}:${f.line}  [${f.rule}]`, `      ${f.text}`, `      ${wrap(f.detail, 92, "      ")}`];
  if (withFix && rule) {
    out.push(`      FIX    ${wrap(rule.fix, 86, "             ")}`);
    out.push(`      ALLOW  ${allowSnippet(f.rule)}`);
  }
  return out.join("\n");
}

/** The rule list, one block per rule. `verbose` adds the case for the rule and its fix. */
export function formatRules({ verbose = false } = {}) {
  const out = [];
  for (const r of RULES) {
    out.push(`  ${r.id}`);
    out.push(`      ${r.title}`);
    if (verbose) {
      out.push(`      WHY    ${wrap(r.why, 86, "             ")}`);
      out.push(`      FIX    ${wrap(r.fix, 86, "             ")}`);
    }
    out.push(`      READS  ${wrap(r.reads, 86, "             ")}`);
    out.push("");
  }
  return out.join("\n").trimEnd();
}

export function formatReach(reach) {
  const out = [];
  const scanned = [...reach.scannedByExt.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const total = scanned.reduce((n, [, c]) => n + c, 0);
  out.push("REACH — what this run actually read");
  out.push(
    total
      ? `  Read ${total} file${total === 1 ? "" : "s"}:  ${scanned.map(([e, c]) => `${e} (${c})`).join("   ")}`
      : "  Read 0 files. Nothing here has an extension this check can read.",
  );
  out.push(`  ${wrap(`Extensions it can read:  ${SCANNED_EXT.join(" ")}`, 94, "      ")}`);

  const skipped = [...reach.skippedByExt.entries()]
    .filter(([e]) => STYLE_OR_MARKUP_LIKE_UNSCANNED.includes(e))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (skipped.length) {
    out.push("");
    out.push("  NOT READ — these are present here, can hold styles or markup, and this check cannot parse them:");
    out.push(`      ${skipped.map(([e, c]) => `${e} (${c})`).join("   ")}`);
    out.push("      No rule was applied to those files. A violation in one of them is NOT reported as clean —");
    out.push("      it is not reported at all.");
  }
  const others = [...reach.skippedByExt.entries()]
    .filter(([e]) => !STYLE_OR_MARKUP_LIKE_UNSCANNED.includes(e))
    .reduce((n, [, c]) => n + c, 0);
  if (others) {
    out.push(`  ${others} further file${others === 1 ? " was" : "s were"} of other types (images, config, data) and not read.`);
  }
  if (reach.tooLarge.length) out.push(`  ${reach.tooLarge.length} file(s) skipped as larger than 2 MB (generated or vendored in practice).`);
  if (reach.unreadable.length) out.push(`  ${reach.unreadable.length} path(s) could not be opened.`);
  out.push(
    `  ${wrap(
      `Directories not entered: ${[...DIR_IGNORE].join(", ")}, and any directory whose name begins with "."` +
        (reach.skippedDirs ? ` — ${reach.skippedDirs} skipped here.` : "."),
      94,
      "  ",
    )}`,
  );
  out.push("");
  out.push("  Inside the files it did read:");
  for (const l of WITHIN_FILE_LIMITS) out.push(`      · ${wrap(l, 92, "        ")}`);
  return out.join("\n");
}

export function formatReport(report) {
  const out = [];
  const { results, counts, reach } = report;
  const filesRead = [...reach.scannedByExt.values()].reduce((n, c) => n + c, 0);
  const unreadStyleLike = [...reach.skippedByExt.entries()]
    .filter(([e]) => STYLE_OR_MARKUP_LIKE_UNSCANNED.includes(e))
    .reduce((n, [, c]) => n + c, 0);

  const failing = results.filter((r) => r.findings.length || r.allowIssues.length || r.stale.length);
  if (failing.length) {
    out.push(`FAILED — ${counts.failures} problem${counts.failures === 1 ? "" : "s"} in ${failing.length} file${failing.length === 1 ? "" : "s"}.`);
    out.push("");
    for (const r of failing) {
      for (const f of r.findings) out.push(formatFinding(f), "");
      for (const a of r.allowIssues) {
        out.push(
          [
            `  ${a.file}:${a.line}  [ds-allow rejected]`,
            `      ${a.text}`,
            `      ${a.detail}`,
            `      FIX    write the allowance in full, or delete it and fix the line.`,
            `      FORM   ${allowSnippet("<rule-id>")}`,
          ].join("\n"),
          "",
        );
      }
      for (const s of r.stale) {
        out.push(
          [
            `  ${s.file}:${s.line}  [ds-allow stale]`,
            `      ${s.text}`,
            `      ${s.detail}`,
            `      FIX    delete this allowance. It is not protecting anything, and an allowance nobody`,
            `             can trace is how an exemption list turns permanent.`,
          ].join("\n"),
          "",
        );
      }
    }
    const fired = [...new Set(results.flatMap((r) => r.findings.map((f) => f.rule)))];
    if (fired.length) {
      out.push("WHY THESE RULES");
      for (const id of fired) {
        const rule = RULE_BY_ID.get(id);
        out.push(`  ${id} — ${rule.title}`);
        out.push(`      ${wrap(rule.why, 94, "      ")}`);
      }
      out.push("");
    }
  } else if (filesRead === 0) {
    // NOT a pass. A green headline over a directory nothing could be read in is the false comfort
    // this check exists to refuse — a wrong path argument would look identical to clean code.
    out.push("NOTHING READ — 0 files here carry an extension this check can read. This is not a pass.");
    out.push("  Check the path you gave it, and the REACH block below.");
    out.push("");
  } else {
    out.push(`PASSED — no problems in the ${filesRead} file${filesRead === 1 ? "" : "s"} this check read.`);
    out.push("");
  }

  const allowedAll = results.flatMap((r) => r.allowed);
  if (allowedAll.length) {
    out.push(`ALLOWED — ${allowedAll.length} declared deviation${allowedAll.length === 1 ? "" : "s"}. Printed, not failed.`);
    for (const a of allowedAll) {
      out.push(`  ${a.file}:${a.line}  [${a.rule}]  ${a.text}`);
      out.push(`      because: ${a.reason}`);
    }
    out.push("");
  }

  out.push(formatReach(report.reach));
  out.push("");
  out.push(
    counts.failures
      ? `${counts.failures} problem${counts.failures === 1 ? "" : "s"} to fix` +
          (counts.allowed ? `, ${counts.allowed} allowed` : "") +
          ". Each one above prints its fix and the exact comment that would allow it."
      : `${filesRead} file${filesRead === 1 ? "" : "s"} read, nothing to fix in ${filesRead === 1 ? "it" : "them"}` +
          (counts.allowed ? `, ${counts.allowed} deviation(s) allowed` : "") +
          ".",
  );
  if (unreadStyleLike) {
    out.push(
      `  ${unreadStyleLike} file${unreadStyleLike === 1 ? "" : "s"} that can hold styles or markup ` +
        `${unreadStyleLike === 1 ? "was" : "were"} NOT read — see NOT READ above. This result says nothing about ${unreadStyleLike === 1 ? "it" : "them"}.`,
    );
  }
  return out.join("\n");
}

function wrap(text, width, indent) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    if (line && line.length + 1 + w.length > width) { lines.push(line); line = w; }
    else line = line ? `${line} ${w}` : w;
  }
  if (line) lines.push(line);
  return lines.join(`\n${indent}`);
}
