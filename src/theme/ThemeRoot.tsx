/* ThemeRoot — the system's own route to Radix's `Theme`, for its components and its pages
 * ([[system-layout-layers]]).
 *
 * `Theme` is deliberately unpublished: a consumer's app has one theme root, `Provider`, which also
 * writes the brand, the typefaces and the size and order contexts (`src/index.ts` gives the reason).
 * Inside the system, though, a portalled panel has to re-establish a theme root for its content,
 * because Radix's token scales do not resolve outside `.radix-themes`, and a test clones a theme root
 * to measure a colour. Those sites import `Theme` and `useThemeContext` from here, never from
 * `@radix-ui/themes`, so the raw-import guard can hold every other file to the system's own layer.
 *
 * Not published. The barrel guard lists the module as internal. */
export { Theme, useThemeContext } from "@radix-ui/themes";
