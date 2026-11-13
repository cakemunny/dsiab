/* =============================================================================
   storedSeed.ts — THE ONE WRITE OF A BRAND COLOUR
   -----------------------------------------------------------------------------
   Every control that applies a brand colour stores it through this function:
   the docs toolbar and the Customize page, so the shared setting holds the same
   value whichever control wrote it ([[brand-colour-setting]]). It parses what a
   person typed and returns the colour as six-digit lower-case hex, the form that
   survives a reload and a shared link. Text stored as typed does not: Storybook
   10.4's URL check drops `oklch()` and modern `rgb()` values, so such a colour
   applied, then vanished on reload and never reached a shared link. A colour the
   parser refuses comes back with the parser's own reason.

   Pure. No DOM.
   ============================================================================= */
import { parseSeed } from "./parseSeed";

export type StoredSeed = { ok: true; hex: string } | { ok: false; reason: string };

/** `input`, a colour as a person typed it, as the value the shared setting stores. */
export function storedSeed(input: unknown): StoredSeed {
  const parsed = parseSeed(input);
  if (!parsed.ok) return { ok: false, reason: parsed.reason };
  const { r, g, b } = parsed.rgb;
  return { ok: true, hex: `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}` };
}
