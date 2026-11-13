/* Flex — the System import surface for Radix Themes' one-axis layout primitive: a container that places
 * its children in a row or a column with a gap between them. A DOCUMENTED RE-EXPORT, not a forwardRef
 * wrap ([[surface-wraps]], [[system-layout-layers]]) — Flex is pure layout, so there is nothing to
 * override. It carries NO `--ds-*` roles and rides NO size lane: it never paints and never sizes a
 * control, it only positions.
 *
 * Every prop flows straight through to Radix. `direction` picks the axis (`row` by default), `gap` — and
 * the per-axis `gapX` / `gapY` — snap to the Radix `--space` scale ("0"–"9"), so a row's gutters stay
 * on the same rhythm as Grid, Box and the components placed in it. `align`, `justify` and `wrap` map to
 * the matching flexbox properties, and the Box layout props (`p`, `m`, `width`, `flexGrow` …) apply
 * too. `asChild` merges the flex styles onto its single child; `as` renders a div (default) or a span.
 * Every prop is RESPONSIVE — pass a `{ initial, sm, md, … }` breakpoint object. Reach for Grid when the
 * children must line up in two dimensions at once, and for ButtonGroup when the row is a cluster of
 * actions, which owns its own gap and anchor. */
export { Flex, type FlexProps } from "@radix-ui/themes";
