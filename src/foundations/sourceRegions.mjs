/**
 * sourceRegions.mjs — split one source file into the regions each matcher may read, preserving every
 * offset, so a match in a region is a match at the same line and column in the file.
 *
 * `scanScript.mjs` finds the comments, strings and template text in script. This module adds the CSS
 * comment scan and the markup split, and assembles the regions. `ds-check` and `dsiab usage` both read
 * source through it ([[jsx-text-masking]], [[local-usage-scan]]).
 *
 * Plain ESM, local imports only: it has to run in a consumer's repo with nothing installed but this
 * package.
 */
import { scanJs, JSX_EXT } from "./scanScript.mjs";

/** The extensions a source scan reads, by the syntax they hold. */
export const STYLE_EXT = [".css", ".scss", ".less", ".pcss", ".postcss"];
export const SCRIPT_EXT = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts"];
export const MARKUP_EXT = [".html", ".htm", ".vue", ".svelte", ".astro"];
export const SCANNED_EXT = [...STYLE_EXT, ...SCRIPT_EXT, ...MARKUP_EXT];

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
/** CSS comments. `//` is included for the preprocessor syntaxes where it IS a comment. */
export function scanCssComments(src, base = 0, lineComments = false) {
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

export const inAnySpan = (index, spans) => spans.some(([s, e]) => index >= s && index < e);

/**
 * Split one file into:
 *   css       — CSS-syntax text, everything else blanked
 *   code      — script + markup text, comments blanked
 *   comments  — every real comment span, for `ds-allow` validity
 *   strings   — quoted string spans, which no matcher in `code` may start inside
 *   templates — template-literal TEXT spans. The motion rules read a style value there on purpose,
 *               and no other rule may start inside one: a message that mentions `tabIndex={2}` is
 *               a message, not a tab order. Measured 2026-11-03, held by
 *               `jsx-text-masking.node-check.ts`.
 */
export function regionsFor(ext, src) {
  if (STYLE_EXT.includes(ext)) {
    const comments = scanCssComments(src, 0, ext !== ".css");
    return { css: blankSpans(src, comments), code: blankLine(src), comments, strings: [], templates: [] };
  }
  if (SCRIPT_EXT.includes(ext)) {
    const { comments, templates, strings } = scanJs(src, 0, JSX_EXT.includes(ext));
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
      templates: templates.map(([s, e]) => [s, e]),
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
    const jsText = [];
    for (const [s, e] of scriptBlocks) {
      const r = scanJs(src.slice(s, e), s);
      jsComments.push(...r.comments);
      jsTemplates.push(...r.templates.filter((t) => t[2]));
      jsText.push(...r.templates.map(([ts, te]) => [ts, te]));
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
      templates: jsText,
    };
  }
  return null;
}
