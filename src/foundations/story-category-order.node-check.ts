/* =============================================================================
   story-category-order.node-check.ts — STORYSORT DRIFT GUARD
   -----------------------------------------------------------------------------
   .storybook/preview.tsx's storySort array MUST be a plain literal — Storybook
   statically parses that file's AST to build the story index and cannot
   evaluate a computed expression there (confirmed live: importing and
   spreading STORY_CATEGORIES directly crashed the dev server with "Unknown
   node type CallExpression"). So the literal is hand-written a second time in
   preview.tsx. This guard is the alternative to code-sharing: it parses that
   literal back out of the source text and asserts it matches
   STORY_CATEGORIES exactly, so the two copies can't silently drift apart.
   ============================================================================= */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test, expect } from "vitest";
import { STORY_CATEGORIES } from "./storyCategories";

const PREVIEW = join(process.cwd(), ".storybook/preview.tsx");

function parseComponentsOrder(src: string): Record<string, string[]> {
  const marker = '"Components", [';
  const componentsStart = src.indexOf(marker);
  if (componentsStart === -1) throw new Error(`${marker} not found in preview.tsx`);
  const afterOpenBracket = src.slice(componentsStart + marker.length);

  // Find the Components array's OWN closing bracket by counting depth, rather than stopping at
  // whatever top-level entry happens to follow it. An earlier version looked for `"_internal"`, which
  // held while this group was the last before internals. A top-level name added between them landed
  // inside the slice and the guard reported it as a subcategory. Counting ends where the array ends,
  // whatever comes next, which now includes the `"UI examples", [...]` folder ([[sidebar-order]]).
  let depth = 1;
  let endIdx = -1;
  for (let i = 0; i < afterOpenBracket.length; i += 1) {
    const ch = afterOpenBracket[i];
    if (ch === "[") depth += 1;
    else if (ch === "]") {
      depth -= 1;
      if (depth === 0) {
        endIdx = i;
        break;
      }
    }
  }
  if (endIdx === -1) throw new Error('the "Components" array in preview.tsx is not closed');
  const componentsBlock = afterOpenBracket.slice(0, endIdx);

  const result: Record<string, string[]> = {};
  const re = /"([^"]+)",\s*\[([^\]]*)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(componentsBlock))) {
    const category = m[1];
    const members = m[2]
      .split(",")
      .map((s) => s.trim().replace(/^"|"$/g, ""))
      .filter(Boolean);
    result[category] = members;
  }
  return result;
}

test("preview.tsx's storySort Components order matches STORY_CATEGORIES exactly", () => {
  const src = readFileSync(PREVIEW, "utf8");
  const parsed = parseComponentsOrder(src);
  expect(Object.keys(parsed)).toEqual(Object.keys(STORY_CATEGORIES));
  for (const [category, members] of Object.entries(STORY_CATEGORIES)) {
    expect(parsed[category], `category "${category}" missing or wrong in preview.tsx`).toEqual(members);
  }
});
