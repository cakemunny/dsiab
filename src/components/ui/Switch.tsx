import { forwardRef, type ComponentPropsWithoutRef, type ElementRef, type ReactNode } from "react";
import { Flex, Switch as RadixSwitch } from "@radix-ui/themes";
import { useResolvedSize } from "../../theme/SizeContext";
import { accentColorProps, type AccentColor } from "../../theme/Provider";
import { Field, useFieldControl } from "./Field";

/* Switch — an on/off toggle for a single setting that takes effect immediately. A THIN wrap over
 * Radix Themes' Switch: it rides the uiSize control lane (an unset `size` follows the global tier,
 * small → 1) and passes everything else straight through. Radix draws the track and thumb itself, and
 * its checked track paints from `--accent-track`, the shade every part without text paints ([[textless-part-fills]]), so the
 * ON state is already accent-aware and follows the brand collision shift. It therefore declares no
 * `--ds-*` roles of its own (it reuses the Radix skin, the Separator precedent).
 *
 * The thumb stays white on every colour. Where a light track leaves the white thumb under 3:1, the
 * checked thumb's 1px ring, Radix's `--accent-a4`, paints `--accent-thumb-stroke` instead: the lightest
 * deeper step of the same colour that clears 3:1 (theme.css keys it, components.css paints it).
 *
 * Focus is the system's own: on `:focus-visible` the track takes the keyboard-focus ring
 * ([[focus-ring]]), inherited from the system focus rule, not a per-component halo.
 *
 * `size` (1–3), `variant` (surface | classic), `color`, `highContrast`, `radius`, and the `checked` /
 * `defaultChecked` / `onCheckedChange` / `disabled` state props all pass through to Radix. `soft` is not
 * offered: its pale track read 1.24:1 against the light page on yellow, and a switch given it is a type
 * error ([[colour-prop-and-high-contrast]], [[published-aschild-props]]). A switch given `color` or `highContrast` takes the same stroke and edge as the
 * default switch ([[colour-prop-and-high-contrast]]).
 *
 * `label` promotes the bare switch into a single Field, the Checkbox mechanism ([[switch-field-label]]): the
 * label LEADS and the switch sits on the row's trailing edge, with `description` or the `validation`
 * message stacked under the label in the leading column. The control is a child component so that
 * `useFieldControl()` reads the Field.Root it renders inside. Without `label` the render is the bare
 * Radix switch, unchanged. */

export type SwitchProps = Omit<ComponentPropsWithoutRef<typeof RadixSwitch>, "variant" | "color"> & {
  /** The track's visual style. `soft` is not offered ([[colour-prop-and-high-contrast]]). @default "surface" */
  variant?: "surface" | "classic";
  /** Radix's 26 colours or the oxblood preset ([[part-colour-parity]]). */
  color?: AccentColor;
  /** The visible name of the setting. Given, the switch renders as a single field: the label leads,
   *  the switch sits on the row's trailing edge, and the label is the switch's accessible name.
   *  Omitted, the switch renders bare, and it needs a name from `aria-label` or a label you place
   *  beside it with `htmlFor`. */
  label?: ReactNode;
  /** A persistent helper line under the label, calm guidance that holds in any validation state.
   *  A `validation` message replaces it while one is set. Renders only when `label` is set. */
  description?: ReactNode;
  /** A status line under the label, with a glyph in the tone's colour. `tone: "error"` also marks the
   *  switch `aria-invalid` and announces the message. Renders only when `label` is set. */
  validation?: { tone: "error" | "warning" | "success" | "info"; message: ReactNode };
};

type SwitchElement = ElementRef<typeof RadixSwitch>;
type ControlProps = Omit<SwitchProps, "label" | "description" | "validation">;

// The control inside the Field — pulls id / aria-describedby / aria-invalid from the Field context.
const FieldSwitch = forwardRef<SwitchElement, ControlProps>(function FieldSwitch({ size, color, style, ...rest }, ref) {
  const resolvedSize = useResolvedSize("control", size) as SwitchProps["size"];
  const aria = useFieldControl();
  return (
    <RadixSwitch ref={ref} size={resolvedSize} {...aria} {...accentColorProps(color)} {...rest}
                 style={{ flexShrink: 0, ...style }} />
  );
});

export const Switch = forwardRef<SwitchElement, SwitchProps>(function Switch(
  { label, description, validation, size, color, ...props },
  ref,
) {
  const resolvedSize = useResolvedSize("control", size) as SwitchProps["size"];
  // Bare control — current behaviour, unchanged.
  if (label == null) {
    return <RadixSwitch ref={ref} size={resolvedSize} {...accentColorProps(color)} {...props} />;
  }
  // Field-wrapped: label column leading, switch trailing. The column holds the description or the
  // message, so each stays aligned to the label's leading edge and never runs under the switch.
  return (
    <Field.Root validation={validation} description={description} size={resolvedSize}>
      <Flex align="center" justify="between" gap="4">
        <Flex direction="column" gap="1" style={{ minWidth: 0 }}>
          <Field.Label>{label}</Field.Label>
          {description != null && <Field.Description>{description}</Field.Description>}
          <Field.Message />
        </Flex>
        <FieldSwitch ref={ref} size={size} color={color} {...props} />
      </Flex>
    </Field.Root>
  );
});
