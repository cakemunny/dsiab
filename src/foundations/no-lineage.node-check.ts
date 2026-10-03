/* =============================================================================
   no-lineage.node-check.ts — THE "NO PORTING LINEAGE IN STORIES" GUARD
   -----------------------------------------------------------------------------
   The INVERSE of loose-values.node-check.ts. Where that guard scans the SHIPPED
   component surface and EXEMPTS the .stories.tsx scaffolding, this one scans the
   STORY prose and exempts the code: user-facing Storybook must carry zero
   porting/planning lineage (Astryx / upstream / "lifted use…" / commit hashes /
   agent-gap / [[component-registry]] / wave-N / bare "port"). That provenance belongs in DECISIONS.md
   and the .tsx source-header notices — NEVER in a rendered story a reader sees.

   Why a real parser and not a whole-file regex: a text scan trips on `import` /
   `export` / `Portal` / `useTransport` — none of which a reader ever sees. So we
   parse each story with the TypeScript compiler API and extract ONLY the strings
   that render to a reader:

     1. every JsxText node (the visible text between tags);
     2. string / template-literal values of the copy attributes
        { blurb, caption, lead, standfirst, note, desc, label, title, message };
     3. string / template-literal {"…"} children of the copy elements
        { Text, Decision, PageHeader, Section, Caption, Muted, Scenario, DoDont }.

   EXEMPT (never scanned):
     - the children/contents of <Code> elements (code snippets);
     - the id attribute of <Decision> (ledger-code strings) and the
       source / type / name / def / role attribute values (prop names, prop-table
       type strings, file names) — none are copy attributes, so they never match;
     - all comments and import/export statements (inherently — they are not
       reader-visible strings in the AST sense above);
     - _-prefixed fixture stories (_internal, exempt like the stories themselves).

   The banned vocabulary lives in ONE module (lineageTerms.ts) so the strip pass
   and this guard can never drift. Runs in the node lane (vitest.node.config.ts /
   `npm run test:tokens` / the pretest hook), like the other *.node-check.ts.
   ============================================================================= */
import { readFileSync, readdirSync } from "node:fs";
import { join, basename, relative } from "node:path";
import { test, expect } from "vitest";
import ts from "typescript";
import { findLineageMatches } from "./lineageTerms";

const ROOT = process.cwd();
const STORIES_DIR = join(ROOT, "src/components/ui");

/** Copy render-props whose string value is shown to a reader. */
const COPY_ATTRS = new Set([
  "blurb", "caption", "lead", "standfirst", "note", "desc", "label", "title", "message",
]);
/** JSX elements whose string/template children render as reader prose. */
const COPY_ELEMENTS = new Set([
  "Text", "Decision", "PageHeader", "Section", "Caption", "Muted", "Scenario", "DoDont",
]);

interface Violation {
  file: string;
  line: number;
  term: string;
  snippet: string;
}

/** User-facing Components/* story files: *.stories.tsx, basename NOT starting with `_`. */
function storyFiles(): string[] {
  return readdirSync(STORIES_DIR)
    .filter((f) => f.endsWith(".stories.tsx") && !basename(f).startsWith("_"))
    .map((f) => join(STORIES_DIR, f))
    .sort();
}

/** The tag name of a JSX element node (`Code`, `Table.Cell`, …), else undefined. */
function tagOf(node: ts.Node, sf: ts.SourceFile): string | undefined {
  if (ts.isJsxElement(node)) return node.openingElement.tagName.getText(sf);
  if (ts.isJsxSelfClosingElement(node)) return node.tagName.getText(sf);
  return undefined;
}

/** True when the node sits anywhere inside a <Code>…</Code> element (exempt). */
function isInsideCode(node: ts.Node, sf: ts.SourceFile): boolean {
  for (let p = node.parent; p; p = p.parent) {
    if (ts.isJsxElement(p) && p.openingElement.tagName.getText(sf) === "Code") return true;
  }
  return false;
}

/** True when a string/template literal is a copy-attribute value OR a copy-element child. */
function isCopyLiteral(node: ts.Node, sf: ts.SourceFile): boolean {
  const isLiteral =
    ts.isStringLiteral(node) ||
    ts.isNoSubstitutionTemplateLiteral(node) ||
    ts.isTemplateExpression(node);
  if (!isLiteral) return false;
  if (isInsideCode(node, sf)) return false;

  const parent = node.parent;
  // name="…"  (string literal directly as the attribute value)
  if (parent && ts.isJsxAttribute(parent)) {
    return COPY_ATTRS.has(parent.name.getText(sf));
  }
  if (parent && ts.isJsxExpression(parent)) {
    const gp = parent.parent;
    // name={"…"} / name={`…`}
    if (gp && ts.isJsxAttribute(gp)) return COPY_ATTRS.has(gp.name.getText(sf));
    // {"…"} as a direct child of a copy element
    if (gp && ts.isJsxElement(gp)) return COPY_ELEMENTS.has(gp.openingElement.tagName.getText(sf));
  }
  return false;
}

/** True when a `component`/`story` property sits inside a `description: { … }`
 *  object — i.e. the Storybook autodocs blurb `parameters.docs.description.component`
 *  (or `.story`), which renders as reader-visible prose in the Docs tab but is not a
 *  JSX copy channel. Often written as a `"…" + "…"` string concatenation. */
function isUnderDescription(node: ts.PropertyAssignment): boolean {
  const objLit = node.parent;
  if (!objLit || !ts.isObjectLiteralExpression(objLit)) return false;
  const owner = objLit.parent;
  return !!owner && ts.isPropertyAssignment(owner) && owner.name.getText() === "description";
}

/** Collapse whitespace + clip a raw source slice into a one-line snippet. */
function snippetOf(raw: string, matchIndex: number): string {
  const collapsed = raw.replace(/\s+/g, " ").trim();
  if (collapsed.length <= 120) return collapsed;
  // Center the window on the match so the banned term is always visible.
  const approx = raw.slice(0, matchIndex).replace(/\s+/g, " ").length;
  const start = Math.max(0, approx - 50);
  return (start > 0 ? "…" : "") + collapsed.slice(start, start + 118) + "…";
}

function scanFile(file: string): Violation[] {
  const src = readFileSync(file, "utf8");
  const sf = ts.createSourceFile(
    file, src, ts.ScriptTarget.Latest, /*setParentNodes*/ true, ts.ScriptKind.TSX,
  );
  const rel = relative(ROOT, file);
  const out: Violation[] = [];

  // A reader-visible piece = an absolute [start,end) source span whose raw text
  // renders to a reader. Matching against the RAW source slice keeps every match
  // index perfectly aligned to a source position for accurate line reporting.
  const record = (start: number, end: number) => {
    const raw = src.slice(start, end);
    for (const m of findLineageMatches(raw)) {
      const { line } = sf.getLineAndCharacterOfPosition(start + m.index);
      out.push({ file: rel, line: line + 1, term: m.term, snippet: snippetOf(raw, m.index) });
    }
  };

  const visit = (node: ts.Node): void => {
    // 1. JsxText — the visible text between tags (skip whitespace-only + <Code> bodies).
    if (ts.isJsxText(node)) {
      if (node.getText(sf).trim() && !isInsideCode(node, sf)) {
        record(node.getStart(sf), node.getEnd());
      }
      return;
    }
    // 2 & 3. copy-attribute values + copy-element string/template children.
    if (isCopyLiteral(node, sf)) {
      // For a template literal, scan ONLY the reader-visible parts — the head and each
      // span's literal tail — never the ${…} interpolation expressions (identifiers /
      // property accesses aren't rendered prose, so `${portConfig}` must not false-trip).
      if (ts.isTemplateExpression(node)) {
        record(node.head.getStart(sf), node.head.getEnd());
        for (const span of node.templateSpans) record(span.literal.getStart(sf), span.literal.getEnd());
      } else {
        record(node.getStart(sf), node.getEnd());
      }
    }
    // 4. Storybook autodocs blurb: parameters.docs.description.component / .story.
    //    Reader-visible in the Docs tab but not a JSX channel; record the whole
    //    initializer span so a "…" + "…" concatenation is scanned across both parts.
    if (
      ts.isPropertyAssignment(node) &&
      (node.name.getText(sf) === "component" || node.name.getText(sf) === "story") &&
      isUnderDescription(node)
    ) {
      record(node.initializer.getStart(sf), node.initializer.getEnd());
    }
    // 5. <Decision id="…"> label — the id is RENDERED as the decision's visible heading
    //    (#code · label), so lineage prose in a suffix ("… (agent-gap)", "… over upstream")
    //    reaches the reader. Ledger citations ([[breadcrumb-trail]] / [[catalog-as-specification]] / R10 / [[focus-criterion-numbers]]) carry no lineage term,
    //    so they never match; only an actual banned word in the label trips it.
    if (
      ts.isJsxAttribute(node) &&
      node.name.getText(sf) === "id" &&
      node.initializer &&
      ts.isStringLiteral(node.initializer)
    ) {
      const opening = node.parent.parent; // JsxAttributes → JsxOpeningElement / JsxSelfClosingElement
      const tag =
        opening && (ts.isJsxOpeningElement(opening) || ts.isJsxSelfClosingElement(opening))
          ? opening.tagName.getText(sf)
          : undefined;
      if (tag === "Decision") record(node.initializer.getStart(sf), node.initializer.getEnd());
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);

  return out;
}

test("no porting-lineage prose in user-facing stories", () => {
  const violations = storyFiles()
    .flatMap(scanFile)
    .sort((a, b) => (a.file === b.file ? a.line - b.line : a.file < b.file ? -1 : 1));

  // Group by file for a readable, copy-pasteable strip work-list.
  const byFile = new Map<string, Violation[]>();
  for (const v of violations) (byFile.get(v.file) ?? byFile.set(v.file, []).get(v.file)!).push(v);
  const report = [...byFile.entries()]
    .map(([f, vs]) => `  ${f}\n${vs.map((v) => `    :${v.line}  [${v.term}]  ${v.snippet}`).join("\n")}`)
    .join("\n");

  expect(
    violations,
    violations.length ? `Porting-lineage prose found in ${byFile.size} story file(s):\n${report}` : "",
  ).toEqual([]);
});

/* ---- RULING CITATIONS RENDER AS LINKS ---------------------------------------
   Story copy cites a ruling as `[[name]]`, and the kit's `linkRulings` (in _storyKit.tsx) turns each
   citation into a link without brackets. It reaches only what the kit renders on a story's behalf:
   the `children` of the kit components in CHILD_LINKING, walked through every nested element, and the
   copy props in ATTR_LINKING. A citation anywhere else reaches the reader as raw `[[name]]`.

   So every `[[` in a rendered string (JSX text, or a string literal inside JSX) must sit under a
   linking component through a chain of `children` alone. The walk up from the string stops at the
   first of these:
     - a CHILD_LINKING element: linked;
     - a JSX attribute: linked only when its owner and name appear in ATTR_LINKING, because the walk
       never enters a prop other than `children`. A `data-*` attribute never renders, so it passes;
     - a code element: verbatim by design, so it passes;
     - a `const X: PropDef[]` or `KeyBinding[]` table, from inside the one field the kit renders
       through linkRulings (DATA_LINKING): linked.
   Reaching the top of the file (a story-local component body, a `render` function) means nothing
   links the string. Every `*.stories.tsx` under src is in scope, internal ones too, because they
   render in the same Storybook. */
const CHILD_LINKING: Record<string, true> = { Decision: true, Section: true, Caption: true, Muted: true };
const ATTR_LINKING: Record<string, readonly string[]> = {
  Decision: ["id"],
  Section: ["lead"],
  PageHeader: ["standfirst"],
  Scenario: ["label", "caption"],
  DoDont: ["note"],
  MeasuredRow: ["part", "note"],
  NoteRow: ["part", "value"],
  RenderedRow: ["label"],
  RoleRow: ["part"],
  LiteTokenSpec: ["rationale"],
  TokenGroup: ["blurb"],
  KeyRow: ["action"],
  AnatomyLegend: ["parts"],
  PropTable: ["rows"],
};
/** Typed story tables the kit renders, and the one field of each that it links. */
const DATA_LINKING: Record<string, string> = { "PropDef[]": "desc", "KeyBinding[]": "action" };
const VERBATIM_TAGS: Record<string, true> = { Code: true, code: true, pre: true, kbd: true };

function allStoryFiles(dir = join(ROOT, "src")): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? allStoryFiles(join(dir, d.name)) : d.name.endsWith(".stories.tsx") ? [join(dir, d.name)] : [],
  ).sort();
}

/** "linked", "exempt", or the reason nothing links this string. */
function citationContext(node: ts.Node, sf: ts.SourceFile): "linked" | "exempt" | string {
  let field = "";
  for (let cur = node.parent; cur; cur = cur.parent) {
    if (ts.isJsxAttribute(cur)) {
      const owner = cur.parent.parent;
      const tag = ts.isJsxOpeningElement(owner) || ts.isJsxSelfClosingElement(owner) ? owner.tagName.getText(sf) : "?";
      const attr = cur.name.getText(sf);
      if (attr.startsWith("data-")) return "exempt";
      return ATTR_LINKING[tag]?.includes(attr) ? "linked" : `in <${tag} ${attr}=…>, a prop linkRulings never walks`;
    }
    if (ts.isJsxElement(cur)) {
      const tag = cur.openingElement.tagName.getText(sf);
      if (VERBATIM_TAGS[tag]) return "exempt";
      if (CHILD_LINKING[tag]) return "linked";
    }
    // A function child (`<Foo>{(x) => …}</Foo>`) renders later, and linkRulings leaves it untouched.
    if ((ts.isArrowFunction(cur) || ts.isFunctionExpression(cur)) && ts.isJsxExpression(cur.parent) && !ts.isJsxAttribute(cur.parent.parent)) {
      return "inside a function child, which linkRulings leaves untouched";
    }
    if (ts.isPropertyAssignment(cur) && !field) field = cur.name.getText(sf);
    if (ts.isVariableDeclaration(cur) && cur.type) {
      const linkedField = DATA_LINKING[cur.type.getText(sf)];
      if (linkedField) return field === linkedField ? "linked" : `in the \`${field}\` field of a ${cur.type.getText(sf)} table, which the kit never links`;
    }
  }
  return "under no kit component that runs linkRulings";
}

function scanCitations(file: string): Violation[] {
  const src = readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out: Violation[] = [];
  const inJsx = (node: ts.Node) => {
    for (let p = node.parent; p; p = p.parent) {
      if (ts.isJsxElement(p) || ts.isJsxSelfClosingElement(p) || ts.isJsxFragment(p) || ts.isJsxAttribute(p)) return true;
    }
    return false;
  };
  const visit = (node: ts.Node): void => {
    const rendered =
      ts.isJsxText(node) ||
      ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateExpression(node)) && inJsx(node));
    const text = rendered ? node.getText(sf) : "";
    const at = text.indexOf("[[");
    if (at >= 0) {
      const why = citationContext(node, sf);
      if (why !== "linked" && why !== "exempt") {
        const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf) + at);
        out.push({ file: relative(ROOT, file), line: line + 1, term: why, snippet: snippetOf(text, at) });
      }
      if (ts.isJsxText(node)) return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

test("every rendered [[ruling]] citation passes through linkRulings", () => {
  const violations = allStoryFiles().flatMap(scanCitations);
  const report = violations.map((v) => `  ${v.file}:${v.line}  ${v.term}\n    ${v.snippet}`).join("\n");
  expect(
    violations,
    violations.length
      ? `${violations.length} citation(s) would render with their brackets. Route each through a kit ` +
        `component that runs linkRulings (Muted or Caption for loose prose), or call linkRulings:\n${report}`
      : "",
  ).toEqual([]);
});
