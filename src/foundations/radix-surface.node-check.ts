/* =============================================================================
   radix-surface.node-check.ts — THE GUARD ON THE RADIX RELATIONSHIP (D3)
   -----------------------------------------------------------------------------
   Sibling of barrel.node-check.ts and registry.node-check.ts: same node lane
   (vitest.node.config.ts / `npm run test:tokens` / the pretest hook), same harness,
   same idiom — measure the real thing, and let the file that CLAIMS something be the
   file the measurement is checked against.

   WHAT IT PROTECTS. This system is a layer on `@radix-ui/themes`, and every one of
   that package's exported names has to have been DECIDED about. There are exactly
   three outcomes, and the whole relationship is the partition:

     WRAPPED  the name is exported here too, and the binding a consumer gets is this
              system's own — a component that resolves the size tier, paints from
              `--ds-*`, wires the Field shell. 57 names today.
     KEPT     the name is exported here and the binding is RADIX'S OWN, deliberately:
              20 named one by one in section 3 of src/index.ts, 10 through a registered
              component whose module is a single `export { … } from "@radix-ui/themes"`.
              30 names today.
     DROPPED  the name is not exported at all, on the record, with a reason. 16 today.

   WHAT WENT WRONG WITHOUT IT. Until 2026-08-05 the entry's header, this plan's D3 and
   the commit messages all said "67 wrapped / 36 unwrapped". Measured against Radix, it
   is 57 / 46: the ten names `AspectRatio`, `Grid`, `Section`, `Skeleton`,
   `VisuallyHidden` and their `*Props` ship Radix's own binding while being counted as
   wrappers, and the entry positively called two of them "wrapped". 67 + 36 = 103 was
   internally consistent, so nothing about the sentence invited a check — which is the
   argument for a guard rather than a careful reader.

   AND THE HOLE IT CLOSES. Deleting a re-exported name is caught by the compiler. A
   Radix release ADDING one was caught by nothing: the peer range is open-ended, so a
   minor can introduce a name that this package neither ships nor rules out, and the
   silence looks identical to a decision. Arm A is the arm that fires there.

   THE FOUR ARMS:

     A  ACCOUNTED FOR. Every name `@radix-ui/themes` exports is wrapped (measured),
        or on the KEEP roster below, or on the DROP roster below. A Radix name that is
        neither wrapped nor rostered fails, and the failure says how to rule on it. A
        name declared in both this package and Radix at once fails as unclassifiable
        rather than being guessed at.
     B  THE RECORDED COUNTS. The six numbers in src/index.ts's census block equal the
        six measured ones. This is the arm that would have caught the incident: prose
        that states a count is checked against the surface it claims to describe.
     C  THE KEEP ROSTER, BOTH DIRECTIONS. Every rostered keep really resolves to Radix's
        own binding here, and every measured keep is on the roster — so a name that
        quietly starts shipping Radix's binding cannot be filed under "wrapped" again,
        and a name that GAINS a wrapper cannot stay recorded as kept. Section 3's
        membership is read off the entry's own export statement, never a second list.
     D  A DROPPED NAME NEVER REAPPEARS, AND EVERY RULING IS WRITTEN DOWN. A rostered
        drop that turns up in the package surface fails. Each rostered drop must also be
        named in the entry's "DELIBERATELY NOT EXPORTED" block, and each keep that ships
        through section 2 in its "KEPT THROUGH SECTION 2" block — a ruling with no
        written reason is the state the roster exists to prevent.

   WHY A ROSTER HERE AND PROSE THERE. The rosters are not a second copy of a machine
   list: src/index.ts records the RULINGS in prose a consumer reads, and this file
   records the NAMES a test can compare. Arms C and D pin the two together in both
   directions, so they cannot drift apart silently — the same shape as
   barrel.node-check.ts's INTERNAL_MODULES and its anti-rot arm. Derivation alone
   cannot replace the roster: a Radix name this package simply does not export is
   indistinguishable, by measurement, from one nobody has looked at yet. The roster is
   what makes the second one fail.

   HOW IT MEASURES. Through the TypeScript checker, not by reading text: an export is
   followed along its alias chain to the declaration it ultimately names, and the
   question "whose binding is this?" is answered by which file that declaration lives
   in. A re-export chain three modules deep resolves the same as a direct one, which is
   the point — `Grid` reaches a consumer through `src/index.ts` → `./components/ui` →
   `./Grid` → `@radix-ui/themes`, and only the checker follows that honestly. The entry
   path comes from the generator (scripts/gen-barrel.mjs), so this guard cannot end up
   pointed at a different file than the one that ships, and Radix is resolved from the
   entry's OWN `from "@radix-ui/themes"` statement — the same specifier, under the same
   compiler options as the type gate.
   ============================================================================= */
import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import ts from "typescript";
import { test, expect } from "vitest";
import { ENTRY_PATH } from "../../scripts/gen-barrel.mjs";

const ROOT = process.cwd();
const rel = (p: string) => relative(ROOT, p);
/** This file, for failures whose fix is editing a roster below. */
const SELF = "src/foundations/radix-surface.node-check.ts";
/** The file that carries the rulings in prose, and the census the numbers live in. */
const ENTRY = rel(ENTRY_PATH);

/**
 * KEEP — Radix names this package exports with RADIX'S OWN binding, on purpose.
 *
 * Which lane a keep ships in (section 3 by name, or section 2 through a component whose
 * module is a bare re-export) is MEASURED, not listed: recording it here would be a third
 * place to forget. What is recorded here is only that the name was ruled on.
 *
 * The reasons live beside the names in src/index.ts — section 3's grouping comments for
 * the twenty, and the "KEPT THROUGH SECTION 2" block for the ten. Arm D checks the ten
 * are really written there.
 */
const KEEP = [
  "AccessibleIcon",
  "AccessibleIconProps",
  "AspectRatio",
  "AspectRatioProps",
  "Box",
  "BoxProps",
  "Container",
  "ContainerProps",
  "Em",
  "EmProps",
  "Flex",
  "FlexProps",
  "Grid",
  "GridProps",
  "Inset",
  "InsetProps",
  "Quote",
  "QuoteProps",
  "Reset",
  "ResetProps",
  "Section",
  "SectionProps",
  "Skeleton",
  "SkeletonProps",
  "Slot",
  "Slottable",
  "Strong",
  "StrongProps",
  "VisuallyHidden",
  "VisuallyHiddenProps",
] as const;

/**
 * DROP — Radix names this package deliberately does not export. Every one has a written
 * reason in the "DELIBERATELY NOT EXPORTED" block at the foot of src/index.ts, which arm D
 * requires; the reasons are not repeated here, so there is one place to read them and one
 * place to edit them.
 */
const DROP = [
  "ChevronDownIcon",
  "IconProps",
  "Portal",
  "PortalProps",
  "Radio",
  "RadioProps",
  "TabNav",
  "Theme",
  "ThemeContext",
  "ThemePanel",
  "ThemePanelProps",
  "ThemeProps",
  "ThickCheckIcon",
  "ThickChevronRightIcon",
  "ThickDividerHorizontalIcon",
  "useThemeContext",
] as const;

/** The keys the census block in src/index.ts must carry — exactly these, in any order. */
const CENSUS_KEYS = [
  "radix-names",
  "wrapped",
  "kept",
  "in-section-3",
  "through-a-component",
  "dropped",
] as const;
type CensusKey = (typeof CENSUS_KEYS)[number];

/** A census line: five to seven spaces, a lower-case key, the number, then its gloss. */
const CENSUS_LINE = /^ {5,7}([a-z][a-z0-9-]*) {2,}(\d+) {2,}\S/;

/** The two record blocks at the foot of the entry, matched on their opening line. */
const KEPT_BLOCK = /^\/\* KEPT THROUGH SECTION 2\b/;
const DROP_BLOCK = /^\/\* DELIBERATELY NOT EXPORTED\b/;

const RADIX_SPECIFIER = "@radix-ui/themes";
const isRadixFile = (f: string) => f.split("node_modules/").length > 1 && /@radix-ui[\\/]themes[\\/]/.test(f);

/* ---- the measurement ------------------------------------------------------- */

/** Compiler options straight from the repo's tsconfig, so resolution matches the type gate. */
function compilerOptions(): ts.CompilerOptions {
  const configPath = join(ROOT, "tsconfig.json");
  const read = ts.readConfigFile(configPath, ts.sys.readFile);
  if (read.error) {
    throw new Error(`could not read tsconfig.json: ${ts.flattenDiagnosticMessageText(read.error.messageText, " ")}`);
  }
  const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, dirname(configPath), undefined, configPath);
  return { ...parsed.options, noEmit: true };
}

type Surface = {
  /** Every name `@radix-ui/themes` exports, sorted. */
  radixNames: string[];
  /** Installed Radix version, and the range package.json accepts — quoted in failures. */
  radixVersion: string;
  peerRange: string;
  /** Radix names this package exports whose binding is this system's own. */
  wrapped: string[];
  /** Radix names this package exports whose binding is Radix's own. */
  kept: string[];
  /** Radix names this package does not export at all. */
  dropped: string[];
  /** Of `kept`, the ones named in the entry's own `from "@radix-ui/themes"` statement. */
  inSection3: string[];
  /** Of `kept`, the ones reaching the surface through the generated component block. */
  throughComponent: string[];
  /** Names declared in BOTH this package and Radix — unclassifiable, never guessed at. */
  ambiguous: string[];
  /** The names section 3 re-exports, read off the entry's AST. */
  section3: string[];
};

/** `JSON.parse(readFileSync(…))`, or null — a file that is absent or malformed is an answer here. */
function readJson(file: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * The installed Radix version and the peer range this package accepts. Both are QUOTED in failure
 * text and MEASURED AGAINST NOTHING — no arm asserts on either — so neither may take the census
 * down with it. Every arm reads through `measured()`, which turns any throw inside the measurement
 * into "the Radix export surface could not be measured, so nothing below was checked": a guard that
 * reports the whole relationship as unverifiable because it could not read a version string is
 * reporting the wrong failure. Each falls back to the "(unset)" the peer range already used, and a
 * failure message that says `@radix-ui/themes@(unset)` is a smaller loss than four skipped arms.
 *
 * The version is resolved from the declaration file the CHECKER ALREADY RESOLVED — walking up to
 * the package.json that owns it — rather than from a path built under ROOT. A layout where the
 * package does not sit at `<root>/node_modules/@radix-ui/themes` (a hoisting root above this one,
 * pnpm's store, a workspace) resolves fine for the compiler and would have failed a ROOT-relative
 * read, so this also describes the copy that was measured rather than one that happens to be nearby.
 */
function metadata(radixModule: ts.Symbol): { radixVersion: string; peerRange: string } {
  const UNSET = "(unset)";

  let radixVersion = UNSET;
  const declared = (radixModule.declarations ?? [])
    .map((d) => d.getSourceFile().fileName)
    .find(isRadixFile);
  let dir = declared ? dirname(declared) : "";
  while (dir && dir !== dirname(dir)) {
    const pkg = readJson(join(dir, "package.json"));
    if (pkg?.name === RADIX_SPECIFIER) {
      if (typeof pkg.version === "string") radixVersion = pkg.version;
      break;
    }
    dir = dirname(dir);
  }

  const peers = readJson(join(ROOT, "package.json"))?.peerDependencies as Record<string, string> | undefined;
  return { radixVersion, peerRange: peers?.[RADIX_SPECIFIER] ?? UNSET };
}

const surface: Surface | { error: string } = (() => {
  try {
    const program = ts.createProgram([ENTRY_PATH], compilerOptions());
    const checker = program.getTypeChecker();
    const entrySf = program.getSourceFile(ENTRY_PATH);
    if (!entrySf) throw new Error(`the program did not include ${ENTRY}`);

    // Radix is resolved from the entry's OWN re-export statement — the same specifier the
    // package ships, so this guard cannot be measuring a different copy than the build is.
    const radixDecls = entrySf.statements.filter(
      (st): st is ts.ExportDeclaration =>
        ts.isExportDeclaration(st) &&
        !!st.moduleSpecifier &&
        ts.isStringLiteral(st.moduleSpecifier) &&
        st.moduleSpecifier.text === RADIX_SPECIFIER,
    );
    if (radixDecls.length !== 1) {
      throw new Error(
        `${ENTRY} has ${radixDecls.length} \`export { … } from "${RADIX_SPECIFIER}"\` statements; this guard ` +
          `and the file's own record both assume exactly one (section 3). Merge them, or teach this guard ` +
          `about the second in ${SELF}.`,
      );
    }
    const radixDecl = radixDecls[0]!;
    const radixModule = checker.getSymbolAtLocation(radixDecl.moduleSpecifier!);
    if (!radixModule) throw new Error(`could not resolve "${RADIX_SPECIFIER}" from ${ENTRY}`);
    const entryModule = checker.getSymbolAtLocation(entrySf);
    if (!entryModule) throw new Error(`could not read the module symbol of ${ENTRY}`);

    const section3: string[] = [];
    if (radixDecl.exportClause && ts.isNamedExports(radixDecl.exportClause)) {
      for (const el of radixDecl.exportClause.elements) section3.push(el.name.text);
    }

    /** Follow an export through its alias chain to the declaration it ultimately names. */
    const ultimate = (sym: ts.Symbol): ts.Symbol => {
      let s = sym;
      const seen = new Set<ts.Symbol>();
      while (s.flags & ts.SymbolFlags.Alias && !seen.has(s)) {
        seen.add(s);
        let next: ts.Symbol | undefined;
        try {
          next = checker.getAliasedSymbol(s);
        } catch {
          break;
        }
        if (!next || next === s) break;
        s = next;
      }
      return s;
    };

    const radixNames = checker.getExportsOfModule(radixModule).map((s) => s.getName()).sort();
    const ours = new Map(checker.getExportsOfModule(entryModule).map((s) => [s.getName(), s]));

    const wrapped: string[] = [];
    const kept: string[] = [];
    const dropped: string[] = [];
    const ambiguous: string[] = [];
    for (const name of radixNames) {
      const sym = ours.get(name);
      if (!sym) {
        dropped.push(name);
        continue;
      }
      const files = (ultimate(sym).getDeclarations() ?? []).map((d) => d.getSourceFile().fileName);
      const fromRadix = files.filter(isRadixFile).length;
      if (files.length === 0) ambiguous.push(name);
      else if (fromRadix === files.length) kept.push(name);
      else if (fromRadix === 0) wrapped.push(name);
      else ambiguous.push(name);
    }

    const inS3 = new Set(section3);
    return {
      radixNames,
      ...metadata(radixModule),
      wrapped,
      kept,
      dropped,
      inSection3: kept.filter((n) => inS3.has(n)),
      throughComponent: kept.filter((n) => !inS3.has(n)),
      ambiguous,
      section3,
    } satisfies Surface;
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
})();

/** Arms read this; a measurement that failed to run is a failure, never a skip. */
function measured(): Surface {
  if ("error" in surface) {
    throw new Error(
      `the Radix export surface could not be measured, so nothing below was checked. ${surface.error}`,
    );
  }
  return surface;
}

const entryText = readFileSync(ENTRY_PATH, "utf8");

/** The entry's leading block comment — where the census lives. */
function headerComment(): string {
  const end = entryText.indexOf("*/");
  if (end < 0) throw new Error(`${ENTRY} has no leading block comment, so the census block cannot be read.`);
  return entryText.slice(0, end);
}

/** A record block at the foot of the entry, from its opening line to the end of that comment. */
function recordBlock(opening: RegExp, label: string): string {
  const lines = entryText.split("\n");
  const start = lines.findIndex((l) => opening.test(l));
  if (start < 0) {
    throw new Error(
      `${ENTRY} no longer has the ${label} block (a comment whose first line matches ${opening}). It is the ` +
        `only written record of those rulings — restore it, or move the record and point this guard at it in ${SELF}.`,
    );
  }
  const end = lines.findIndex((l, i) => i >= start && l.includes("*/"));
  return lines.slice(start, end < 0 ? lines.length : end + 1).join("\n");
}

/* ---- A: every Radix name is accounted for ---------------------------------- */
test("every name @radix-ui/themes exports is wrapped, kept, or dropped — on the record", () => {
  const m = measured();
  const rostered = new Set<string>([...KEEP, ...DROP]);
  const isWrapped = new Set(m.wrapped);
  const failures: string[] = [];

  for (const name of m.ambiguous) {
    failures.push(
      `"${name}" is declared BOTH here and in ${RADIX_SPECIFIER}, so whose binding a consumer gets cannot be ` +
        `read off the declaration — this guard will not guess. Make the export resolve to one declaration.`,
    );
  }

  for (const name of m.radixNames) {
    if (isWrapped.has(name) || rostered.has(name)) continue;
    failures.push(
      `${RADIX_SPECIFIER}@${m.radixVersion} exports "${name}", and nothing in this package decides what happens ` +
        `to it. The peer range is "${m.peerRange}", so a Radix release can add a name at any time and the ` +
        `silence that follows looks exactly like a decision. Rule on it, then record the ruling:\n` +
        `      it should ship as Radix's own binding  → re-export it from section 3 of ${ENTRY} (or register a ` +
        `component module that re-exports it), add "${name}" to KEEP in ${SELF}, and give it a line in the ` +
        `matching record block at the foot of ${ENTRY};\n` +
        `      it should not ship                     → add "${name}" to DROP in ${SELF} and give it a line with ` +
        `its reason in the "DELIBERATELY NOT EXPORTED" block at the foot of ${ENTRY};\n` +
        `      it should be wrapped                   → build the wrapper, register it in registry.json, run ` +
        `\`npm run barrel\`. A wrapped name needs no roster entry — arm C measures it.\n` +
        `      Either way, update the census block in ${ENTRY}'s header; arm B checks those numbers.`,
    );
  }

  for (const name of [...KEEP, ...DROP]) {
    if (!m.radixNames.includes(name)) {
      failures.push(
        `"${name}" is on the ${KEEP.includes(name as never) ? "KEEP" : "DROP"} roster in ${SELF} but ` +
          `${RADIX_SPECIFIER}@${m.radixVersion} does not export it — Radix renamed or removed it and the ruling ` +
          `outlived the name. Drop the line, and drop it from the record block in ${ENTRY} too.`,
      );
    }
  }

  const both = KEEP.filter((n) => (DROP as readonly string[]).includes(n));
  for (const name of both) {
    failures.push(`"${name}" is on BOTH rosters in ${SELF} — a name either ships or it does not.`);
  }

  expect(
    failures,
    failures.length ? `unruled or mis-ruled Radix name(s) (${failures.length}):\n  ${failures.join("\n  ")}` : "",
  ).toEqual([]);
});

/* ---- B: the counts the entry records match the measured surface ------------- */
test("the census recorded in src/index.ts matches the measured Radix surface", () => {
  const m = measured();
  const recorded = new Map<string, number>();
  const duplicates: string[] = [];
  for (const line of headerComment().split("\n")) {
    const hit = CENSUS_LINE.exec(line);
    if (!hit) continue;
    const [, key, value] = hit;
    if (recorded.has(key!)) duplicates.push(key!);
    recorded.set(key!, Number(value));
  }

  const expected: Record<CensusKey, number> = {
    "radix-names": m.radixNames.length,
    wrapped: m.wrapped.length,
    kept: m.kept.length,
    "in-section-3": m.inSection3.length,
    "through-a-component": m.throughComponent.length,
    dropped: m.dropped.length,
  };

  const failures: string[] = [];
  for (const key of duplicates) failures.push(`"${key}" is recorded twice — the census has one line per key.`);
  for (const key of recorded.keys()) {
    if (!(CENSUS_KEYS as readonly string[]).includes(key)) {
      failures.push(
        `"${key}" is not a census key. The block carries exactly these, and nothing else: ` +
          `${CENSUS_KEYS.join(", ")}. Rename it, or teach ${SELF} what it measures.`,
      );
    }
  }
  for (const key of CENSUS_KEYS) {
    if (!recorded.has(key)) {
      failures.push(
        `the census block in ${ENTRY} has no "${key}" line, so that number is claimed nowhere and checked ` +
          `nowhere. Measured, it is ${expected[key]}.`,
      );
      continue;
    }
    if (recorded.get(key) !== expected[key]) {
      failures.push(
        `"${key}": the header says ${recorded.get(key)}, the surface measures ${expected[key]}.`,
      );
    }
  }

  expect(
    failures,
    failures.length
      ? `the census in ${ENTRY} no longer describes the package (${failures.length}):\n  ${failures.join("\n  ")}\n\n` +
        `  Measured now, against ${RADIX_SPECIFIER}@${m.radixVersion}: ` +
        `${m.radixNames.length} Radix names = ${m.wrapped.length} wrapped + ${m.kept.length} kept ` +
        `(${m.inSection3.length} in section 3, ${m.throughComponent.length} through a component) + ` +
        `${m.dropped.length} dropped. Correct the block; it is the record, not a description of one.`
      : "",
  ).toEqual([]);
});

/* ---- C: the keep roster, both directions ----------------------------------- */
test("every kept name really ships Radix's own binding, and every one is rostered", () => {
  const m = measured();
  const roster = new Set<string>(KEEP);
  const keptNow = new Set(m.kept);
  const wrappedNow = new Set(m.wrapped);
  const failures: string[] = [];

  // → a rostered keep that no longer keeps.
  for (const name of KEEP) {
    if (keptNow.has(name)) continue;
    if (wrappedNow.has(name)) {
      failures.push(
        `"${name}" is on KEEP in ${SELF}, but the binding this package exports is now its OWN — it gained a ` +
          `wrapper. That is a promotion, not a slip: delete it from KEEP, delete its line from the ` +
          `"KEPT THROUGH SECTION 2" block in ${ENTRY} if it is there, and move it in the census (kept down one, ` +
          `wrapped up one).`,
      );
    } else if (m.dropped.includes(name)) {
      failures.push(
        `"${name}" is on KEEP in ${SELF} but this package no longer exports it at all. Either restore the ` +
          `re-export, or move it to DROP and give it a reason in the "DELIBERATELY NOT EXPORTED" block in ${ENTRY}.`,
      );
    }
  }

  // ← a name that ships Radix's binding and is on no roster: the exact shape of the 2026-08-05 defect,
  //   where ten such names were counted as wrappers because nothing ever compared the two.
  for (const name of m.kept) {
    if (roster.has(name)) continue;
    failures.push(
      `"${name}" is exported by this package with RADIX'S OWN binding, but it is on no roster in ${SELF} — so it ` +
        `is being counted as a wrapper while a consumer gets the vendor's component. Add it to KEEP and record ` +
        `the reason in ${ENTRY}: section 3's grouping comments if it is re-exported there, the ` +
        `"KEPT THROUGH SECTION 2" block if it reaches the surface through a component module.`,
    );
  }

  // Section 3's membership is the entry's own statement, never a second list.
  for (const name of m.section3) {
    if (!keptNow.has(name)) {
      failures.push(
        `section 3 of ${ENTRY} re-exports "${name}" from ${RADIX_SPECIFIER}, but the name this package finally ` +
          `exports does not resolve to Radix — something downstream shadows it.`,
      );
    }
  }

  expect(
    failures,
    failures.length ? `the keep roster and the package disagree (${failures.length}):\n  ${failures.join("\n  ")}` : "",
  ).toEqual([]);
});

/* ---- D: a drop never reappears, and every ruling is written down ------------ */
test("dropped names stay out, and every ruling has its reason on the record", () => {
  const m = measured();
  const droppedNow = new Set(m.dropped);
  const failures: string[] = [];

  for (const name of DROP) {
    if (droppedNow.has(name)) continue;
    const how = m.kept.includes(name)
      ? `it is back, carrying Radix's own binding`
      : m.wrapped.includes(name)
        ? `it is back, carrying a binding of this system's own`
        : `it is back`;
    failures.push(
      `"${name}" is on DROP in ${SELF} — ${how}. The reason it was withheld is in the ` +
        `"DELIBERATELY NOT EXPORTED" block of ${ENTRY}; read it before deciding this is fine. To reverse the ` +
        `ruling, move the name to KEEP (or wrap it and roster nothing), rewrite its line in ${ENTRY}, and ` +
        `correct the census.`,
    );
  }

  const dropText = recordBlock(DROP_BLOCK, "DELIBERATELY NOT EXPORTED");
  for (const name of DROP) {
    if (!new RegExp(`\\b${name}\\b`).test(dropText)) {
      failures.push(
        `"${name}" is on DROP in ${SELF} but is named nowhere in the "DELIBERATELY NOT EXPORTED" block of ` +
          `${ENTRY} — the roster withholds it and no reader can find out why. Give it a line with its reason.`,
      );
    }
  }

  const keptText = recordBlock(KEPT_BLOCK, "KEPT THROUGH SECTION 2");
  for (const name of m.throughComponent) {
    if (!new RegExp(`\\b${name}\\b`).test(keptText)) {
      failures.push(
        `"${name}" reaches consumers through section 2 carrying Radix's own binding, but the ` +
          `"KEPT THROUGH SECTION 2" block of ${ENTRY} does not name it. Section 2's list is generated and says ` +
          `nothing about whose binding a name carries, so that block is the only place a reader learns this one ` +
          `is not a wrapper. Give it a line.`,
      );
    }
  }

  expect(
    failures,
    failures.length ? `a ruling is unrecorded or reversed in silence (${failures.length}):\n  ${failures.join("\n  ")}` : "",
  ).toEqual([]);
});
