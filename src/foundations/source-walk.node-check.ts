/* =============================================================================
   source-walk.node-check.ts — THE SHARED WALK NAMES WHAT IT SKIPPED ([[local-usage-scan]])
   -----------------------------------------------------------------------------
   `ds-check` and `dsiab usage` walk a project through `sourceWalk.mjs`. The
   rule checker prints a COUNT of the directories it did not enter. The usage
   report lists each gap BY NAME, because an unused list over a tree with a
   hole in it is only as good as the reader's knowledge of the hole. So the walk
   records, additively:

     skippedDirNames  every directory not entered, with its reason: `ignored`
                      for a name in DIR_IGNORE at ANY depth (`src/build`
                      included), `hidden` for a name that begins with "."
     symlinks         every symbolic link, file or folder, never followed

   Three arms hold it:

     NAMES    a tree with each kind of gap yields exactly those names.
     COUNT    `skippedDirs` stays the count of `skippedDirNames`, so the
              number ds-check prints cannot drift from the list.
     READ     `readSources` reports a file that vanished between the walk and
              the read as unreadable, and keeps the walk's own unreadable paths.

   The rule checker's printed output did not change in the move. That was
   proven once, byte for byte, by running the old and new module over the same
   tree. It is not a standing test, because a future rule changes the output on
   purpose.
   ============================================================================= */
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { collectFiles, readSources, SKIP_HIDDEN, SKIP_IGNORED } from "./sourceWalk.mjs";

const root = mkdtempSync(join(tmpdir(), "dsiab-walk-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const put = (rel: string, body = "export const x = 1;\n") => {
  mkdirSync(join(root, rel, ".."), { recursive: true });
  writeFileSync(join(root, rel), body);
};

put("src/App.tsx");
put("src/real/Card.tsx");
put("src/build/Generated.tsx");
put("src/.cache/Hidden.tsx");
put("node_modules/pkg/index.js");
symlinkSync(join(root, "src/real"), join(root, "src/linked"), "dir");
symlinkSync(join(root, "src/App.tsx"), join(root, "src/AppLink.tsx"), "file");

describe("sourceWalk", () => {
  const inv = collectFiles(root);

  it("NAMES: every skipped directory and every symlink is recorded by name, with its reason", () => {
    expect(inv.skippedDirNames).toEqual([
      { path: join(root, "node_modules"), reason: SKIP_IGNORED },
      { path: join(root, "src/.cache"), reason: SKIP_HIDDEN },
      { path: join(root, "src/build"), reason: SKIP_IGNORED },
    ]);
    expect(inv.symlinks).toEqual([join(root, "src/AppLink.tsx"), join(root, "src/linked")]);
    expect(inv.files).toEqual([join(root, "src/App.tsx"), join(root, "src/real/Card.tsx")]);
  });

  it("COUNT: skippedDirs is the length of skippedDirNames", () => {
    expect(inv.skippedDirs).toBe(inv.skippedDirNames.length);
  });

  it("READ: a file gone between the walk and the read is unreadable, after the walk's own", () => {
    const gone = join(root, "src/real/Card.tsx");
    const walked = { files: inv.files, unreadable: [join(root, "locked")] };
    rmSync(gone);
    const { sources, unreadable } = readSources(walked);
    expect(sources.map((s) => s.file)).toEqual([join(root, "src/App.tsx")]);
    expect(unreadable).toEqual([join(root, "locked"), gone]);
  });
});
