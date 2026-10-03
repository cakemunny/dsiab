/* =============================================================================
   story-category.node-check.ts — COMPONENTS/* NAV CATEGORY GUARD
   -----------------------------------------------------------------------------
   Every documented component lives at "Components/<Category>/<Name>" in
   its Storybook title, per CATEGORY_OF in storyCategories.ts (the root was
   "System" until [[sidebar-order]] renamed it). This guard makes that a mechanical gate: a
   new component's story cannot land in the flat "Components/<Name>" shape, or
   under the old root.
   ============================================================================= */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test, expect } from "vitest";
import { CATEGORY_OF } from "./storyCategories";

const ROOT = process.cwd();
const UI = join(ROOT, "src/components/ui");

for (const [name, category] of Object.entries(CATEGORY_OF)) {
  test(`${name} (${category}) is titled under its approved category`, () => {
    const file = join(UI, `${name}.stories.tsx`);
    const src = readFileSync(file, "utf8");
    const match = src.match(/^\s*title:\s*"([^"]+)"/m);
    expect(match, `${name}.stories.tsx: no title found`).not.toBeNull();
    expect(match![1]).toBe(`Components/${category}/${name}`);
  });
}

test("every non-underscore component story file is covered by the category map", () => {
  const files = readdirSync(UI).filter((f) => f.endsWith(".stories.tsx") && !f.startsWith("_"));
  const names = files.map((f) => f.replace(".stories.tsx", ""));
  for (const name of names) {
    expect(Object.prototype.hasOwnProperty.call(CATEGORY_OF, name), `${name} has no entry in CATEGORY_OF`).toBe(true);
  }
  expect(Object.keys(CATEGORY_OF).length).toBe(names.length);
});
