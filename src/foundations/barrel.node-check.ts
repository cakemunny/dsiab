/* =============================================================================
   barrel.node-check.ts — THE GUARD ON THE GENERATED PUBLIC SURFACE
   -----------------------------------------------------------------------------
   Sibling of registry.node-check.ts and control-box-registry.node-check.ts: same
   node lane (vitest.node.config.ts / `npm run test:tokens` / the pretest hook),
   same harness, same AST idiom — read through the generator rather than around it.

   WHAT IT PROTECTS. Since D2, registry.json is the truth of what SHIPS as well as
   what exists: each entry carries `module` (the file its names come from) and
   `exports` (the exact names it publishes), and scripts/gen-barrel.mjs turns those
   two fields into src/components/ui/index.ts — the component surface the package
   entry re-exports. That makes REGISTERING a component the act that PUBLISHES it,
   which holds only while three things stay true:

     the barrel on disk is what the registry generates;
     every name a registered module exports is declared by exactly one entry;
     every module under src/components/ui is either registered or knowingly internal.

   Nothing else in this repo runs `gen-barrel.mjs --check` — the build does not, and
   `pretest` does not. Without this file, editing registry.json and forgetting
   `npm run barrel`, or hand-editing the generated barrel, is silent. That is the
   drift the ruling forbids, which is that no change may introduce
   drift, so it is a named failing test here rather than a shell exit code.

   THE FOUR ARMS:

     A  STALENESS, over BOTH generated surfaces. Regenerating from registry.json must
        reproduce `src/components/ui/index.ts` byte for byte, AND must reproduce the
        region of `src/index.ts` between the `gen-barrel` markers. Catches a registry
        edit with no `npm run barrel`, and a hand-edit of either generated region.
        Also fails when the generator REFUSES to produce a barrel at all — an
        unresolvable registry cannot be in sync with anything, and arm B says which
        name is the problem.

        WHY THE PACKAGE ENTRY IS IN SCOPE HERE. The entry cannot say
        `export * from "./components/ui"` — it also re-exports names from
        `@radix-ui/themes`, and a star beside an explicit re-export shadows silently,
        so a wrapped `Box` added tomorrow would lose to Radix's without a word. But a
        hand-kept list of the same 306 names is a copy of the barrel one file
        downstream, and a copy drifts: add a component, run `npm run barrel`, and the
        import still fails because nobody edited the entry. The component block is
        therefore generated too, and this arm is what keeps it honest.
     B  TWO-WAY NAME PARITY, module-scoped. For every module a registry entry names,
        every name the module exports is ACCOUNTED FOR — either in an entry's
        `exports[]` (it publishes) or in its `internalExports[]` (it is withheld on
        purpose) — and every declared name is really exported. Direction one catches a
        name that started shipping with no entry, no ruling and no guard; direction two
        catches a declared name a refactor deleted or renamed.

        A MODULE MAY PUBLISH A SUBSET. `Field` is why: the shell is `_internal` by
        ruling and does not ship, but `useOptionalFieldControl` does, so its entry
        declares one name in `exports` and the other fifteen in `internalExports`.
        That hook is required INSIDE this repo — it is how every input that renders
        its own `Field.Root` reaches the field wiring — and what it can do for a
        consumer is narrower, because `Field.Root` is not on the surface to compose:
        see the entry's own note, which says so, and section 2 of src/index.ts. Withholding is a decision that gets written down, not a
        silence — and the generator checks the withheld names are real and are not also
        published, so arm A surfaces a rotten list too.
     C  REVERSE / ANTI-ROT on the allowlist below. An INTERNAL_MODULES entry whose
        file is gone fails, and so does one that has since been registered, one with
        no reason, and one in a directory arm D does not walk. The exemption list is
        the thing most likely to outlive its reason, so it is checked like everything
        else rather than trusted.
     D  UNREGISTERED MODULE. A module under src/components/ui or src/hooks that is
        neither registered nor allowlisted fails, and the failure prints a paste-ready
        registry entry carrying the names it actually exports. A guard that blocks
        without teaching the fix is a locked door. src/hooks is walked because [[registry-module-paths]] let
        a path module publish, and before [[internal-hooks]] sixteen hooks there shipped inside the
        bundle with no entry and no allowlist line, so nothing had decided them.

   SCOPE — WHY NOT EVERY FILE IN THE DIRECTORY. Arm B reaches modules that BACK a
   registry entry, not every file under the walked directories. Most modules there
   publish nothing by design (INTERNAL_MODULES), so a directory-wide parity scan would
   fail on all of them and teach an author to widen the exemption instead of declaring
   an export. Arm D is the direction that covers the rest of each walked directory.
   The other directories [[registry-module-paths]] made publishable (src/utils, src/dates, src/palette,
   src/powersearch, src/theme) are not walked yet. [[internal-hooks]] records that gap.

   TWO WAYS TO BE INTERNAL, AND THEY ARE NOT INTERCHANGEABLE. A module publishing
   NOTHING goes on INTERNAL_MODULES here (one key, one reason, arm C keeps it honest).
   A module publishing SOME of its names is a registry entry with `internalExports` —
   it is registered, arm B governs it, and the withheld names are listed one by one.
   Reach for the second whenever even one name has to ship. The first is not a way to
   avoid writing the list.

   TWO CARVE-OUTS IN ARM B, both deliberate:
     `default`  is never in `exports[]`. A barrel of NAMED re-exports cannot carry a
                module default (measured: TopNav.tsx and SideNav.tsx have one), and a
                default reached through a package entry is not a governed name.
     `export *` is a hard error, not a pass. The names behind a star are not knowable
                without resolving the target, so a star inside a published module is a
                hole in the contract — the same reason the barrel itself never emits
                one (see the generator's header).

   ONE IMPLEMENTATION, NOT TWO. `moduleExportNames`, `moduleFile` and `resolveBarrel`
   are imported from scripts/gen-barrel.mjs. A second parser here could disagree with
   the generator, and then a green check would say nothing about the file that ships.
   The paths come from the generator too (it anchors on its own location), so this
   guard cannot drift from it by pointing at a different directory.
   ============================================================================= */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { test, expect } from "vitest";
import {
  applyEntryRegion,
  BARREL_PATH,
  ENTRY_PATH,
  internalExportsByModule,
  REGISTRY_PATH,
  SRC_DIR,
  UI_DIR,
  moduleDirOf,
  moduleExportNames,
  moduleFile,
  resolveBarrel,
} from "../../scripts/gen-barrel.mjs";

/** The one command that fixes a stale barrel. Printed on every failure that it fixes. */
const REFRESH = "npm run barrel";
/** This file, for failures whose fix is editing the allowlist below. */
const SELF = "src/foundations/barrel.node-check.ts";

/**
 * Modules that publish NOTHING and are not registry entries, each keyed to its one-line reason.
 * Each is internal by a decision, not by omission, which is why every key carries its reason
 * and arm C checks the list in both directions.
 *
 * A key resolves the way a registry `module` does ([[registry-module-paths]]): a bare name under src/components/ui,
 * a name with a slash under src/. So `hooks/useGridFocus` is src/hooks/useGridFocus.ts.
 *
 * `Field` is deliberately NOT here: it publishes one name (`useOptionalFieldControl`),
 * so it is a registry entry that withholds the other fifteen via `internalExports`.
 * A module with even one public name belongs to arm B, never to this list.
 */
const INTERNAL_MODULES: Readonly<Record<string, string>> = {
  _storyKit: "docs primitives, imported by stories only.",
  _comparisons: "docs primitives, imported by stories only.",
  Item: "the shared row body other components compose.",
  CheckboxVisual: "reuses Radix's own BaseCheckbox skin for other controls.",
  appShellContext: "React context wiring behind AppShell.",
  groupItems: "grouping helper used by the list-shaped components.",
  useComboboxEngine: "the shared combobox state machine.",
  useReturnFocus: "close-focus restore for the modal surfaces ([[focus-return-on-close]]).",

  // src/hooks. [[internal-hooks]] rules the first three. The rest are engines of one shipped component or capability.
  "hooks/useGridFocus": "[[internal-hooks]]. Calendar is its only caller, and that one caller shaped its API.",
  "hooks/useListFocus":
    "[[internal-hooks]]. Pagination, SideNav and TopNav call it. It has no right-to-left handling, and Astryx publishes a different hook under the same name.",
  "hooks/useScrollOverflow":
    "[[internal-hooks]], deferred. Carousel is its only caller. It publishes with ScrollOverflowState on the first consumer need.",
  "hooks/useTreeFocus": "TreeList's keyboard model ([[tree-list]]), and TreeList is its only caller.",
  "hooks/useOverflow": "OverflowList's measurement engine ([[overflow-list]]), and OverflowList is its only caller.",
  "hooks/useResizable":
    "Layout and SideNav drive their panels with it ([[resize-handle]]). OPEN GAP: the published ResizeHandle takes its separatorProps and onDragStart from this hook, so a consumer has no supported way to wire one alone. [[internal-hooks]] records it.",
  "hooks/useMenuHover": "hover intent for the TopNav flyouts ([[top-nav]]), and TopNav is its only caller.",
  "hooks/useScrollSpy": "Outline's active-heading engine ([[outline-scrollspy]]), and Outline is its only caller.",
  "hooks/useOutlineFromDOM": "Outline's heading scan ([[outline-scrollspy]]), and Outline is its only caller.",
  "hooks/useChatStreamScroll": "ChatLayout's scroll engine ([[chat-layout-assembly]]), and ChatLayout is its only caller.",
  "hooks/useChatNewMessages":
    "ChatLayout's new-message detector. ChatMessage imports its CHAT_MESSAGE_ATTR to stamp what the detector finds.",
  "hooks/useIsomorphicLayoutEffect":
    "an SSR-safe layout-effect switch that Calendar, SideNav, TopNav and six sibling hooks call.",
  "hooks/useReorderProps":
    "the DOM half of useReorder ([[reorder-capability]]). useReorder re-exports the prop-getter types it publishes.",
  "hooks/reorderIndicator":
    "drop-indicator geometry for useReorder ([[reorder-capability]]). DragHandle's docs fixture also paints a frozen group with it.",
  "hooks/reorderKeyboard": "the keyboard route of useReorder ([[reorder-capability]]), called only by useReorder and useReorderProps.",
  "hooks/reorderGesture": "the pointer gesture of useReorder ([[reorder-capability]]), called only by useReorder and useReorderProps.",
};

/** The directories arm D walks, and the prefix that turns a file there into a registry `module`. */
const WALKED_DIRS: readonly { dir: string; prefix: string }[] = [
  { dir: UI_DIR, prefix: "" },
  { dir: join(SRC_DIR, "hooks"), prefix: "hooks/" },
];

/** Files in a walked directory that are not modules at all. */
const NOT_A_MODULE = /(\.stories|\.test|\.node-check)\.tsx?$/;
/** The generated barrel itself — it re-exports the modules, it is not one of them. */
const BARREL_BASENAME = "index";

type Entry = { name: string; module?: string; exports?: string[]; status?: string };

const registry: Entry[] = JSON.parse(readFileSync(REGISTRY_PATH, "utf8"));
const rel = (p: string) => relative(process.cwd(), p);

/** module basename → Map(withheld name → the entry that withholds it). Shared with the generator. */
const withheldByModule = internalExportsByModule() as Map<string, Map<string, string>>;

/** module basename → Map(declared name → the entry that declares it). */
const declaredByModule = new Map<string, Map<string, string>>();
/** declared name → every entry that declares it (a name has exactly one owner). */
const owners = new Map<string, string[]>();
for (const entry of registry) {
  if (!entry.module) continue;
  if (!declaredByModule.has(entry.module)) declaredByModule.set(entry.module, new Map());
  for (const name of entry.exports ?? []) {
    declaredByModule.get(entry.module)!.set(name, entry.name);
    owners.set(name, [...(owners.get(name) ?? []), entry.name]);
  }
}

/** What the registry resolves to — or the generator's refusal, kept for arm A. */
const generated: { text: string; region: string } | { error: string } = (() => {
  try {
    const { text, region } = resolveBarrel() as { text: string; region: string };
    return { text, region };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
})();

/** Where two files first disagree, as a quotable pair of lines. */
function firstDifference(onDisk: string, wanted: string): string {
  const disk = onDisk.split("\n");
  const want = wanted.split("\n");
  // `findIndex` returns -1 when every line it walked matched — which is not "no difference" here
  // (the caller only asks after the texts compared unequal), it is one file being a PREFIX of the
  // other. The difference is then the first line past the shorter file, and a clamp to 0 would
  // point at the top of a file whose first line is correct. The `undefined` cell prints as
  // "(end of file)" below, which is the whole message in that case.
  const diverged = disk.findIndex((line, i) => line !== want[i]);
  const at = diverged === -1 ? Math.min(disk.length, want.length) : diverged;
  return (
    `(${disk.length} lines on disk, ${want.length} generated). First difference at line ${at + 1}:\n` +
    `    on disk:    ${disk[at] === undefined ? "(end of file)" : JSON.stringify(disk[at])}\n` +
    `    generated:  ${want[at] === undefined ? "(end of file)" : JSON.stringify(want[at])}`
  );
}

/* ---- A: staleness, over both generated surfaces ---------------------------- */
test("both generated surfaces on disk are byte-identical to what registry.json generates", () => {
  const drift: string[] = [];

  if ("error" in generated) {
    drift.push(
      `the generator refused to produce a barrel, so the committed files cannot be in sync with ` +
        `anything. Its report:\n    ${generated.error.split("\n").join("\n    ")}`,
    );
  } else {
    if (!existsSync(BARREL_PATH)) {
      drift.push(`${rel(BARREL_PATH)} does not exist — the component surface is not generated at all.`);
    } else {
      const onDisk = readFileSync(BARREL_PATH, "utf8");
      if (onDisk !== generated.text) {
        drift.push(`${rel(BARREL_PATH)} is not what registry.json generates ${firstDifference(onDisk, generated.text)}`);
      }
    }

    // The package entry: only the marked region is generated, so compare the whole file against
    // itself-with-the-region-respliced. A hand edit anywhere OUTSIDE the markers is invisible here,
    // which is the point — those sections are rulings.
    const entryOnDisk = readFileSync(ENTRY_PATH, "utf8");
    try {
      const entryWanted = applyEntryRegion(entryOnDisk, generated.region) as string;
      if (entryOnDisk !== entryWanted) {
        drift.push(
          `${rel(ENTRY_PATH)}: the block between the \`gen-barrel\` markers is not what registry.json ` +
            `generates ${firstDifference(entryOnDisk, entryWanted)}`,
        );
      }
    } catch (err) {
      drift.push(err instanceof Error ? err.message : String(err));
    }
  }

  expect(
    drift,
    drift.length
      ? `a generated public surface is stale — registry.json and the file(s) it generates ` +
        `disagree:\n  ${drift.join("\n  ")}\n\n  Fix: run \`${REFRESH}\` and commit the result. The barrel ` +
        `is generated whole and the entry's component block is generated in place; never hand-edit either.`
      : "",
  ).toEqual([]);
});

/* ---- B: two-way name parity ----------------------------------------------- */
test("registry `exports[]` ⇔ what the module actually exports (both directions)", () => {
  const failures: string[] = [];

  for (const [name, declaringEntries] of owners) {
    if (declaringEntries.length > 1) {
      failures.push(
        `"${name}" is declared by ${declaringEntries.join(" and ")} — a public name has exactly one owner, ` +
          `or the barrel would re-export it twice and the surface would depend on entry order.`,
      );
    }
  }

  for (const base of [...declaredByModule.keys()].sort()) {
    const declared = declaredByModule.get(base)!;
    const someEntry = [...declared.values()][0] ?? "(an entry)";
    const file = moduleFile(base) as string | null;
    if (!file) {
      failures.push(
        `module "${base}" (named by ${someEntry}) has no ${base}.tsx or ${base}.ts under ` +
          `${rel(UI_DIR)} — fix \`module\` in registry.json, or restore the file.`,
      );
      continue;
    }
    const real = moduleExportNames(file) as Map<string, { isType: boolean }>;

    if (real.has("*")) {
      failures.push(
        `${base}: contains \`export * from …\`. The names behind a star are not knowable here, so a ` +
          `published module cannot carry one — re-export the names explicitly and declare them in ` +
          `\`exports\` on ${someEntry}.`,
      );
    }

    const withheld = withheldByModule.get(base) ?? new Map<string, string>();

    // → direction one: the module exports a name no entry accounts for, in either list.
    for (const name of [...real.keys()].sort()) {
      if (name === "*") continue;
      if (name === "default") continue; // carve-out: a named re-export barrel cannot carry a default.
      if (declared.has(name)) continue;
      if (withheld.has(name)) continue; // withheld on purpose, and named in `internalExports`.
      failures.push(
        `${base} exports "${name}" but no registry entry accounts for it — it would ship ungoverned, or ` +
          `(as today) not ship at all with no error. Decide: add "${name}" to \`exports\` on ${someEntry} ` +
          `in registry.json to publish it, or to \`internalExports\` on ${someEntry} to withhold it on ` +
          `the record. Then run \`${REFRESH}\`. Stopping the export from ${base} also settles it.`,
      );
    }

    // ← withheld names are claims about the module too, checked the same way `exports` is. The
    //   generator refuses on these as well, so arm A fails in parallel; this arm is what names them.
    for (const name of [...withheld.keys()].sort()) {
      if (!real.has(name)) {
        failures.push(
          `${withheld.get(name)}: withholds "${name}" in \`internalExports\` but ${base} does not export ` +
            `it — a rename or a deletion left the claim behind, and the module's real name is now ` +
            `unaccounted for. Drop it, or correct the name.`,
        );
      }
      if (declared.has(name)) {
        failures.push(
          `${withheld.get(name)}: "${name}" is in BOTH \`exports\` and \`internalExports\` — a name ` +
            `either publishes or it does not. Remove it from one list.`,
        );
      }
    }

    // ← direction two: an entry declares a name the module does not export.
    for (const name of [...declared.keys()].sort()) {
      if (real.has(name)) continue;
      failures.push(
        `${declared.get(name)}: declares "${name}" but ${base} does not export it — a rename or a deletion ` +
          `left the registry claiming a name the source no longer has. Fix the export, or drop the name ` +
          `from \`exports\` in registry.json and run \`${REFRESH}\`.`,
      );
    }
  }

  expect(
    failures,
    failures.length
      ? `public-surface drift — registry.json and the modules it publishes disagree (${failures.length}):\n  ` +
        failures.join("\n  ")
      : "",
  ).toEqual([]);
});

/* ---- C: reverse / anti-rot on the allowlist -------------------------------- */
test("the internal-module allowlist cannot rot", () => {
  const failures: string[] = [];
  const registeredModules = new Set(declaredByModule.keys());
  const walked = (key: string) =>
    WALKED_DIRS.some(({ prefix }) =>
      prefix === "" ? !key.includes("/") : key.startsWith(prefix) && !key.slice(prefix.length).includes("/"),
    );

  for (const [key, reason] of Object.entries(INTERNAL_MODULES)) {
    if (!reason.trim()) {
      failures.push(
        `"${key}" is on INTERNAL_MODULES with no reason. The reason is what makes it a decision and ` +
          `not an omission. Write one line in ${SELF} saying why it publishes nothing.`,
      );
    }
    if (!walked(key)) {
      failures.push(
        `"${key}" is on INTERNAL_MODULES but arm D does not walk its directory, so the line exempts ` +
          `nothing and checks nothing. Add the directory to WALKED_DIRS in ${SELF}, or delete the line.`,
      );
      continue;
    }
    if (!moduleFile(key)) {
      failures.push(
        `"${key}" is on INTERNAL_MODULES but ${rel(moduleDirOf(key))}/${key}.tsx|.ts does not exist — the module ` +
          `was renamed or deleted and the exemption outlived it. Delete the line in ${SELF} (or correct ` +
          `the name), so the list keeps meaning what it says.`,
      );
      continue;
    }
    if (registeredModules.has(key)) {
      failures.push(
        `"${key}" is on INTERNAL_MODULES but registry.json now names it as a \`module\` — it publishes, ` +
          `so it is no longer internal. Delete the line in ${SELF}. Arm B governs it from here.`,
      );
    }
  }

  expect(
    failures,
    failures.length
      ? `the internal-module allowlist is stale (${failures.length}):\n  ${failures.join("\n  ")}`
      : "",
  ).toEqual([]);
});

/* ---- D: unregistered module ------------------------------------------------ */
test("every module under src/components/ui and src/hooks is registered or declared internal", () => {
  const failures: string[] = [];
  const registeredModules = new Set(declaredByModule.keys());

  const modules = WALKED_DIRS.flatMap(({ dir, prefix }) =>
    readdirSync(dir)
      .filter((f) => /\.tsx?$/.test(f) && !NOT_A_MODULE.test(f) && !f.startsWith("_"))
      .map((f) => f.replace(/\.tsx?$/, ""))
      .filter((base) => base !== BARREL_BASENAME)
      .map((base) => ({ base, mod: prefix + base })),
  );

  const seen = new Set<string>();
  for (const { base, mod } of modules.sort((a, b) => a.mod.localeCompare(b.mod))) {
    if (seen.has(mod)) continue; // a .ts and a .tsx of one name are one module
    seen.add(mod);
    if (registeredModules.has(mod) || Object.hasOwn(INTERNAL_MODULES, mod)) continue;

    const file = moduleFile(mod) as string;
    const names = [...(moduleExportNames(file) as Map<string, { isType: boolean }>).keys()]
      .filter((n) => n !== "*" && n !== "default")
      .sort();
    const isPath = mod.includes("/");
    const suggestion = [
      "    {",
      `      "name": ${JSON.stringify(base)},`,
      `      "module": ${JSON.stringify(mod)},`,
      `      "exports": ${JSON.stringify(names)},`,
      `      "internalExports": [],`,
      `      "status": "CHOOSE ported | planned | external | out-of-scope",`,
      `      "wave": "CHOOSE a number 0-5",`,
      ...(isPath
        ? [
            `      "tier": "lite",`,
            `      "controlBox": "exempt",`,
            `      "buildingBlock": "CHOOSE a plain description of what it is built on",`,
            `      "note": "CHOOSE the ruling that publishes it, and the component page that documents it"`,
          ]
        : [
            `      "tier": "CHOOSE full | lite",`,
            `      "controlBox": "CHOOSE row | composite | nav | exempt",`,
            `      "buildingBlock": "CHOOSE the Radix primitive it is built on, or a plain description",`,
            `      "storyPath": "src/components/ui/${base}.stories.tsx"`,
          ]),
      "    }",
    ].join("\n");

    failures.push(
      `${rel(file)} exports ${names.length} name(s) but no registry entry names "${mod}" as its ` +
        `\`module\`, and it is not on INTERNAL_MODULES — so nothing decides whether those names ship.\n` +
        `  Either paste this entry into registry.json and run \`${REFRESH}\`:\n${suggestion}\n` +
        `  (every CHOOSE… value is a placeholder: registry.node-check.ts rejects the status / wave / tier ` +
        `it names, and control-box-registry.node-check.ts rejects the controlBox once the entry is ` +
        `status:"ported" — which is also when the storyPath has to exist. Move any name that should NOT ` +
        `ship from "exports" into "internalExports". Both lists together must cover all ${names.length}.)\n` +
        `  Or, if it publishes nothing AT ALL on purpose — a hook, a context, a docs-only helper — add ` +
        `"${mod}" to INTERNAL_MODULES in ${SELF} with a one-line reason. That list is for modules with ` +
        `zero public names. One public name makes it a registry entry.`,
    );
  }

  expect(
    failures,
    failures.length
      ? `unregistered module(s) under ${WALKED_DIRS.map(({ dir }) => rel(dir)).join(" and ")} (${failures.length}):\n  ${failures.join("\n  ")}`
      : "",
  ).toEqual([]);
});
