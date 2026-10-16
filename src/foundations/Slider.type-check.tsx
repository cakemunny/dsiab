/* =============================================================================
   Slider.type-check.tsx — COMPILE-TIME ASSERTIONS FOR THE Slider `color` PROP
   -----------------------------------------------------------------------------
   There is no runtime here and no test runner: `tsc --noEmit` passing IS the
   green. Each `@ts-expect-error` is a real assertion that INVERTS — if the error
   it guards ever stops occurring, the build fails.

   `color` is typed as `AccentColor`, the same union every other colour prop in
   the system takes: the Radix accent names plus `oxblood`. Typed as `string`, a
   misspelt accent compiled and painted the brand accent with no error anywhere.

   EXCLUDED FROM THE PUBLISHED BUILD via tsconfig.build.json (`*.type-check.tsx`).
   ============================================================================= */
import { Slider } from "../components/ui/Slider";

/* ---- MUST COMPILE — every accent the system ships ---- */

/** A Radix accent name. */
export const radixAccent = () => <Slider aria-label="Volume" defaultValue={[40]} color="teal" />;

/** The system's own accent, which Radix does not ship. */
export const oxbloodAccent = () => <Slider aria-label="Volume" defaultValue={[40]} color="oxblood" />;

/** Unset paints the running brand accent. */
export const noAccent = () => <Slider aria-label="Volume" defaultValue={[40]} />;

/* ---- MUST NOT COMPILE — a misspelt accent ---- */

// @ts-expect-error -- "tael" is not an accent name
export const typoRejected = () => <Slider aria-label="Volume" defaultValue={[40]} color="tael" />;
