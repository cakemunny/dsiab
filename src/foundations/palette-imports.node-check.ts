/* =============================================================================
   palette-imports.node-check.ts — THE PALETTE FOLDER STANDS ON ITS OWN
   -----------------------------------------------------------------------------
   `src/palette` is the arithmetic under a generated brand: the seed parser,
   the OKLab maths, the step generator, the collision check and the surface
   table ([[palette-surface-table]]). `src/theme` calls it, at runtime, in a
   consumer's browser. Two directions of import would break that quietly:

     THEME   A palette module imports from `src/theme`. The theme folder holds
             React and the Provider, so the arithmetic would pull them in, and
             the two folders would import each other.
     LANE    A palette module imports from `src/foundations`, the test lane.
             The guards there measure the palette's output, so the code that
             picks a colour would depend on the code that checks it.

   The rule that holds both: a runtime module in `src/palette` imports only
   from inside `src/palette`. Its tests (`*.logic.test.ts`) may import more,
   because they are the checking side.
   ============================================================================= */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test, expect } from "vitest";

const PALETTE = join(process.cwd(), "src/palette");

const RUNTIME = readdirSync(PALETTE).filter((f) => /\.tsx?$/.test(f) && !/\.(?:logic\.test|node-check|stories)\.tsx?$/.test(f));

function specifiers(file: string): string[] {
  const text = readFileSync(join(PALETTE, file), "utf8");
  const found: string[] = [];
  for (const m of text.matchAll(/(?:^|[\s;])(?:import|export)\b[^'"`;]*?\bfrom\s*["']([^"']+)["']/gm)) found.push(m[1]!);
  for (const m of text.matchAll(/(?:^|[\s;(])import\s*["']([^"']+)["']/gm)) found.push(m[1]!);
  for (const m of text.matchAll(/\b(?:import|require)\s*\(\s*["']([^"']+)["']\s*\)/g)) found.push(m[1]!);
  return found;
}

test("the palette folder holds its runtime modules, or the arm below is vacuous", () => {
  expect(RUNTIME).toEqual(expect.arrayContaining(["generate.ts", "oklch.ts", "parseSeed.ts", "surfaces.ts"]));
});

test("a runtime palette module imports only from inside src/palette", () => {
  const offenders = RUNTIME.flatMap((f) =>
    specifiers(f).filter((s) => !/^\.\/[^/]+$/.test(s)).map((s) => `${f} imports ${s}`),
  );
  expect(offenders, "the palette arithmetic must not reach src/theme, the test lane or a package").toEqual([]);
});
