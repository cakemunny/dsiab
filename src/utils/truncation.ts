import type { CSSProperties } from "react";

/* =============================================================================
   truncation.ts — ONE IMPLEMENTATION OF "HOW MANY LINES BEFORE IT TRUNCATES"
   -----------------------------------------------------------------------------
   `GUIDELINES.md` §8b rules the behaviour: as a container narrows, single-line
   labels TRUNCATE and prose REFLOWS. A label that wraps does not merely look
   wrong, it drives layout — its min-content width is its longest unbreakable
   word, so one long filename can set the minimum width of a whole panel, which
   is usually why a horizontal scrollbar appeared ([[container-narrowing]]).

   `Item` has carried this longhand since it was written, as `labelLines` /
   `descriptionLines`. It lives here now because `Outline` needed the same
   behaviour and the choice was to copy four lines of CSS or to share them, and
   a second copy is how two components end up disagreeing about what `1` means.

   THE VOCABULARY, so every component that adopts it says the same thing:
     • `undefined` on a NODE      → no clamp. The caller composed it; leave it alone.
     • `undefined` on a STRING    → one line. A bare string label is a single-line
                                    label, and defaulting it to wrap is the defect.
     • `1`                        → ellipsis.
     • `n > 1`                    → line-clamp at n.

   WHERE TRUNCATION HIDES SOMETHING, GIVE IT BACK. §9's 1.4.12 ellipsis
   allowance holds only when a mechanism reveals the full text — a `Tooltip`, a
   `title`, or a destination that carries it. This helper cannot enforce that
   and does not pretend to; it is named here so the obligation travels with the
   thing that creates it.
   ============================================================================= */

/**
 * Truncation longhands for a label.
 *
 * @param lines    The caller's explicit line budget, or `undefined` to take the default.
 * @param isString Whether the content is a bare string, which is what makes a one-line default
 *                 correct: a caller who composed a node has already decided how it should wrap.
 */
export function truncationStyle(
  lines: number | undefined,
  isString: boolean,
): CSSProperties | undefined {
  const n = lines ?? (isString ? 1 : undefined);
  if (n == null) return undefined;
  if (n === 1) return { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
  return { overflow: "hidden", display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: n };
}
