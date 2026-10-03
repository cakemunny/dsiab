/* =============================================================================
   axe-scope.node-check.ts — AXE CARVE-OUTS STAY NARROW
   -----------------------------------------------------------------------------
   `context.exclude` drops an element from EVERY axe rule, not just the one a
   page meant to forgive. `.storybook/preview.tsx` says so at the global default
   and `_storyKit.tsx` repeats it above `DODONT_LABEL`: the only part of a
   do/don't card that genuinely cannot clear 4.5 is the DO/DON'T word itself
   (semantic step-11 ink on its own step-3 tint, 4.10 at 12px bold), so a page
   marks JUST that row and excludes JUST that.

   That was documented and drifted anyway — 26 `exclude` arrays had widened to
   the whole card, and the blanket was measurably hiding real defects. Two more
   surfaced the moment they were narrowed (2026-08-04): a bare `<Switch>` with no
   accessible name, and a DO specimen whose scrollable box no keyboard user could
   reach. Both had been sitting under `[data-dodont]`.

   So the rule stops being a comment and becomes a gate. A page that needs to
   forgive something else names the RULE (`config.rules`), which is readable in
   review — an exemption nobody can read is indistinguishable from a bug.
   ============================================================================= */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test, expect } from "vitest";
import { COMPOSITION_FIXTURE, SHOWCASES } from "./showcases";

/**
 * WHOLE-STORY AXE OPT-OUTS — the registered set.
 *
 * `Foundations/Enforcement` advertises the mechanism as "axe, every story", and
 * it is not: seven sites set `a11y.test = "off"`, exempting 18 stories. Each is
 * individually defensible — a ~1,500-icon gallery is a heavy sweep, the fail-loud
 * probe must fail loudly, the geometry fixtures mount bare specimens that trip
 * label rules nobody is asserting there. What was not defensible is that the
 * count lived only in a grep, on the one page whose standfirst is "a guarantee
 * whose edge you cannot see is not one".
 *
 * FOUR OF THE SEVEN ARE META-LEVEL, which is the part that actually rots: a story
 * added to `_size.stories.tsx` inherits the exemption with no author decision and
 * no diff to review. Registering the set here turns "someone should re-grep this"
 * into a failing test.
 */
export const AXE_EXEMPT: Record<string, { stories: number; why: string }> = {
  "src/components/ui/_size.stories.tsx":
    { stories: 9, why: "meta — bare size fixtures, no accessible names to assert" },
  "src/components/ui/_focus.stories.tsx":
    { stories: 7, why: "meta — focus-ring probes and specimens the plays clone off-screen ([[focus-ring]]'s token, scrim and drawn-ring sweeps), and [[button-focus-ring-offset]]'s RingGapOutsideEdge and [[tab-panel-focus-clearance]]'s TabPanelRingClearsList turn axe back on for themselves" },
  "src/components/ui/_control-box.stories.tsx":
    { stories: 3, why: "meta — geometry census, bare controls (third story is [[text-spacing-control-box]]'s text-spacing guard)" },
  "src/components/ui/_regressions.stories.tsx":
    { stories: 1, why: "meta — one specimen per fixed defect, several mounted in contexts that REPRODUCE a defect rather than model good use" },
  "src/components/ui/_escape-stack.stories.tsx":
    { stories: 1, why: "meta — layered-dismiss harness" },
  "src/foundations/Colors.stories.tsx":
    { stories: 1, why: "the fail-loud probe must fail loudly" },
  "src/foundations/Elevation.stories.tsx":
    { stories: 1, why: "decorative specimen swatches; contrast asserted separately" },
  "src/foundations/Icons.stories.tsx":
    { stories: 1, why: "~1,500-glyph gallery; a full sweep per render is not affordable" },
};

const ROOT = process.cwd();
const DIRS = [join(ROOT, "src/components/ui"), join(ROOT, "src/foundations")];

/** Selectors that may never appear in a `context.exclude`, and what to use instead. */
const BANNED: Record<string, string> = {
  "[data-dodont]": "the whole do/don't card — use DODONT_LABEL (_storyKit) to exclude only the DO/DON'T word row",
  "[data-dodont-label]":
    "a raw string copy of DODONT_LABEL — import the constant from _storyKit so one edit moves every page",
};

const storyFiles = () =>
  DIRS.flatMap((dir) =>
    readdirSync(dir)
      .filter((f) => f.endsWith(".stories.tsx"))
      .map((f) => join(dir, f)),
  );

test("no axe exclusion is wider than the row it means to forgive", () => {
  const findings: string[] = [];
  for (const file of storyFiles()) {
    const src = readFileSync(file, "utf8");
    src.split("\n").forEach((line, i) => {
      if (line.trimStart().startsWith("//") || line.trimStart().startsWith("*")) return; // prose may discuss them
      if (!/\bexclude\s*:/.test(line) && !/^\s*["'[]/.test(line)) return;
      for (const [selector, why] of Object.entries(BANNED)) {
        if (line.includes(`"${selector}"`) || line.includes(`'${selector}'`)) {
          findings.push(`${file.replace(ROOT + "/", "")}:${i + 1} — "${selector}" is ${why}`);
        }
      }
    });
  }
  expect(findings, `\n${findings.join("\n")}\n`).toEqual([]);
});

/* Anti-rot: DODONT_LABEL must still be the constant these pages reach for. If it stops being
   exported, the guard above is silently unenforceable and every page falls back to a raw string. */
test("DODONT_LABEL is still exported from _storyKit", () => {
  const kit = readFileSync(join(ROOT, "src/components/ui/_storyKit.tsx"), "utf8");
  expect(kit).toMatch(/export const DODONT_LABEL = "\[data-dodont-label\]";/);
});


/* ---- the opt-out set matches reality, in both directions ------------------ */

/** Every story file that switches axe off wholesale, read from source. */
function liveExemptions(): Map<string, number> {
  const out = new Map<string, number>();
  for (const file of storyFiles()) {
    const src = readFileSync(file, "utf8");
    const off = src.search(/test:\s*"off"/);
    if (off === -1) continue;
    const exports = src.match(/^export const \w+/gm) ?? [];
    const firstExport = src.indexOf("export const");
    // A meta-level switch precedes the first story and exempts the whole file.
    const stories = off < firstExport ? exports.length : 1;
    out.set(file.slice(ROOT.length + 1), stories);
  }
  return out;
}

test("every whole-story axe opt-out is registered in AXE_EXEMPT", () => {
  const live = liveExemptions();
  const unregistered = [...live.keys()].filter((f) => !(f in AXE_EXEMPT));
  expect(unregistered, "a story file switched axe off without registering it").toEqual([]);
});

test("AXE_EXEMPT does not outlive the opt-outs it describes", () => {
  const live = liveExemptions();
  const stale = Object.keys(AXE_EXEMPT).filter((f) => !live.has(f));
  expect(stale, "remove these — they no longer switch axe off").toEqual([]);
});

test("the registered story counts are the real ones", () => {
  const live = liveExemptions();
  const drifted: string[] = [];
  for (const [file, n] of live) {
    const declared = AXE_EXEMPT[file]?.stories;
    if (declared !== undefined && declared !== n) drifted.push(`${file}: declared ${declared}, actual ${n}`);
  }
  expect(drifted, "a meta-level exemption silently grew — this is the rot arm").toEqual([]);
});

/* =============================================================================
   SCENARIO PAGES: TWO KINDS, TWO RULES ([[scenario-axe-carve-outs]], NARROWED BY
   [[showcases-and-fixture]])
   -----------------------------------------------------------------------------
   [[scenario-axe-carve-outs]] ruled that a scenario page may scope off `color-contrast` only by citing
   the rulings it stands on, and NOTHING else, because the suite exists to find
   STRUCTURAL defects and every other rule is one of those. That ruling held one
   assumption that stopped being true: that every page in `src/scenarios/` is a
   composition PROBE.

   [[showcases-and-fixture]] splits the directory in two, because the six probe pages were rejected
   as showcases in favour of recognisable app recreations.

     SHOWCASE (`Screen` stories, root-level titles) — recreations of familiar
       interfaces, rendered at rest, read by humans. They assert NOTHING. Axe is
       off wholesale, and that is the honest posture: a page that is not evidence
       must not claim to be. They keep a free smoke test, because the story suite
       renders every story and a crash still fails the lane.
     FIXTURE (`_composition.stories.tsx`) — the dense cross-component probe that
       inherits the role the six pages carried. The rule of
       [[scenario-axe-carve-outs]] applies here UNCHANGED:
       `color-contrast` only, citation required.

   WHY THE SPLIT RATHER THAN A WIDER REGISTER. Letting showcases into
   `SCENARIO_CONTRAST_EXEMPT` would mean relaxing the "nothing but
   color-contrast" arm for everyone, and that arm is the whole mechanism
   [[scenario-axe-carve-outs]] added. Two registers with two different rules keeps the probe's guarantee
   exactly as strict as it was while letting the showcases off entirely.

   WHAT THIS COSTS, STATED. Eight recreations now run with no accessibility
   assertion at all. The composition fixture is the only page-level structural
   check that remains, so it has to stay dense enough to be worth running. If it
   is ever thinned to nothing, this trade stops being affordable and
   [[showcases-and-fixture]] should be revisited rather than quietly tolerated.
   ============================================================================= */

const SCENARIOS_DIR = join(ROOT, "src/scenarios");

/** The one rule the composition FIXTURE may scope off, and nothing else. */
const SCENARIO_ALLOWED_RULE = "color-contrast";

/** The fixture and the eight recreations both come from `showcases.ts`, so this guard and
 *  `boxLaw.ts` cannot disagree about which pages [[showcases-and-fixture]] exempts. Two hand-kept
 *  lists would drift, and the drift would be silent: a page missing from one gets a rule
 *  [[showcases-and-fixture]] says must not apply. */

export const SCENARIO_CONTRAST_EXEMPT: Record<string, { rulings: string[]; why: string }> = {
  [COMPOSITION_FIXTURE]: {
    rulings: ["wcag-claim-scope", "soft-fill-text-exception"],
    why:
      "the dense crossing page renders the same token pairings the six it replaced did: soft semantic " +
      "fills at 4.10 to 4.43 in light ([[soft-fill-text-exception]]), white on error-9 at 3.91 under the " +
      "retired 3:1 floor for text on a solid fill, which [[text-on-solid-fill-contrast]] replaced, and the " +
      "solid accent at 2.58 on dark hover ([[wcag-claim-scope]]). The first and the third are token-level, " +
      "ruled, and reproduce on their components' own pages. The second rests on no current ruling, so the " +
      "carve-out may now excuse a pair the fixture no longer renders",
  },
};

/** Showcase recreations: axe off wholesale under [[showcases-and-fixture]]. The reason is a sentence, not a
 *  measurement, because these assert nothing and there is no number to carry. */
export const SHOWCASE_AXE_OFF: Record<string, string> = Object.fromEntries(
  SHOWCASES.map((s) => [s.file, `showcase recreation of ${s.depicts}`]),
);

/** Scenario files that scope any axe rule off, mapped to the rule ids they disable. */
function scenarioCarveOuts(): Map<string, string[]> {
  const out = new Map<string, string[]>();
  if (!existsSync(SCENARIOS_DIR)) return out;
  for (const name of readdirSync(SCENARIOS_DIR).filter((f) => f.endsWith(".stories.tsx"))) {
    const src = readFileSync(join(SCENARIOS_DIR, name), "utf8");
    const ids = [...src.matchAll(/id:\s*"([a-z0-9-]+)"\s*,\s*enabled:\s*false/g)].map((m) => m[1]);
    if (src.includes('test: "off"')) ids.push("(whole story off)");
    if (ids.length) out.set(`src/scenarios/${name}`, [...new Set(ids)]);
  }
  return out;
}

test("every scenario carve-out is registered in exactly one register, and every entry is live", () => {
  const live = scenarioCarveOuts();
  const registered = (f: string) => f in SCENARIO_CONTRAST_EXEMPT || f in SHOWCASE_AXE_OFF;

  const unregistered = [...live.keys()].filter((f) => !registered(f));
  const staleFixture = Object.keys(SCENARIO_CONTRAST_EXEMPT).filter((f) => !live.has(f));
  const staleShowcase = Object.keys(SHOWCASE_AXE_OFF).filter((f) => !live.has(f));
  // A file in BOTH registers is claiming two incompatible rules at once.
  const doubled = Object.keys(SHOWCASE_AXE_OFF).filter((f) => f in SCENARIO_CONTRAST_EXEMPT);

  expect(
    unregistered,
    "a scenario page scoped a rule off without registering it — a showcase belongs in SHOWCASE_AXE_OFF, " +
      "the composition fixture in SCENARIO_CONTRAST_EXEMPT with its citation",
  ).toEqual([]);
  expect(
    [...staleFixture, ...staleShowcase],
    "these no longer scope anything off — delete them rather than leaving a register that overstates " +
      "the carve-outs, which is the arm that stops this list rotting",
  ).toEqual([]);
  expect(doubled, "a file cannot be both a showcase and the composition fixture").toEqual([]);
});

test("the composition fixture scopes off nothing but color-contrast ([[scenario-axe-carve-outs]], unchanged)", () => {
  const wider: string[] = [];
  for (const [file, ids] of scenarioCarveOuts()) {
    if (!(file in SCENARIO_CONTRAST_EXEMPT)) continue;
    const extra = ids.filter((id) => id !== SCENARIO_ALLOWED_RULE);
    if (extra.length) wider.push(`${file}: ${extra.join(", ")}`);
  }
  expect(
    wider,
    `the composition fixture may scope off "${SCENARIO_ALLOWED_RULE}" and nothing else. It exists to ` +
      `find STRUCTURAL defects, and every other rule is one of those. [[showcases-and-fixture]] let ` +
      `the SHOWCASES off entirely and did not loosen this`,
  ).toEqual([]);
});

test("a showcase turns axe off wholesale, never rule by rule ([[showcases-and-fixture]])", () => {
  // Half-off is the posture [[showcases-and-fixture]] rejects: a page that silences three named rules is still
  // claiming the rest passed, which is a claim a showcase must not make. Off or on.
  const partial: string[] = [];
  for (const [file, ids] of scenarioCarveOuts()) {
    if (!(file in SHOWCASE_AXE_OFF)) continue;
    if (!ids.includes("(whole story off)")) partial.push(`${file}: ${ids.join(", ")}`);
  }
  expect(
    partial,
    'a showcase must carry `a11y: { test: "off" }`. Disabling individual rules implies the others ' +
      "were asserted, and a showcase asserts nothing",
  ).toEqual([]);
});

test("the composition fixture exists and is dense enough to be worth running ([[showcases-and-fixture]])", () => {
  // The stated cost of [[showcases-and-fixture]] is that the fixture is the ONLY page-level structural check left. If it is
  // deleted or thinned to a stub, the trade stops being affordable and should fail here rather
  // than pass quietly.
  const path = join(ROOT, COMPOSITION_FIXTURE);
  expect(existsSync(path), `${COMPOSITION_FIXTURE} is gone, and the whole trade of [[showcases-and-fixture]] rested on it`).toBe(true);
  const src = readFileSync(path, "utf8");
  // It must actually cross components: a probe with no portaled surface open finds nothing,
  // because axe cannot inspect a panel that never rendered.
  expect(src, "the fixture carries no `play`, so its portaled surfaces never open for axe").toMatch(
    /play\s*:/,
  );
  const imported = [...src.matchAll(/from "\.\.\/components\/ui\/([A-Za-z]+)"/g)].map((m) => m[1]);
  expect(
    new Set(imported).size,
    `the fixture imports ${new Set(imported).size} system components. It is the only page-level ` +
      "structural check left; under about a dozen it is not a composition probe any more",
  ).toBeGreaterThanOrEqual(12);
});

test("every ruling a scenario carve-out cites resolves to a real ledger entry", () => {
  const ledger = readFileSync(join(ROOT, "docs", "DECISIONS.md"), "utf8");
  const missing: string[] = [];
  for (const [file, { rulings, why }] of Object.entries(SCENARIO_CONTRAST_EXEMPT)) {
    expect(rulings.length, `${file} cites no ruling`).toBeGreaterThan(0);
    expect(why.length, `${file} carries no measured reason`).toBeGreaterThan(20);
    for (const name of rulings) {
      // A real entry is its own `### name` heading. A mention inside prose is not an entry.
      if (!new RegExp(`^### ${name}$`, "m").test(ledger)) missing.push(`${file} cites ${name}`);
    }
  }
  expect(
    missing,
    "these carve-outs cite a ruling that has no entry in docs/DECISIONS.md. A citation nobody can follow " +
      "is the unjustified exclusion this rule replaced",
  ).toEqual([]);
});
