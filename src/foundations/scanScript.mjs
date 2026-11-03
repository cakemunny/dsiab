/**
 * scanScript.mjs — the character scanner that finds the comments, strings and template-literal text
 * in a script file, so a matcher never reads a word on a page, or a message, as code.
 *
 * It is a scanner and not a parser: it tracks only what decides where a comment, string, template
 * or piece of JSX text begins and ends. `sourceRegions.mjs` turns what it finds into the regions each
 * matcher reads. `ds-check` and `dsiab usage` both read source through it ([[jsx-text-masking]],
 * [[local-usage-scan]]).
 *
 * Plain ESM, no imports: it has to run in a consumer's repo with nothing installed but this package.
 */


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

/** JSX TEXT IS TEXT. A page's words sit in JSX text, and the scanner used to read them as code: a
 *  `/*` in `<Code>/* x</Code>` opened a comment that ran to the end of the file, a `//` in a written
 *  web address ate the rest of its line, and the apostrophe in `Don't` opened a string. Every finding
 *  they covered vanished while the run stayed clean. Measured on 2026-11-03, and held by
 *  `jsx-text-masking.node-check.ts`.
 *
 *  So in a file that can hold JSX the scanner keeps a stack of frames: `code` (with its own brace
 *  depth), `tag` (an opening tag's attributes) and `children` (text between tags). Text is skipped,
 *  and every `{…}` inside a tag or between tags is scanned as code again, so a JSX comment is still a
 *  comment and an allowance written in one still counts.
 *
 *  An element can start only where an expression can: after the punctuation below or after one of
 *  these keywords. A TypeScript generic that looks like a tag (`<T,>(x) =>`, `<T extends X>`,
 *  `<T>(a: T) => T`) is refused by its head. A file whose JSX never closes is scanned again without
 *  any of this, so a parse this code cannot follow costs no more than it did before. */
export const JSX_EXT = [".tsx", ".jsx", ".js", ".mjs", ".cjs"];
const JSX_MAY_START_AFTER = new Set([undefined, "(", ",", "=", ":", "?", "[", "{", "}", ";", "&", "|", "!", ">"]);
const JSX_MAY_START_KEYWORD = /(?:^|[^\w$])(?:return|yield|await|default|case|else|do)\s*$/;
const TS_GENERIC_HEAD_RE = /^<\s*[A-Za-z_$][\w$]*\s*(?:,|extends\b|>\s*\()/;

function jsxMayStart(src, i, prev) {
  const next = src[i + 1];
  if (next !== ">" && !/[A-Za-z]/.test(next ?? "")) return false;
  if (!JSX_MAY_START_AFTER.has(prev) && !JSX_MAY_START_KEYWORD.test(src.slice(Math.max(0, i - 12), i))) return false;
  return !TS_GENERIC_HEAD_RE.test(src.slice(i, i + 64));
}

/** One step inside a `tag` or `children` frame. Returns the next index. */
function stepJsx(src, i, frames, found, base) {
  const c = src[i];
  const d = src[i + 1];
  if (c === "{") { frames.push({ t: "code", depth: 0 }); return i + 1; }
  if (frames[frames.length - 1].t === "tag") {
    if (c === "/" && d === "*") {
      const end = src.indexOf("*/", i + 2);
      const e = end < 0 ? src.length : end + 2;
      found.comments.push([base + i, base + e]);
      return e;
    }
    if (c === "/" && d === "/") {
      const end = src.indexOf("\n", i);
      const e = end < 0 ? src.length : end;
      found.comments.push([base + i, base + e]);
      return e;
    }
    if (c === '"' || c === "'") {
      const end = src.indexOf(c, i + 1);
      const e = end < 0 ? src.length : end;
      found.strings.push([base + i + 1, base + e]);
      return e + 1;
    }
    if (c === "/" && d === ">") { frames.pop(); return i + 2; }
    if (c === ">") { frames[frames.length - 1] = { t: "children" }; return i + 1; }
    return i + 1;
  }
  if (c === "<" && d === "/") {
    const end = src.indexOf(">", i);
    frames.pop();
    return end < 0 ? src.length : end + 1;
  }
  if (c === "<" && (d === ">" || /[A-Za-z]/.test(d ?? ""))) { frames.push({ t: "tag" }); return i + 1; }
  return i + 1;
}

/** The index just past a regex literal that starts at the `/` at `i`, or -1 when the `/` does not
 *  open one: no closing `/` on its line, or a body that reads as the tail of a JSX tag. WITHOUT this,
 *  the quote inside `/["'`]/` opens a phantom string and every comment, string and template span after
 *  it is wrong. Measured: this file's own JSDoc stopped being recognised as a comment, and was
 *  reported as a violation. */
function regexLiteralEnd(src, i) {
  const n = src.length;
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
  if (!closed || JSX_TAG_BODY_RE.test(src.slice(i + 1, j - 1))) return -1;
  while (j < n && /[a-z]/.test(src[j])) j++; // flags
  return j;
}

/** The index of the quote that closes the string opened at `i`, or of the newline or end of file
 *  that cut it short. A backslash escapes the character after it. */
function quotedEnd(src, i) {
  const q = src[i];
  const n = src.length;
  let j = i + 1;
  while (j < n) {
    if (src[j] === "\\") { j += 2; continue; }
    if (src[j] === q || src[j] === "\n") break;
    j++;
  }
  return j;
}

/** The index just past the `}` that closes a `${` whose body starts at `i`. Strings and nested
 *  templates inside the body are skipped whole, so a brace inside one does not count. */
function interpolationEnd(src, i) {
  const n = src.length;
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
      const close = quotedEnd(src, i);
      i = src[close] === ch ? close + 1 : close;
      continue;
    }
    i++;
  }
  return i;
}

/** Scan the template literal whose backtick is at `i`. Each run of TEXT, split around every `${…}`,
 *  joins `templates` as `[start, end, isCss]`. Returns the index just past the closing backtick. */
function scanTemplate(src, i, base, templates) {
  const n = src.length;
  const isCss = isStyleTagged(src, i);
  i++;
  let start = i;
  while (i < n) {
    if (src[i] === "\\") { i += 2; continue; }
    if (src[i] === "`") { templates.push([base + start, base + i, isCss]); return i + 1; }
    if (src[i] === "$" && src[i + 1] === "{") {
      templates.push([base + start, base + i, isCss]);
      i = interpolationEnd(src, i + 2);
      start = i;
      continue;
    }
    i++;
  }
  return i;
}

export function scanJs(src, base = 0, jsx = false) {
  const comments = [];
  const templates = [];
  const strings = [];
  const found = { comments, strings };
  /** The JSX frame stack. The bottom frame is the file's own code and never pops. */
  const frames = [{ t: "code", depth: 0 }];
  const n = src.length;
  let i = 0;
  /** Last significant character seen in CODE, for the regex-vs-division question below. */
  let prev;
  while (i < n) {
    const top = frames[frames.length - 1];
    if (top.t !== "code") {
      i = stepJsx(src, i, frames, found, base);
      // The tree closed. What follows an element is an operator or punctuation, so a `/` there is
      // division, and `)` says so.
      if (frames.length === 1) prev = ")";
      continue;
    }
    const c = src[i];
    const d = src[i + 1];
    if (jsx && c === "<" && jsxMayStart(src, i, prev)) {
      frames.push({ t: "tag" });
      i++;
      continue;
    }
    if (c === "}" && top.depth === 0 && frames.length > 1) {
      frames.pop();
      i++;
      continue;
    }
    if (c === "{") top.depth++;
    else if (c === "}" && top.depth > 0) top.depth--;
    // A regex literal, consumed whole. `regexLiteralEnd` says why it must be.
    if (c === "/" && d !== "/" && d !== "*" && REGEX_MAY_START_AFTER.has(prev)) {
      const end = regexLiteralEnd(src, i);
      if (end > 0) {
        prev = "/";
        i = end;
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
      const close = quotedEnd(src, i);
      strings.push([base + i + 1, base + Math.min(close, n)]);
      i = src[close] === c ? close + 1 : close;
      prev = c;
      continue;
    }
    if (c === "`") {
      i = scanTemplate(src, i, base, templates);
      prev = "`";
      continue;
    }
    if (!/\s/.test(c)) prev = c;
    i++;
  }
  if (frames.length > 1) return scanJs(src, base, false);
  return { comments, templates, strings };
}
