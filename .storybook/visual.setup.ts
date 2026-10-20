// IMAGE COMPARISON of story renders. It runs only on CI, where the `visual` job of
// `.github/workflows/ci.yml` sets DS_VISUAL, because a reference image differs by browser and operating
// system. No reference image is committed:
//
//   - On a push to `main`, DS_VISUAL is "update". Every image is taken again and uploaded as the CI
//     artifact `visual-references`.
//   - On a pull request, DS_VISUAL is "compare". The job downloads the images of the pull request's base
//     commit, and each page is compared against its image. A page with no image, such as a page the pull
//     request adds, is skipped, and the next `main` run takes its image.
//
// SCOPE. The first story of each docs page, in the lane's appearance. On a component page that is the
// Anatomy or Usage story, which the story-order guard keeps first. Any other page contributes the story
// it exports first. The internal `_*.stories.tsx` files hold behaviour plays, not pages, so they take no
// image. The Decisions page takes none either: it renders the whole ledger as text, far taller than the
// 16,000-pixel window, and its capture never settled on the CI runner.
import { afterEach, beforeEach, expect } from "vitest";
import type { RunnerTestCase, RunnerTestFile, RunnerTestSuite } from "vitest";
import { commands, page } from "vitest/browser";

declare module "vitest/browser" {
  interface BrowserCommands {
    /** True when the reference image `name` exists for the running story file (vitest.config.ts). */
    visualReferenceExists: (name: string) => Promise<boolean>;
  }
}

const env = (import.meta as unknown as { env?: Record<string, string> }).env ?? {};

function firstTest(node: RunnerTestFile | RunnerTestSuite): RunnerTestCase | undefined {
  for (const task of node.tasks) {
    if (task.type === "test") return task;
    const inner = firstTest(task);
    if (inner) return inner;
  }
  return undefined;
}

const takesImage = (task: RunnerTestCase) => {
  const fileName = task.file.name.split("/").pop() ?? "";
  return !fileName.startsWith("_") && fileName !== "Decisions.stories.tsx" && firstTest(task.file) === task;
};

if (env.DS_VISUAL === "update" || env.DS_VISUAL === "compare") {
  // Every other story is skipped here. The `checks` job already runs them, and a flaky one must not turn the
  // image comparison red.
  beforeEach(({ task, skip }) => {
    if (!takesImage(task)) skip();
  });
  afterEach(async ({ task }) => {
    if (!takesImage(task)) return;
    const name = env.VITE_SB_APPEARANCE ?? "light";
    if (env.DS_VISUAL === "compare" && !(await commands.visualReferenceExists(name))) return;
    await document.fonts.ready;
    // The test frame paints only its own viewport, and a docs page is taller, so the frame grows to the
    // page for the capture and returns to its size after it.
    const { innerWidth: width, innerHeight: height } = window;
    await page.viewport(width, Math.ceil(document.documentElement.scrollHeight));
    try {
      // A tall page needs longer than the 5-second default to give two equal captures on the CI runner.
      await expect.element(page.elementLocator(document.body)).toMatchScreenshot(name, { timeout: 30_000 });
    } finally {
      await page.viewport(width, height);
    }
  });
}
