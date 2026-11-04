/* =============================================================================
   dist-reference.node-check.ts — THE COMPILED COMPONENT REFERENCE IS COMPLETE,
   CLEAN AND RIGHT ([[compiled-component-reference]])
   -----------------------------------------------------------------------------
   `scripts/dist-reference.mjs` compiles `dist/components/<Name>.md`, one per
   available registry entry plus `index.md`, and the package ships it as
   `dsiab/components/<Name>.md`. An agent in a product repository reads it in
   place of a Storybook it does not have running, so a wrong file is worse than
   none: it is read as the answer.

   One pure checker, `referenceProblems`, holds the structural arms: coverage,
   headings, the docs-win sentence and link, leaks, ruling citations, `any`
   and size. The real run and every red proof call the same function, so a
   proof that goes red proves the arm the real run relies on.

   Positive controls hold the props to known values, because a generator that
   wrote an empty props list for every export would pass every structural arm.

   NO WRITE ON IMPORT. The generator writes only as the process entry point, so
   this file checks the in-memory build and never regenerates its own subject.
   It does not compare against `dist/`: every build writes the files again, the
   same way `dist/registry.json` is handled.
   ============================================================================= */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test, expect } from "vitest";
import { findLineageMatches } from "./lineageTerms";
import { bannedIn } from "../../scripts/dist-decisions.mjs";
import { buildReference, DOCS_WIN, OUT_DIR } from "../../scripts/dist-reference.mjs";
import { docsUrlFor } from "../../bin/docs-url.mjs";

interface Entry {
  name: string;
  status: string;
  exports: string[];
}
interface Ctx {
  ported: Entry[];
  rulings: Set<string>;
  docsRoot: string;
}
interface Problem {
  file: string;
  problem: string;
}

const registry: Entry[] = JSON.parse(readFileSync("registry.json", "utf8"));
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const ctx: Ctx = {
  ported: registry.filter((e) => e.status === "ported"),
  rulings: new Set([...readFileSync("docs/DECISIONS.md", "utf8").matchAll(/^### ([a-z0-9-]+)$/gm)].map((m) => m[1])),
  docsRoot: docsUrlFor(pkg.version),
};
const files: Map<string, string> = buildReference();

const MAX_FILE = 24 * 1024;
const MAX_TOTAL = 640 * 1024;

/** Everything wrong with one set of reference files. Pure. */
function referenceProblems(set: Map<string, string>, c: Ctx): Problem[] {
  const out: Problem[] = [];
  const add = (file: string, problem: string) => out.push({ file, problem });
  const expected = [...c.ported.map((e) => `${e.name}.md`), "index.md"].sort();
  const actual = [...set.keys()].sort();
  for (const f of expected.filter((f) => !set.has(f))) add(f, "missing: every available entry gets a file");
  for (const f of actual.filter((f) => !expected.includes(f))) add(f, "extra: no registry entry names it");
  const lower = new Map<string, string>();
  for (const f of actual) {
    if (lower.has(f.toLowerCase())) add(f, `collides with ${lower.get(f.toLowerCase())} on a case-insensitive disk`);
    lower.set(f.toLowerCase(), f);
  }
  let total = 0;
  for (const [file, text] of set) {
    total += Buffer.byteLength(text);
    if (Buffer.byteLength(text) > MAX_FILE) add(file, `over ${MAX_FILE} bytes`);
    if (!text.includes(DOCS_WIN)) add(file, "the docs-win sentence is missing");
    for (const m of findLineageMatches(text)) add(file, `lineage term "${m.term}": ${m.matched}`);
    for (const m of text.matchAll(/(?<![A-Za-z0-9_./-])src\/[A-Za-z0-9/._-]*/g)) add(file, `src/ path ${m[0]}`);
    for (const b of bannedIn(text)) add(file, `banned term ${b.term} x${b.count}`);
    for (const code of sectionCodes(text)) add(file, `internal section code ${code}`);
    for (const m of text.matchAll(/\[\[([A-Za-z0-9]+(?:-[A-Za-z0-9]+)+)\]\]/g)) {
      if (!c.rulings.has(m[1])) add(file, `[[${m[1]}]] heads no entry in the ledger`);
    }
    for (const m of text.matchAll(/^- `(\w+)\??: any`/gm)) add(file, `own prop ${m[1]} prints as any`);
  }
  if (total > MAX_TOTAL) add("(all)", `total ${total} bytes over ${MAX_TOTAL}`);
  for (const entry of c.ported) {
    const text = set.get(`${entry.name}.md`);
    if (!text) continue;
    if (!text.includes(`Docs page: ${c.docsRoot}/`)) add(`${entry.name}.md`, "no version-locked docs link");
    for (const name of entry.exports) {
      if (!new RegExp(`^### \`${name}\` \\(`, "m").test(text)) add(`${entry.name}.md`, `no heading for export ${name}`);
    }
    for (const section of text.split(/^### /m).filter((s) => /^`\w+` \((?:compound )?component\)/.test(s))) {
      if (!/^- (?:`|Inherited|Also takes|The props)/m.test(section)) add(`${entry.name}.md`, `${section.split(" ")[0]} lists no props`);
    }
  }
  return out;
}

/** Replace one file's text in a copy of the set. */
function planted(file: string, edit: (text: string) => string): Map<string, string> {
  const copy = new Map(files);
  copy.set(file, edit(copy.get(file)!));
  return copy;
}
const problemsOf = (set: Map<string, string>) => referenceProblems(set, ctx).map((p) => `${p.file}: ${p.problem}`);


/** A section code of a private spec ("D12") reads as a citation a package reader cannot look up. */
function sectionCodes(text: string): string[] {
  return [...text.matchAll(/\bD\d{1,2}\b/g)].map((m) => m[0]);
}

/** Every `.d.ts` under `dir`, as [path relative to dir, text]. */
function declarations(dir: string, rel = ""): [string, string][] {
  return readdirSync(join(dir, rel), { withFileTypes: true }).flatMap((e) => {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) return declarations(dir, r);
    return e.name.endsWith(".d.ts") ? [[r, readFileSync(join(dir, r), "utf8")] as [string, string]] : [];
  });
}

describe("the compiled component reference ([[compiled-component-reference]])", () => {
  test("the real build has no problem", () => {
    expect(problemsOf(files)).toEqual([]);
  });

  test("RED: a missing file, an extra file and a case collision each fail", () => {
    const dropped = new Map(files);
    dropped.delete("Button.md");
    expect(problemsOf(dropped).join("\n")).toMatch(/Button\.md: missing/);
    const extra = new Map(files).set("button.md", "x");
    expect(problemsOf(extra).join("\n")).toMatch(/button\.md: extra/);
    expect(problemsOf(extra).join("\n")).toMatch(/collides with Button\.md/);
  });

  test("RED: a lost export heading, docs-win sentence or docs link fails", () => {
    expect(problemsOf(planted("Select.md", (t) => t.replace("### `SelectRootProps` (type)", "")))).toContain(
      "Select.md: no heading for export SelectRootProps",
    );
    expect(problemsOf(planted("Select.md", (t) => t.replace(DOCS_WIN, "")))).toContain("Select.md: the docs-win sentence is missing");
    expect(problemsOf(planted("Select.md", (t) => t.replace(`Docs page: ${ctx.docsRoot}/`, "Docs page: https://example.com/")))).toContain(
      "Select.md: no version-locked docs link",
    );
  });

  test("RED: lineage prose, a src/ path and a private docs/ path each fail", () => {
    const leak = planted("Button.md", (t) => `${t}\nThis was lifted from upstream, see src/utils/x.ts and docs/plan.md.\n`);
    const found = problemsOf(leak).join("\n");
    expect(found).toMatch(/lineage term "upstream"/);
    expect(found).toMatch(/src\/ path src\/utils\/x\.ts/);
    expect(found).toMatch(/banned term docs\//);
  });

  test("RED: a bare internal section code fails, and ARIA and CSS text does not", () => {
    const found = problemsOf(planted("TreeList.md", (t) => `${t}\nControlled expansion (D12), see D2.\n`)).join("\n");
    expect(found).toMatch(/TreeList\.md: internal section code D12/);
    expect(found).toMatch(/TreeList\.md: internal section code D2/);
    expect(problemsOf(planted("TreeList.md", (t) => `${t}\n\`aria-level\`, a 2D grid, \`--space-2\`, ID12.\n`)).filter((p) => p.includes("section code"))).toEqual([]);
  });

  test("RED: an unknown ruling and the banned ruling each fail", () => {
    // Assembled, so the ledger's own LINKS arm does not read the planted name as a citation here.
    const unknown = ["[[", "no-such-ruling", "]]"].join("");
    const found = problemsOf(planted("Button.md", (t) => `${t}\nSee ${unknown} and [[component-registry]].\n`)).join("\n");
    expect(found).toMatch(/\[\[no-such-ruling\]\] heads no entry/);
    expect(found).toMatch(/lineage term "\[\[component-registry\]\]/);
  });

  test("RED: an own prop typed any, an empty props list and an oversized file each fail", () => {
    expect(problemsOf(planted("Button.md", (t) => `${t}- \`color?: any\`\n`))).toContain("Button.md: own prop color prints as any");
    const empty = planted("Badge.md", (t) => t.replace(/^- (?:`|Inherited|Also takes|The props).*$/gm, ""));
    expect(problemsOf(empty).join("\n")).toMatch(/Badge\.md: `Badge` lists no props/);
    expect(problemsOf(planted("Button.md", (t) => t + "x".repeat(MAX_FILE)))).toContain(`Button.md: over ${MAX_FILE} bytes`);
  });

  test("two builds give identical bytes", () => {
    expect([...buildReference()]).toEqual([...files]);
  });
});

describe("the props are the right props", () => {
  test("Button lists its own props and refuses Radix's `variant`", () => {
    const text = files.get("Button.md")!;
    expect(text).toContain("- `priority?: ButtonPriority`");
    expect(text).toContain("- `tone?: ButtonTone`");
    expect(text).toContain("- Not accepted from Radix `Button`: `variant`.");
    expect(text).toContain("Only the props listed below apply.");
    expect(text).toMatch(/^- Inherited from Radix: .*`asChild`/m);
    expect(text).toContain('`import { type ButtonPriority, type ButtonTone, type ButtonProps, Button } from "dsiab";`');
  });

  test("a compound lists its parts, and each part its own props", () => {
    const text = files.get("Select.md")!;
    expect(text).toMatch(/^- Parts: `Select.Root`, `Select.Trigger`/m);
    const trigger = text.split("#### `Select.Trigger`")[1].split("####")[0];
    expect(trigger).toContain("- `icon?: ReactNode`");
    expect(trigger).toContain("- Not accepted from Radix `Select.Trigger`: `variant`.");
  });

  test("a union props type is merged and marks the members of one shape", () => {
    const text = files.get("Calendar.md")!;
    const alias = text.split("### `CalendarProps` (type)")[1].split("### ")[0];
    expect(alias).toContain("- `type CalendarProps = CalendarSingleProps | CalendarRangeProps`");
    const props = text.split("### `Calendar` (component)")[1];
    expect(props).toContain("The props are a union of shapes.");
    expect(props).toMatch(/^- `value\?: ISODateString \| DateRange`: .* \/ /m);
    expect(props).toContain("- `onValueChange: ((value: ISODateString) => void) | ((value: DateRange) => void)`");
  });

  test("a hook prints its signature and a type alias its declared text", () => {
    expect(files.get("useMediaQuery.md")).toContain("- `useMediaQuery(query: string, serverDefault = false): boolean`");
    expect(files.get("Badge.md")).toContain('- `type BadgeTone = "error" | "warning" | "success" | "info"`');
    // `asChild?: never` is a declared refusal, so it is listed as not accepted and not as a prop.
    expect(files.get("Badge.md")).toContain("- Not accepted from Radix `Badge`: `asChild`, `variant`.");
    expect(files.get("Badge.md")).not.toMatch(/^- `asChild\?/m);
  });

  test("an entry with no export of its own points at the file of the page that documents it", () => {
    const text = files.get("TypeaheadItem.md")!;
    expect(text).toContain("It is a part of Typeahead, documented in [Typeahead.md](./Typeahead.md).");
    expect(files.has("Typeahead.md")).toBe(true);
    expect(files.get("TopNavItem.md")).toContain("[TopNav.md](./TopNav.md)");
    expect(files.has("TopNav.md")).toBe(true);
  });
});

/** The reference paths a shipped Markdown file fails to name. Pure. */
const SUBPATH = `dsiab/${OUT_DIR.replace(/^dist\//, "")}`;
const REFERENCE_PATHS = [`${SUBPATH}/<Name>.md`, `${SUBPATH}/index.md`];
const unnamedPaths = (text: string) => REFERENCE_PATHS.filter((p) => !text.includes(`\`${p}\``));

describe("one path, named the same everywhere", () => {
  test("OUT_DIR, the exports key and rules.md agree", () => {
    expect(OUT_DIR).toBe("dist/components");
    expect(pkg.exports["./components/*.md"], "package.json exports must map the subpath to OUT_DIR").toBe(`./${OUT_DIR}/*.md`);
    const rules = readFileSync("skills/dsiab/references/rules.md", "utf8");
    expect(rules).toContain("dsiab/components/<Name>.md");
    expect(rules).toContain("dsiab/components/index.md");
  });

  test("the dsiab skill routes to the same paths ([[skill-read-back-step]])", () => {
    const skill = readFileSync("skills/dsiab/SKILL.md", "utf8");
    expect(unnamedPaths(skill), "skills/dsiab/SKILL.md must name the reference the build writes").toEqual([]);
    // RED: a skill that names a renamed directory fails both paths.
    expect(unnamedPaths(skill.replaceAll("dsiab/components/", "dsiab/reference/"))).toEqual(REFERENCE_PATHS);
  });
});

describe("the shipped type declarations", () => {
  // The .d.ts carry the JSDoc of every export, including the ones the reference never prints, and a
  // consumer's editor shows them on hover. The build writes them, so this reads dist/ when it exists:
  // CI builds before this lane, and a local run without a build has nothing to read.
  test("carry no internal section code", () => {
    if (!existsSync("dist/index.d.ts")) {
      expect(process.env.CI, "CI builds before this lane, so dist/ must exist there").toBeFalsy();
      return;
    }
    const found = declarations("dist").flatMap(([file, text]) => sectionCodes(text).map((c) => `${file}: ${c}`));
    expect(found).toEqual([]);
    // RED: a planted code in a hover doc is found.
    expect(sectionCodes("/** Restores the size (the D5 fix). */")).toEqual(["D5"]);
  });
});
