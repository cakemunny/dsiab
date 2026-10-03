/* Section — a vertical-rhythm block: a page region carrying even, generous top-and-bottom padding so
 * stacked regions breathe consistently down a long page. The uniform System import surface for Radix
 * Themes' Section, shipped as a documented re-export — there is nothing to override, so it stays a bare
 * pass-through rather than a forwardRef shell.
 *
 * Its `size` (1–4) is a VERTICAL-PADDING scale — the block's top/bottom breathing room (24 / 40 / 64 /
 * 80px) — NOT a type/size lane. It is therefore passed through UNTOUCHED: a Section deliberately does not
 * ride `useResolvedSize`, because its rhythm must stay independent of the ambient type size (a control or
 * a container reads the size lane; a rhythm block does not). `size` defaults to `"3"` (64px) and accepts
 * a responsive object.
 *
 * `display` ("none" | "initial", responsive) toggles the region in or out of layout — the idiomatic way
 * to drop a section on small screens. `asChild` merges the rhythm onto a single child so a semantic
 * `<section>` element can carry it. Margin and layout props flow straight through to Radix.
 *
 * It paints NOTHING and declares no `--ds-*` roles of its own — background, text and border come from
 * whatever it wraps. The Radix name wins (a wrapped Radix Themes component), so this is `Section`, not a
 * renamed rhythm primitive. */
export { Section, type SectionProps } from "@radix-ui/themes";
