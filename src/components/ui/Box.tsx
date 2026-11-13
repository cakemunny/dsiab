/* Box — the System import surface for Radix Themes' block-level container: one element that takes the
 * shared spacing scale for its padding and margin, and the layout props (`display`, `width`, `height`,
 * `position`, `inset`, `flexGrow` …) every Radix layout primitive shares. A DOCUMENTED RE-EXPORT, not a
 * forwardRef wrap ([[surface-wraps]], [[system-layout-layers]]) — Box is pure layout, so there is nothing
 * to override. It carries NO `--ds-*` roles and rides NO size lane: it never paints (no fill, stroke, or
 * text colour of its own) and never sizes a control. Paint belongs to the parts placed in it, which read
 * the system's roles.
 *
 * Every prop flows straight through to Radix. `p`, `px`, `py`, `pt` … and `m`, `mx` … snap to the
 * Radix `--space` scale ("0"–"9"), so a Box's padding stays on the same rhythm as the components inside
 * it. `asChild` merges the props onto its single child; `as` renders a div (default) or a span. Every
 * layout prop is RESPONSIVE — pass a `{ initial, sm, md, … }` breakpoint object to change it per
 * breakpoint. Reach for Flex or Grid when the container arranges its children. */
export { Box, type BoxProps } from "@radix-ui/themes";
