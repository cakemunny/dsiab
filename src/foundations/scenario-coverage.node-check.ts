/* =============================================================================
   scenario-coverage.node-check.ts — WHAT THE SCENARIO SUITE ACTUALLY EXERCISES
   -----------------------------------------------------------------------------
   The scenario suite exists because a census found the roster documented alone.
   Measured 2026-09-02 across 104 registry entries and 170 story files: 50
   components appeared ONLY in their own story page, and 4 appeared nowhere as a
   JSX tag at all. The most-composed things in this repository were layout
   primitives, and the most-composed real component was Button, at 25 files.

   Components documented alone are not wrong. They are untested in the dimension
   that matters most for a design system. A portal opened inside another portal,
   an input whose field chrome meets a focus trap, a container that seeds a size
   into a slot: none of those can fail on a page that renders one component.

   The first scenario proved the point on its first run. It reproduced three
   contrast shortfalls that were, until then, page-local registered exclusions on
   three separate documentation pages. Reproducing all three without trying is
   evidence they are a position every product screen inherits, rather than three
   incidental exceptions.

   WHAT THIS GUARD MEASURES, and why it is two numbers rather than one:

     1. COVERAGE. Every ported component appears in at least one scenario. The
        uncovered set must equal NOT_YET_COVERED exactly, in BOTH directions, so
        the suite cannot silently lose a component and the register cannot outlive
        the gap it describes.

     2. OVERLAP. How many scenarios each component appears in. Coverage alone is
        satisfied by rendering everything once and retiring it, which is a
        checklist rather than a test. A control that works as a form field under
        one set of neighbours has not been shown to work as a filter under
        another. The suite is built for recurrence on purpose, so this reports the
        distribution and fails if it collapses into a tick-list.

   WHY A REGISTER RATHER THAN A FLAT "EVERYTHING IS COVERED". The suite is built
   one scenario at a time. A guard demanding full coverage on day one is red for
   as long as the work takes, and a permanently red guard is one nobody reads.
   NOT_YET_COVERED is the honest state. Shrinking it is the visible unit of
   progress, and the anti-rot arm means a name cannot sit in it once its scenario
   renders the component.

   FIVE REASONS A NAME CAN BE ABSENT FROM THE TAG SCAN, and only one of them is a
   gap. Collapsing them into a single list overstates the gap by a fifth, so each
   has its own register below, and each register is MACHINE-CHECKED rather than
   trusted from its own prose:

     HOOKS                — the name does not begin with an uppercase letter, so
                            JSX reads it as a DOM tag and it can never render a
                            component. Checked against the name itself.
     TYPES                — the name is a type, written in a prop and never
                            rendered. Checked against its module's source: it
                            must be declared as a type or interface and never as
                            a value.
     NO_COMPONENT_EXPORT  — registry.json publishes no export matching the entry's
                            own name, so `<Name>` does not exist to be written.
                            Checked against the entry's exports[].
     VIA_NAMESPACE        — a scenario DOES render it, as `<Parent.Child>`, which a
                            scan for `<Child` cannot see. Checked by finding the
                            namespaced tag in a scenario, so an entry here cannot
                            excuse a component nobody rendered.
     NOT_YET_COVERED      — the real gap. Nothing renders it yet.
   ============================================================================= */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { test, expect } from "vitest";

const ROOT = process.cwd();
const SCENARIOS = join(ROOT, "src/scenarios");
const REGISTRY = join(ROOT, "registry.json");

interface Entry { name: string; status: string; module?: string; exports?: string[] }

/**
 * Hooks. A hook is called rather than rendered, and its lowercase first letter means JSX would
 * compile `<useLightbox>` into a DOM element rather than a component. The arm below re-derives that
 * from the NAME, so this list cannot be used to excuse a component.
 */
const HOOKS: Record<string, string> = {
  useLightbox: "a hook, called rather than rendered",
  useAnnounce: "a hook, called rather than rendered; it owns the shared live regions ([[registry-module-paths]])",
  useMediaQuery: "a hook, called rather than rendered; published from src/hooks ([[registry-module-paths]])",
  useSizeLane: "a hook, called rather than rendered; the public half of the size lanes ([[size-lane-hook]])",
  useReorder: "a hook, called rather than rendered; the reorder capability, whose visible half is DragHandle ([[reorder-capability]])",
};

/**
 * Types. A type is written in a prop rather than rendered, so no scenario can hold it as a tag. The
 * arm below reads the entry's module and fails unless the name is declared there as a type or
 * interface and never as a value, so this list cannot be used to excuse a component.
 */
const TYPES: Record<string, string> = { AccentColor: "a type, written in a color prop rather than rendered ([[part-colour-parity]])" };

/**
 * Registry entries that publish no component under their own name. The arm below reads exports[] and
 * FAILS if the name turns out to be exported after all, so nothing real can hide here.
 *
 * `Toast` carries a second arm: its real entry points have to appear in a scenario, so the entry is
 * exercised rather than merely excused.
 */
const NO_COMPONENT_EXPORT: Record<string, { why: string; rendersAs?: string[] }> = {
  Field: {
    why: "internal by ruling ([[field-shell]]); the entry publishes only useOptionalFieldControl",
  },
  TypeaheadItem: {
    why: "an option-rendering contract (the TypeaheadOption type and renderOption prop), exports[] is empty",
  },
  Toast: {
    why: "publishes ToastProvider, ToastViewport and useToast — there is no <Toast> tag to write",
    rendersAs: ["ToastProvider", "ToastViewport"],
  },
};

/**
 * Sub-parts a scenario renders through a PARENT'S NAMESPACE rather than by their own name. The tag in
 * the source is `<TopNav.Item>`, so a scan for `<TopNavItem` finds nothing and reports a gap that does
 * not exist. Each entry names the tag that actually renders it, and the arm below fails when that tag
 * is absent from every scenario, so this cannot wave a component through.
 */
const VIA_NAMESPACE: Record<string, string> = {
  TopNavHeading: "<TopNav.Heading",
  TopNavItem: "<TopNav.Item",
};

/**
 * Ported components no scenario renders YET. Every name here is a GAP, not an exemption, and shrinking
 * the list is the unit of progress for the suite. Grouped by the kind of gap, because they are not the
 * same job: some need a seventh scenario, and some are one import away on a page that already exists.
 */
const NOT_YET_COVERED: string[] = [
  // SHRUNK 2026-09-18, when the six scenario pages were replaced by the eight showcase recreations
  // ([[showcases-and-fixture]]). Eight names left this list because a recreation now authors them: Layout and
  // ResizeHandle (the code editor's three-region shell), ChatMessageList (the assistant transcript),
  // ContextMenu (board cards), PowerSearch (mail and board), Toolbar (the mail bulk bar), List
  // (the social feed's trending panel) and Table (the mail message list, from the system's own
  // wrapper rather than Radix). The recreations reach further than the pages they replaced, which
  // is the argument for building showcases against familiar archetypes rather than invented ones:
  // a real product shape asks for components an invented workflow never happens to need.

  // Rendered internally by a component a scenario DOES render, but never authored by one. Real
  // runtime exercise, no compositional evidence: nothing has placed them beside a chosen neighbour.
  "MobileNav", "Calendar",
  // Nothing reaches these at all. A section added to a recreation, or a ninth one.
  // CHANGED 2026-09-20: ToggleButton LEFT this list when the analytics filter bar replaced a wide
  // labelled Switch with a compact pressed-state toggle ([[component-shadowing]]). DragHandle ENTERED it in the same
  // change, and the reason is a ruling rather than neglect. The project board drags the whole card,
  // because a kanban card is Atlassian's stated exception: a handle icon belongs on an entity whose
  // drag is a primary action, "an exception for this is when drag and drop is implied, for example
  // cards on a board". The case a handle is actually FOR — an item that contains other interactive
  // parts, where a whole-item drag would swallow them — does not occur on any of the eight
  // recreations yet. Rendering one somewhere to satisfy this register would be inventing usage to
  // please a counter, which is the opposite of what the register is for.
  // CHANGED 2026-10-02: ToggleButton RE-ENTERED this list. The analytics comparison is a persistent
  // report setting, so it became a surface Select (ToggleButton's Usage page reserves it for a
  // transient, in-context tool such as Bold), and no recreation has a formatting toolbar yet.
  "CommandPalette", "Tokenizer", "DragHandle", "ToggleButton",
  "Typeahead", "DateTimeInput", "TopNavMegaMenu", "TopNavMegaMenuFeaturedCard",
  "TopNavMegaMenuItem", "TopNavMenu",
  // Rendered on scenario pages, but imported from Radix or the story kit rather than from the
  // system's own wrapper. The tag is there and the component is not, which is the exact defect the
  // import check below exists to catch.
  "Grid", "Section",
];

const registry: Entry[] = JSON.parse(readFileSync(REGISTRY, "utf8"));
const ported = registry.filter((e) => e.status === "ported").map((e) => e.name);
const exportsOf = (name: string) => registry.find((e) => e.name === name)?.exports ?? [];

/**
 * The source of an entry's module. A module with a slash resolves from src, and a bare module from
 * src/components/ui, with .tsx tried before .ts. An absent file reads as an empty string.
 */
function moduleSource(entry: Entry | undefined): string {
  const module = entry?.module;
  if (!module) return "";
  const base = module.includes("/") ? join(ROOT, "src", module) : join(ROOT, "src/components/ui", module);
  const file = [`${base}.tsx`, `${base}.ts`].find((f) => existsSync(f));
  return file ? readFileSync(file, "utf8") : "";
}

function scenarioFiles(): { name: string; source: string }[] {
  if (!existsSync(SCENARIOS)) return [];
  return readdirSync(SCENARIOS)
    .filter((f) => f.endsWith(".stories.tsx"))
    .sort()
    .map((f) => ({ name: f, source: readFileSync(join(SCENARIOS, f), "utf8") }));
}

/**
 * Names a file imports, mapped to the module they come from. A tag scan alone is not enough,
 * because names collide: the story kit exports its own `Section`, and the registry has a Radix
 * `Section`. Matching `<Section` would credit the wrong one and report coverage the suite does not
 * have. This guard found exactly that on its first run.
 */
function importedFrom(source: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of source.matchAll(/import\s*\{([^}]*)\}\s*from\s*"([^"]+)"/g)) {
    const specifier = m[2];
    for (const raw of m[1].split(",")) {
      // `X`, `X as Y`, `type X`. The local binding is what a tag refers to.
      const local = raw.replace(/\btype\b/, "").trim().split(/\s+as\s+/).pop()?.trim();
      if (local) out.set(local, specifier);
    }
  }
  return out;
}

/** True when this local binding is the SYSTEM component rather than a same-named import. */
function isSystemComponent(specifier: string | undefined): boolean {
  if (!specifier) return false;
  // The system's own components live under components/ui/<Name>. The story kit lives there too,
  // so it is excluded by name rather than by directory.
  return /components\/ui\//.test(specifier) && !/_storyKit/.test(specifier);
}

/** Which scenarios render a given component, by opening JSX tag AND by where the name came from. */
function appearances(): Map<string, string[]> {
  const files = scenarioFiles().map((f) => ({ ...f, imports: importedFrom(f.source) }));
  const out = new Map<string, string[]>();
  for (const name of ported) {
    // `<Name>`, `<Name />` or `<Name.Sub`. Anchored on the opening angle bracket, so a mention in
    // prose or an import line does not count as a render.
    const tag = new RegExp(`<${name}[\\s/>.]`);
    out.set(
      name,
      files
        .filter((f) => tag.test(f.source) && isSystemComponent(f.imports.get(name)))
        .map((f) => f.name),
    );
  }
  return out;
}

/** True when any scenario source contains this literal tag, for example `<TopNav.Item`. */
function tagAppearsSomewhere(tag: string): boolean {
  return scenarioFiles().some((f) => f.source.includes(tag));
}

const seen = appearances();
const covered = ported.filter((n) => (seen.get(n) ?? []).length > 0);
const accountedFor = new Set([
  ...Object.keys(HOOKS),
  ...Object.keys(TYPES),
  ...Object.keys(NO_COMPONENT_EXPORT),
  ...Object.keys(VIA_NAMESPACE),
]);
const uncovered = ported.filter((n) => (seen.get(n) ?? []).length === 0 && !accountedFor.has(n));

test("the scan finds scenarios, and finds components inside them", () => {
  // The positive control. With no scenario files every component reads as uncovered, which would
  // make the register look correct while measuring nothing at all.
  expect(scenarioFiles().length, `no *.stories.tsx found in ${SCENARIOS}`).toBeGreaterThan(0);
  expect(covered.length, "no component is rendered by any scenario — the tag scan is broken").toBeGreaterThan(0);
});

test("the uncovered set is exactly the register, in both directions", () => {
  const lost = uncovered.filter((n) => !NOT_YET_COVERED.includes(n));
  const stale = NOT_YET_COVERED.filter((n) => !uncovered.includes(n));

  expect(lost, "these components stopped being rendered by any scenario, so coverage regressed").toEqual([]);
  expect(
    stale,
    "these are registered as not-yet-covered but a scenario renders them now. Delete them from " +
      "NOT_YET_COVERED rather than leaving a list that overstates the gap",
  ).toEqual([]);
});

test("every excused name is real, and its excuse is checked rather than believed", () => {
  for (const [name, reason] of Object.entries(HOOKS)) {
    expect(reason.length, `${name} is excused with no reason`).toBeGreaterThan(10);
    expect(
      registry.find((e) => e.name === name),
      `HOOKS names ${name}, which is not in registry.json`,
    ).toBeDefined();
    // The machine check. A hook's name starts lowercase, so JSX cannot render it as a component.
    expect(
      /^[a-z]/.test(name),
      `${name} starts with a capital, so it is a component rather than a hook. Move it out of HOOKS`,
    ).toBe(true);
  }

  for (const [name, reason] of Object.entries(TYPES)) {
    expect(reason.length, `${name} is excused with no reason`).toBeGreaterThan(10);
    const entry = registry.find((e) => e.name === name);
    expect(entry, `TYPES names ${name}, which is not in registry.json`).toBeDefined();
    // The machine check. The module declares the name as a type or interface and never as a value.
    const source = moduleSource(entry);
    expect(
      new RegExp(`export\\s+(type|interface)\\s+${name}\\b`).test(source),
      `${name} is not exported as a type or interface from ${entry?.module}. Move it out of TYPES`,
    ).toBe(true);
    expect(
      new RegExp(`export\\s+(const|let|var|function|class)\\s+${name}\\b`).test(source),
      `${name} is exported as a value from ${entry?.module}, so a scenario can render it. Move it out of TYPES`,
    ).toBe(false);
  }

  for (const [name, { why, rendersAs }] of Object.entries(NO_COMPONENT_EXPORT)) {
    expect(why.length, `${name} is excused with no reason`).toBeGreaterThan(10);
    expect(
      registry.find((e) => e.name === name),
      `NO_COMPONENT_EXPORT names ${name}, which is not in registry.json`,
    ).toBeDefined();
    // The machine check. If the entry publishes its own name, `<Name>` exists and the excuse is false.
    expect(
      exportsOf(name).includes(name),
      `${name} IS exported under its own name, so a scenario can render <${name}>. ` +
        `Remove it from NO_COMPONENT_EXPORT and either cover it or register it as a gap`,
    ).toBe(false);
    // And where the entry names its real entry points, those have to be rendered somewhere.
    for (const alias of rendersAs ?? []) {
      expect(
        exportsOf(name).includes(alias),
        `${name} claims to render as <${alias}>, which it does not export`,
      ).toBe(true);
      expect(
        tagAppearsSomewhere(`<${alias}`),
        `${name} is excused because it renders as <${alias}>, but no scenario renders that either`,
      ).toBe(true);
    }
  }

  for (const [name, tag] of Object.entries(VIA_NAMESPACE)) {
    expect(
      registry.find((e) => e.name === name),
      `VIA_NAMESPACE names ${name}, which is not in registry.json`,
    ).toBeDefined();
    // The machine check. The namespaced tag has to be in a scenario, or this is a gap wearing a label.
    expect(
      tagAppearsSomewhere(tag),
      `${name} is excused because a scenario renders it as \`${tag}\`, but no scenario contains ` +
        `that tag. Either render it, or move ${name} into NOT_YET_COVERED`,
    ).toBe(true);
  }

  // No name may sit in two registers at once, which would let a change to one silently stop mattering.
  const all = [
    ...Object.keys(HOOKS),
    ...Object.keys(TYPES),
    ...Object.keys(NO_COMPONENT_EXPORT),
    ...Object.keys(VIA_NAMESPACE),
    ...NOT_YET_COVERED,
  ];
  const twice = all.filter((n, i) => all.indexOf(n) !== i);
  expect(twice, "these names appear in more than one register").toEqual([]);
});

test("the suite overlaps rather than ticking each component off once", () => {
  /* Coverage alone is satisfiable by rendering each component exactly once, which is a checklist.
     The value is in a component recurring under different neighbours.

     The floor is written against the NUMBER OF SCENARIOS rather than a constant, so it cannot
     quietly stop meaning anything: one scenario cannot overlap with itself, and the assertion only
     binds once a second scenario exists. */
  const files = scenarioFiles();
  const counts = covered.map((n) => (seen.get(n) ?? []).length);
  const inMoreThanOne = counts.filter((c) => c > 1).length;

  const distribution = new Map<number, number>();
  for (const c of counts) distribution.set(c, (distribution.get(c) ?? 0) + 1);
  const summary = [...distribution.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([scenarios, components]) => `${components} in ${scenarios} scenario(s)`)
    .join(", ");

  if (files.length < 2) {
    expect(inMoreThanOne, "a single scenario cannot overlap with itself").toBe(0);
    return;
  }
  expect(
    inMoreThanOne,
    `no component appears in more than one scenario, so the suite is a tick-list rather than a set ` +
      `of overlapping compositions. Distribution: ${summary}`,
  ).toBeGreaterThan(0);
});
