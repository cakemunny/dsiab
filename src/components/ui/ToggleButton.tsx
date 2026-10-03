import { type CSSProperties, type ReactNode, useState } from "react";
import { Toggle } from "@radix-ui/react-toggle";
import { Button, type ButtonProps } from "./Button";

/* ToggleButton — a binary on/off control (bold, mute, pin). Composes the @radix-ui/react-toggle
 * primitive `asChild` over our Button at `priority="tertiary"` (ghost), so it reuses the ENTIRE Button
 * chrome — size (uiSize control lane), focus ring, disabled — rather than re-skinning any of it. Toggle
 * merges `data-state="on"|"off"` + `aria-pressed` + `data-disabled` onto the Button root; the pressed
 * paint (accent-aware `--ds-fill-selected-subtle`, a 1px inset `--ds-stroke-accent-weak` edge and `--ds-text-strong` ink, plus weight 600 as the [[select-selected-row]] non-colour cue) lives in
 * components.css keyed on `[data-state="on"]`.
 *
 * Controlled AND uncontrolled (D1 — a deliberate capability ADD over Astryx, which is controlled-only):
 * `pressed`/`onPressedChange` (controlled) or `defaultPressed` (uncontrolled). ToggleButton is the single
 * source of truth for which content renders (the `pressedIcon` swap), driving Toggle as a controlled
 * primitive; Toggle still owns the DOM `data-state`.
 *
 * Doc-lie caution: Astryx's docs claim an icon-only ToggleButton gets an automatic tooltip from `label`.
 * That is FALSE in their source — there is no auto-tooltip. We apply the IconButton `aria-label`
 * requirement instead: an icon-only toggle MUST pass `label` (→ aria-label) for an accessible name.
 *
 * NOT ported (named deferrals): Astryx's event-arg `preventDefault` opt-out, and the async
 * `pressedChangeAction` + `useOptimistic` optimistic pattern. */

type Reserved = "priority" | "children" | "aria-label" | "asChild";

export interface ToggleButtonProps extends Omit<ButtonProps, Reserved> {
  /** Controlled pressed state. Pair with `onPressedChange`. */
  pressed?: boolean;
  /** Initial pressed state when uncontrolled (D1). */
  defaultPressed?: boolean;
  /** Fires when the pressed state changes — in both controlled and uncontrolled use. */
  onPressedChange?: (pressed: boolean) => void;
  /** Optional icon shown while pressed — swaps the rest content. Omit it and the same content renders in both states. */
  pressedIcon?: ReactNode;
  /** Accessible name → `aria-label`. REQUIRED for an icon-only toggle (there is no auto-tooltip). */
  label?: string;
  /** The rest content — a label, an icon, or both. */
  children?: ReactNode;
  /** Refused, and measured before it was refused. Two things make the seam impossible here rather than
   *  merely awkward. The root is a `<button>` that the `@radix-ui/react-toggle` primitive drives through
   *  `aria-pressed` and `data-state`, and `children` is the label, which this component renders TWICE on
   *  purpose: once hidden and always bold to reserve the pressed width, once visible. A slot target would
   *  therefore have to be a NEW prop, which is [[aschild-or-type-error]]'s own test for a component that cannot take the seam.
   *  Server-rendered at 51bfa0b, `<ToggleButton asChild>` emitted no `<button>` at all: the inner layout
   *  `<span>` stood where the control had been, wearing `type="button"`, `aria-pressed`, `data-state` and
   *  the full `rt-reset rt-BaseButton rt-variant-ghost rt-Button` class list, and the consumer's element
   *  appeared twice, two levels inside, one of them inside the `aria-hidden` reservation cell. A span
   *  with `aria-pressed` is a toggle no keyboard can reach and no screen reader can operate. Same idiom
   *  as [[badge-scope]]'s Badge and Token, opposite reason: those refuse so a display marker cannot become a control,
   *  this refuses so a control cannot stop being one. Declared rather than merely reserved above so the
   *  refusal is a type error a reader can see, and destructured away below so a spread from untyped
   *  JavaScript is IGNORED. */
  asChild?: never;
}

// The label reserves its BOLD (600) width at all times: a hidden, aria-hidden, always-600 duplicate is
// stacked in the SAME grid cell as the visible label (whose weight follows [data-state] via the CSS). The
// cell sizes to the widest child — always the bold duplicate — so flipping the visible weight 500↔600 on
// press never changes offsetWidth. (Astryx's width-reservation technique; the _internal play measures it.)
const LABEL_CELL: CSSProperties = {
  gridArea: "1 / 1",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "var(--space-1)",
};

export function ToggleButton({
  pressed,
  defaultPressed,
  onPressedChange,
  pressedIcon,
  label,
  disabled,
  size,
  children,
  asChild: _refusedAsChild,
  ...rest
}: ToggleButtonProps) {
  const isControlled = pressed !== undefined;
  const [internal, setInternal] = useState(defaultPressed ?? false);
  const current = isControlled ? pressed : internal;

  const handleChange = (next: boolean) => {
    if (!isControlled) setInternal(next);
    onPressedChange?.(next);
  };

  const content = current && pressedIcon !== undefined ? pressedIcon : children;

  return (
    <Toggle asChild pressed={current} onPressedChange={handleChange} disabled={disabled}>
      <Button priority="tertiary" size={size} aria-label={label} data-icon-only={label ? "" : undefined} {...rest}>
        <span style={{ display: "inline-grid", placeItems: "center", verticalAlign: "middle" }}>
          <span aria-hidden data-ds-toggle-reserve style={{ ...LABEL_CELL, visibility: "hidden", fontWeight: 600 }}>
            {content}
          </span>
          <span data-ds-toggle-label style={LABEL_CELL}>{content}</span>
        </span>
      </Button>
    </Toggle>
  );
}
