/* =============================================================================
   control-box-registry.node-check.ts — THE REGISTRATION GUARD FOR THE [[box-law-scope]] LAW
   -----------------------------------------------------------------------------
   Sibling of registry.node-check.ts / registry-tier.node-check.ts (same node lane,
   same harness, same AST idiom). It closes the one hole [[box-law-scope]]'s enforcement left.

   [[box-law-scope]] states the law — a size step names ONE box, 24 / 32 / 40px at steps 1 / 2 / 3,
   and every component that presents a single-row control honours it — and names
   `_internal/Control box` as the place it is measured. That file guards the entries
   IN it. Nothing guarded the entries NOT in it. A new single-row control that its
   author never added to `CONTROL_BOX_MANIFEST` was unguarded, silently, and read
   exactly like a control that had been checked: no red test, no missing file, no
   diff to notice. [[box-law-scope]] says so in its own words — "a control missing from it is
   unguarded whether or not it happens to be correct" — and then relies on an author
   remembering a comment. The three deviations [[box-law-scope]] was minted for were all in
   components nobody had thought to add.

   REGISTRATION IS THEREFORE A FIELD, NOT A HABIT. Every `status:"ported"` entry in
   `registry.json` declares `controlBox`:

     "row"        the component owns a box the law binds — it presents a single-row
                  control (or paints a row cell of its own, like a pagination page).
                  MUST be measured in CONTROL_BOX_MANIFEST.
     "composite"  a control assembly: it presents single-row controls, but every
                  bound box inside belongs to a MEMBER component and is guarded
                  through that member's own entry. [[box-law-scope]]'s "composites are governed at
                  their inner row level, not at their own" — the chat composer's dock
                  is two stacked rows, and the dock is not a row.
     "nav"        the component's rows ride the NAV ladder ([[nav-row-ladder]]) — 32 / 36 / 40 at
                  steps 1 / 2 / 3 — because navigation carries more prominence than a
                  standard control, so a nav row is an Item-family row rather than a
                  control-lane button. A bound box, just not the row ladder's, so it
                  belongs in neither "row" (the manifest measures against 24 / 32 / 40)
                  nor "exempt" (which claims no bound box at all — the claim SideNav
                  used to carry, and the reason nothing noticed when its rail was
                  conformed to the wrong family).
                  MEASURED by `_internal/SideNav behavior` → `NavLadderTracksBothStates`,
                  which asserts both regimes at all three tiers and under scaling 90%,
                  NOT by CONTROL_BOX_MANIFEST. Rule D below binds the two together, so a
                  component tagged "nav" cannot go unguarded and the ladder cannot lose
                  its only member silently. If TopNav (or any other rail) later joins
                  the family, it retags "nav" AND is added to the guard story and to
                  NAV_LADDER_COMPONENTS below — rule D fails until both are true.
     "exempt"     presents no bound box at all: text and display primitives, layout
                  and surface shells, multi-line surfaces, the checkbox / radio /
                  switch glyph ladder, tracks, chips (the [[control-box-per-step]] inset carve-out), and
                  anything reachable only by opening a portal.

   THE FOUR RULES:

     A  Every ported entry DECLARES the field. Ship a component without classifying
        it and the node lane goes red — the classification cannot be skipped, and
        "I did not think about it" is no longer a state the registry can hold.
     B  Every "row" entry is MEASURED. Its `name` appears as a `component:` value in
        CONTROL_BOX_MANIFEST. Omitting the manifest entry is now red.
     C  Every manifest entry is REGISTERED "row". Nothing is measured against the row
        ladder that the registry calls composite or exempt, and no manifest entry
        names a component the registry has never heard of. This is the direction that
        catches a rename, and the one that stops the manifest and the registry from
        describing two different systems.
     D  The "nav" class agrees with its guard, BOTH WAYS. Every "nav" entry is named in
        NAV_LADDER_COMPONENTS, and every name in NAV_LADDER_COMPONENTS is registered
        "nav". Same shape as B and C, against the nav-ladder story instead of the
        manifest: a rail that retags away from "nav" while the guard still measures it
        goes red, and so does one tagged "nav" that no nav-ladder guard covers.

   Deleting the guard fails the same way: rule B cannot pass if the manifest is gone.

   WHY THE COMPILER API rather than a line regex — the reasoning registry-tier uses,
   in the other direction. `CONTROL_BOX_MANIFEST` is a TSX array of object literals
   full of JSX, comments and nested prose; a text scan for `component: "…"` would also
   match the word inside a comment or a story's copy. Parsing binds the read to the
   ACTUAL property of the ACTUAL array, so a name that only exists in a comment can
   never be mistaken for a registration.
   ============================================================================= */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test, expect } from "vitest";
import ts from "typescript";

const ROOT = process.cwd();
const MANIFEST_FILE = "src/components/ui/_control-box.stories.tsx";
const MANIFEST_BINDING = "CONTROL_BOX_MANIFEST";

/** The classification a ported entry must carry. */
const CONTROL_BOX_CLASSES = ["row", "composite", "nav", "exempt"] as const;
type ControlBoxClass = (typeof CONTROL_BOX_CLASSES)[number];

/** Rule D's other side: the components the NAV-LADDER guard actually measures. Written out here rather
 *  than parsed out of the story, because the story mounts its fixtures by JSX element and there is no
 *  `component:` field to read — the join is a name, and a name a human types is exactly what rule D is
 *  for. Where the measuring happens, for a reader who lands on a rule-D failure cold. */
const NAV_LADDER_GUARD = "src/components/ui/_sidenav.stories.tsx → NavLadderTracksBothStates";
const NAV_LADDER_COMPONENTS = ["SideNav"] as const;

type Entry = {
  name: string;
  status: "ported" | "planned" | "external" | "out-of-scope";
  controlBox?: string;
};

const registry: Entry[] = JSON.parse(readFileSync(join(ROOT, "registry.json"), "utf8"));

/** Every `component:` string value inside the `CONTROL_BOX_MANIFEST` array literal, paired with the
 *  entry's `name:` so a failure names the manifest row a reader can go and find. Read off the AST —
 *  see the header. */
function manifestEntries(file: string): { component: string; name: string }[] {
  const src = readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  let array: ts.ArrayLiteralExpression | undefined;
  const findArray = (n: ts.Node): void => {
    if (
      ts.isVariableDeclaration(n) &&
      ts.isIdentifier(n.name) &&
      n.name.text === MANIFEST_BINDING &&
      n.initializer &&
      ts.isArrayLiteralExpression(n.initializer)
    ) {
      array = n.initializer;
      return;
    }
    ts.forEachChild(n, findArray);
  };
  findArray(sf);
  if (!array) {
    throw new Error(
      `${MANIFEST_BINDING} not found as an array literal in ${file} — the [[box-law-scope]] guard's registration point ` +
        `is gone or has been renamed. If the manifest moved, this check moves with it; it must never be ` +
        `deleted to make a test pass.`,
    );
  }

  const strOf = (obj: ts.ObjectLiteralExpression, key: string): string | undefined => {
    for (const p of obj.properties) {
      if (!ts.isPropertyAssignment(p)) continue;
      if (p.name.getText(sf).replace(/['"]/g, "") !== key) continue;
      if (ts.isStringLiteral(p.initializer) || ts.isNoSubstitutionTemplateLiteral(p.initializer)) {
        return p.initializer.text;
      }
    }
    return undefined;
  };

  const out: { component: string; name: string }[] = [];
  for (const el of array.elements) {
    if (!ts.isObjectLiteralExpression(el)) continue;
    const name = strOf(el, "name") ?? "(unnamed entry)";
    const component = strOf(el, "component");
    if (component === undefined) {
      throw new Error(
        `manifest entry "${name}" in ${file} declares no string \`component:\` — that field is the join ` +
          `key to registry.json and cannot be computed, spread or interpolated.`,
      );
    }
    out.push({ component, name });
  }
  if (!out.length) {
    throw new Error(`${MANIFEST_BINDING} in ${file} is empty — every single-row control would be unguarded.`);
  }
  return out;
}

test("the control-box law is registered, not remembered — registry.json ⇔ CONTROL_BOX_MANIFEST", () => {
  const failures: string[] = [];
  const entries = manifestEntries(join(ROOT, MANIFEST_FILE));

  // Which registry component each manifest row claims to guard. One component may hold several rows
  // (a group's root and a member inside it; DateTimeInput's two sub-inputs), which is why this is a map
  // to a LIST rather than a set of names.
  const measured = new Map<string, string[]>();
  for (const e of entries) {
    const rows = measured.get(e.component) ?? [];
    rows.push(e.name);
    measured.set(e.component, rows);
  }

  const classOf = new Map<string, ControlBoxClass>();

  // ---- A: every ported entry declares the field --------------------------------
  for (const e of registry) {
    if (e.status !== "ported") continue;
    if (e.controlBox === undefined) {
      failures.push(
        `${e.name}: no \`controlBox\` in registry.json — classify it "row" (a single-row control the [[box-law-scope]] ` +
          `law binds), "composite" (an assembly whose bound boxes belong to its members), "nav" (rows on ` +
          `the [[nav-row-ladder]] nav ladder, 32 / 36 / 40) or "exempt" (presents no bound box). The classification is ` +
          `the registration.`,
      );
      continue;
    }
    if (!(CONTROL_BOX_CLASSES as readonly string[]).includes(e.controlBox)) {
      failures.push(
        `${e.name}: controlBox "${e.controlBox}" is not one of ${CONTROL_BOX_CLASSES.join(" | ")}.`,
      );
      continue;
    }
    classOf.set(e.name, e.controlBox as ControlBoxClass);
  }

  // ---- B: every "row" entry is measured ----------------------------------------
  for (const [name, cls] of classOf) {
    if (cls !== "row") continue;
    if (!measured.has(name)) {
      failures.push(
        `${name}: registered controlBox:"row" but no entry in ${MANIFEST_BINDING} names it — an unguarded ` +
          `single-row control. Add it to ${MANIFEST_FILE} with \`component: "${name}"\`, or reclassify it ` +
          `if it does not in fact own a box the law binds.`,
      );
    }
  }

  // ---- C: every measured entry is registered "row" -----------------------------
  for (const [component, rows] of measured) {
    const cls = classOf.get(component);
    const where = rows.map((r) => `"${r}"`).join(", ");
    if (cls === undefined) {
      const known = registry.some((e) => e.name === component);
      failures.push(
        known
          ? `${component}: measured by ${where} but its registry entry is not status:"ported" (or carries no valid controlBox).`
          : `${component}: measured by ${where} but registry.json has no entry by that name — a rename or a typo. ` +
            `The \`component\` value must match a registry \`name\` EXACTLY.`,
      );
      continue;
    }
    if (cls !== "row") {
      failures.push(
        `${component}: measured against the row ladder by ${where}, but registered controlBox:"${cls}". ` +
          `A "${cls}" entry is not bound at the ROW ladder's box — either the classification is wrong or the ` +
          `manifest entry is.`,
      );
    }
  }

  // ---- D: the "nav" class agrees with its guard, both ways ---------------------
  const navGuarded = new Set<string>(NAV_LADDER_COMPONENTS);
  for (const [name, cls] of classOf) {
    if (cls === "nav" && !navGuarded.has(name)) {
      failures.push(
        `${name}: registered controlBox:"nav" but not named in NAV_LADDER_COMPONENTS — an unguarded nav ` +
          `ladder. Add it to ${NAV_LADDER_GUARD} (both regimes, all three tiers, and the scaling rung) and ` +
          `name it in NAV_LADDER_COMPONENTS, or reclassify it.`,
      );
    }
  }
  for (const name of navGuarded) {
    const cls = classOf.get(name);
    if (cls === "nav") continue;
    failures.push(
      cls === undefined
        ? `${name}: named in NAV_LADDER_COMPONENTS but registry.json has no status:"ported" entry by that ` +
          `name carrying a valid controlBox — a rename or a typo.`
        : `${name}: measured on the nav ladder by ${NAV_LADDER_GUARD}, but registered controlBox:"${cls}". ` +
          `A rail whose rows the [[nav-row-ladder]] guard measures is "nav"; "${cls}" claims it is bound elsewhere (or, ` +
          `for "exempt", not bound at all — the claim that let the rail be conformed to the wrong family).`,
    );
  }

  expect(
    failures,
    failures.length
      ? `[[box-law-scope]] registration drift — the registry and the control-box guard disagree (${failures.length}):\n  ` +
        failures.join("\n  ")
      : "",
  ).toEqual([]);
});
