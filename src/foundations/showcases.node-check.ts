/* =============================================================================
   showcases.node-check.ts — THE SHOWCASE LIST MATCHES WHAT IS ON DISK
   -----------------------------------------------------------------------------
   `showcases.ts` is the single source two guards read: `axe-scope` keys off its
   file paths, `boxLaw` off its titles. That removes the drift between those two
   and replaces it with one new risk — the list drifting from the DIRECTORY.

   A stale entry and a missing entry fail in opposite, equally quiet ways. An
   entry naming a deleted file silences nothing while claiming to. A recreation
   on disk that nobody listed gets axe run against it and box-law layer 2
   demanding `data-size-lesson` on every pinned control, which [[showcases-and-fixture]] says must not
   apply to a showcase. Neither shows up as a red lane on its own, so this guard
   is the thing that notices.

   THE ARMS:

     ROSTER   — every `.stories.tsx` in `src/scenarios/` is either a listed
       showcase or the composition fixture, and every listed showcase exists.
     SHAPE    — a showcase title is `UI examples/<Name>`: exactly one slash,
       under the one folder [[sidebar-order]] put them in. A title back at the root, or one
       nested a level deeper, silently moves a recreation out of that folder.
     CONTRACT — each showcase file carries the meta [[showcases-and-fixture]] requires: exactly one
       story, no `play`, `layout: "fullscreen"`, `a11y: { test: "off" }`, and the
       title the list claims. This is the arm that catches the original
       complaint coming back: a `play` function added to a showcase means the
       page greets its reader mid-gesture again. It also holds the story's
       `name` to the title's last segment, because that match is what makes
       Storybook hoist the page to one sidebar leaf ([[sidebar-order]]).
     SORTED   — `.storybook/preview.tsx`'s storySort lists the showcases under
       `"UI examples"`, in SHOWCASES order and with nothing else. Storybook
       statically parses that file and cannot import this list, so the order
       literal is a second hand-written copy, same as the Components array.
   ============================================================================= */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test, expect } from "vitest";
import { COMPOSITION_FIXTURE, SHOWCASES, SHOWCASE_FOLDER } from "./showcases";

const ROOT = join(import.meta.dirname, "..", "..");
const SCENARIOS_DIR = join(ROOT, "src/scenarios");
const PREVIEW = join(ROOT, ".storybook/preview.tsx");

/** Every story file in the scenarios directory, repo-relative. */
function scenarioFiles(): string[] {
  if (!existsSync(SCENARIOS_DIR)) return [];
  return readdirSync(SCENARIOS_DIR)
    .filter((f) => f.endsWith(".stories.tsx"))
    .map((f) => `src/scenarios/${f}`)
    .sort();
}

test("every scenario file is a listed showcase or the composition fixture", () => {
  const onDisk = scenarioFiles();
  const listed = new Set<string>([...SHOWCASES.map((s) => s.file), COMPOSITION_FIXTURE]);

  const unlisted = onDisk.filter((f) => !listed.has(f));
  expect(
    unlisted,
    "a scenario file nobody listed. Add it to SHOWCASES in showcases.ts, or name it with a leading " +
      "underscore if it is a fixture. Unlisted, it gets axe and box-law layer 2 applied, which [[showcases-and-fixture]] " +
      "says must not happen to a showcase",
  ).toEqual([]);

  const missing = [...listed].filter((f) => !onDisk.includes(f));
  expect(
    missing,
    "showcases.ts names a file that does not exist. A stale entry silences nothing while claiming to",
  ).toEqual([]);
});

test("a showcase title sits one level inside UI examples", () => {
  const misplaced = SHOWCASES.filter((s) => {
    const [folder, name, ...deeper] = s.title.split("/");
    return folder !== SHOWCASE_FOLDER || !name || deeper.length > 0;
  }).map((s) => `${s.file}: ${s.title}`);
  expect(
    misplaced,
    `[[sidebar-order]] put the recreations in the "${SHOWCASE_FOLDER}" folder, one leaf each, after Components. A ` +
      "title at the root puts one back among Index and the section roots, and a deeper title hides it " +
      "inside a subfolder",
  ).toEqual([]);
});

test("every showcase carries the meta [[showcases-and-fixture]] requires", () => {
  const wrong: string[] = [];
  for (const s of SHOWCASES) {
    const path = join(ROOT, s.file);
    if (!existsSync(path)) continue; // the roster arm above owns this failure
    const src = readFileSync(path, "utf8");

    if (!src.includes(`title: "${s.title}"`)) {
      wrong.push(`${s.file}: does not declare title "${s.title}"`);
    }
    if (!/layout:\s*"fullscreen"/.test(src)) {
      wrong.push(`${s.file}: missing layout: "fullscreen" — a showcase is full-bleed app chrome`);
    }
    if (!/a11y:\s*\{\s*test:\s*"off"\s*\}/.test(src)) {
      wrong.push(`${s.file}: missing a11y: { test: "off" } — [[showcases-and-fixture]] registered it as asserting nothing`);
    }
    // The first review finding, made into a guard: a showcase renders AT REST.
    if (/^\s*play\s*:/m.test(src)) {
      wrong.push(
        `${s.file}: has a play function. A showcase renders at rest — Storybook runs play on open, ` +
          `which is exactly the "jarring" arrival that got the previous six pages rejected`,
      );
    }
    const exported = [...src.matchAll(/^export const (\w+)\s*:\s*Story\b/gm)].map((m) => m[1]);
    if (exported.length !== 1 || exported[0] !== "Screen") {
      wrong.push(`${s.file}: exports [${exported.join(", ")}], expected exactly one named Screen`);
    }
    // [[sidebar-order]]: the story's name matches the title's last segment, which is what makes Storybook hoist
    // the page to one sidebar leaf. Without the match the reader gets a folder with a lone "Screen".
    const leaf = s.title.split("/").pop();
    const named = src.match(/^export const Screen\s*:\s*Story\s*=\s*\{\s*name:\s*"([^"]+)"/m)?.[1];
    if (named !== leaf) {
      wrong.push(`${s.file}: its Screen story is named ${named ? `"${named}"` : "nothing"}, expected "${leaf}"`);
    }
    // The compaction defect, made into a guard. A reading measure belongs on prose, never on
    // layout chrome, so `maxWidth` is allowed only where it reads as a measure on text.
    if (/maxWidth:\s*["']?\d{3,}/.test(src) && !/--ds-text-measure/.test(src)) {
      wrong.push(
        `${s.file}: pins a pixel maxWidth with no reading measure in sight. App chrome runs full ` +
          `width; only a prose body takes a measure, and --ds-text-measure is how it says so`,
      );
    }
  }
  expect(wrong, wrong.join("\n")).toEqual([]);
});

test("storySort lists every showcase under UI examples, in order", () => {
  const src = readFileSync(PREVIEW, "utf8");
  const block = src.match(new RegExp(`"${SHOWCASE_FOLDER}",\\s*\\[([^\\]]*)\\]`))?.[1];
  expect(block, `preview.tsx's storySort has no "${SHOWCASE_FOLDER}", [ … ] array`).toBeDefined();
  const sorted = [...block!.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  expect(
    sorted,
    "preview.tsx's storySort does not list the showcases in SHOWCASES order. Storybook statically " +
      "parses that file and cannot import showcases.ts, so the literal is a second copy and this arm is " +
      "what keeps it true. An unlisted page falls to the end of the folder in import order",
  ).toEqual(SHOWCASES.map((s) => s.title.split("/").pop()));
});
