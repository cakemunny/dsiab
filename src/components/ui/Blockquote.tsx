/* Blockquote — the uniform System import surface for Radix Themes' quotation block: it renders a
 * `<blockquote>` set as a typographic pull-quote — an accent left rule beside indented prose — for a
 * genuine quotation or citation carried in the reading flow. The QUOTE reuses Radix's OWN skin
 * (a left border painted from the accent scale, `--accent-a6`, plus the default prose text) and declares
 * no `--ds-*` role of its own; the accent rule already resolves to the system's
 * `--ds-stroke-accent-weak` role (which also aliases `--accent-a6`), so a bare quote matches with no
 * override — the same tokenless skin-reuse as Separator. The only paint the wrap owns belongs to the
 * attribution caption below (`--ds-text-weak`, the supporting-text role).
 *
 * THE ONE PROP THAT IS OURS — `attribution`, and the contract it costs.
 * Without it this is a bare pass-through: the rendered DOM is exactly Radix's single `<blockquote>`,
 * byte for byte. Pass it and the wrap emits a `<figure>` holding the quote plus a `<figcaption>` — the
 * markup a quotation and its source are supposed to share, and the reason it can't be left to the
 * caller: the quote's text column is inset by the rule + padding Radix derives from the quote's own
 * `em`, so a byline written as a sibling `<p>` lands at the RULE's edge, hanging left of the passage it
 * belongs to. The figcaption pays that inset back (tokens/components.css, "Blockquote attribution"),
 * tracking the quote's `size` step, so the byline aligns with the first word of the quote.
 *
 * The slot stays deliberately ignorant: Blockquote never learns what an identity IS. A person is an
 * Avatar plus a name composed INTO the slot; a document is a Link; a bare string is a byline. The
 * figcaption supplies only the indent, the gap, and a quiet default text tier — everything else is the
 * caller's composition. `cite` (the standard `<blockquote cite>` URL) passes through as ever.
 *
 * `size` (1–9) passes through UNTOUCHED: a quotation is prose sized by the passage that hosts it, not a
 * control on the global UI size lane — so it is left to Radix like Section, never resolved through
 * `useResolvedSize`. `weight`, `color`, `truncate` and `wrap` (and the usual `style` / `className` /
 * `id` / `data-*` / `aria-*`) likewise pass straight through to the rendered `<blockquote>`. */
import { forwardRef, type ReactNode } from "react";
import { Blockquote as RadixBlockquote, type BlockquoteProps as RadixBlockquoteProps } from "@radix-ui/themes";
import { accentColorProps, type AccentColor } from "../../theme/Provider";

export interface BlockquoteProps extends Omit<RadixBlockquoteProps, "color"> {
  /** Radix's 26 colours or the oxblood preset ([[part-colour-parity]]). */
  color?: AccentColor;
  /**
   * The quotation's source, rendered as a `<figcaption>` under the quote and indented to line up with
   * the quoted text. Present → the component emits `<figure><blockquote/><figcaption/></figure>`;
   * absent → a bare `<blockquote>`, unchanged.
   *
   * Compose the identity here — an `Avatar` beside a name for a person, a `Link` for a document, a
   * plain string for a byline. Blockquote styles the slot (indent, gap, a quiet default text tier) and
   * nothing else.
   */
  attribution?: ReactNode;
}

/**
 * A typographic quotation block.
 *
 * @example
 * ```tsx
 * <Blockquote size="4">A design system earns its keep the day nobody notices it.</Blockquote>
 *
 * <Blockquote size="4" attribution="— Priya Nadeem, Head of Design, Northwind">
 *   A design system earns its keep the day nobody notices it.
 * </Blockquote>
 * ```
 */
export const Blockquote = forwardRef<HTMLQuoteElement, BlockquoteProps>(function Blockquote(
  { attribution, color, ...props },
  ref,
) {
  const quote = <RadixBlockquote ref={ref} {...accentColorProps(color)} {...props} />;
  // No source → the bare Radix quote, untouched. `false` / `null` are treated as absent so a
  // conditional (`attribution={author && <Byline/>}`) doesn't emit an empty figcaption.
  if (attribution === undefined || attribution === null || attribution === false) return quote;
  return (
    <figure className="rt-ds-blockquote-figure">
      {quote}
      {/* The padding lives on the figcaption (which inherits the quote's font-size, so its em-derived
          inset matches); the text tier lives on the inner span, which sets its own size back. */}
      <figcaption className="rt-ds-blockquote-attribution">
        <span className="rt-ds-blockquote-attribution-text">{attribution}</span>
      </figcaption>
    </figure>
  );
});
