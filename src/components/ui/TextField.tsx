import { useEffect, type ComponentProps, type ReactNode } from "react";
import { TextField as RadixTextField } from "@radix-ui/themes";
import { useResolvedSize } from "../../theme/SizeContext";
import { accentColorProps, useAccentColorRef, type AccentColor } from "../../theme/Provider";
import { Field, useFieldControl } from "./Field";

// Dev-only accessibility warnings, resolved once at module load. A `try` rather than
// `typeof process !== "undefined" && …`: a bundler replaces the LITERAL `process.env.NODE_ENV`
// without defining a `process` global, so the typeof form reads "undefined" and silences the
// warning in exactly the dev build it exists for (measured here: typeof process = "undefined",
// literal replaced with "test"). The catch fires only when NOTHING replaced the literal and no
// `process` exists — the browser bundle that used to throw a ReferenceError — and stays silent.
const DEV_WARN = (() => {
  try {
    return process.env.NODE_ENV !== "production";
  } catch {
    return false;
  }
})();

type RadixRootProps = ComponentProps<typeof RadixTextField.Root>;
type Validation = { tone: "error" | "warning" | "success" | "info"; message: ReactNode };

// `variant` is locked to "surface" — `soft` and `classic` are intentionally not exposed.
export interface TextFieldProps extends Omit<RadixRootProps, "variant" | "color"> {
  /** Radix's 26 colours or the oxblood preset ([[part-colour-parity]]). */
  color?: AccentColor;
  label?: ReactNode;
  info?: ReactNode;
  endSlot?: ReactNode;
  /** Persistent helper line under the input — calm guidance that holds in any validation state. */
  description?: ReactNode;
  validation?: Validation;
}

/* Radix writes data-accent-color on the field's root div, and the rest of the props and the ref reach the
 * input inside it. So oxblood reaches that root from the ref ([[part-colour-parity]]). */
const textFieldRoot = (node: HTMLInputElement) => node.closest(".rt-TextFieldRoot");

function Input({ size, children, color, ref, ...rest }: Omit<TextFieldProps, "label" | "info" | "endSlot" | "description" | "validation">) {
  const resolvedSize = useResolvedSize("control", size);
  const aria = useFieldControl();
  const own = useAccentColorRef<HTMLInputElement>(color, ref, textFieldRoot);
  return (
    <RadixTextField.Root ref={own} variant="surface" size={resolvedSize} color={accentColorProps(color).color} {...aria} {...rest}>
      {children}
    </RadixTextField.Root>
  );
}

type SlotProps = Omit<ComponentProps<typeof RadixTextField.Slot>, "color"> & {
  /** Radix's 26 colours or the oxblood preset ([[part-colour-parity]]). */
  color?: AccentColor;
};

function TextFieldSlot({ color, ...props }: SlotProps) {
  return <RadixTextField.Slot {...accentColorProps(color)} {...props} />;
}

function TextFieldComponent({ label, info, endSlot, description, validation, size, children, ...rest }: TextFieldProps) {
  // Resolve the field size once so the Field shell can scale the helper/message text with it
  // (a large field gets a 14px helper, not a fixed 12px) and the Input renders at the same size.
  const resolvedSize = useResolvedSize("control", size);
  // Nameless input = WCAG 4.1.2 failure. Warn loudly in dev when a field renders with NEITHER a
  // `label` prop NOR an aria-label / aria-labelledby. Guarded by `process.env.NODE_ENV` so it's
  // stripped from production; keyed on the relevant props so it fires once per relevant change, not
  // on every render.
  const ariaLabel = (rest as Record<string, unknown>)["aria-label"];
  const ariaLabelledby = (rest as Record<string, unknown>)["aria-labelledby"];
  useEffect(() => {
    if (DEV_WARN && label == null && ariaLabel == null && ariaLabelledby == null) {
      console.warn(
        "TextField: a field with no `label` needs `aria-label` or `aria-labelledby` for an accessible name (WCAG 4.1.2).",
      );
    }
  }, [label, ariaLabel, ariaLabelledby]);

  return (
    <Field.Root validation={validation} description={description} size={resolvedSize}>
      {label != null && <Field.Label info={info} endSlot={endSlot}>{label}</Field.Label>}
      <Input size={resolvedSize} {...rest}>{children}</Input>
      {description != null && <Field.Description>{description}</Field.Description>}
      <Field.Message />
    </Field.Root>
  );
}

export const TextField = Object.assign(TextFieldComponent, {
  // `TextField` IS the root; `Root` is the SAME component under its Radix name so a copied Radix
  // Themes snippet (`<TextField.Root><TextField.Slot/></TextField.Root>`) resolves instead of
  // throwing "Element type is invalid". Same alias shape as `Tabs.Nav.Root` (Tabs.tsx).
  Root: TextFieldComponent,
  Slot: TextFieldSlot,
});
