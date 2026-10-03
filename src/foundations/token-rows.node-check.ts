/* =============================================================================
   token-rows.node-check.ts — THE "A TOKEN ROW MEASURES, IT DOES NOT RESOLVE" GUARD
   -----------------------------------------------------------------------------
   The token table is a point of reference AND the evidence that the system
   obeys its own rules. Both jobs need the same property: the row must be able
   to DISAGREE with the component.

   [[docs-page-spine]] rules the value is read live from the CSS and never hand-typed. [[token-row-shape]] ruled
   the row's column order. Neither stopped the row from RESOLVING the token it
   names — painting a probe with `--ds-fill-accent`, reading that probe back,
   and printing the hex. That agrees by construction. It proves the token layer
   resolves, which nobody doubted, and proves nothing about what the component
   paints. [[measured-token-rows]] is the stricter rule: read the value off the ELEMENT THAT PAINTS
   IT, and print the verdict.

   The five rules, in the order a row fails them:

     R1  Every user-facing Components/* story has a TOKEN SURFACE — a `MeasuredSpec`,
         a `TokenGroup`, a `LiteTokenSpec`, or a `Section` titled ~/token|role|
         spec/i. Floor: ZERO violations. A component cannot ship with no token
         documentation at all.

     R2  A token row is a `MeasuredRow`. `RoleRow` and `RenderedRow` take the
         value from the story — RoleRow resolves the very token it names, and
         RenderedRow accepts whatever the story computed — so neither row can
         disagree with the component. This is the CONVERSION WORK-LIST, and it
         is deliberately left failing: the list of rows nobody has verified is
         more useful checked in than deleted.

     R3  No row hands in a value. `value`, `swatch` and `verdict` are computed
         BY the primitive; a row that receives one is asserting on the story's
         say-so. `MeasuredRowProps` declares none of them, so `tsc` normally
         gets there first (excess property on a JSX attribute is an error) —
         R3 is the belt to those braces and stays reachable through a spread.

     R4  A measured row must not measure a paint the story applied. Inside a
         `MeasuredSpec`, no inline `style` may set a property to `var(<token>)`
         for a token a `MeasuredRow` in that same spec claims. That is the
         static half of "a row must not be able to resolve the token it
         claims"; `assertMeasuredRows` closes the rest at runtime (the measured
         node is not the probe node, and carries no inline paint for the
         property read).

     R5  No `#rrggbb` literal anywhere in a token row's attributes. [[docs-page-spine]] at the
         row level — the value is READ, never typed.

   Why the TypeScript compiler API and not a line regex (the approach in
   loose-values.node-check.ts): a raw text scan can't tell a rendered string
   from an interpolation. `value={`${v.panel} — ${v.panelToken}`}` is a value
   arriving through a variable, and a regex looking for "--" in the source line
   has no way to know that, and false-fires. So each story is parsed, and only
   the LITERAL text of an attribute (string literals + the head/middle/tail
   chunks of a template, never the `${…}` expressions) is tested.

   Runs in the node lane — `vitest.node.config.ts` includes every
   `.node-check.ts` under src, alongside no-lineage / loose-values / registry /
   story-order.
   ============================================================================= */
import { readFileSync, readdirSync } from "node:fs";
import { join, basename, relative } from "node:path";
import { test, expect } from "vitest";
import ts from "typescript";

const ROOT = process.cwd();
const STORIES_DIR = join(ROOT, "src/components/ui");

/** The measured row — the only shape that can disagree with the component. */
const MEASURED_ROW = "MeasuredRow";
/** The legacy rows: they take the value from the story. R2's work-list. */
const LEGACY_ROWS = new Set(["RoleRow", "RenderedRow"]);
/** Every token-row primitive, for the attribute rules. `NoteRow` is prose — a length, a keyword,
 *  a layout fact — and makes no colour claim, so it is not a token row for this guard. */
const ROW_ELEMENTS = new Set([MEASURED_ROW, ...LEGACY_ROWS]);
/** Attributes that hand a computed answer to the row instead of letting it measure one. */
const HANDED_IN = new Set(["value", "swatch", "verdict"]);
/** Elements that, by themselves, constitute a token surface (R1). */
const TOKEN_SURFACES = new Set(["MeasuredSpec", "TokenGroup", "LiteTokenSpec"]);
/** A `Section` whose title reads as the token spec also counts (R1). Word-bounded on purpose: the
 *  unbounded `/spec/i` this replaces matched "Specimen", which nearly every story has — so R1 could
 *  never fire, and a story with no token documentation at all would have passed it silently. */
const TOKEN_SECTION_TITLE = /\b(tokens?|roles?|spec)\b/i;

/** A hand-typed colour: #rgb / #rgba / #rrggbb / #rrggbbaa. */
const HEX_LITERAL = /#[0-9a-f]{3,8}\b/i;
/** A `var(--token)` reference inside an inline style value. */
const VAR_REF = /var\(\s*(--[\w-]+)/g;

type Rule = "R1" | "R2" | "R3" | "R4" | "R5";

interface Violation {
  file: string;
  line: number;
  rule: Rule;
  detail: string;
}

/** User-facing Components/* story files: *.stories.tsx, basename NOT starting with `_`. */
function storyFiles(): string[] {
  return readdirSync(STORIES_DIR)
    .filter((f) => f.endsWith(".stories.tsx") && !basename(f).startsWith("_"))
    .map((f) => join(STORIES_DIR, f))
    .sort();
}

function parse(file: string): ts.SourceFile {
  return ts.createSourceFile(
    file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, /*setParentNodes*/ true, ts.ScriptKind.TSX,
  );
}

/** The opening element of a JSX element/self-closing element, else undefined. */
function openingOf(node: ts.Node): ts.JsxOpeningElement | ts.JsxSelfClosingElement | undefined {
  if (ts.isJsxElement(node)) return node.openingElement;
  if (ts.isJsxSelfClosingElement(node)) return node;
  return undefined;
}

/** Every LITERAL text chunk inside an expression — string literals plus the head / middle / tail
 *  of template literals. The `${…}` interpolations are deliberately skipped: a value arriving
 *  through a variable is exactly what "read it live" looks like, and must never trip a prose rule. */
function literalText(node: ts.Node | undefined): string[] {
  if (!node) return [];
  const out: string[] = [];
  const walk = (n: ts.Node): void => {
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) { out.push(n.text); return; }
    if (ts.isTemplateExpression(n)) {
      out.push(n.head.text);
      for (const span of n.templateSpans) { out.push(span.literal.text); walk(span.expression); }
      return;
    }
    if (ts.isJsxExpression(n)) { if (n.expression) walk(n.expression); return; }
    if (ts.isJsxText(n)) { if (n.text.trim()) out.push(n.text); return; }
    ts.forEachChild(n, walk);
  };
  walk(node);
  return out;
}

/** Map of attribute name -> attribute node for a token-row element. */
function attrsOf(open: ts.JsxOpeningElement | ts.JsxSelfClosingElement, sf: ts.SourceFile) {
  const map = new Map<string, ts.JsxAttribute>();
  for (const a of open.attributes.properties) {
    if (ts.isJsxAttribute(a)) map.set(a.name.getText(sf), a);
  }
  return map;
}

/** Every `--token` referenced through `var()` in an inline `style` object inside `node`, with the
 *  CSS property it was assigned to and the line it sits on. */
function inlinePaints(node: ts.Node, sf: ts.SourceFile): { token: string; prop: string; line: number }[] {
  const out: { token: string; prop: string; line: number }[] = [];
  const walk = (n: ts.Node): void => {
    if (ts.isJsxAttribute(n) && n.name.getText(sf) === "style" && n.initializer) {
      const objects: ts.ObjectLiteralExpression[] = [];
      const collect = (x: ts.Node): void => { if (ts.isObjectLiteralExpression(x)) objects.push(x); ts.forEachChild(x, collect); };
      collect(n.initializer);
      for (const obj of objects) {
        for (const p of obj.properties) {
          if (!ts.isPropertyAssignment(p)) continue;
          const prop = p.name.getText(sf).replace(/['"]/g, "");
          for (const chunk of literalText(p.initializer)) {
            for (const m of chunk.matchAll(VAR_REF)) {
              out.push({ token: m[1], prop, line: sf.getLineAndCharacterOfPosition(p.getStart(sf)).line + 1 });
            }
          }
        }
      }
    }
    ts.forEachChild(n, walk);
  };
  walk(node);
  return out;
}

/** Every `MeasuredRow` inside `node`, with the token and property it claims. */
function claimsIn(node: ts.Node, sf: ts.SourceFile): { token: string; prop: string; line: number }[] {
  const out: { token: string; prop: string; line: number }[] = [];
  const walk = (n: ts.Node): void => {
    const open = openingOf(n);
    if (open && open.tagName.getText(sf) === MEASURED_ROW) {
      const attrs = attrsOf(open, sf);
      const token = literalText(attrs.get("token")?.initializer)[0];
      const prop = literalText(attrs.get("prop")?.initializer)[0];
      if (token) out.push({ token, prop: prop ?? "", line: sf.getLineAndCharacterOfPosition(open.getStart(sf)).line + 1 });
    }
    ts.forEachChild(n, walk);
  };
  walk(node);
  return out;
}

function scanFile(file: string): Violation[] {
  const sf = parse(file);
  const rel = relative(ROOT, file);
  const out: Violation[] = [];
  const at = (n: ts.Node) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;

  let hasTokenSurface = false;

  const visit = (node: ts.Node): void => {
    const open = openingOf(node);
    if (open) {
      const tag = open.tagName.getText(sf);

      // R1 — does this file document its tokens anywhere?
      if (TOKEN_SURFACES.has(tag)) hasTokenSurface = true;
      if (tag === "Section") {
        const title = attrsOf(open, sf).get("title");
        if (title && literalText(title.initializer).some((t) => TOKEN_SECTION_TITLE.test(t))) {
          hasTokenSurface = true;
        }
      }

      // R4 — inside a measurement root, a row must not measure a paint the story applied.
      if (tag === "MeasuredSpec") {
        const claims = claimsIn(node, sf);
        for (const paint of inlinePaints(node, sf)) {
          const clash = claims.find((c) => c.token === paint.token);
          if (clash) {
            out.push({
              file: rel, line: paint.line, rule: "R4",
              detail: `inline \`${paint.prop}: var(${paint.token})\` inside the measurement root, and a MeasuredRow (:${clash.line}) claims ${paint.token} — ` +
                `the row would read back a paint this story applied, so it could never disagree`,
            });
          }
        }
      }

      if (ROW_ELEMENTS.has(tag)) {
        const attrs = attrsOf(open, sf);
        const line = at(open);

        // R2 — the conversion work-list.
        if (LEGACY_ROWS.has(tag)) {
          const subject = literalText(attrs.get("role")?.initializer)[0]
            ?? literalText(attrs.get("token")?.initializer)[0]
            ?? literalText(attrs.get("part")?.initializer)[0]
            ?? literalText(attrs.get("label")?.initializer)[0]
            ?? "";
          out.push({
            file: rel, line, rule: "R2",
            detail: `<${tag}${subject ? ` ${subject}` : ""}> resolves its own token instead of measuring the component — convert to <MeasuredRow select= prop= />`,
          });
        }

        // R3 — nothing is handed in; the primitive computes value, swatch and verdict.
        for (const name of attrs.keys()) {
          if (HANDED_IN.has(name)) {
            out.push({
              file: rel, line, rule: "R3",
              detail: `<${tag}> is handed \`${name}\` — the row must READ that off the painting element, not be told it`,
            });
          }
        }

        // R5 — [[docs-page-spine]] at the row level: the value is read, never typed.
        for (const [name, attr] of attrs) {
          for (const chunk of literalText(attr.initializer)) {
            const hit = chunk.match(HEX_LITERAL);
            if (hit) {
              out.push({
                file: rel, line, rule: "R5",
                detail: `hand-typed colour "${hit[0]}" in \`${name}\` — read it live off the DOM ([[docs-page-spine]])`,
              });
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);

  if (!hasTokenSurface) {
    out.push({
      file: rel, line: 1, rule: "R1",
      detail: "no token surface — expected a <MeasuredSpec>, a <TokenGroup>, a <LiteTokenSpec>, or a <Section title> naming tokens/roles/spec",
    });
  }
  return out;
}

/** Compact the work-list: R2/R3 repeat per row, so a file gets one line per rule plus the lines. */
function report(violations: Violation[]): string {
  const byFile = new Map<string, Violation[]>();
  for (const v of violations) (byFile.get(v.file) ?? byFile.set(v.file, []).get(v.file)!).push(v);
  const blocks: string[] = [];
  for (const [f, vs] of byFile) {
    const byRule = new Map<Rule, Violation[]>();
    for (const v of vs) (byRule.get(v.rule) ?? byRule.set(v.rule, []).get(v.rule)!).push(v);
    const lines: string[] = [];
    for (const [rule, rv] of [...byRule.entries()].sort()) {
      if (rule === "R2") {
        lines.push(`    [R2] ${rv.length} unmeasured row(s) at :${rv.map((v) => v.line).join(", :")}`);
      } else if (rule === "R3") {
        lines.push(`    [R3] ${rv.length} handed-in value(s) at :${rv.map((v) => v.line).join(", :")}`);
      } else {
        for (const v of rv) lines.push(`    :${v.line}  [${v.rule}]  ${v.detail}`);
      }
    }
    blocks.push(`  ${f}\n${lines.join("\n")}`);
  }
  const tally = (["R1", "R2", "R3", "R4", "R5"] as Rule[])
    .map((r) => [r, violations.filter((v) => v.rule === r).length] as const)
    .filter(([, n]) => n > 0)
    .map(([r, n]) => `${r}=${n}`)
    .join("  ");
  return `${tally}\n${blocks.join("\n")}`;
}

test("token rows measure the component, and are never handed a value", () => {
  const violations = storyFiles()
    .flatMap(scanFile)
    .sort((a, b) => (a.file === b.file ? a.line - b.line : a.file < b.file ? -1 : 1));

  expect(
    violations,
    violations.length
      ? `Token-row violations in ${new Set(violations.map((v) => v.file)).size} story file(s) — see DECISIONS [[measured-token-rows]].\n` +
        `R2/R3 are the conversion work-list and are expected to fail until the rows are measured.\n${report(violations)}`
      : "",
  ).toEqual([]);
});
