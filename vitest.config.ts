import { defineConfig } from "vitest/config";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { PlaywrightBrowserProvider, playwright } from "@vitest/browser-playwright";
import { browserLaunchOptions, waitForBlockerStartup } from "./scripts/browser.mjs";

// Browser-mode story tests. getComputedStyle only resolves --ds-* inside a real .radix-themes DOM,
// so tests run in a real browser rather than jsdom.
//
// WHICH BROWSER, AND WHEN IT IS READY, both live in scripts/browser.mjs, which the publish gate
// (scripts/acceptance.mjs) imports too. The lookup order is DS_BROWSER_PATH, then Playwright's own
// Chromium (`npx playwright install chromium`, once per machine). Read that file before changing
// either here.
//
// WHY THE PROVIDER WAITS BEFORE IT NAVIGATES. A Chromium build with uBlock Origin built in runs one copy per
// browser context, and each copy can reload a tab that made requests while that copy was
// starting. Vitest's test page opened about half a second after its context was created, so the
// page was reloaded, its WebSocket closed, and the run died before any test with "Browser
// connection was closed while running tests". That happened to both story files tried alone and
// to the full run, with `--headless` present in the launch arguments. The provider below opens
// each page on about:blank, which makes no network request, waits for that page's copy of the
// blocker to finish starting, and only then loads the test page. With Chrome or plain Chromium
// the wait returns at once.
//
// HEADLESS comes from `test.browser.headless` on each project. The Playwright provider overwrites
// `launchOptions.headless` with that value (@vitest/browser-playwright 4.1.9, openBrowser), so the
// project flag is the one that reaches the launch. `DEBUG=pw:browser` shows `--headless` in it.
//
// Profile isolation needs no flag. `browserType.launch()` already creates a throwaway profile, and
// passing `--user-data-dir` is rejected outright ("Pass userDataDir to launchPersistentContext
// instead"). So the suite always gets a browser of its own, separate from any browser a person
// has open.
const launchOptions = browserLaunchOptions();

class BlockerAwareProvider extends PlaywrightBrowserProvider {
  override async openPage(sessionId: string, url: string, options: { parallel: boolean }) {
    await super.openPage(sessionId, "about:blank", options);
    const page = this.getPage(sessionId);
    await waitForBlockerStartup(page);
    await page.goto(url, { timeout: 0 });
  }
}

// Each project gets its own provider, and therefore its own browser.
function provider() {
  const options = { launchOptions };
  return {
    ...playwright(options),
    providerFactory: (project: ConstructorParameters<typeof PlaywrightBrowserProvider>[0]) =>
      new BlockerAwareProvider(project, options),
  };
}

// TWO APPEARANCE LANES. A story renders at ONE point in the globals space per run, so
// a single lane could only ever gate ONE appearance — and the Storybook a11y panel runs
// at whatever the viewer's toolbar says, which is how a dark-only (or light-only) defect
// reaches a reader while the suite stays green. The suite therefore runs twice: the
// `light` and `dark` projects below set VITE_SB_APPEARANCE, which preview.tsx reads into
// `initialGlobals.appearance`. Story count doubles; wall clock roughly doubles with it.
// The ACCENT axis is deliberately NOT swept here — see the coverage note in preview.tsx.
//
// addon-vitest 10.3+ auto-applies the preview annotations, so no setup file is needed, which is
// also how addon-a11y's afterEach hook gets applied: axe runs after EVERY story render, with or
// without a `play`, and `parameters.a11y.test = "error"` (preview.tsx) turns a violation into a
// failed test.
export default defineConfig({
  plugins: [storybookTest({ configDir: ".storybook" })],
  // Phosphor uses an internal React context; keep one React instance and pre-bundle it
  // so the browser test env doesn't load a second copy (-> useContext null).
  resolve: { dedupe: ["react", "react-dom"] },
  optimizeDeps: {
    include: [
      "@phosphor-icons/react",
      "@radix-ui/react-popover",
      "@radix-ui/react-toggle",
      "@radix-ui/react-toggle-group",
      "@radix-ui/react-toolbar",
      "@radix-ui/react-collapsible",
      "@radix-ui/react-accordion",
      "@radix-ui/react-toast",
      "react",
      "react-dom",
      "react/jsx-runtime",
    ],
  },
  test: {
    // `extends: true` reuses the plugins/resolve/optimizeDeps above; only the lane's
    // name + env differ. Each project gets its own browser instance.
    projects: [
      {
        extends: true,
        test: {
          name: "light",
          env: { VITE_SB_APPEARANCE: "light" },
          browser: {
            enabled: true,
            headless: true,
            provider: provider(),
            instances: [{ browser: "chromium" }],
          },
        },
      },
      {
        extends: true,
        test: {
          name: "dark",
          env: { VITE_SB_APPEARANCE: "dark" },
          browser: {
            enabled: true,
            headless: true,
            provider: provider(),
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
