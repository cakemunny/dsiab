/* Grid — the uniform System import surface for Radix Themes' CSS-grid layout primitive: a container
 * that arranges its children on a two-dimensional grid. A DOCUMENTED RE-EXPORT, not a forwardRef wrap —
 * Grid is pure layout, so there is nothing to override. It carries NO `--ds-*` roles and rides NO size
 * lane: it never paints (no fill, stroke, or text colour of its own) and never sizes a control — it only
 * positions. A bare re-export is therefore the honest wrap; a forwardRef shell would imply an override
 * that does not exist.
 *
 * Every prop flows straight through to Radix. `columns` / `rows` set the template tracks (a numeric
 * string like "3" makes that many even tracks; a CSS string like "100px 1fr" is used verbatim). `gap` —
 * and the per-axis `gapX` / `gapY` — snap to the Radix `--space` scale ("0"–"9"), so grid gutters stay on
 * the same spacing rhythm as Flex, Box, and the rest of the system. `flow`, `align`, `justify`, `areas`,
 * and `display` map to the matching CSS grid properties; `asChild` merges the grid styles onto its single
 * child; `as` renders a div (default) or a span. Every one is RESPONSIVE — pass a `{ initial, sm, md, … }`
 * breakpoint object to change the layout per breakpoint. It declares no roles of its own. */
export { Grid, type GridProps } from "@radix-ui/themes";
