/* =============================================================================
   semanticBaseline.fixture.ts — the PRE-run-1 resolved semantic step-9 values
   -----------------------------------------------------------------------------
   WHAT THIS IS. Every named accent's resolved `--{error,warning,success,info}-9`
   and `--*-contrast`, measured off a live theme root at 6008 before the
   custom-brand collision shift was written. Run 1's binding acceptance criterion
   is that the twenty named-accent blocks are UNCHANGED by that work: one altered
   value is a failed run, not a side effect.

   WHY A FIXTURE RATHER THAN A NOTE. The "capture before, diff after" instruction
   in the work order is only as good as the captured values, and a baseline that
   lives in a session transcript cannot be re-run in six months. Checked in, it is
   a regression gate any future change to `theme.css` must pass.

   HOW IT WAS MEASURED. `getComputedStyle(root).getPropertyValue()` per accent,
   cycling `data-accent-color` on the theme root — the same mechanism `withAccent`
   uses in `_assert.ts`. Values are the resolved hex the scale files declare, not
   a rasterised readback: this fixture answers "did the mapping change", which is
   a string comparison, NOT "what does it look like", which needs the P3-safe
   canvas path and is a different question.

   NOTE ON CONTRAST POLARITY. `teal`/`jade`/`green`/`grass` route success -> lime
   and carry `--success-contrast: #21201c`, where an unshifted accent carries
   `#fff`. `gold`/`yellow`/`amber`/`orange`/`lime` do the same for warning ->
   orange. That flip is load-bearing: white on a light scale drops under the 3.0
   non-text gate, so a shift that moves a family without moving its foreground
   ships below the floor. Any runtime chooser must reproduce it.
   ============================================================================= */

/** A resolved semantic row: the step-9 fill and its on-solid foreground. */
export interface SemanticRow {
  error: string; errorContrast: string;
  warning: string; warningContrast: string;
  success: string; successContrast: string;
  info: string; infoContrast: string;
}

/** Measured 2026-08-11 at `31e6726`, light appearance, before any run-1 change. */
export const SEMANTIC_BASELINE_LIGHT: Record<string, SemanticRow> = {
  gray:    { error: "#e5484d", errorContrast: "#fff", warning: "#ffc53d", warningContrast: "#21201c", success: "#30a46c", successContrast: "#fff", info: "#00a2c7", infoContrast: "#fff" },
  gold:    { error: "#8a2119", errorContrast: "#fff", warning: "#f76b15", warningContrast: "#21201c", success: "#30a46c", successContrast: "#fff", info: "#00a2c7", infoContrast: "#fff" },
  bronze:  { error: "#e54666", errorContrast: "#fff", warning: "#ffc53d", warningContrast: "#21201c", success: "#30a46c", successContrast: "#fff", info: "#00a2c7", infoContrast: "#fff" },
  brown:   { error: "#e5484d", errorContrast: "#fff", warning: "#ffe629", warningContrast: "#21201c", success: "#30a46c", successContrast: "#fff", info: "#00a2c7", infoContrast: "#fff" },
  yellow:  { error: "#8a2119", errorContrast: "#fff", warning: "#f76b15", warningContrast: "#21201c", success: "#30a46c", successContrast: "#fff", info: "#00a2c7", infoContrast: "#fff" },
  amber:   { error: "#8a2119", errorContrast: "#fff", warning: "#f76b15", warningContrast: "#21201c", success: "#30a46c", successContrast: "#fff", info: "#00a2c7", infoContrast: "#fff" },
  orange:  { error: "#8a2119", errorContrast: "#fff", warning: "#ffc53d", warningContrast: "#21201c", success: "#30a46c", successContrast: "#fff", info: "#00a2c7", infoContrast: "#fff" },
  tomato:  { error: "#8a2119", errorContrast: "#fff", warning: "#ffc53d", warningContrast: "#21201c", success: "#30a46c", successContrast: "#fff", info: "#00a2c7", infoContrast: "#fff" },
  red:     { error: "#8a2119", errorContrast: "#fff", warning: "#ffc53d", warningContrast: "#21201c", success: "#30a46c", successContrast: "#fff", info: "#00a2c7", infoContrast: "#fff" },
  ruby:    { error: "#8a2119", errorContrast: "#fff", warning: "#ffc53d", warningContrast: "#21201c", success: "#30a46c", successContrast: "#fff", info: "#00a2c7", infoContrast: "#fff" },
  crimson: { error: "#8a2119", errorContrast: "#fff", warning: "#ffc53d", warningContrast: "#21201c", success: "#30a46c", successContrast: "#fff", info: "#00a2c7", infoContrast: "#fff" },
  pink:    { error: "#8a2119", errorContrast: "#fff", warning: "#ffc53d", warningContrast: "#21201c", success: "#30a46c", successContrast: "#fff", info: "#00a2c7", infoContrast: "#fff" },
  plum:    { error: "#e5484d", errorContrast: "#fff", warning: "#ffc53d", warningContrast: "#21201c", success: "#30a46c", successContrast: "#fff", info: "#00a2c7", infoContrast: "#fff" },
  purple:  { error: "#e5484d", errorContrast: "#fff", warning: "#ffc53d", warningContrast: "#21201c", success: "#30a46c", successContrast: "#fff", info: "#00a2c7", infoContrast: "#fff" },
  violet:  { error: "#e5484d", errorContrast: "#fff", warning: "#ffc53d", warningContrast: "#21201c", success: "#30a46c", successContrast: "#fff", info: "#00a2c7", infoContrast: "#fff" },
  iris:    { error: "#e5484d", errorContrast: "#fff", warning: "#ffc53d", warningContrast: "#21201c", success: "#30a46c", successContrast: "#fff", info: "#00a2c7", infoContrast: "#fff" },
  indigo:  { error: "#e5484d", errorContrast: "#fff", warning: "#ffc53d", warningContrast: "#21201c", success: "#30a46c", successContrast: "#fff", info: "#00a2c7", infoContrast: "#fff" },
  blue:    { error: "#e5484d", errorContrast: "#fff", warning: "#ffc53d", warningContrast: "#21201c", success: "#30a46c", successContrast: "#fff", info: "#5b5bd6", infoContrast: "#fff" },
  cyan:    { error: "#e5484d", errorContrast: "#fff", warning: "#ffc53d", warningContrast: "#21201c", success: "#30a46c", successContrast: "#fff", info: "#3e63dd", infoContrast: "#fff" },
  teal:    { error: "#e5484d", errorContrast: "#fff", warning: "#ffc53d", warningContrast: "#21201c", success: "#bdee63", successContrast: "#21201c", info: "#3e63dd", infoContrast: "#fff" },
  jade:    { error: "#e5484d", errorContrast: "#fff", warning: "#ffc53d", warningContrast: "#21201c", success: "#bdee63", successContrast: "#21201c", info: "#00a2c7", infoContrast: "#fff" },
  green:   { error: "#e5484d", errorContrast: "#fff", warning: "#ffc53d", warningContrast: "#21201c", success: "#bdee63", successContrast: "#21201c", info: "#00a2c7", infoContrast: "#fff" },
  grass:   { error: "#e5484d", errorContrast: "#fff", warning: "#ffc53d", warningContrast: "#21201c", success: "#bdee63", successContrast: "#21201c", info: "#00a2c7", infoContrast: "#fff" },
  lime:    { error: "#8a2119", errorContrast: "#fff", warning: "#f76b15", warningContrast: "#21201c", success: "#30a46c", successContrast: "#fff", info: "#00a2c7", infoContrast: "#fff" },
  mint:    { error: "#e5484d", errorContrast: "#fff", warning: "#ffc53d", warningContrast: "#21201c", success: "#46a758", successContrast: "#fff", info: "#00a2c7", infoContrast: "#fff" },
  sky:     { error: "#e5484d", errorContrast: "#fff", warning: "#ffc53d", warningContrast: "#21201c", success: "#30a46c", successContrast: "#fff", info: "#0090ff", infoContrast: "#fff" },
  oxblood: { error: "#e5484d", errorContrast: "#fff", warning: "#ffc53d", warningContrast: "#21201c", success: "#30a46c", successContrast: "#fff", info: "#00a2c7", infoContrast: "#fff" },
};

/**
 * Every named accent's own `--accent-9`, measured in the same pass.
 *
 * This is the SEED SWEEP INPUT. The acceptance criterion is that seeding each of
 * these hexes reproduces the shift `COLLISION_TABLE` declares for that accent —
 * a far stronger test than two hand-picked seeds, because a static `ds-custom`
 * block that happens to clear red and teal passes those two and is wrong for
 * every other brand. The seed space is the whole hue circle, not an enum of 27;
 * these 27 are the cheapest sample of it whose right answer is already ruled.
 */
export const ACCENT_STEP_9: Record<string, string> = {
  gray: "#8b8d98", gold: "#978365", bronze: "#a18072", brown: "#ad7f58",
  yellow: "#ffe629", amber: "#ffc53d", orange: "#f76b15", tomato: "#e54d2e",
  red: "#e5484d", ruby: "#e54666", crimson: "#e93d82", pink: "#d6409f",
  plum: "#ab4aba", purple: "#8e4ec6", violet: "#6e56cf", iris: "#5b5bd6",
  indigo: "#3e63dd", blue: "#0090ff", cyan: "#00a2c7", teal: "#12a594",
  jade: "#29a383", green: "#30a46c", grass: "#46a758", lime: "#bdee63",
  mint: "#86ead4", sky: "#7ce2fe", oxblood: "#8a2119",
};
