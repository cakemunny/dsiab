/* =============================================================================
   collisionTable.ts — WHICH SCALE EACH COLLIDING BRAND ROUTES A FAMILY TO
   -----------------------------------------------------------------------------
   Pure data. No DOM, no dependency — so the runtime chooser (`Provider`'s path),
   the node-lane logic tests and the browser-lane verifier can all read the SAME
   table. [[brand-collision-shift-table]] already says this table "lives once"; before this file it lived in
   `src/foundations/_assert.ts`, which rasterises on a canvas and therefore cannot
   be imported outside a browser. Moving the DATA here changes nothing about the
   ruling and makes the node lane able to check it.

   WHAT IS *NOT* MOVED, AND WHY THAT MATTERS
   ------------------------------------------
   Only the table moved. The MATHS stays duplicated between `palette/oklch.ts`
   (producer) and `_assert.ts` (verifier), deliberately — see `oklch.ts`'s header.
   Sharing a producer's arithmetic with its verifier makes a generator that
   computes "these sit 0.20 apart" checked by a function computing the same 0.20
   from the same code, which agrees with itself by construction. A shared lookup
   of "red routes error to oxblood" carries no such risk: it is the thing being
   asserted, not the instrument that measures it.

   WHERE THE STEP-9 VALUES CAME FROM — MEASURED, NOT INVENTED
   -----------------------------------------------------------
   `SCALE_STEP_9` is read off a live theme root (`getComputedStyle` per
   `data-accent-color`, the same mechanism `withAccent` uses), not transcribed
   from memory or from the vendor's docs. This is the same posture as
   `generate.ts`'s `L_CURVE`/`C_CURVE`, which were fitted off Radix's own 25
   scales for the same reason: the system specifies no value here, and inventing
   one is the defect the no-invented-values rule exists to prevent.

   The alternative — resolving `var(--oxblood-9)` off the theme root at runtime —
   was considered and rejected: `generate.ts` is declared to run in `Provider` AND
   in the CLI from one source, and `custom-brand.css` documents an SSR story that
   a DOM read forfeits. A parity guard asserts this table still matches the live
   values, so the fitted copy cannot rot silently.
   ============================================================================= */

/** The four semantic families a brand can collide with. */
export type SemFamily = "error" | "warning" | "success" | "info";

/** The scale each family uses when nothing collides. */
export const SEMANTIC_DEFAULT: Record<SemFamily, string> = {
  error: "red",
  warning: "amber",
  success: "green",
  info: "cyan",
};

/**
 * Per-accent semantic re-routing — the shift table [[brand-collision-shift-table]] rules and `theme.css`
 * implements as 20 blocks. An accent absent from this map clears every family on
 * one axis or the other and needs no block.
 *
 * Several entries are SECOND choices with the rejected first recorded: a chooser
 * that takes the first candidate clearing the gate will not reproduce them, which
 * is exactly what the parity test exists to catch.
 */
export const COLLISION_TABLE: Record<string, Partial<Record<SemFamily, string>>> = {
  gold: { error: "oxblood", warning: "orange" },
  bronze: { error: "ruby" },
  brown: { warning: "yellow" },
  yellow: { error: "oxblood", warning: "orange" },
  amber: { error: "oxblood", warning: "orange" },
  orange: { error: "oxblood" }, // was ruby — orange↔ruby ΔE-OK 0.12; oxblood clears at 0.28
  // Red family + pink → oxblood (deep red; named reds sit ~0.07 apart, oxblood 0.21+).
  tomato: { error: "oxblood" },
  red: { error: "oxblood" },
  ruby: { error: "oxblood" },
  crimson: { error: "oxblood" },
  pink: { error: "oxblood" }, // magenta brand; bright red read too close (ΔE-OK 0.13)
  // Cyan/teal/blue cluster → indigo/iris for info — a hue-distinct blue, not a lighter cyan.
  cyan: { info: "indigo" }, // was blue — cyan↔blue ΔE-OK 0.11; indigo 0.18
  sky: { info: "blue" },
  blue: { info: "iris" }, // blue IS the info hue; iris the only clear option (0.14)
  teal: { success: "lime", info: "indigo" }, // collides on BOTH (the teal↔grass swap + cyan)
  jade: { success: "lime" },
  green: { success: "lime" },
  grass: { success: "lime" }, // was teal — the other half of the swap
  mint: { success: "grass" },
  lime: { error: "oxblood", warning: "orange" }, // warning→orange (amber too close, 0.13→0.31);
  // error→oxblood so it stays clear of the orange warning. gold/yellow/amber/lime all do this:
  // warning→orange would otherwise sit ~ΔE-OK 0.10 from a ruby/red error (both warm).
};

/** The expected semantic→scale map for an accent (defaults + any shift). */
export function expectedScales(accent: string): Record<SemFamily, string> {
  return { ...SEMANTIC_DEFAULT, ...(COLLISION_TABLE[accent] ?? {}) };
}

/** Every scale the table can route to, deduplicated. */
export const COLLISION_TARGETS = [
  "oxblood", "orange", "ruby", "yellow", "indigo", "blue", "iris", "lime", "grass",
] as const;

/**
 * The candidate shortlist PER FAMILY, nearest-first — and the shortlist is the
 * whole point.
 *
 * A shift may not change what a colour MEANS. Error moves within the reds,
 * warning within the warms, success within the greens, info within the blues.
 * Read off `COLLISION_TABLE`'s own value set, which never once routes error to a
 * green or info to a red: that constraint was always there, encoded 20 times by
 * hand rather than written down.
 *
 * It is also the difference between a working chooser and a broken one. Given a
 * global pool and "take the furthest that clears", the maximally-distant scale
 * from a red brand is lime — arithmetically ideal, and a lime error message is
 * nonsense. Ordering nearest-first and taking the FIRST that clears keeps the
 * move as small as the gate allows, which is what the hand table does: red goes
 * to ruby when ruby is far enough, and only falls through to oxblood because the
 * named reds sit ~ΔE-OK 0.07 apart and ruby cannot clear a red brand.
 */
export const FAMILY_CANDIDATES: Record<SemFamily, readonly string[]> = {
  error: ["red", "ruby", "oxblood"],
  warning: ["amber", "yellow", "orange"],
  success: ["green", "grass", "lime"],
  info: ["cyan", "blue", "indigo", "iris"],
};

/**
 * Step-9 sRGB hex of every scale the chooser reasons about — the four defaults
 * plus every candidate target. Measured off a live theme root 2026-08-11; the
 * parity guard re-reads them and fails if the vendor moves one.
 */
export const SCALE_STEP_9: Record<string, string> = {
  // defaults
  red: "#e5484d",
  amber: "#ffc53d",
  green: "#30a46c",
  cyan: "#00a2c7",
  // candidate targets
  oxblood: "#8a2119",
  orange: "#f76b15",
  ruby: "#e54666",
  yellow: "#ffe629",
  indigo: "#3e63dd",
  blue: "#0090ff",
  iris: "#5b5bd6",
  lime: "#bdee63",
  grass: "#46a758",
};

/**
 * Scales whose step-9 is light enough that white text on it drops under the 3.0
 * non-text gate, so a family routed here must flip its `--<family>-contrast` to
 * the dark ink. Not a guess: `theme.css` already does exactly this for every
 * warning→orange and success→lime block, and the measured baseline records the
 * flip (`--success-contrast: #21201c` under teal, `#fff` under an unshifted accent).
 */
export const LIGHT_TARGET_SCALES = new Set(["orange", "yellow", "lime", "amber"]);

/** The dark ink a light-scale family takes as its on-solid foreground. */
export const DARK_ON_SOLID = "#21201c";
