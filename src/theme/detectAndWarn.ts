/* =============================================================================
   detectAndWarn.ts — THE TWO SILENT CONSUMER FAILURES, MADE LOUD
   -----------------------------------------------------------------------------
   Every way a consumer can misinstall this package currently fails SILENTLY.
   Measured on 2026-09-02, rendering with `class="radix-themes"` alone — what
   anybody writes without React:

     --ds-fill-accent   #5b5bd6  with Provider   ·  ""        without
     --ds-space-8       calc(8px * 1)            ·  ""
     --ds-radius-3      calc(6px * 1 * 1)        ·  ""
     --ds-text-strong   #1c2024                  ·  #202020   (falls off slate)

   `--scaling` comes from `[data-scaling]`, radius from `[data-radius]`, the
   accent ramp from `[data-accent-color]`, greys from `[data-gray-color]` — all
   written by `Provider`. Without them every `calc()` is invalid at
   computed-value time. Nothing errors and nothing warns: the page just paints
   wrong, and the reader has no thread to pull.

   This module closes the two cases a library CAN detect from inside itself:

     1. NO PROVIDER ABOVE A COMPONENT. `SizeContext` cannot answer this — its
        default is a real tier (`"small"`), indistinguishable from a Provider
        that set it. So presence needs its own sentinel context, which is what
        `ProviderPresenceContext` is for and all it is for.
     2. THE STYLESHEET WAS NEVER IMPORTED. Vite's library build extracts the CSS
        out of the JS, so importing `Provider` alone paints nothing. Detected by
        reading a `--ds-*` role off the theme root after mount: if our sheet is
        absent the whole role layer computes empty, because `semantic.css`
        declares it on `.radix-themes` — the element Provider renders.

   WHAT IT DOES NOT TRY TO DETECT. Radix's own stylesheet loaded AFTER ours.
   Both sheets set `--default-font-family` and the root `font-size` on
   `.radix-themes` at equal strength, so the loser is decided by source order
   and the winner's value is a legitimate value either way. There is nothing to
   compare against, so a check here would be a guess. That case stays a
   documented trap in README and AGENTS.md.

   ONE WARNING PER CAUSE, PER PAGE. `useResolvedSize` runs in 74 components and
   on every render; a per-instance warning would bury the signal it exists to
   raise.
   ============================================================================= */
import { createContext } from "react";

/**
 * Dev-only gate. A `try` rather than `typeof process !== "undefined" && …`:
 * a bundler replaces the LITERAL `process.env.NODE_ENV` without defining a
 * `process` global, so the typeof form reads "undefined" and silences the
 * warning in exactly the dev build it exists for. The catch fires only when
 * NOTHING replaced the literal and no `process` exists — the browser bundle
 * that used to throw a ReferenceError — and stays silent.
 *
 * NOTE: fourteen components under `src/components/ui/` carry a byte-identical
 * private copy of this IIFE and its comment (Avatar, Badge, ChatMessageList,
 * CommandPalette, DateInput, DateRangeInput, NumberInput, PowerSearch,
 * TextArea, TextField, TimeInput, Token, Tokenizer, Typeahead). That is the
 * [[container-size-seeding]] shape — private copies of a shared decision — and this is the one
 * definition they should all reach for. Migrating them is deliberately NOT part
 * of the change that introduced this file; it is recorded as a surfaced gap so
 * the diff that fixes it says so.
 */
export const DEV_WARN: boolean = (() => {
  try {
    return process.env.NODE_ENV !== "production";
  } catch {
    return false;
  }
})();

/**
 * Whether a `Provider` sits above this subtree. `false` is the honest default:
 * a consumer who rendered a component with no Provider gets the default, and
 * that is precisely the case worth reporting.
 *
 * Deliberately NOT exported from the package. It answers one internal question
 * and a consumer who reads it has no use for the answer.
 */
export const ProviderPresenceContext = createContext(false);

/** Causes already reported on this page. Module-level, so the cap is per page
 *  rather than per component instance or per render. */
const reported: Record<string, true> = {};

/**
 * Report a cause once. Returns whether it reported, so a caller can assert the
 * once-only behaviour without reading the console.
 */
export function warnOnce(cause: string, message: string): boolean {
  if (!DEV_WARN || reported[cause]) return false;
  reported[cause] = true;
  console.warn(`[dsiab] ${message}`);
  return true;
}

/** Test seam — lets a guard drive `warnOnce` more than once from one process. */
export function resetWarnings(): void {
  for (const cause of Object.keys(reported)) delete reported[cause];
}

export const NO_PROVIDER_MESSAGE =
  "a component rendered with no <Provider> above it. The design tokens are written by Provider as " +
  "data attributes on the theme root, so without it every --ds-* value computes empty and the page " +
  "paints wrong with no other symptom. Wrap your app once, at its entry point: " +
  'import { Provider } from "dsiab" — see the README Quickstart.';

export const NO_STYLESHEET_MESSAGE =
  "the stylesheet was never imported, so nothing is painted from the token layer. The library build " +
  'extracts CSS out of the JS, so importing Provider alone is not enough. Add import "dsiab/styles.css" ' +
  "once, at your app's entry point. It already contains Radix Themes' own sheet, so do not import that " +
  "one as well.";

/**
 * The canary. `semantic.css` declares the whole `--ds-*` role layer on
 * `.radix-themes`, so any one role answers the question; this is the same
 * property the publish acceptance test reads, which keeps the two checks
 * pointed at one fact.
 */
export const CANARY_PROPERTY = "--ds-fill-accent";

/**
 * True when the token layer resolved on `root`. Separated from the effect that
 * calls it so a guard can drive it against a element it built itself, rather
 * than mounting a Provider and reading the console.
 */
export function tokenLayerResolved(root: Element): boolean {
  return getComputedStyle(root).getPropertyValue(CANARY_PROPERTY).trim() !== "";
}
