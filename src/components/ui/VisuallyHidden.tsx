/* VisuallyHidden — the uniform System import surface for Radix Themes' screen-reader-only primitive: it
 * takes its content OUT of the visual layout while keeping it in the accessibility tree. A DOCUMENTED
 * RE-EXPORT, not a forwardRef wrap — VisuallyHidden is pure a11y plumbing, so there is nothing to
 * override. It carries NO `--ds-*` roles and rides NO size lane: it never paints (no fill, stroke, or
 * text colour of its own) and never sizes a control — it only removes content from view. A bare
 * re-export is therefore the honest wrap; a forwardRef shell would imply an override that does not exist.
 *
 * The announce-only pattern. The rendered element is clipped to a 1px box (absolutely positioned,
 * `overflow: hidden`, `clip: rect(0,0,0,0)`) rather than `display: none` — so it stays OUT of the visual
 * layout but IN the accessibility tree, where a screen reader still announces it. Reach for it to name a
 * visual-only control (an icon-only button whose accessible name is a hidden "Close" label), to voice
 * context that sighted users read from layout alone (a table caption, a "results updated" status), or to
 * front a "Skip to main content" link that surfaces only on focus. Do NOT hide content people need to
 * SEE — that is a `display: none` / conditional-render job, not this.
 *
 * Every prop flows straight through to Radix. `children` is the content held in the a11y tree but out of
 * view. `asChild` merges the visually-hidden treatment onto its single child instead of rendering a
 * wrapping `<span>` — use it to hide a semantic element (a heading, a label) without adding a node. All
 * remaining span attributes (`id`, `aria-*`, event handlers, …) pass through untouched. It declares no
 * roles of its own. */
export { VisuallyHidden, type VisuallyHiddenProps } from "@radix-ui/themes";
