import { type ComponentProps, type ReactNode } from "react";
import { Checkbox as RadixCheckbox, Flex } from "@radix-ui/themes";
import { useResolvedSize } from "../../theme/SizeContext";
import { accentColorProps, type AccentColor } from "../../theme/Provider";
import { Field, useFieldControl } from "./Field";

type RootProps = ComponentProps<typeof RadixCheckbox>;
type Validation = { tone: "error" | "warning" | "success" | "info"; message: ReactNode };

/**
 * Checkbox locked to `variant="surface"`. `soft`, `classic` are not exposed.
 *
 * Bare by default — keep it bare inside a `CheckboxGroup.Item`, a table cell, or anywhere it already
 * has a name. Pass `label` to render it as a single Field (label beside the box, optional persistent
 * `description`, and accent-aware `validation` beneath) — the same shell and props as `TextField`, for
 * the canonical consent / opt-in / "I agree" checkbox that can be required and can error.
 */
export interface CheckboxProps extends Omit<RootProps, "variant" | "color"> {
  /** Radix's 26 colours or the oxblood preset ([[part-colour-parity]]). A checkbox given one paints what the same
   *  checkbox paints on a page of that colour. */
  color?: AccentColor;
  label?: ReactNode;
  /** Persistent helper line under the label — calm guidance that holds in any validation state. */
  description?: ReactNode;
  validation?: Validation;
}

// The control inside the Field — pulls id / aria-describedby / aria-invalid from the Field context.
function FieldCheckbox({ size, color, ...rest }: Omit<CheckboxProps, "label" | "description" | "validation">) {
  const resolvedSize = useResolvedSize("control", size);
  const aria = useFieldControl();
  return <RadixCheckbox variant="surface" size={resolvedSize} {...aria} {...accentColorProps(color)} {...rest} />;
}

export function Checkbox({ label, description, validation, size, color, ...rest }: CheckboxProps) {
  const resolvedSize = useResolvedSize("control", size);
  // Bare control — current behaviour, unchanged.
  if (label == null) {
    return <RadixCheckbox variant="surface" size={resolvedSize} {...accentColorProps(color)} {...rest} />;
  }
  // Field-wrapped: checkbox + label on one row; the description + message sit BELOW at full width so
  // the status glyph aligns to the checkbox's left edge (not indented under the label).
  return (
    <Field.Root validation={validation} description={description} size={resolvedSize}>
      <Flex gap="2" align="center">
        <FieldCheckbox size={size} color={color} {...rest} />
        <Field.Label>{label}</Field.Label>
      </Flex>
      {description != null && <Field.Description>{description}</Field.Description>}
      <Field.Message />
    </Field.Root>
  );
}
