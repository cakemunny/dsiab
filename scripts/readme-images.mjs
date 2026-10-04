#!/usr/bin/env node
/**
 * Captures the README images from the live docs at https://dsiab.pages.dev.
 *
 * Most images are one demo screen from the docs, loaded alone through Storybook's iframe. One image is
 * the docs site itself, with its sidebar and toolbar and the addon panel hidden. Each is 1440 by 900 at
 * scale 1 and lands in docs/images/. The browser comes from scripts/browser.mjs, the resolver the story
 * suite and the publish test share: DS_BROWSER_PATH, then Playwright's own Chromium. Each page opens on
 * about:blank and waits for a built-in ad blocker to finish starting before it loads the docs, because
 * such a blocker reloads a tab that loads early. Motion stays at the browser default: under a
 * reduced-motion preference a Skeleton paints no placeholder, so a loading card would capture as an
 * empty box.
 *
 * Run it after a docs deploy that changes one of these screens:
 *   node scripts/readme-images.mjs
 */
import { mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { browserLaunchOptions, waitForBlockerStartup } from "./browser.mjs";

const DOCS = "https://dsiab.pages.dev";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "images");

/** A story captured alone. `globals` holds Storybook toolbar settings, written as the docs URL takes them. */
const story = (file, id, globals) => ({ file, url: `${DOCS}/iframe.html?id=${id}&viewMode=story${globals ? `&globals=${globals}` : ""}`, root: "#storybook-root > *" });
/** A page of the docs site, captured with its sidebar and toolbar. */
const site = (file, path) => ({ file, url: `${DOCS}/?path=${path}&panel=false`, frame: "#storybook-preview-iframe", root: "#storybook-root > *" });

const SHOTS = [
  story("readme-project-board.png", "ui-examples-project-board--screen"),
  story("readme-mail-client.png", "ui-examples-mail-client--screen"),
  story("readme-code-editor.png", "ui-examples-code-editor--screen"),
  story("readme-ai-assistant.png", "ui-examples-ai-assistant--screen"),
  story("readme-agent-run.png", "ui-examples-agent-run--screen"),
  story("readme-analytics-light.png", "ui-examples-analytics-dashboard--screen"),
  story("readme-project-board-dark.png", "ui-examples-project-board--screen", "appearance:dark"),
  story("readme-project-board-orange.png", "ui-examples-project-board--screen", "accent:orange"),
  site("readme-docs.png", "/story/components-typed-entry-textfield--anatomy"),
];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(browserLaunchOptions());
try {
  for (const shot of SHOTS) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    await waitForBlockerStartup(page);
    await page.goto(shot.url, { waitUntil: "networkidle" });
    const scope = shot.frame ? page.frameLocator(shot.frame) : page;
    await scope.locator(shot.root).first().waitFor({ timeout: 30_000 });
    await page.evaluate(() => document.fonts.ready);
    if (shot.frame) await page.waitForTimeout(1500);
    const path = join(OUT, shot.file);
    await page.screenshot({ path });
    console.log(`${shot.file}  ${Math.round(statSync(path).size / 1024)} KB`);
    await page.close();
  }
} finally {
  await browser.close();
}
