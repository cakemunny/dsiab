/* =============================================================================
   component-shadow.node-check.ts — NOTHING REDEFINES A SHIPPED COMPONENT
   -----------------------------------------------------------------------------
   THE DEFECT THIS EXISTS FOR. The analytics recreation declared its own
   `function Toolbar()` and hand-rolled the filter bar as a `<Flex align="end">`.
   The system already ships `Toolbar`, and the shipped one sets
   `alignItems: "center"`, so it would have been right first time. Instead the
   bar bottom-aligned its members: every control centred on 54px except the
   switch group, which is 20px tall against 32px controls and therefore centred
   on 60. Review spotted the 6px and asked why it was not centred.

   The interesting part is not the 6px. It is that NOTHING NOTICED a page had
   quietly redefined a component this system publishes. Inside that file the
   name `Toolbar` resolved to the local hand-roll, so every later reader,
   human or agent, saw a page apparently using the system's Toolbar and getting
   the wrong result. That is worse than a page that never reached for it, and it
   is exactly the failure mode AGENTS.md's "reuse before you invent" rule is
   written against.

   WHAT THIS GUARD ASSERTS. No file outside the component layer declares a
   top-level `function` / `const` / `class` whose name matches a shipped
   component's registered name or one of its exports.

   WHY SOURCE AND NOT PIXELS. A shadow is a naming fact, visible in the text,
   and it is invisible at runtime by construction: the shadowed page renders
   perfectly happily, just wrong. There is no rendered property to measure.

   SCOPE, and why it is drawn here:
     · `src/components/ui/` is EXCLUDED, because that is where these names are
       legitimately declared.
     · `src/foundations/` is EXCLUDED, because the guards name components in
       registers and assertions rather than declaring them.
     · Everything else is in: scenarios, hooks, theme, utils, powersearch.
       A page or a hook has no business declaring `Card`, `Toolbar` or `Select`.

   IF YOU HIT THIS. The answer is almost never to rename the local thing. It is
   to delete it and use the component the system already ships. If the shipped
   one genuinely cannot express what the page needs, that is a gap worth
   surfacing as a ruling, not routing around in a page.
   ============================================================================= */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { test, expect } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");

/** Directories whose files may legitimately declare a shipped component's name. */
const ALLOWED_PREFIXES = ["src/components/ui/", "src/foundations/"];

type RegistryEntry = { name: string; status: string; exports?: string[] };

/** Every name the system publishes as a component, plus its exported symbols. */
function shippedNames(): Set<string> {
  const reg = JSON.parse(readFileSync(join(ROOT, "registry.json"), "utf8")) as RegistryEntry[];
  const out = new Set<string>();
  for (const e of reg) {
    if (e.status !== "ported") continue;
    out.add(e.name);
    for (const x of e.exports ?? []) out.add(x);
  }
  return out;
}

/** Every `.ts`/`.tsx` under `src/`, repo-relative. Hand-rolled rather than `fs.globSync`, which is
 *  still experimental and warns on every guard-lane run. */
function sourceFiles(dir = join(ROOT, "src")): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (/\.tsx?$/.test(e)) out.push(relative(ROOT, full));
  }
  return out;
}

/** Source with comments and string literals blanked, line count preserved. A docblock saying "use
 *  Toolbar here" must not read as a declaration of one. */
function stripNonCode(src: string): string {
  const blank = (m: string) => m.replace(/[^\n]/g, " ");
  return src
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1: string) => p1 + " ".repeat(m.length - p1.length))
    .replace(/`(?:[^`\\]|\\[\s\S])*`/g, blank)
    .replace(/"(?:[^"\\\n]|\\.)*"/g, blank)
    .replace(/'(?:[^'\\\n]|\\.)*'/g, blank);
}

function shadows(): { file: string; line: number; name: string }[] {
  const shipped = shippedNames();
  const found: { file: string; line: number; name: string }[] = [];
  for (const file of sourceFiles()) {
    if (ALLOWED_PREFIXES.some((p) => file.startsWith(p))) continue;
    const src = stripNonCode(readFileSync(join(ROOT, file), "utf8"));
    for (const m of src.matchAll(/^\s*(?:export\s+)?(?:function|const|class)\s+([A-Z][A-Za-z0-9_]*)/gm)) {
      if (shipped.has(m[1])) found.push({ file, line: src.slice(0, m.index).split("\n").length, name: m[1] });
    }
  }
  return found;
}

test("no file outside the component layer redefines a shipped component", () => {
  const bad = shadows().map(
    (s) =>
      `${s.file}:${s.line} declares its own \`${s.name}\`, which is a component this system ships. ` +
      `Inside that file the name resolves to the local copy, so the page reads as though it uses ` +
      `the system's ${s.name} while getting different behaviour. Delete the local one and import ` +
      `the real one. If the shipped ${s.name} cannot express what the page needs, surface that as ` +
      `a gap rather than forking it here (AGENTS.md, "reuse before you invent")`,
  );
  expect(bad, bad.join("\n\n")).toEqual([]);
});

test("the shadow scan reads real files and a real registry", () => {
  // Without this the arm above passes over an empty set the moment the registry shape, the file
  // walk or the declaration regex breaks, which is the vacuous-pass failure mode
  // `dist-decisions.node-check.ts` documents at length.
  const shipped = shippedNames();
  expect(shipped.size, "no shipped component names were read out of registry.json").toBeGreaterThan(50);
  const scanned = sourceFiles().filter((f) => !ALLOWED_PREFIXES.some((p) => f.startsWith(p)));
  expect(scanned.length, "the shadow scan looked at no files outside the component layer").toBeGreaterThan(10);
  // And the regex must still find declarations in those files, shadowing or not.
  const anyDecl = scanned.some((f) =>
    /^\s*(?:export\s+)?(?:function|const|class)\s+[A-Z]/m.test(stripNonCode(readFileSync(join(ROOT, f), "utf8"))),
  );
  expect(anyDecl, "the declaration pattern matched nothing anywhere, so it can no longer detect a shadow").toBe(true);
});
