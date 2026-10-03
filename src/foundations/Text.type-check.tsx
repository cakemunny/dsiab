/* =============================================================================
   Text.type-check.tsx — COMPILE-TIME ASSERTIONS FOR THE Text PROP SURFACE
   -----------------------------------------------------------------------------
   There is no runtime here and no test runner: `tsc --noEmit` passing IS the
   green. Each `@ts-expect-error` is a real assertion that INVERTS — if the error
   it guards ever stops occurring, the build fails. That is what stops a future
   "simplification" of TextProps from silently widening the type back open.

   Radix types Text as a union over `as` (span | div | label | p). `Omit` does not
   distribute over a union — it keeps only the keys every arm shares — so applying
   it directly dropped the per-element attributes and `htmlFor` disappeared. [[text-element-attributes]]
   rules the fix.

   EXCLUDED FROM THE PUBLISHED BUILD via tsconfig.build.json. `*.type-check.tsx`
   is a net-new suffix, so without that entry this file would be emitted into
   dist/. It is deliberately NOT named `*.test.tsx`: vitest sets no explicit
   `test.include`, so its default glob would collect this file into both browser
   projects and fail with "no test suite found" — it contains types, not tests.
   ============================================================================= */
import { Text } from "../components/ui/Text";

/* ---- MUST COMPILE — the per-`as` element attributes have to survive the wrap ---- */

/** The case the defect broke, and the one the Switch page's labelled row needs. */
export const labelWithHtmlFor = () => <Text as="label" htmlFor="field-id">Label</Text>;

/** The system's own size opt-out still resolves. */
export const sizeInherit = () => <Text size="inherit">opts out of the global size</Text>;

/** A Radix size step alongside a non-default element. */
export const sizedParagraph = () => <Text size="3" as="p">paragraph</Text>;

/** The bare default (the `span` arm, where `as` is optional). */
export const plain = () => <Text>plain</Text>;

/** A different arm, carrying an attribute every arm shares. */
export const divWithId = () => <Text as="div" id="d">div</Text>;

/* ---- MUST NOT COMPILE — the fix must not widen the type into accepting anything ---- */

// @ts-expect-error -- htmlFor belongs to the label arm only, never to a span
export const spanRejectsHtmlFor = () => <Text as="span" htmlFor="x">no</Text>;

// @ts-expect-error -- an unknown prop stays unknown on every arm
export const bogusPropRejected = () => <Text as="label" bogusProp="x">no</Text>;
