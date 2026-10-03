/* =============================================================================
   detect-and-warn.node-check.ts — THE TWO SILENT FAILURES STAY LOUD
   -----------------------------------------------------------------------------
   `src/theme/detectAndWarn.ts` exists because every way a consumer can
   misinstall this package fails silently: no `Provider` above a component, or
   the stylesheet never imported. Both paint a wrong page with no console
   output and no thread to pull.

   A warning layer has an unusual property — when it breaks, it breaks QUIETLY,
   in the same way as the defect it was built to report. Three plausible bugs,
   each of which this file turns into a red test:

     1. `ProviderPresenceContext`'s default flips to `true`. The no-Provider
        warning then never fires for anybody, and the feature is gone with no
        symptom.
     2. `warnOnce` stops de-duplicating. `useResolvedSize` runs in 74 components
        on every render, so the one useful line is buried in hundreds.
     3. `CANARY_PROPERTY` is renamed, or the token layer stops declaring it.
        Every correctly-installed consumer is then told their stylesheet is
        missing — a false positive shipped to everyone, which is worse than the
        silence it replaced.

   WHY THE RENDER ASSERTIONS WORK IN THE NODE LANE. The no-Provider check runs
   during RENDER, not in an effect, so `renderToString` exercises it with no DOM.
   The stylesheet canary is the opposite — it runs in an effect and needs real
   CSS — so what is checked here is the half that can go wrong silently in
   source: that the property the canary reads is actually declared. The runtime
   half was verified against real Chrome, both directions, on 2026-09-17:
   `#5b5bd6` with the stylesheet and `""` without.
   ============================================================================= */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { test, expect } from "vitest";
import { useResolvedSize } from "../theme/SizeContext";
import {
  ProviderPresenceContext, warnOnce, resetWarnings, DEV_WARN, CANARY_PROPERTY,
} from "../theme/detectAndWarn";

const TOKENS_DIR = join(process.cwd(), "src/tokens");

/** A component that reaches the shared size seam, which is where the check lives. */
function Sized() {
  return createElement("span", null, String(useResolvedSize("control", undefined)));
}

/** Render `node` with `console.warn` captured, so a guard reads the lines a
 *  consumer would see rather than asserting on internals. */
function warningsFrom(node: Parameters<typeof renderToString>[0]): { html: string; lines: string[] } {
  const lines: string[] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => void lines.push(args.map(String).join(" "));
  try {
    return { html: renderToString(node), lines };
  } finally {
    console.warn = original;
  }
}

test("the dev gate is on in this lane, or every assertion below is vacuous", () => {
  expect(DEV_WARN, "DEV_WARN resolved false under vitest, so the warning paths never run").toBe(true);
});

test("a component with no Provider above it says so, and still renders", () => {
  resetWarnings();
  const { html, lines } = warningsFrom(createElement(Sized));

  expect(lines.length, `expected exactly one warning, got ${lines.length}: ${lines.join(" | ")}`).toBe(1);
  expect(lines[0]).toContain("no <Provider>");
  // Degrading loudly, not fatally: the tier default still resolves a usable step.
  expect(html, "a missing Provider must warn, never break the render").toBe("<span>1</span>");
});

test("the warning is once per page, not once per component", () => {
  resetWarnings();
  const { lines } = warningsFrom(
    createElement("div", null, ...Array.from({ length: 20 }, (_, i) => createElement(Sized, { key: i }))),
  );

  expect(
    lines.length,
    `20 unwrapped components produced ${lines.length} warnings. useResolvedSize runs in 74 ` +
      `components on every render, so anything but 1 buries the signal.`,
  ).toBe(1);
});

test("a correctly wrapped tree is silent — the false positive that would reach every consumer", () => {
  resetWarnings();
  const { lines } = warningsFrom(
    createElement(
      ProviderPresenceContext.Provider,
      { value: true },
      createElement("div", null, ...Array.from({ length: 20 }, (_, i) => createElement(Sized, { key: i }))),
    ),
  );

  expect(lines, `a wrapped tree warned: ${lines.join(" | ")}`).toEqual([]);
});

test("warnOnce de-duplicates per cause, not globally", () => {
  resetWarnings();
  expect(warnOnce("cause-a", "first"), "a fresh cause must report").toBe(true);
  expect(warnOnce("cause-a", "second"), "a repeated cause must stay quiet").toBe(false);
  expect(warnOnce("cause-b", "other"), "a different cause must still report").toBe(true);
});

test("the stylesheet canary reads a property the token layer actually declares", () => {
  const declaring = readdirSync(TOKENS_DIR)
    .filter((f) => f.endsWith(".css"))
    .filter((f) => readFileSync(join(TOKENS_DIR, f), "utf8").includes(`${CANARY_PROPERTY}:`));

  expect(
    declaring,
    `${CANARY_PROPERTY} is declared in no file under src/tokens/, so the canary would report a ` +
      `missing stylesheet to every consumer who installed correctly. Point CANARY_PROPERTY at a ` +
      `--ds-* role that exists.`,
  ).not.toEqual([]);

  // Scope matters as much as existence: the canary reads the element Provider renders, so a role
  // declared only on `:root` or only inside `.dark` would answer the wrong question.
  const onThemeRoot = declaring.some((f) => {
    const css = readFileSync(join(TOKENS_DIR, f), "utf8");
    const block = css.slice(css.indexOf(".radix-themes {"), css.indexOf(`${CANARY_PROPERTY}:`));
    return css.includes(".radix-themes {") && !block.includes("}\n.dark");
  });
  expect(
    onThemeRoot,
    `${CANARY_PROPERTY} is not declared on .radix-themes — the element Provider renders and the ` +
      `element the canary queries.`,
  ).toBe(true);
});
