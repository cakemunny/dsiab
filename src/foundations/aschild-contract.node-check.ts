/* =============================================================================
   aschild-contract.node-check.ts — THE SEAM STAYS LOUD
   -----------------------------------------------------------------------------
   `asChild` hands the rendered element to the consumer. Radix `Slot` merges
   `className` by concatenation and `style` shallowly and chains handlers, so
   the paint always survives the swap. Everything else is taken from the CHILD.
   That combination is what makes this seam dangerous: a swap that voids
   keyboard operability, the focus hairline, the disabled state, the pointer
   floor or a declared `role` still paints correctly, type-checks, and reports
   nothing anywhere.

   Two mechanisms answer that, and this file guards both together because they
   are one law read at two moments:

     · `asChildContract.ts`   dev-time, sees the ELEMENT a consumer passed
     · `consumerRules.mjs`    static, sees CODE THAT NEVER RAN, in their repo

   A DETECTOR BREAKS THE SAME WAY THE DEFECT DOES, which is quietly. Six
   plausible bugs, each of which this file turns into a red test:

     1. The operability arm stops firing. The clearest and most common swap,
        a control handed a `<div>`, goes back to being silent.
     2. The operability arm starts firing on a CORRECT swap. That is a false
        positive shipped to every consumer who used the seam properly, and a
        console warning nobody can act on is worse than the silence it replaced,
        because the next real one is ignored too.
     3. The shape arm stops firing, so a consumer meets Radix's own
        "Slot failed to slot onto its children" thrown from inside
        `node_modules`, naming no component and no file.
     4. The override arm reports a prop the child merely repeated, or stops
        reporting one it really replaced.
     5. The two tag tables drift apart, so the static rule and the runtime
        warning disagree about which elements are operable, and a consumer is
        told two different things about one swap.
     6. `ASCHILD_CONTROLS` names a component that no longer exists or no longer
        publishes that name, so the one rule that reaches a product repo quietly
        stops covering it.

   WHY THE RUNTIME HALF RUNS IN THE NODE LANE. `checkAsChild` runs during
   RENDER and reads React elements, not DOM nodes, so it needs no browser. The
   render arm uses `renderToString` for the same reason the no-Provider arm in
   `detect-and-warn.node-check.ts` does: it proves the check is safe to call
   from a component body rather than only from a test.

   WHAT NEITHER MECHANISM CAN SEE, stated here so a green lane is never read as
   more than it is. A child that is a COMPONENT renders a tag neither of them
   knows: the detector holds a function, not an element, and the static rule
   holds a name. A ref dropped by that component is invisible to both. Both
   limits are in the docs and in the rule's own `reads`.
   ============================================================================= */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement, type ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { test, expect } from "vitest";
import { resetWarnings, DEV_WARN } from "../theme/detectAndWarn";
import {
  checkAsChild, declaresOperable, rendersOperable, OPERABLE_TAGS, OPERABLE_WITH_HREF,
  type AsChildContract,
} from "./asChildContract";
import {
  RULES, RULE_IDS, checkSource, ASCHILD_CONTROLS, ASCHILD_OPERABLE_TAGS, ASCHILD_OPERABLE_WITH_HREF,
} from "./consumerRules.mjs";

const BUTTON: AsChildContract = { element: "button", owns: { type: "button", "aria-pressed": false } };
const BOX: AsChildContract = { element: "div" };

/** Drive the detector with `console.warn` captured, so a guard reads both the verdict it returns
 *  and the lines a consumer would actually see. */
function run(name: string, children: ReactNode, contract: AsChildContract) {
  resetWarnings();
  const lines: string[] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => void lines.push(args.map(String).join(" "));
  try {
    const found = checkAsChild(name, children, contract);
    return { causes: found.map((v) => v.cause), messages: found.map((v) => v.message), lines };
  } finally {
    console.warn = original;
  }
}

const el = createElement;

/* ------------------------------------------------------------------------------------------------
   THE DEV GATE
   ---------------------------------------------------------------------------------------------- */

test("the dev gate is on in this lane, or every assertion below is vacuous", () => {
  expect(DEV_WARN, "DEV_WARN resolved false under vitest, so the detector never runs").toBe(true);
});

/* ------------------------------------------------------------------------------------------------
   1 + 2. OPERABILITY — the arm that catches the clearest swap, and stays quiet on a good one
   ---------------------------------------------------------------------------------------------- */

test("a control handed a bare div says so, by name, and still returns", () => {
  const { causes, lines } = run("Button", el("div", null, "Save"), BUTTON);

  expect(causes, "a <button> replaced by a <div> is the swap this seam exists to report").toEqual([
    "aschild:Button:operability",
  ]);
  expect(lines).toHaveLength(1);
  expect(lines[0]).toContain("[dsiab]");
  expect(lines[0]).toContain("`<Button asChild>`");
  expect(lines[0]).toContain("not keyboard-operable");
});

test("the detector is safe to call from a component body and never breaks the render", () => {
  resetWarnings();
  const lines: string[] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => void lines.push(args.map(String).join(" "));
  let html = "";
  try {
    function Probe() {
      checkAsChild("Button", el("div", null, "Save"), BUTTON);
      return el("span", null, "rendered");
    }
    html = renderToString(el(Probe));
  } finally {
    console.warn = original;
  }

  expect(html, "a detected swap must warn, never break the render").toBe("<span>rendered</span>");
  expect(lines, `expected one warning from a render, got ${lines.length}`).toHaveLength(1);
});

test("an anchor with no href is caught, because it looks the most correct and is not", () => {
  const { causes, messages } = run("Link", el("a", { onClick: () => {} }, "Docs"), { element: "a" });

  expect(causes).toEqual(["aschild:Link:operability"]);
  expect(messages[0], "the reason has to name the href, or the reader cannot act on it")
    .toContain("with no href");
});

test("a correct swap is silent, which is the false positive that would reach every consumer", () => {
  const good: Array<[string, ReactNode, AsChildContract]> = [
    // A real interactive element.
    ["Button", el("a", { href: "/save" }, "Save"), BUTTON],
    ["Button", el("button", { type: "submit" }, "Go"), { element: "button" }],
    // The consumer taking responsibility explicitly.
    ["Button", el("div", { role: "button", tabIndex: 0 }, "Save"), { element: "button" }],
    // A component child: the tag is unknowable here, so silence is the honest answer.
    ["Button", el(function MyLink() { return null; }), BUTTON],
    // A component whose own element carries no operability has nothing to lose.
    ["Text", el("div", null, "a box"), BOX],
  ];

  for (const [name, child, contract] of good) {
    const { causes, lines } = run(name, child, contract);
    expect(causes, `<${name} asChild> with a correct child warned: ${lines.join(" | ")}`).toEqual([]);
  }
});

/* ------------------------------------------------------------------------------------------------
   3. SHAPE — the crash Radix throws from inside node_modules, and the disappearance it does not
   ---------------------------------------------------------------------------------------------- */

test("more than one child is named before Slot throws from inside node_modules", () => {
  const { causes, messages } = run("ButtonGroup", [el("div", { key: "a" }), el("div", { key: "b" })], BOX);

  expect(causes).toEqual(["aschild:ButtonGroup:shape"]);
  expect(messages[0], "the count is what tells a reader which call site it is").toContain("2 children");
  expect(messages[0]).toContain("ButtonGroup");
});

test("a text child is a shape defect, not an operability one", () => {
  expect(run("Button", "Save", BUTTON).causes).toEqual(["aschild:Button:shape"]);
});

test("no children at all is its own cause, because Slot renders nothing and throws nothing", () => {
  const { causes, messages } = run("Button", null, BUTTON);

  expect(causes, "Slot returns falsy children unchanged, so the component silently disappears")
    .toEqual(["aschild:Button:empty"]);
  expect(messages[0]).toContain("renders nothing at all");
});

test("a Slottable composition keeps several children and is not a shape defect", () => {
  // The real `Slottable` marker: a global registry symbol, which is how the mark survives a second
  // copy of the package. A local stand-in proves the detector reads the mark rather than the import.
  const Slottable = Object.assign(() => null, { __radixId: Symbol.for("radix.slottable") });
  const children = [
    el("svg", { key: "icon" }),
    el(Slottable, { key: "slot" }, el("a", { href: "/x" }, "Save")),
  ];

  const { causes, lines } = run("Button", children, BUTTON);
  expect(causes, `a legal Slottable composition was reported: ${lines.join(" | ")}`).toEqual([]);
});

/* ------------------------------------------------------------------------------------------------
   4. OVERRIDE — the merge direction nothing else in the system reveals
   ---------------------------------------------------------------------------------------------- */

test("a child that replaces a prop the component owns is reported with both values", () => {
  const { causes, messages } = run(
    "Button",
    el("button", { type: "submit" }, "Go"),
    BUTTON,
  );

  expect(causes).toEqual(["aschild:Button:override:type"]);
  expect(messages[0]).toContain('"submit" wins');
  expect(messages[0]).toContain('`type="button"` is dropped');
});

test("a child that repeats the same value, or sets a prop outside the contract, is silent", () => {
  const same = run("Button", el("button", { type: "button" }, "Go"), BUTTON);
  expect(same.causes, `an identical value is not an override: ${same.lines.join(" | ")}`).toEqual([]);

  const unrelated = run("Button", el("button", { "data-testid": "save" }, "Go"), BUTTON);
  expect(unrelated.causes, "only the props a component declares as its contract are guarded")
    .toEqual([]);
});

/* ------------------------------------------------------------------------------------------------
   5. ONE LINE PER CAUSE PER COMPONENT PER PAGE
   ---------------------------------------------------------------------------------------------- */

test("the warning is once per component per cause, and a second component still gets its own", () => {
  resetWarnings();
  const lines: string[] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => void lines.push(args.map(String).join(" "));
  try {
    for (let i = 0; i < 20; i++) checkAsChild("Button", el("div"), BUTTON);
    for (let i = 0; i < 20; i++) checkAsChild("IconButton", el("div"), BUTTON);
  } finally {
    console.warn = original;
  }

  expect(
    lines.length,
    `40 bad swaps across two components produced ${lines.length} warnings. This runs on every ` +
      `render of every component in the seam, so anything but 2 buries the signal.`,
  ).toBe(2);
  expect(lines.filter((l) => l.includes("IconButton")), "each component reports itself").toHaveLength(1);
});

/* ------------------------------------------------------------------------------------------------
   6. ONE LAW, TWO FILES
   ---------------------------------------------------------------------------------------------- */

test("the runtime detector and the consumer rule agree on which tags are operable", () => {
  const pairs: Array<[string, string[], string[]]> = [
    ["OPERABLE_TAGS", Object.keys(OPERABLE_TAGS), [...ASCHILD_OPERABLE_TAGS]],
    ["OPERABLE_WITH_HREF", Object.keys(OPERABLE_WITH_HREF), [...ASCHILD_OPERABLE_WITH_HREF]],
  ];

  for (const [label, runtime, statics] of pairs) {
    expect(runtime.length, `${label} is empty in asChildContract.ts, so nothing is operable`)
      .toBeGreaterThan(0);
    expect(
      [...statics].sort(),
      `${label} differs between asChildContract.ts and consumerRules.mjs, so ds-check and the dev ` +
        `warning would tell one consumer two different things about the same swap.`,
    ).toEqual([...runtime].sort());
  }

  // The asymmetry is deliberate and is the point, so it is pinned rather than left to a reader.
  expect(declaresOperable("a"), "the element WE render always carries its href").toBe(true);
  expect(rendersOperable("a", {}), "the element we are HANDED has to prove it").toBe(false);
});

/* ------------------------------------------------------------------------------------------------
   7. THE CONSUMER RULE — registered, populated, and proven end to end
   ---------------------------------------------------------------------------------------------- */

test("the rule is registered with the shape every rule in that file has", () => {
  expect(RULE_IDS, "an unregistered rule cannot be named in a ds-allow").toContain("aschild-nonint");
  const rule = RULES.find((r: { id: string }) => r.id === "aschild-nonint");
  for (const field of ["title", "why", "fix", "reads"] as const) {
    expect(
      (rule as Record<string, string>)[field]?.length ?? 0,
      `aschild-nonint carries no \`${field}\`, so \`ds-check --rules\` prints a rule a reader ` +
        `cannot act on`,
    ).toBeGreaterThan(20);
  }
});

test("every parent the rule knows is a ported component that publishes that name", () => {
  const registry: Array<{ name: string; status: string; exports?: string[] }> = JSON.parse(
    readFileSync(join(process.cwd(), "registry.json"), "utf8"),
  );

  expect(
    ASCHILD_CONTROLS.size,
    "ASCHILD_CONTROLS is empty, so the rule matches nothing and passes over every repo",
  ).toBeGreaterThan(0);

  for (const name of ASCHILD_CONTROLS.keys()) {
    const entry = registry.find((e) => e.name === name);
    expect(entry, `ASCHILD_CONTROLS names \`${name}\`, which is not in registry.json`).toBeTruthy();
    expect(entry?.status, `\`${name}\` is not ported, so the rule guards a name nobody can import`)
      .toBe("ported");
    expect(
      entry?.exports ?? [],
      `\`${name}\` does not publish the name the rule matches on`,
    ).toContain(name);
  }
});

test("a bad swap in consumer source is reported, and a good one is not", () => {
  const bad = checkSource(
    "app/Save.tsx",
    'import { Button } from "dsiab";\nexport const Save = () => (\n  <Button asChild onClick={save}>\n    <div>Save</div>\n  </Button>\n);\n',
  );
  expect(bad.findings.map((f: { rule: string; line: number }) => `${f.rule}@${f.line}`)).toEqual([
    "aschild-nonint@3",
  ]);

  const good = checkSource(
    "app/Docs.tsx",
    'import { Button, Link, Text } from "dsiab";\nimport NextLink from "next/link";\n' +
      "export const Docs = () => (\n  <>\n    <Button asChild>\n      <a href=\"/save\">Save</a>\n    </Button>\n" +
      "    <Link asChild>\n      <NextLink href=\"/docs\">Docs</NextLink>\n    </Link>\n" +
      "    <Text asChild>\n      <div>a box</div>\n    </Text>\n  </>\n);\n",
  );
  expect(
    good.findings,
    `a correct swap was reported: ${good.findings.map((f: { detail: string }) => f.detail).join(" | ")}`,
  ).toEqual([]);
});
