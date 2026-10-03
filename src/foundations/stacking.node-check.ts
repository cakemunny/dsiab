/* =============================================================================
   stacking.node-check.ts — THE CROSS-COMPONENT z-index LADDER
   -----------------------------------------------------------------------------
   WHAT THIS GUARD PROVES, and nothing more:
     · FORWARD — each of the 7 registered cross-component sites declares its
       z-index through a --ds-z-* token, not a raw number.
     · REVERSE (anti-rot) — no unregistered rule in components.css declares a
       raw numeric z-index >= 10. That threshold is the whole discrimination
       rule: values 0/1/2 order siblings INSIDE one component's stacking
       context and mean nothing globally, so tokenising them would advertise a
       relationship that does not exist.

   WHAT IT CANNOT SEE, stated so nobody reads more into a pass than it earns:
     · IT PROVES THE TOKEN IS CONSUMED, NEVER THAT THE VALUE REACHES THE SCREEN.
       All three rungs do reach it — verified by hand in Chrome, not here — but
       the panel rung's route is indirect: those five elements compute
       `position: static`, and they work only because Radix reads their computed
       z-index at mount and copies it onto the floating wrapper. A regression in
       that vendor behaviour would be invisible to this guard. Closing the gap
       would need an effective arm that opens each portal and reads the wrapper.
       See [[stacking-ladder]].
     · It is a DECLARATION scan. A rule that is present but OUTRANKED passes.
       There is no effective arm — proving painted stacking would mean mounting
       five portals; the drift this guard exists to catch (a new panel picking a
       raw number) is caught by the reverse arm instead.
     · The >= 10 threshold leaves 3-9 UNPOLICED. A new floating surface written
       `z-index: 5` is invisible to both arms. Tolerable only because nothing at
       5 could clear the existing 50s — stated rather than left implicit.
     · It reads src/tokens/components.css only. A z-index in a .tsx inline style
       is invisible. That set is bounded, not open-ended: the highest in any
       shipped .tsx is 1 (ClickableCard.tsx's exported `interactiveLayer`), plus
       2 in _storyKit.tsx and 0/1 in story fixtures — all below 10.

   COMMENTS ARE STRIPPED BEFORE EITHER ARM RUNS, and that is not cosmetic. An
   earlier draft was comment-blind, and a review demonstrated the hole: a comment
   mentioning a class name could satisfy the forward arm while the real rule
   carried a raw number, with the reverse arm also passing because the number was
   under 10. This file already contains comments with brace pairs (see the
   AvatarFallback note), so the hazard is live. Stripping also stops the reverse
   arm false-positiving on a comment that documents `z-index: 50;`.
   ============================================================================= */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const CSS = readFileSync("src/tokens/components.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

/**
 * Selectors permitted to carry a raw z-index >= 10 inside their own stacking
 * context. The escape hatch for the >= 10 threshold: without it, a component
 * with a legitimate local need would be pushed into adding a GLOBAL rung, which
 * is the exact false relationship the threshold exists to prevent.
 * EMPTY today — no shipped component needs one.
 */
const INTRA_COMPONENT_ALLOW: Record<string, string> = {};

/** The cross-component sites. Each MUST consume a token. */
const LADDER_SITES: Record<string, string> = {
  "rt-ds-multiselect-panel": "--ds-z-panel",
  "rt-ds-typeahead-panel": "--ds-z-panel",
  "rt-ds-dateinput-panel": "--ds-z-panel",
  "rt-ds-daterange-panel": "--ds-z-panel",
  "rt-ds-powersearch-popover": "--ds-z-panel",
  "rt-ds-toast-viewport": "--ds-z-toast",
  "rt-ds-appshell-skiplink": "--ds-z-skip-link",
};

describe("cross-component stacking ladder", () => {
  it("every registered site consumes its --ds-z-* token", () => {
    const missing: string[] = [];
    for (const [cls, token] of Object.entries(LADDER_SITES)) {
      // [^{}] on BOTH sides, so a match cannot run across an intervening rule.
      const block = new RegExp(`\\.${cls}\\b[^{}]*\\{[^{}]*\\}`, "g");
      const found = CSS.match(block) ?? [];
      // Tolerate whitespace inside var() — `var( --ds-z-panel )` is valid CSS.
      const wanted = new RegExp(`z-index\\s*:\\s*var\\(\\s*${token}\\s*\\)`);
      if (!found.some((b) => wanted.test(b))) missing.push(`${cls} -> ${token}`);
    }
    expect(missing, `sites not consuming their ladder token:\n${missing.join("\n")}`).toEqual([]);
  });

  it("no unregistered raw z-index >= 10 remains (anti-rot)", () => {
    const offenders: string[] = [];
    for (const m of CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const selector = m[1].trim().replace(/\s+/g, " ");
      // -?\d+ so a negative value cannot slip past, and a lookahead terminator
      // so a declaration written without a trailing semicolon is still seen.
      const zi = m[2].match(/z-index\s*:\s*(-?\d+)\s*(?=[;}]|$)/);
      if (!zi || Number(zi[1]) < 10) continue;
      const allowed = Object.keys(INTRA_COMPONENT_ALLOW).some((s) => selector.includes(s));
      if (!allowed) offenders.push(`${selector} -> z-index: ${zi[1]}`);
    }
    expect(
      offenders,
      "raw cross-component z-index found. Either point it at a --ds-z-* rung, or — if it is genuinely " +
        "local to one component's stacking context — register the selector in INTRA_COMPONENT_ALLOW " +
        "with a reason. Do NOT add a global rung to solve a local problem:\n" + offenders.join("\n"),
    ).toEqual([]);
  });
});
