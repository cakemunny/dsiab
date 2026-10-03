/**
 * Which browser this repo's two browser gates drive, and when a page in it is safe to load.
 *
 * Imported by `vitest.config.ts` (the story suite, `npm test`) and by `scripts/acceptance.mjs`
 * (`npm run test:publish`). They share one copy on purpose. A private copy in either one is the
 * [[container-size-seeding]] shape: the day one of them changes, the two gates quietly run different browsers.
 *
 * -----------------------------------------------------------------------------
 * WHICH BROWSER
 * -----------------------------------------------------------------------------
 * The browser is looked up, never assumed. Any Chromium-family browser gives the same results for
 * these gates, so the lookup takes the first of two ([[test-browser-order]]):
 *
 *   1. DS_BROWSER_PATH, if it is set and the file exists. An explicit override always wins, and it
 *      is how a machine names its own Chromium-family browser.
 *   2. Playwright's own Chromium, the same version on every machine. Install it once with
 *      `npx playwright install chromium`. A machine with neither gets Playwright's own launch error,
 *      which names that command.
 *
 * -----------------------------------------------------------------------------
 * WHEN A PAGE IS SAFE TO LOAD: A BUILT-IN AD BLOCKER RELOADS EARLY TABS
 * -----------------------------------------------------------------------------
 * Some Chromium builds, Helium among them, ship uBlock Origin built in, as a component extension, so
 * `--disable-extensions` does not turn it off. Its manifest says `"incognito": "split"`, so every
 * browser context Playwright creates, each of which is an off-the-record profile, gets its OWN copy
 * of uBlock with its own startup. These measurements come from Helium 0.17.1.1 with uBlock 1.74.0,
 * on 2026-09-24:
 *
 *   - Each copy builds its filter lists from scratch. It holds back the requests its tabs make
 *     (`suspendDepth` above 0) for about 3.4 seconds on an idle machine, and longer under load.
 *   - When a copy lets requests go again, it can reload a tab that made requests while it was
 *     starting. Its own code does this: `unsuspendAllRequests()` calls `vAPI.tabs.reload(tabId)`.
 *     The reload comes from the browser, not from the page. The page's request headers show it as
 *     `Sec-Fetch-Site: none`, and the DevTools protocol records a navigation of type `reload`.
 *   - A copy for a new context does not always exist yet when `newPage()` resolves. It had
 *     appeared in 62 of 88 fresh contexts at that moment.
 *
 * Vitest opens its test page about half a second after it creates the context, so the page falls
 * inside that window. The reload closes the page's WebSocket to Vitest, and the run dies before any
 * test with "Browser connection was closed while running tests" and "[birpc] rpc is closed, cannot
 * call createTesters". If the reload lands while the test page is still loading, the error is
 * `page.goto: net::ERR_ABORTED` instead. Running headless does not help: the launch that failed
 * already had `--headless` and its own temporary profile.
 *
 * So a gate opens its page on about:blank, which makes no network request, calls
 * `waitForBlockerStartup(page)`, and only then loads the real URL. The wait finds the uBlock copy
 * that belongs to the page's own context and reads uBlock's state from it. The copy is ready once
 * it has stopped holding requests (`suspendDepth === 0`) and its filtering engine is attached
 * (`suspendableListener` is a function). Requests made after that go through uBlock's normal
 * filter, and uBlock never marks a tab for a reload that way. In a browser with no copy at all,
 * such as plain Chromium, the wait returns at once.
 */
import { existsSync } from "node:fs";

/** Playwright launch options for the browser the lookup above picks.
 *
 *  `--disable-features=HeliumNoiseCanvas` turns off the canvas fingerprint defence of Helium, which
 *  is on by default and adds a random ±1 to some channels when a canvas is read back, re-seeded on
 *  every launch. The colour gates read every colour through a canvas (`parseColor` in
 *  `src/foundations/_assert.ts`), so a noisy launch misread orange-11 on slate-1, which sits at
 *  4.3978 against a 4.39 floor, as 4.37, and Foundations/Colors > Swatches failed at random.
 *  Measured: with the flag, 0 of 8 launches moved any colour, and without it 6 of 8 did. A browser
 *  that does not know the feature ignores the flag. */
export function browserLaunchOptions(env = process.env) {
  const executablePath = env.DS_BROWSER_PATH && existsSync(env.DS_BROWSER_PATH) ? env.DS_BROWSER_PATH : undefined;
  return {
    ...(executablePath ? { executablePath } : {}),
    headless: true,
    args: ["--disable-features=HeliumNoiseCanvas"],
  };
}

/** Helium's component ID for its built-in uBlock Origin (`kUBlockOriginComponentId` in Helium's
 *  `ublock-install-as-component.patch`). */
const BUNDLED_BLOCKER = "chrome-extension://blockjmkbacgjkknlgpkjjiijinjdanf/";
const isBlocker = (t) => t.type === "background_page" && t.url.startsWith(BUNDLED_BLOCKER);

const BLOCKER_STATE = `(() => {
  const net = globalThis.vAPI && globalThis.vAPI.net;
  if (!net || typeof net.suspendDepth !== "number") return "starting";
  return net.suspendDepth === 0 && typeof net.suspendableListener === "function" ? "ready" : "suspended";
})()`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Resolve once the built-in blocker serving `page`'s context has finished starting, so loading a
 * URL in `page` cannot be reloaded out from under the caller. Resolves at once when the browser
 * has no such blocker. Throws after `timeout` ms, naming the cause, rather than letting the gate
 * fail later with an error that points at the page.
 */
export async function waitForBlockerStartup(page, { timeout = 60_000 } = {}) {
  const pageSession = await page.context().newCDPSession(page);
  const { targetInfo } = await pageSession.send("Target.getTargetInfo");
  await pageSession.detach();

  const cdp = await page.context().browser().newBrowserCDPSession();
  try {
    const deadline = Date.now() + timeout;
    const fail = (why) => new Error(
      `The browser's built-in uBlock Origin ${why} ${timeout / 1000}s after the page was created. Each ` +
      "copy reloads any tab that loads while it starts up, and that reload kills a test page, so " +
      "the gate stops here instead. If a browser update changed uBlock's incognito mode from " +
      '"split" or renamed the state this reads (vAPI.net.suspendDepth, ' +
      "vAPI.net.suspendableListener), update scripts/browser.mjs.",
    );

    // Find this context's copy. None anywhere means the browser has no built-in blocker. Copies
    // elsewhere but not here yet means this context's copy is still being created.
    let blocker;
    for (;;) {
      const copies = (await cdp.send("Target.getTargets")).targetInfos.filter(isBlocker);
      if (copies.length === 0) return;
      blocker = copies.find((t) => t.browserContextId === targetInfo.browserContextId);
      if (blocker) break;
      if (Date.now() > deadline) throw fail("had no copy for this page's context");
      await sleep(50);
    }

    // Playwright's CDP session cannot address a flat child session, so this uses the non-flat
    // form: messages to the background page travel through the browser session.
    const { sessionId } = await cdp.send("Target.attachToTarget", { targetId: blocker.targetId, flatten: false });
    const replies = new Map();
    let nextId = 0;
    cdp.on("Target.receivedMessageFromTarget", (event) => {
      if (event.sessionId !== sessionId) return;
      const message = JSON.parse(event.message);
      replies.get(message.id)?.(message);
      replies.delete(message.id);
    });
    // Each read is bounded too: a background page that stops answering must not hang the gate.
    const readState = () => new Promise((resolve, reject) => {
      const id = ++nextId;
      const timer = setTimeout(() => { replies.delete(id); resolve("not answering"); }, 5_000);
      replies.set(id, (message) => { clearTimeout(timer); resolve(message.result?.result?.value ?? "starting"); });
      const message = JSON.stringify({ id, method: "Runtime.evaluate", params: { expression: BLOCKER_STATE, returnByValue: true } });
      cdp.send("Target.sendMessageToTarget", { sessionId, message }).catch((error) => { clearTimeout(timer); reject(error); });
    });

    let state = await readState();
    while (state !== "ready") {
      if (Date.now() > deadline) throw fail(`was still "${state}"`);
      await sleep(100);
      state = await readState();
    }
    await cdp.send("Target.detachFromTarget", { sessionId });
  } finally {
    await cdp.detach();
  }
}
