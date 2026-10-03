/* =============================================================================
   story-order.node-check.ts — THE STORY-ORDER GUARD ([[docs-page-spine]] spine)
   -----------------------------------------------------------------------------
   Node-mode source guard (same harness as registry/loose-values, runs via
   vitest.node.config.ts / `npm run test:tokens` / the pretest hook).

   Storybook's sidebar order for Components/* stories is DECLARATION order (the
   `parameters.options.storySort` array does not reliably apply in this SB10
   setup — a parked issue). So the sidebar can only be trusted if the export
   ORDER in each *.stories.tsx is right.

   The spine ([[docs-page-spine]], reordered by ruling 2026-08-04) opens on the component
   itself and closes on its provenance:

       Anatomy (full) | Usage (lite) → …content stories… → Props → History

   WHY THIS ORDER. A reader arriving at a component wants to see the thing and
   how to use it; History is the rulings it encodes plus a changelog — reference
   you consult, not the page you land on. Opening on History put the least
   urgent page first on all 90 components. `Props` closes the working set (live
   Controls + the full prop table), and History sits after it as the appendix.

   `Props` was named `Playground` until 2026-08-04. The story had always carried
   the prop reference as well as the args-driven controls — 89 of the 90 pages
   render `<PropTable>` inside it — and "Playground" advertised only half of
   that, so a reader looking for the properties had no reason to open it.

   This guard makes the order a mechanical gate instead of a thing a human keeps
   catching by eye. It enforces the invariant UNIFORMLY — every Components/*
   docs story file (underscore-prefixed fixtures exempt), no exceptions:
     1. the FIRST story export is `Anatomy` (full tier) or `Usage` (lite tier);
     2. the LAST story export is `History`;
     3. the one BEFORE it is `Props`.

   (The middle content stories — Usage/Keyboard/MenuStates — are not
   order-locked: components legitimately carry different content sets.)
   ============================================================================= */
import { readFileSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";
import { test, expect } from "vitest";

const ROOT = process.cwd();
const UI = join(ROOT, "src/components/ui");

/** Story exports, in source order: `export const <Name>: Story` / `StoryObj`. */
function storyExports(src: string): string[] {
  const out: string[] = [];
  const re = /^export const (\w+)\s*:\s*(?:Story|StoryObj)\b/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) out.push(m[1]);
  return out;
}

const files = readdirSync(UI).filter((f) => f.endsWith(".stories.tsx") && !basename(f).startsWith("_"));

/** The landing page: the diagram on a full page, the single docs story on a lite one. */
const OPENERS = ["Anatomy", "Usage"];

test("every Components/* story file opens on the component and closes Props → History", () => {
  expect(files.length).toBeGreaterThan(0);
  for (const f of files) {
    const stories = storyExports(readFileSync(join(UI, f), "utf8"));
    expect(stories.length, `${f}: no story exports found`).toBeGreaterThan(0);
    expect(
      OPENERS.includes(stories[0]),
      `${f}: first story must be Anatomy (full) or Usage (lite), not ${stories[0]} — got ${stories.join(", ")}`,
    ).toBe(true);
    expect(stories.at(-1), `${f}: last story must be History (got ${stories.join(", ")})`).toBe("History");
    expect(stories.at(-2), `${f}: the story before History must be Props (got ${stories.join(", ")})`).toBe("Props");
  }
});

/* Anti-rot: the old names must be gone everywhere, not just reordered. A file that still exports
   `Playground` would satisfy nothing above (History-last would fail first), but a file that renamed
   the export and left `PlaygroundArgs`/`PlaygroundLead` behind reads as half-migrated forever. */
test("no story file still refers to the pre-2026-08-04 Playground names", () => {
  const stale: string[] = [];
  for (const f of files) {
    const src = readFileSync(join(UI, f), "utf8");
    for (const token of ["Playground"]) {
      if (src.includes(token)) stale.push(`${f} still mentions ${token}`);
    }
  }
  expect(stale, `\n${stale.join("\n")}\n`).toEqual([]);
});
