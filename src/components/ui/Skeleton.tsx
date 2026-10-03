/* Skeleton — the uniform System import surface for Radix Themes' Skeleton: a placeholder that reserves a
 * chunk of layout while its real content loads, then swaps to that content. A DOCUMENTED RE-EXPORT, not a
 * forwardRef wrap — there is nothing to override. It reuses Radix's OWN skeleton skin (a neutral gray box
 * that breathes between `--gray-a3` and `--gray-a4`), so a bare skeleton already matches the system's
 * loading-placeholder look with no new CSS and no new token; it declares no `--ds-*` roles of its own.
 *
 * `loading` (Radix default `true`) is the whole contract: while `true` it renders the gray placeholder
 * SIZED TO its children (Radix merges the skeleton skin onto the child element and hides the child), so
 * the placeholder MIRRORS the exact shape that will load; flip it to `false` and it renders the children
 * unchanged — the same markup drives both states. For a childless bar/block, `width` / `height` (and the
 * `minWidth` / `maxWidth` / `minHeight` / `maxHeight` clamps, plus the margin props) set the size — every
 * one is RESPONSIVE (pass a `{ initial, sm, md, … }` breakpoint object). An empty skeleton with no size
 * falls back to `var(--space-3)` tall. It rides NO size lane: a skeleton has no scale of its own, it takes
 * the size of whatever it stands in for.
 *
 * The pulse is an AMBIENT loop — a ~1s gray breathe with no start or end — so its duration is a deliberate
 * literal rather than a value off the intent-named `--ds-duration` transition ladder (the StatusDot pulse
 * precedent). NOTE the reduced-motion behaviour: Radix ships this animation UNCONDITIONALLY (the
 * `.rt-Skeleton` rule sets `animation: … !important` with no `prefers-reduced-motion` guard — unlike its
 * popper motion, which opts in under `no-preference`). To hold a STATIC fill under
 * `prefers-reduced-motion: reduce` (matching StatusDot), the guard is applied CENTRALLY in the system's
 * component CSS — a re-export owns no CSS of its own to carry it.
 *
 * While `loading`, the placeholder is out of the accessibility tree and non-interactive (Radix sets
 * `aria-hidden`, `inert`, and `tabIndex={-1}`), so a screen reader skips the gray box and reaches the real
 * content only once it renders. */
export { Skeleton, type SkeletonProps } from "@radix-ui/themes";
