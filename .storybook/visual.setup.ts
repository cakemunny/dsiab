// IMAGE COMPARISON of story renders ([[test-browser-order]] picks the browser). It runs only when
// DS_VISUAL is "1", which CI sets, because a reference image differs by browser and operating system, so
// only the machine that takes the references can check them. `.github/workflows/visual-references.yml`
// takes them on that machine.
//
// SCOPE. The first story of each docs page, in the lane's appearance: the Anatomy or Usage story, which a
// guard keeps first. The internal `_*.stories.tsx` files hold behaviour plays, not pages, so they take no
// image. The Decisions page takes none either: it renders the whole ledger as text, far taller than the
// 16,000-pixel window, and its capture never settled on the CI runner.
//
// The image goes beside its story file, in `__screenshots__/<file>/<appearance>-chromium-linux.png`, the
// default path of `toMatchScreenshot`.
import { afterEach, expect } from "vitest";
import type { RunnerTestCase, RunnerTestFile, RunnerTestSuite } from "vitest";
import { page } from "vitest/browser";

const env = (import.meta as unknown as { env?: Record<string, string> }).env ?? {};

function firstTest(node: RunnerTestFile | RunnerTestSuite): RunnerTestCase | undefined {
  for (const task of node.tasks) {
    if (task.type === "test") return task;
    const inner = firstTest(task);
    if (inner) return inner;
  }
  return undefined;
}

if (env.DS_VISUAL === "1") {
  afterEach(async ({ task }) => {
    const fileName = task.file.name.split("/").pop() ?? "";
    if (fileName.startsWith("_") || fileName === "Decisions.stories.tsx" || firstTest(task.file) !== task) return;
    await document.fonts.ready;
    // The test frame paints only its own viewport, and a docs page is taller, so the frame grows to the
    // page for the capture and returns to its size after it.
    const { innerWidth: width, innerHeight: height } = window;
    await page.viewport(width, Math.ceil(document.documentElement.scrollHeight));
    try {
      await expect.element(page.elementLocator(document.body)).toMatchScreenshot(env.VITE_SB_APPEARANCE ?? "light");
    } finally {
      await page.viewport(width, height);
    }
  });
}
