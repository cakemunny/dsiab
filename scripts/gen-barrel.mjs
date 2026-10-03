#!/usr/bin/env node
/**
 * Barrel generator — the mechanism that makes REGISTERING a component the act that PUBLISHES it.
 *
 * `registry.json` is the truth of what exists ([[component-registry]]). Since D2 it is also the truth of what SHIPS:
 * each entry carries `module` (the file its exports come from) and `exports` (the exact names it
 * publishes). This step turns those two fields into `src/components/ui/index.ts` — the component
 * surface the package entry re-exports.
 *
 * WHY NAMED RE-EXPORTS AND NEVER `export *`:
 *   `export * from "./Button"` publishes whatever `Button.tsx` happens to export today — measured,
 *   that is 302 names against 96 registry entries, so 206 names would ship with no entry, no ruling
 *   and no guard, and `export function useX()` added tomorrow would reach every consumer silently.
 *   A named list cannot drift: a name that is not in `exports[]` is not in the public surface, and a
 *   name in `exports[]` that the module stopped exporting fails this generator (see `resolveBarrel`).
 *
 * WHY THE COMPILER API rather than reading the type modifier out of the registry:
 *   whether a name is a type is a fact about the source, not a decision. Parsing it here keeps the
 *   `type` modifier (required by `isolatedModules`-style builds) true by construction, and keeps the
 *   registry a list of NAMES that a human can read and edit. `moduleExportNames` is exported so the
 *   registry guard shares this one implementation instead of growing a second parser that can disagree.
 *
 * TWO OUTPUTS, BECAUSE A HAND-KEPT MIRROR IS STILL DRIFT:
 *   the package entry `src/index.ts` cannot say `export * from "./components/ui"` — it also re-exports
 *   names from `@radix-ui/themes`, and a star beside an explicit re-export SHADOWS silently, so a
 *   wrapped `Box` added tomorrow would lose to Radix's `Box` without a word. Written out name by name,
 *   that same collision is a compile error. But writing 305 names out by hand puts a copy of the
 *   barrel one file downstream, and a copy drifts: add a component, run `npm run barrel`, and the
 *   import still fails because nobody edited the entry. So the entry's COMPONENT BLOCK is generated
 *   too, between `gen-barrel:begin` / `gen-barrel:end` markers. Everything outside those markers is
 *   hand-authored and untouched — the theme block and the Radix gap-fillers are RULINGS, not derived
 *   data, and the closing list of names deliberately not re-exported is the only record of those.
 *
 * A MODULE MAY PUBLISH A SUBSET OF WHAT IT EXPORTS:
 *   an entry may carry `internalExports[]` beside `exports[]` — names the module exports that stay
 *   internal on purpose. `Field` is the case it exists for: the shell is `_internal` by ruling, but
 *   `useOptionalFieldControl` is REQUIRED to build a custom input, so one name publishes and fifteen
 *   do not. The two lists together must account for every name the module exports (the guard checks
 *   that direction); here we check that a withheld name is real, and that no name is on both lists.
 *   Silence is not an option in either list — that is the whole point of the mechanism.
 *
 * Usage:  node scripts/gen-barrel.mjs           (writes both outputs)
 *         node scripts/gen-barrel.mjs --check   (writes nothing; exits 1 if either is out of date)
 * Output: src/components/ui/index.ts            (generated whole — do not edit by hand)
 *         src/index.ts, between the markers      (generated region inside a hand-authored file)
 */
import ts from "typescript";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const REGISTRY_PATH = join(ROOT, "registry.json");
export const SRC_DIR = join(ROOT, "src");
export const UI_DIR = join(ROOT, "src/components/ui");
export const BARREL_PATH = join(UI_DIR, "index.ts");
export const ENTRY_PATH = join(ROOT, "src/index.ts");

/**
 * The markers in src/index.ts that fence the generated component block. Hand-placed, never rewritten.
 * A marker is a line that OPENS with the comment — the file's own prose names both tokens when it
 * explains the mechanism, and prose must never be mistaken for a fence.
 */
export const ENTRY_BEGIN = /^\/\* gen-barrel:begin\b/;
export const ENTRY_END = /^\/\* gen-barrel:end\b/;

/** Longest single-line `export { … } from "…";` we emit before wrapping one name per line. */
const WRAP_AT = 110;

/** Byte-stable ordering — `localeCompare` varies with the machine's locale, and this file is committed. */
const byCodeUnit = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * A registry `module` is EITHER a bare basename, resolved under `src/components/ui/` — which is what
 * all 104 component entries use — OR a path relative to `src/`, for a module that publishes from
 * somewhere else (`hooks/useMediaQuery`). The slash is the whole signal, so nothing about the
 * component entries changed when the second form was added.
 *
 * Before this existed the public surface was reachable only from `src/components/ui/`, so a hook or
 * a util had no supported route out and the choices were to move the file into a components
 * directory it did not belong in, or to hand-list it beside the theme exports. Both are worse than
 * letting the registry say where a module lives.
 */
export function moduleDirOf(mod) {
  return mod.includes("/") ? SRC_DIR : UI_DIR;
}

/** Resolve a registry `module` to the file that defines it (`.tsx` first — most components are TSX). */
export function moduleFile(mod) {
  for (const ext of [".tsx", ".ts"]) {
    const p = join(moduleDirOf(mod), mod + ext);
    if (existsSync(p)) return p;
  }
  return null;
}

/**
 * The specifier the generated barrel uses to reach a module. The barrel lives at
 * `src/components/ui/index.ts`, so a sibling is `./Name` and anything else is reached back out
 * through `../../`.
 */
export function specifierFor(mod) {
  return mod.includes("/") ? `../../${mod}` : `./${mod}`;
}

/**
 * Every name a module exports, mapped to whether it is a TYPE (an interface, a type alias, or a
 * `type`-flagged specifier). `export default` is reported under the key `default`.
 *
 * @param {string} file absolute path to a `.ts`/`.tsx` module
 * @returns {Map<string, { isType: boolean }>}
 */
export function moduleExportNames(file) {
  const sf = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out = new Map();
  const add = (name, isType) => out.set(name, { isType });
  const modifiers = (n) => (ts.canHaveModifiers(n) ? (ts.getModifiers(n) ?? []) : []);
  const isExported = (n) => modifiers(n).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
  const isDefault = (n) => modifiers(n).some((m) => m.kind === ts.SyntaxKind.DefaultKeyword);

  const bindings = (name) => {
    if (ts.isIdentifier(name)) return [name.text];
    const found = [];
    for (const el of name.elements) {
      if (!ts.isBindingElement(el)) continue;
      found.push(...bindings(el.name));
    }
    return found;
  };

  for (const st of sf.statements) {
    if (ts.isVariableStatement(st) && isExported(st)) {
      for (const d of st.declarationList.declarations) for (const n of bindings(d.name)) add(n, false);
    } else if ((ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st)) && isExported(st)) {
      if (isDefault(st)) add("default", false);
      else if (st.name) add(st.name.text, false);
    } else if (ts.isTypeAliasDeclaration(st) && isExported(st)) {
      add(st.name.text, true);
    } else if (ts.isInterfaceDeclaration(st) && isExported(st)) {
      add(st.name.text, true);
    } else if (ts.isEnumDeclaration(st) && isExported(st)) {
      add(st.name.text, false);
    } else if (ts.isExportAssignment(st)) {
      add("default", false);
    } else if (ts.isExportDeclaration(st)) {
      if (st.exportClause && ts.isNamedExports(st.exportClause)) {
        for (const el of st.exportClause.elements) add(el.name.text, Boolean(st.isTypeOnly || el.isTypeOnly));
      } else if (st.exportClause && ts.isNamespaceExport(st.exportClause)) {
        add(st.exportClause.name.text, false);
      } else if (!st.exportClause && st.moduleSpecifier) {
        // `export * from "…"` — the names are not knowable without resolving the target module. The
        // registry declares names, so a star re-export inside a published module is a hole in the
        // contract, not a shortcut. Flagged so it can never pass unnoticed.
        add("*", false);
      }
    }
  }
  return out;
}

/**
 * Names a registry entry declares as DELIBERATELY WITHHELD — exported by the module, kept out of the
 * public surface on purpose. Read by the parity guard, which needs `exports[] ∪ internalExports[]` to
 * account for every name a published module exports.
 *
 * @returns {Map<string, Map<string, string>>} module basename → Map(withheld name → declaring entry)
 */
export function internalExportsByModule() {
  const registry = JSON.parse(readFileSync(REGISTRY_PATH, "utf8"));
  const out = new Map();
  for (const entry of registry) {
    if (!entry.module || !(entry.internalExports ?? []).length) continue;
    if (!out.has(entry.module)) out.set(entry.module, new Map());
    for (const name of entry.internalExports) out.get(entry.module).set(name, entry.name);
  }
  return out;
}

/**
 * The barrel, resolved from the registry. Throws on anything that would make the public surface a
 * lie — a declared name its module does not export, a declared name with no module, a duplicate, or
 * an `internalExports` entry that is not real or is also declared public.
 *
 * @returns {{ text: string, modules: number, names: number, specifiers: string[] }}
 */
export function resolveBarrel() {
  const registry = JSON.parse(readFileSync(REGISTRY_PATH, "utf8"));
  const problems = [];

  /** module basename → Map(name → declaring entry) */
  const wanted = new Map();
  const owner = new Map(); // exported name → the entry that declares it (uniqueness across the whole surface)
  const withheld = internalExportsByModule();

  for (const entry of registry) {
    const names = entry.exports ?? [];
    if (!names.length) continue;
    if (!entry.module) {
      problems.push(`${entry.name}: declares ${names.length} export(s) but no \`module\` to take them from.`);
      continue;
    }
    for (const name of names) {
      const already = owner.get(name);
      if (already) {
        problems.push(`"${name}" is declared by both ${already} and ${entry.name} — a name has exactly one owner.`);
        continue;
      }
      owner.set(name, entry.name);
      if (!wanted.has(entry.module)) wanted.set(entry.module, new Map());
      wanted.get(entry.module).set(name, entry.name);
    }
  }

  // `internalExports` is a claim about the module too, so it is checked like `exports` is: the name
  // must really be exported (a rename leaves a withheld name pointing at nothing, and the module's
  // NEW name would then be unaccounted for), and it must not also be public.
  for (const [base, names] of withheld) {
    const file = moduleFile(base);
    if (!file) {
      problems.push(
        `module "${base}" is named by \`internalExports\` on ${[...names.values()][0]} but has no ` +
          `${base}.tsx or ${base}.ts under ${base.includes("/") ? "src/" : "src/components/ui/"}.`,
      );
      continue;
    }
    const real = moduleExportNames(file);
    for (const [name, entryName] of names) {
      if (!real.has(name)) {
        problems.push(
          `${entryName}: withholds "${name}" in \`internalExports\` but ${base} does not export it — ` +
            `a rename or a deletion left the claim behind. Drop it, or correct the name.`,
        );
      }
      if (wanted.get(base)?.has(name)) {
        problems.push(
          `${entryName}: "${name}" is in BOTH \`exports\` and \`internalExports\` — a name either ` +
            `publishes or it does not. Remove it from one list.`,
        );
      }
    }
  }

  const statements = [];
  const allSpecifiers = [];
  for (const base of [...wanted.keys()].sort(byCodeUnit)) {
    const file = moduleFile(base);
    if (!file) {
      problems.push(
        `module "${base}" has no ${base}.tsx or ${base}.ts under ` +
          `${base.includes("/") ? "src/" : "src/components/ui/"}.`,
      );
      continue;
    }
    const real = moduleExportNames(file);
    if (real.has("*")) {
      problems.push(`${base}: contains \`export * from …\` — re-export the names explicitly so the registry can declare them.`);
    }
    const specifiers = [];
    for (const name of [...wanted.get(base).keys()].sort(byCodeUnit)) {
      const found = real.get(name);
      if (!found) {
        problems.push(
          `${wanted.get(base).get(name)}: declares "${name}" but ${base} does not export it — ` +
            `fix the export or drop the name from \`exports\` in registry.json.`,
        );
        continue;
      }
      specifiers.push(found.isType ? `type ${name}` : name);
    }
    if (!specifiers.length) continue;
    allSpecifiers.push(...specifiers);
    const from = specifierFor(base);
    const oneLine = `export { ${specifiers.join(", ")} } from "${from}";`;
    statements.push(
      oneLine.length <= WRAP_AT ? oneLine : `export {\n${specifiers.map((s) => `  ${s},`).join("\n")}\n} from "${from}";`,
    );
  }

  if (problems.length) {
    throw new Error(
      `gen-barrel: the registry and the source disagree (${problems.length}) —\n  ` + problems.join("\n  "),
    );
  }

  const text =
    `// AUTO-GENERATED by scripts/gen-barrel.mjs — do not edit by hand.\n` +
    `// Refresh with: npm run barrel\n` +
    `//\n` +
    `// The component surface, one named re-export per registry \`exports[]\` entry. Never \`export *\`:\n` +
    `// registering a component in registry.json is what publishes it, so a name that is not declared\n` +
    `// there is not public, and a declared name its module stopped exporting fails the generator.\n\n` +
    statements.join("\n") +
    "\n";

  // The entry lists every component name in ONE statement, so it sorts on the bare name — a `type`
  // modifier is a property of the name, not part of it, and sorting on the rendered specifier would
  // scatter each type away from the value it belongs to.
  const bare = (s) => s.replace(/^type /, "");
  const region =
    "export {\n" +
    [...allSpecifiers].sort((a, b) => byCodeUnit(bare(a), bare(b))).map((s) => `  ${s},`).join("\n") +
    '\n} from "./components/ui";';

  return { text, region, modules: statements.length, names: owner.size, specifiers: allSpecifiers };
}

/**
 * Splice the generated component block into the hand-authored package entry. Everything outside the
 * markers is returned untouched — those sections are rulings, not derived data.
 *
 * @param {string} fileText current src/index.ts
 * @param {string} region   the `export { … } from "./components/ui";` statement
 * @returns {string} the file with the marked region replaced
 */
export function applyEntryRegion(fileText, region) {
  const lines = fileText.split("\n");
  const begin = lines.findIndex((l) => ENTRY_BEGIN.test(l));
  const end = lines.findIndex((l) => ENTRY_END.test(l));
  if (begin < 0 || end < 0 || end <= begin) {
    throw new Error(
      "gen-barrel: src/index.ts must fence its component block with a line opening `/* gen-barrel:begin` " +
        "and a later line opening `/* gen-barrel:end` — the generator replaces what is between them and " +
        `never touches anything else. ${
          begin < 0 ? "The begin marker is missing." : end < 0 ? "The end marker is missing." : "They are in the wrong order."
        }`,
    );
  }
  return [...lines.slice(0, begin + 1), region, ...lines.slice(end)].join("\n");
}

/* ---- CLI ----------------------------------------------------------------- */
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes("--check");
  const { text, region, modules, names } = resolveBarrel();

  const entryOnDisk = readFileSync(ENTRY_PATH, "utf8");
  const entryWanted = applyEntryRegion(entryOnDisk, region);
  const barrelOnDisk = existsSync(BARREL_PATH) ? readFileSync(BARREL_PATH, "utf8") : null;

  if (check) {
    const stale = [
      barrelOnDisk === text ? null : "src/components/ui/index.ts",
      entryOnDisk === entryWanted ? null : "src/index.ts (the block between the gen-barrel markers)",
    ].filter(Boolean);
    if (!stale.length) {
      console.log(`barrel: up to date — ${names} names from ${modules} modules, in the barrel and the entry`);
    } else {
      console.error(
        `barrel: stale — registry.json declares a surface these file(s) do not emit: ${stale.join(", ")}. ` +
          `Run \`npm run barrel\` and commit the result.`,
      );
      process.exit(1);
    }
  } else {
    writeFileSync(BARREL_PATH, text);
    writeFileSync(ENTRY_PATH, entryWanted);
    console.log(`barrel: wrote ${names} names from ${modules} modules → ${BARREL_PATH}`);
    console.log(`entry:  spliced the same ${names} names into the marked region of ${ENTRY_PATH}`);
  }
}
