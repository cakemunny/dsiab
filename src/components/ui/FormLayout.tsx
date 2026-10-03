// Copyright (c) Meta Platforms, Inc. and affiliates.
// Portions derived from facebook/astryx packages/core/src/FormLayout/FormLayout.tsx @ d7c9a39b (MIT, © Meta Platforms)
// Portions derived from facebook/astryx packages/core/src/FormLayout/FormLayoutContext.ts @ d7c9a39b (MIT, © Meta Platforms)
//
// The direction-context idea only. LIFTED under the port doctrine
// (DECISIONS [[catalog-as-specification]]), per plan decision D9 / H6:
//   • Upstream's FormLayout publishes a context carrying ONLY `{ direction }`, and upstream's Field is
//     the sole consumer. Ours keeps that seam exactly: FormLayout provides the direction; OUR `Field`
//     ([[field-shell]]) grows a `horizontal-labels` layout mode that reads it. Every Field-riding input
//     (TextField / Select / TextArea / …) inherits the mode for free — no per-input plumbing.
//   • It renders a `<div>`, NOT a `<form>` (composition — the CONSUMER owns the form element, so a
//     FormLayout can nest inside any <form>, route, or dialog without owning submission). Upstream's
//     docs describe "flex wrapping"; that is fiction — it is a non-wrapping grid/stack (D9).

import {
  createContext,
  useContext,
  useMemo,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { Grid } from "@radix-ui/themes";

/** The two label layouts a Field can adopt. `vertical` = label above the control (the default, and the
 *  historical Field shape); `horizontal` = label in a left column beside the control (a dense settings
 *  form), collapsing back to a stack on a narrow viewport. */
export type FormLayoutDirection = "vertical" | "horizontal";

interface FormLayoutContextValue {
  direction: FormLayoutDirection;
}
const FormLayoutContext = createContext<FormLayoutContextValue | null>(null);

/** Read the ambient FormLayout direction, or `null` when the caller is not inside a FormLayout. This is
 *  the seam `Field.Root` reads to resolve its label layout when it has no explicit `direction` prop —
 *  the resolution order is: explicit prop → this context → `"vertical"`. Kept as a hook (not a raw
 *  context export) so the null-when-unwrapped default is centralised. */
export function useFormLayoutDirection(): FormLayoutDirection | null {
  return useContext(FormLayoutContext)?.direction ?? null;
}

export interface FormLayoutProps extends Omit<ComponentPropsWithoutRef<typeof Grid>, "direction"> {
  /** Label layout published to every descendant Field. `"vertical"` (default) stacks label over
   *  control; `"horizontal"` lays the label in a left column beside the control (collapsing to a stack
   *  ≤480px, via CSS). An individual `Field` can still override with its own `direction` prop. */
  direction?: FormLayoutDirection;
  /** Space between stacked fields — a Radix space step (default `"4"` = 16px). Passes through to the
   *  grid's row gap. */
  gap?: ComponentPropsWithoutRef<typeof Grid>["gap"];
  children: ReactNode;
}

/**
 * FormLayout — a spacing + direction wrapper for a set of Fields.
 *
 * Its ONLY jobs: (1) publish the `direction` context so descendant Fields lay their labels out
 * consistently, and (2) give the fields consistent vertical rhythm as a **non-wrapping grid** (one
 * implicit column → each field on its own row; NOT a wrapping flex row — D9). It deliberately renders a
 * plain `<div>` (via Radix `Grid`), never a `<form>`: the consumer owns the form element, so FormLayout
 * composes inside any form / route / dialog. All of Radix `Grid`'s props (className, style, data-*,
 * columns, …) forward honestly (D12 — nothing accepted-and-discarded).
 */
export function FormLayout({ direction = "vertical", gap = "4", children, ...rest }: FormLayoutProps) {
  const ctx = useMemo<FormLayoutContextValue>(() => ({ direction }), [direction]);
  // The direction rides `data-ds-form-layout` (its VALUE), NOT a `data-direction` attribute: the
  // horizontal-labels CSS keys off `[data-direction="horizontal"]` on the FIELD roots, and the
  // FormLayout container must NOT match that (it stays a plain single-column field stack, not a
  // two-track label grid). Keeping the two attributes distinct avoids the container being restyled as
  // a field, and keeps `[data-direction]` queries resolving to Field.Roots only.
  return (
    <FormLayoutContext.Provider value={ctx}>
      <Grid data-ds-form-layout={direction} gap={gap} {...rest}>
        {children}
      </Grid>
    </FormLayoutContext.Provider>
  );
}
