/* =============================================================================
   page-header.node-check.ts — THE TITLE GUARD ([[docs-page-header]])
   -----------------------------------------------------------------------------
   A docs page has to say what it is ABOUT before it says anything else. The
   survey that forced [[docs-page-header]] found 271 of 341 stories opening on a Section, a
   specimen, or a bare diagram — no title at all — and of the 70 that did carry
   a `<PageHeader>`, two conventions were competing: some named the component
   ("Carousel"), some named the STORY ROLE ("Props", "Usage"). A reader
   landing on `System/Carousel → Props` was told the page was called
   "Props", which is the one thing it is not.

   [[docs-page-header]] settles it: every docs story opens with `<PageHeader>` as the FIRST child
   of its `<Page>`; the title leads with the COMPONENT'S NAME, never with a role
   and never editorially; the standfirst is the file's single `DEFINITION`
   constant, so one component states its definition once.

   [[docs-page-header]]'s SUFFIX pass then settles what follows the name. Identical titles on
   every story of a component made the header useless as a "where am I" signal —
   four tabs of Button all headed "Button", with only the sidebar to tell them
   apart. EVERY story appends its role — "Button · Usage", "Button · Anatomy",
   "Slider · Value input" (the original bare-primary exception is retired).
   The ONE carve-out is
   the degenerate double: when the role IS the subject (Changelog's only story
   is "Changelog"), "Changelog · Changelog" would distinguish nothing, so the
   bare name stands — it already says everything a suffix would. The
   separator is " · " — space, MIDDLE DOT U+00B7, space — the Decision-card
   idiom this system already reads as "same subject, next facet". The role still
   also opens the first `<Section>` below the header; the suffix names the page,
   the Section names the content.

   The six page rules, in the order a story fails them:

     P1  The story reaches a `<Page>`. A docs story that renders no Page has no
         header slot at all, so nothing below can be checked.

     P2  `<PageHeader>` is the FIRST child of that Page — not the second, not
         inside the first Section, not under a local wrapper. The message names
         what it found in the slot instead, because "it's in there somewhere"
         is exactly the state this guard exists to stop.

     P4  (checked BEFORE P3, and reported separately) The SUBJECT — everything
         before the separator — is a STORY ROLE. This is the regression class
         that actually shipped: a title that names the tab instead of the
         subject reads as correct in review and is wrong on every page. It gets
         its own message so the fix is obvious — the role goes AFTER the
         subject, never instead of it. Fires only when the subject is already
         wrong, so a component legitimately named `Overlay` can never trip it.

     P3  The title is exactly what the standard says it is:

           · EVERY story is `name · role`, where the role is the story's
             export name humanized: PascalCase split on word boundaries, only
             the first word capitalised (MenuStates → "Menu states",
             ValueInput → "Value input", Usage → "Usage").
           · a Foundations topic follows the same shape, the subject being the
             last segment of meta.title ("Motion · Durations",
             "Elevation · Levels", "Colors · Swatches").
           · the ONE exception is the degenerate double: a story whose role IS
             the subject (Changelog → "Changelog") keeps the bare name —
             "Changelog · Changelog" would distinguish nothing.

         One P3 failure carries its own name in the report, because it reads
         as correct in review and is not a typo:
         `suffix-missing` — a story titled with the bare name. That is the
                            state every page was in before the suffix passes,
                            so it is also exactly what a page the passes
                            MISSED looks like.

         The SUBJECT comes from the same authorities as before. For
         `src/components/ui` it is the file's basename CROSS-CHECKED against
         `registry.json`'s `name` for that `storyPath` — the registry is the
         truth of what exists ([[component-registry]]), so a story file the registry doesn't know
         fails loudly rather than silently self-certifying off its own filename.
         For `src/foundations` it is the last segment of `meta.title`, through a
         named override map.

     P5  The standfirst is present and non-empty. A header with no lead is a
         heading, not a page opening — and an empty standfirst is how the
         DEFINITION-constant rule gets quietly skipped.

     P6  (component pages only) That standfirst IS the file's `DEFINITION`
         constant — referenced directly, `standfirst={DEFINITION}`, or opening a
         fragment, `standfirst={<>{DEFINITION} …</>}`. [[docs-page-header]]'s whole point is that
         one component states its definition ONCE; P5 alone only asked for
         prose, so a hand-typed inline standfirst passed while creating a
         SECOND definition of the component, and two definitions drift.
         Foundations pages are out of scope by design: a topic page has no one
         component to define, its standfirst is per-page, and none of the ten
         declares a DEFINITION at all.

   And two rules about the SCAN rather than about a page:

     E   A stale exemption — an EXEMPT key naming a story that no longer exists,
         so the entry silences nothing while claiming to.

     U   An exported story that carries no `: Story` / `: StoryObj<…>` type
         annotation. This guard and story-order are the only two rules that read
         individual story EXPORTS, and both find them by that annotation — so an
         untyped story export is invisible to every structure guard that could
         see it: it renders in Storybook and neither rule reads it. (The
         file-level guards are unaffected — story-category reads `meta.title`.) U
         catches it by diffing what `storyDecls` actually picked up against every
         PascalCase export whose initializer is object-literal-SHAPED — bare,
         parenthesised, `satisfies Story` or `as Story`, none of which is a
         declaration annotation. It is tied to `storyDecls`' own output rather
         than to a second copy of its predicate, so the two cannot drift apart.
         SCREAMING_CASE constants (`DEFINITION`, `PINS`, `DODONT_LABEL`) and
         `meta` are excluded by case; NON_STORY_EXPORTS is the named escape
         hatch, and it is empty today.

   P6 and U both close holes that `design-system-steward` proved open by
   FALSIFICATION on 2026-07-31. Both were LATENT, not live: at the time all 684
   story exports across every `*.stories.tsx` in src were annotated (355 of them
   in the 100 non-underscore docs files this guard binds to), and all 341
   component-page stories referenced their DEFINITION. Latent is the point — a
   hole nothing is standing in is still a hole, and it is cheapest to close
   while the tree is clean:
     · U  — drop the `: Story` annotation from one story AND delete its
            `<PageHeader>` outright. The guard stayed GREEN: with the annotation
            gone the export had stopped being a story as far as every guard was
            concerned, so deleting its header cost nothing.
     · P6 — replace one `standfirst={DEFINITION}` with a hand-typed string. The
            guard stayed GREEN: P5 asked only whether the standfirst rendered
            something, never where that something came from.

   Why the TypeScript compiler API and not a regex (the approach in
   loose-values.node-check.ts): a story's render is not always in the story. It
   resolves through THREE routes — the story's own `render`, `meta.render`, or
   `meta.component` (which every Foundations page uses: `export const Index:
   Story = {}` renders `SystemIndex`) — and the Page itself can sit under a
   local wrapper (`<DemoNav><Page>` in Token.stories.tsx) or behind a bare
   component reference (`render: () => <MeasureDemo />` in Typography). A line
   scan sees none of that. So each file is parsed, the render entry is resolved
   through all three routes, and the walk follows references into local
   components declared in the same file.

   BINDING: every exported story in every non-underscore `*.stories.tsx` under
   `src/components/ui` and `src/foundations`. Underscore-prefixed files are the
   `_internal/*` behavioural fixtures — test-only, never read as docs.

   Runs in the node lane — `vitest.node.config.ts` includes every
   `.node-check.ts` under src, alongside story-order / token-rows / registry /
   loose-values / no-lineage.
   ============================================================================= */
import { readFileSync, readdirSync } from "node:fs";
import { join, basename, relative } from "node:path";
import { test, expect } from "vitest";
import ts from "typescript";

const ROOT = process.cwd();
const UI_DIR = join(ROOT, "src/components/ui");
const FOUNDATIONS_DIR = join(ROOT, "src/foundations");
const REGISTRY_PATH = join(ROOT, "registry.json");

/** The page chrome from `_storyKit`. Both names are unique in this codebase. */
const PAGE = "Page";
const PAGE_HEADER = "PageHeader";

/** The story-role vocabulary ([[docs-page-spine]]'s spine + the two state-matrix roles). A SUBJECT from this set names
 *  the TAB, not the subject — P4. Anchored, so only an exact role word fires; and P4 additionally
 *  requires the subject to be wrong already, so a component legitimately called e.g. `Overlay` — or
 *  one that someday shares a name with a role — can never trip it. */
const STORY_ROLES = /^(History|Anatomy|Usage|Keyboard|MenuStates|QueueStates|Props|Overview)$/;

/** The separator between a title's subject and its role: space, MIDDLE DOT (U+00B7), space. Written
 *  from the code point rather than pasted, so a look-alike (·, ‧, •, ∙) cannot creep into the rule
 *  itself and quietly bless the wrong glyph across 250-odd pages. The escape IS the mechanism — this
 *  line held the pasted glyph itself until 2026-08-01 — the exact thing the sentence above says it
 *  is not, so the rule was one careless paste away from blessing a look-alike and nothing would have
 *  caught it. `\u00B7` IS the mechanism the comment promises; do not "tidy" it back to the glyph. */
const SEP = ` \u00B7 `;


/** A story's export name as it reads in a title: PascalCase split on word boundaries, first word
 *  capitalised, the rest lowered. `Anatomy` → "Anatomy", `MenuStates` → "Menu states", `ValueInput`
 *  → "Value input". Derived, never a lookup table: a new story export gets its role for free, and no
 *  table can fall out of sync with the export names it claims to cover. */
function humanizeRole(exportName: string): string {
  return exportName
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .split(" ")
    .map((word, i) => (i === 0 ? word : word.toLowerCase()))
    .join(" ");
}

/** Named overrides for a Foundations page whose header SUBJECT is NOT the last segment of
 *  `meta.title`. Empty today: every Foundations topic page titles itself with its topic — including
 *  "Spacing & radius", whose sidebar path was widened to match what the page has always covered.
 *  It exists so a future retitle is a one-line data change here rather than a change to the rule. The
 *  one page that genuinely differs — Index, which is titled "Design system" — rides EXEMPT instead,
 *  because it is not a topic page at all. */
const FOUNDATION_TITLE_OVERRIDE = new Map<string, string>();

/** The constant a component file states its definition in, once ([[docs-page-header]]). Every page of that component
 *  points its standfirst at it — P6. Named here so the rule reads as a rule, not as a magic string. */
const DEFINITION_CONST = "DEFINITION";

/** PascalCase object-literal exports that are legitimately NOT stories, name -> the reason it earns.
 *  Empty today: the only non-story export any docs story file carries is `export default meta`, which
 *  is not a named const at all. It exists so a future non-story export is a one-line data change here
 *  rather than a hole punched in U — and, like EXEMPT, adding a name is a ruling and this map is its
 *  audit trail. */
const NON_STORY_EXPORTS = new Map<string, string>();

/** The exemptions, with the reason each one earns. Exactly two, and both are exempt because they are
 *  NOT docs pages — not because the rule is inconvenient. A story that wants an exemption and is not
 *  in this map simply fails; adding one is a ruling, and this map is its audit trail. A key here that
 *  matches no story on disk is itself a failure (E) — a stale exemption is an unguarded page. */
const EXEMPT = new Map<string, string>([
  [
    "src/foundations/Index.stories.tsx::Index",
    // The front door. Not a component page and not a Foundations topic page — it is the index OF the
    // system, and its header reads "dsiab", which neither the registry rule (P3, component
    // names) nor the topic rule (P3, meta.title's last segment → "Index") can express.
    "the front door — its title names the system, not a component or a topic",
  ],
  [
    "src/foundations/Colors.stories.tsx::FailLoudProbe",
    // A negative test wearing a story's clothes: it renders one deliberately-unmapped swatch to prove
    // the resolver throws instead of painting nothing. It documents nothing, so it renders no <Page>.
    // It is also why Colors counts as a ONE-story topic under P3 and keeps its bare title: an exempt
    // story is not a page a reader can land on, so it cannot be what a suffix disambiguates against.
    "a fail-loud negative probe, not a docs page — it renders no <Page> on purpose",
  ],
]);

type Rule = "P1" | "P2" | "P3" | "P4" | "P5" | "P6" | "E" | "U";

/** Each rule's name travels with every message, so a failure reads as a rule, not a coincidence. */
const RULE_NAME: Record<Rule, string> = {
  P1: "no-page",
  P2: "header-not-first",
  P3: "title-is-not-the-standard",
  P4: "title-is-a-story-role",
  P5: "standfirst-missing",
  P6: "standfirst-is-not-the-definition",
  E: "stale-exemption",
  U: "untyped-story-export",
};

interface Violation {
  file: string;
  story: string;
  line: number;
  rule: Rule;
  /** A narrower name for this specific failure of `rule`, shown in place of RULE_NAME. P3 has one —
   *  `suffix-missing` — because a bare title reads as correct in review, and a generic
   *  "expected X, got Y" would bury the one thing the reader needs to know about it. */
  as?: string;
  detail: string;
}

/* ---- registry: the truth of what exists ([[component-registry]]) ------------------------------ */

interface RegistryEntry {
  name: string;
  storyPath?: string;
}

const REGISTRY_BY_PATH = new Map<string, RegistryEntry>(
  (JSON.parse(readFileSync(REGISTRY_PATH, "utf8")) as RegistryEntry[])
    .filter((e) => typeof e.storyPath === "string")
    .map((e) => [e.storyPath!, e]),
);

/* ---- source plumbing ------------------------------------------------------ */

/** User-facing docs story files: `*.stories.tsx`, basename NOT starting with `_`. */
function storyFiles(): string[] {
  return [UI_DIR, FOUNDATIONS_DIR]
    .flatMap((dir) =>
      readdirSync(dir)
        .filter((f) => f.endsWith(".stories.tsx") && !basename(f).startsWith("_"))
        .map((f) => join(dir, f)),
    )
    .sort();
}

function parse(file: string): ts.SourceFile {
  return ts.createSourceFile(
    file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, /*setParentNodes*/ true, ts.ScriptKind.TSX,
  );
}

/** The opening element of a JSX element / self-closing element, else undefined. */
function openingOf(node: ts.Node): ts.JsxOpeningElement | ts.JsxSelfClosingElement | undefined {
  if (ts.isJsxElement(node)) return node.openingElement;
  if (ts.isJsxSelfClosingElement(node)) return node;
  return undefined;
}

function tagOf(node: ts.Node, sf: ts.SourceFile): string | undefined {
  return openingOf(node)?.tagName.getText(sf);
}

/** Map of attribute name -> attribute node. */
function attrsOf(open: ts.JsxOpeningElement | ts.JsxSelfClosingElement, sf: ts.SourceFile) {
  const map = new Map<string, ts.JsxAttribute>();
  for (const a of open.attributes.properties) if (ts.isJsxAttribute(a)) map.set(a.name.getText(sf), a);
  return map;
}

/** Every LITERAL text chunk inside an expression — string literals, template head/middle/tail, and
 *  rendered JSX text. `${…}` interpolations are followed (a value arriving through a variable is
 *  normal), but contribute only whatever literals they themselves hold. */
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
    if (ts.isJsxText(n)) { if (n.text.trim()) out.push(n.text); return; }
    if (ts.isJsxExpression(n)) { if (n.expression) walk(n.expression); return; }
    ts.forEachChild(n, walk);
  };
  walk(node);
  return out;
}

/** The body of every component-shaped declaration in this file, by name: `function Foo()`,
 *  `const Foo = () => …`, `const Foo = function () {}`. Capitalised names only — that is what JSX
 *  can reference as a tag. These are the local wrappers the walk has to follow. */
function localComponents(sf: ts.SourceFile): Map<string, ts.Node> {
  const out = new Map<string, ts.Node>();
  const walk = (n: ts.Node): void => {
    if (ts.isFunctionDeclaration(n) && n.name && /^[A-Z]/.test(n.name.text) && n.body) {
      out.set(n.name.text, n.body);
    }
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && /^[A-Z]/.test(n.name.text) && n.initializer) {
      const init = n.initializer;
      if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) out.set(n.name.text, init.body);
    }
    ts.forEachChild(n, walk);
  };
  walk(sf);
  return out;
}

/** The `const meta = { … }` object literal. */
function metaObject(sf: ts.SourceFile): ts.ObjectLiteralExpression | undefined {
  let found: ts.ObjectLiteralExpression | undefined;
  const walk = (n: ts.Node): void => {
    if (found) return;
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === "meta"
      && n.initializer && ts.isObjectLiteralExpression(n.initializer)) {
      found = n.initializer;
      return;
    }
    ts.forEachChild(n, walk);
  };
  walk(sf);
  return found;
}

function prop(obj: ts.ObjectLiteralExpression | undefined, name: string, sf: ts.SourceFile): ts.Expression | undefined {
  if (!obj) return undefined;
  for (const p of obj.properties) {
    if (ts.isPropertyAssignment(p) && p.name.getText(sf).replace(/['"]/g, "") === name) return p.initializer;
  }
  return undefined;
}

/* ---- the walk: render entry -> <Page> ------------------------------------- */

interface FileCtx {
  sf: ts.SourceFile;
  locals: Map<string, ts.Node>;
}

/** Turn a render-ish expression into the node whose JSX should be searched. A function contributes
 *  its body; a bare identifier (`component: SystemIndex`, `render: () => <MeasureDemo />` reduced to
 *  the reference) contributes the local declaration it names. */
function entryOf(expr: ts.Expression | undefined, ctx: FileCtx): ts.Node | undefined {
  if (!expr) return undefined;
  if (ts.isArrowFunction(expr) || ts.isFunctionExpression(expr)) return expr.body;
  if (ts.isIdentifier(expr)) return ctx.locals.get(expr.text);
  return expr;
}

/** Every route a story's render can arrive by, in Storybook's own precedence order:
 *  the story's `render`, then `meta.render`, then `meta.component`. */
function renderEntries(story: ts.ObjectLiteralExpression | undefined, meta: ts.ObjectLiteralExpression | undefined, ctx: FileCtx): ts.Node[] {
  const chain = [
    prop(story, "render", ctx.sf),
    prop(meta, "render", ctx.sf),
    prop(meta, "component", ctx.sf),
  ];
  for (const expr of chain) {
    const entry = entryOf(expr, ctx);
    if (entry) return [entry];
  }
  return [];
}

/** The `<Page>` this render reaches, or undefined. Two passes, in that order on purpose: a literal
 *  `<Page>` in the render itself wins (so `<DemoNav><Page>…` finds the real Page and not DemoNav's
 *  innards), and only if there is none does the walk descend into the local components the render
 *  references (`render: () => <ElevationGrid />`). */
function findPage(entry: ts.Node, ctx: FileCtx, seen = new Set<string>()): ts.Node | undefined {
  let hit: ts.Node | undefined;
  const scan = (n: ts.Node): void => {
    if (hit) return;
    if (tagOf(n, ctx.sf) === PAGE) { hit = n; return; }
    ts.forEachChild(n, scan);
  };
  scan(entry);
  if (hit) return hit;

  const refs: string[] = [];
  const collect = (n: ts.Node): void => {
    const tag = tagOf(n, ctx.sf);
    if (tag && ctx.locals.has(tag) && !refs.includes(tag)) refs.push(tag);
    ts.forEachChild(n, collect);
  };
  collect(entry);
  for (const ref of refs) {
    if (seen.has(ref)) continue;
    seen.add(ref);
    const found = findPage(ctx.locals.get(ref)!, ctx, seen);
    if (found) return found;
  }
  return undefined;
}

/** The first child of `<Page>` that renders anything — whitespace text and comment-only expressions
 *  are not content and are skipped. */
function firstRenderedChild(page: ts.Node): ts.Node | undefined {
  if (!ts.isJsxElement(page)) return undefined;
  for (const child of page.children) {
    if (ts.isJsxText(child)) { if (child.text.trim()) return child; continue; }
    if (ts.isJsxExpression(child) && !child.expression) continue;
    return child;
  }
  return undefined;
}

/** What sits in the header slot, in words a reader can act on. */
function describe(node: ts.Node | undefined, sf: ts.SourceFile): string {
  if (!node) return "nothing — the <Page> is empty";
  const tag = tagOf(node, sf);
  if (tag) {
    const open = openingOf(node)!;
    const title = literalText(attrsOf(open, sf).get("title")?.initializer)[0];
    return `<${tag}${title ? ` title="${title}"` : ""}>`;
  }
  if (ts.isJsxFragment(node)) return "a fragment <>…</>";
  const text = node.getText(sf).replace(/\s+/g, " ").trim();
  return `\`${text.length > 60 ? `${text.slice(0, 60)}…` : text}\``;
}

/* ---- expected title ------------------------------------------------------- */

/** The SUBJECT every title on this page leads with — the component's registered name, or the
 *  Foundations topic. What follows it (nothing, or ` · role`) is decided per story. */
interface Expectation {
  subject?: string;
  error?: string;
}

function expectedSubject(file: string, meta: ts.ObjectLiteralExpression | undefined, sf: ts.SourceFile): Expectation {
  const rel = relative(ROOT, file);

  if (file.startsWith(`${UI_DIR}/`)) {
    const base = basename(file).replace(/\.stories\.tsx$/, "");
    const entry = REGISTRY_BY_PATH.get(rel);
    if (!entry) {
      return {
        error: `${rel} is not in registry.json — no storyPath matches it, so there is no authority for what this page is called. `
          + `Register the component ([[component-registry]]: the registry is the truth of what exists) or rename the file back.`,
      };
    }
    if (entry.name !== base) {
      return {
        error: `registry.json calls ${rel} "${entry.name}" but the file is named "${base}" — the two disagree, `
          + `so the title has no single source. Rename the file to ${entry.name}.stories.tsx or fix the registry entry.`,
      };
    }
    return { subject: entry.name };
  }

  const metaTitle = literalText(prop(meta, "title", sf))[0];
  if (!metaTitle) return { error: `${rel}: meta.title is missing or not a string literal — cannot derive the topic name` };
  const override = FOUNDATION_TITLE_OVERRIDE.get(metaTitle);
  return { subject: override ?? metaTitle.split("/").pop()! };
}

/* ---- the scan ------------------------------------------------------------- */

/** Exported story declarations, in source order: `export const <Name>: Story | StoryObj<…> = …`. */
function storyDecls(sf: ts.SourceFile): { name: string; obj?: ts.ObjectLiteralExpression; node: ts.Node }[] {
  const out: { name: string; obj?: ts.ObjectLiteralExpression; node: ts.Node }[] = [];
  for (const stmt of sf.statements) {
    if (!ts.isVariableStatement(stmt)) continue;
    if (!stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) continue;
    for (const decl of stmt.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name) || !decl.type) continue;
      if (!/^Story(Obj)?\b/.test(decl.type.getText(sf))) continue;
      out.push({
        name: decl.name.text,
        obj: decl.initializer && ts.isObjectLiteralExpression(decl.initializer) ? decl.initializer : undefined,
        node: decl,
      });
    }
  }
  return out;
}

/** Every identifier name appearing anywhere inside an expression. Used two ways: to resolve a
 *  standfirst's one hop through a module constant, and to ask whether it made that hop at all (P6). */
function identifiersIn(node: ts.Node | undefined): Set<string> {
  const out = new Set<string>();
  const walk = (n: ts.Node): void => {
    if (ts.isIdentifier(n)) out.add(n.text);
    ts.forEachChild(n, walk);
  };
  if (node) walk(node);
  return out;
}

/** Strip the wrappers a story object can wear before its `{ … }` — `(…)`, `… satisfies Story`,
 *  `… as Story`. Not one of them is a DECLARATION annotation, which is the only thing `storyDecls`
 *  matches on, so all three render as stories and scan as nothing. That is the U hole. */
function objectLiteralUnder(expr: ts.Expression | undefined): ts.ObjectLiteralExpression | undefined {
  let e: ts.Expression | undefined = expr;
  while (e && (ts.isParenthesizedExpression(e) || ts.isSatisfiesExpression(e) || ts.isAsExpression(e))) {
    e = e.expression;
  }
  return e && ts.isObjectLiteralExpression(e) ? e : undefined;
}

/** Story-SHAPED exports: `export const <PascalCase> = { … }`, however that object is wrapped —
 *  annotated or not. PascalCase here means an initial capital AND a lowercase letter somewhere: that
 *  drops the SCREAMING_CASE data constants (`DEFINITION`, `PINS`, `DODONT_LABEL`), which have no
 *  lowercase letter, and `meta`, which has no initial capital. None of them is a story, and all of
 *  them would otherwise be swept up by U. */
function storyShapedExports(sf: ts.SourceFile): { name: string; node: ts.Node }[] {
  const out: { name: string; node: ts.Node }[] = [];
  for (const stmt of sf.statements) {
    if (!ts.isVariableStatement(stmt)) continue;
    if (!stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) continue;
    for (const decl of stmt.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name)) continue;
      const name = decl.name.text;
      if (!/^[A-Z]/.test(name) || !/[a-z]/.test(name)) continue;
      if (!objectLiteralUnder(decl.initializer)) continue;
      out.push({ name, node: decl });
    }
  }
  return out;
}

/** Does this file declare the `DEFINITION` constant [[docs-page-header]] makes the single source of its standfirst? */
function declaresDefinition(sf: ts.SourceFile): boolean {
  return sf.statements.some((s) => ts.isVariableStatement(s)
    && s.declarationList.declarations.some((d) => ts.isIdentifier(d.name) && d.name.text === DEFINITION_CONST));
}

function scanFile(file: string, seenExemptions: Set<string>): Violation[] {
  const sf = parse(file);
  const ctx: FileCtx = { sf, locals: localComponents(sf) };
  const rel = relative(ROOT, file);
  const meta = metaObject(sf);
  const expectation = expectedSubject(file, meta, sf);
  const out: Violation[] = [];
  const lineOf = (n: ts.Node) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;

  const stories = storyDecls(sf);
  const isComponentPage = file.startsWith(`${UI_DIR}/`);
  const definitionDeclared = declaresDefinition(sf);

  // How many pages a reader can actually land on in this file — the exempt ones are not pages. On a
  // Foundations topic this is the whole rule: one landable story and the title stays bare, because a
  // suffix that never varies distinguishes nothing. Derived from the file's own exports, so adding a
  // second Foundations story makes BOTH of them fail until both carry their role.

  // U — the export the annotation-matchers cannot see. Diffed against what storyDecls ACTUALLY
  // returned rather than against a second copy of its predicate, so a change to how stories are
  // recognised can never leave U checking a different question than the guard it protects.
  const visible = new Set(stories.map((s) => s.name));
  for (const cand of storyShapedExports(sf)) {
    if (visible.has(cand.name) || NON_STORY_EXPORTS.has(cand.name)) continue;
    out.push({
      file: rel, story: cand.name, line: lineOf(cand.node), rule: "U",
      detail: `\`export const ${cand.name} = { … }\` carries no \`: Story\` / \`: StoryObj<…>\` type annotation — `
        + `an untyped story export is invisible to every structure guard. This guard and story-order are the `
        + `only two rules that read individual story exports, and BOTH find them by that annotation — so `
        + `${cand.name} renders in Storybook while neither reads it: its header and its place in the spine both `
        + `go unchecked. (story-category still holds: it reads meta.title, per file.) Annotate the `
        + `declaration — \`export const ${cand.name}: Story = { … }\` — since \`satisfies Story\` and \`as Story\` `
        + `type it without declaring it and stay invisible. If it is not a story, record it in NON_STORY_EXPORTS `
        + `with the reason it earns.`,
    });
  }

  for (const story of stories) {
    const key = `${rel}::${story.name}`;
    if (EXEMPT.has(key)) { seenExemptions.add(key); continue; }

    const add = (rule: Rule, line: number, detail: string, as?: string) =>
      out.push({ file: rel, story: story.name, line, rule, as, detail });

    // P1 — does this story reach a <Page> at all?
    const entries = renderEntries(story.obj, meta, ctx);
    const page = entries.map((e) => findPage(e, ctx)).find(Boolean);
    if (!page) {
      add("P1", lineOf(story.node),
        `renders no <Page>, so it has no header slot. Every docs story opens on <Page><PageHeader …/> — `
        + `resolved through the story's own render, meta.render, then meta.component, and none of them reach one.`);
      continue;
    }

    // P2 — is <PageHeader> the FIRST thing inside it?
    const first = firstRenderedChild(page);
    if (tagOf(first ?? page, sf) !== PAGE_HEADER || !first) {
      add("P2", lineOf(page),
        `<PageHeader> is not the first child of <Page> — the slot holds ${describe(first, sf)} instead. `
        + `The title comes before the content, always; a header further down is a heading in the middle of a page.`);
      continue;
    }

    const attrs = attrsOf(openingOf(first)!, sf);
    const headerLine = lineOf(first);

    // What this story's title has to be, exactly. EVERY page appends its role (ruled
    // 2026-08-01 — an unlabelled page is a mistake; the bare-primary exception is dead). The one
    // carve-out is the degenerate double: when the role IS the subject (Changelog's only story is
    // "Changelog"), the suffix would distinguish nothing and the bare name already labels the page.
    const role = humanizeRole(story.name);
    const degenerate = role === expectation.subject;
    const wanted = expectation.subject === undefined ? undefined
      : degenerate ? expectation.subject : `${expectation.subject}${SEP}${role}`;

    const title = literalText(attrs.get("title")?.initializer)[0];
    const trimmed = title?.trim();
    const subject = trimmed?.split(SEP)[0];

    // P4 (before P3) — the SUBJECT names the tab instead of the page's subject. Gated on the subject
    // being wrong ALREADY, so a component that shares its name with a role word cannot trip it.
    if (subject !== undefined && subject !== expectation.subject && (STORY_ROLES.test(subject) || subject === role)) {
      add("P4", headerLine,
        `title="${title}" leads with "${subject}", which is a STORY ROLE, not a subject. The page is about `
        + `${expectation.subject ?? "its component"}; "${subject}" names the tab you clicked to get here. The role goes `
        + `AFTER the subject, never instead of it — title it "${wanted ?? `<the component>${SEP}${role}`}".`);
      continue;
    }

    // P3 — the title is exactly the string the standard specifies.
    if (expectation.error) {
      add("P3", headerLine, expectation.error);
    } else if (trimmed === undefined) {
      add("P3", headerLine,
        `<PageHeader> has no readable \`title\` — it must be the literal string "${wanted}"`);

    // The bare name on a page that is not the primary one. This is what EVERY page looked like before
    // the suffix pass, so it is also what a page that was missed looks like — named, not folded into
    // a generic diff, because "Button" on Button's Anatomy page reads as correct in review.
    } else if (trimmed !== wanted && trimmed === expectation.subject) {
      add("P3", headerLine,
        `title="${trimmed}" is the bare ${isComponentPage ? "component name" : "topic"} — the role suffix is missing. `
        + `Every page names itself (the one exception is a story whose role IS the subject): title it "${wanted}".`,
        "suffix-missing");


    } else if (trimmed !== wanted) {
      add("P3", headerLine,
        `title="${trimmed}" — expected "${wanted}". `
        + (isComponentPage
          ? `The subject is registry.json's name for ${rel}; `
          : `The subject is the last segment of meta.title; `)
        + `the role is this story's export name humanized (${story.name} → "${role}"), and the separator is exactly `
        + `" · " — space, MIDDLE DOT U+00B7, space. A look-alike (•, ∙, ‧) or a hand-written role word fails here.`);
    }

    // P5 — the standfirst is there and says something.
    const standfirst = attrs.get("standfirst");
    if (!standfirst) {
      add("P5", headerLine,
        `<PageHeader title="${title ?? ""}"> has no \`standfirst\` — the one-line definition is part of the header, `
        + `not optional. Reference this file's DEFINITION constant.`);
    } else if (!standfirstText(standfirst, ctx).trim()) {
      add("P5", headerLine,
        `<PageHeader title="${title ?? ""}"> has an EMPTY \`standfirst\` — it renders a blank lead paragraph. `
        + `Reference this file's DEFINITION constant.`);

    // P6 — and that standfirst IS the file's DEFINITION constant. Component pages only: a Foundations
    // topic page has no one component to define, so its standfirst is per-page by design.
    } else if (isComponentPage && !identifiersIn(standfirst.initializer).has(DEFINITION_CONST)) {
      add("P6", headerLine, definitionDeclared
        ? `<PageHeader title="${title ?? ""}"> writes its \`standfirst\` INLINE instead of referencing this file's `
          + `\`${DEFINITION_CONST}\` constant. [[docs-page-header]] makes the standfirst that constant — \`standfirst={${DEFINITION_CONST}}\`, `
          + `or \`standfirst={<>{${DEFINITION_CONST}} …page-specific lead…</>}\` when the page adds to it. An inline `
          + `standfirst is a SECOND definition of ${expectation.subject ?? "this component"}, and two definitions drift: `
          + `the next edit changes one of them.`
        : `<PageHeader title="${title ?? ""}"> writes its \`standfirst\` inline, and this file declares no `
          + `\`const ${DEFINITION_CONST}\` for it to reference. [[docs-page-header]] makes the standfirst the file's single `
          + `${DEFINITION_CONST} constant, so a component states its definition once and every page of it opens on `
          + `the same sentence. Declare \`const ${DEFINITION_CONST}\` and point every <PageHeader> here at it.`);
    }
  }

  return out;
}

/** The text a standfirst will actually render. Follows one hop through an identifier, because the
 *  standard is `standfirst={DEFINITION}` — the value lives in a module constant, by design (one
 *  definition per component is the anti-drift rule), so reading only the attribute would see nothing. */
function standfirstText(attr: ts.JsxAttribute, ctx: FileCtx): string {
  const direct = literalText(attr.initializer).join("");
  if (direct.trim()) return direct;

  const names = identifiersIn(attr.initializer);

  let text = "";
  const walk = (n: ts.Node): void => {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && names.has(n.name.text) && n.initializer) {
      text += literalText(n.initializer).join("");
    }
    ts.forEachChild(n, walk);
  };
  walk(ctx.sf);
  return text;
}

/* ---- report --------------------------------------------------------------- */

function report(violations: Violation[]): string {
  const byFile = new Map<string, Violation[]>();
  for (const v of violations) (byFile.get(v.file) ?? byFile.set(v.file, []).get(v.file)!).push(v);
  const blocks = [...byFile].map(([f, vs]) =>
    `  ${f}\n${vs.map((v) => `    :${v.line}  [${v.rule} · ${v.as ?? RULE_NAME[v.rule]}]  ${v.story} — ${v.detail}`).join("\n")}`);
  const tally = (["P1", "P2", "P3", "P4", "P5", "P6", "E", "U"] as Rule[])
    .map((r) => [r, violations.filter((v) => v.rule === r).length] as const)
    .filter(([, n]) => n > 0)
    .map(([r, n]) => `${r}=${n}`)
    .join("  ");
  return `${tally}\n${blocks.join("\n")}`;
}

test("every docs story opens with a <PageHeader> titled `<subject>` or `<subject> · <role>`", () => {
  const files = storyFiles();
  expect(files.length, "no docs story files found — the guard is scanning the wrong directories").toBeGreaterThan(0);

  const seenExemptions = new Set<string>();
  const violations = files.flatMap((f) => scanFile(f, seenExemptions));

  // A stale exemption is an unguarded page: the story it named is gone or renamed, and the entry now
  // silences nothing while claiming to. The exempt set is the audit trail, so it has to stay true.
  for (const key of EXEMPT.keys()) {
    if (seenExemptions.has(key)) continue;
    const [file, story] = key.split("::");
    violations.push({
      file, story, line: 1, rule: "E",
      detail: `EXEMPT names "${story}", which no longer exists in this file — remove the entry or restore the story. `
        + `Reason on record: ${EXEMPT.get(key)}`,
    });
  }

  violations.sort((a, b) => (a.file === b.file ? a.line - b.line : a.file < b.file ? -1 : 1));

  expect(
    violations,
    violations.length
      ? `Title-standard violations in ${new Set(violations.map((v) => v.file)).size} story file(s) — see DECISIONS [[docs-page-header]].\n`
        + `Every docs story opens with <PageHeader> as the first child of <Page>. Its title LEADS with the subject — `
        + `the component's registered name (registry.json) or the Foundations topic — never with a story role. `
        + `EVERY page appends "${SEP}" + its export name humanized (the one exception: a story whose role IS `
        + `the subject keeps the bare name — "Changelog · Changelog" would distinguish nothing). A component page's standfirst IS that `
        + `file's ${DEFINITION_CONST} constant; and every story export carries its \`: Story\` annotation, without `
        + `which no structure guard can see it at all.\n${report(violations)}`
      : "",
  ).toEqual([]);
});
