/* AspectRatio — the uniform System import surface for Radix Themes' AspectRatio: it locks a child to a
 * fixed width:height `ratio` (default 1, e.g. `ratio={16/9}`) so the box RESERVES its footprint up front
 * and never reflows as the asset arrives — the layout-shift guard for media, embeds, and map / video /
 * iframe placeholders. Layout only: it paints nothing, declares no `--ds-*` roles, and adds no CSS of its
 * own (no skin to reuse, unlike Separator; there is simply nothing to colour).
 *
 * The child is stretched to the reserved box's four edges (Radix absolutely-positions it), so a replaced
 * element (`img` / `video` / `iframe`) needs `object-fit: cover` to crop rather than distort; a plain box
 * child fills via `width/height: 100%`. `ratio` (a number) is the only knob.
 *
 * IT RENDERS TWO DIVS, NOT ONE, AND THE SEAM HANDS OVER THE SECOND. Measured by server render at
 * 51bfa0b rather than read: the outer div carries `data-radix-aspect-ratio-wrapper` and the
 * `position: relative; width: 100%; padding-bottom: N%` that IS the ratio lock, and the inner one is
 * the absolutely-inset content box. Everything you set (`style`, `className`, `id`, `data-*`, `aria-*`)
 * lands on the INNER box, and so does `asChild`. Passing `asChild` with an `<img>` produced
 * `<img class="mine consumer" style="border-radius:…;position:absolute;top:0;right:0;bottom:0;left:0">`
 * directly under the wrapper: the component's `className` concatenated ahead of the consumer's, the
 * component's `style` merged with the inset, `data-*` forwarded, and the content div gone. So the seam
 * is real here and it is not the usual one. It hands over the element that HOLDS the content, never the
 * wrapper, because the wrapper is the ratio and an element that replaced it would have no stretcher
 * under it and would reserve nothing. The need it answers is one sentence: a consumer who wants their
 * own `img`, `video` or `iframe` to BE the stretched element instead of sitting inside one more div.
 * Nothing is dropped and nothing is silently lost, which is why this name needs no repair under [[aschild-or-type-error]].
 *
 * Re-surfaced verbatim from Radix Themes — no forwardRef wrapper, no prop narrowing — because there is no
 * paint, size lane, or a11y contract to wire: the value is the consistent System/* import surface plus the
 * documented ratio / reflow / object-fit contract in the story, not any behavioural change. */
export { AspectRatio, type AspectRatioProps } from "@radix-ui/themes";
