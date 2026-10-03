import { forwardRef, useEffect, useState, type ComponentProps, type ComponentRef, type ReactNode } from "react";
import { Box, Flex, TextArea as RadixTextArea, Text } from "@radix-ui/themes";
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

type RadixRootProps = ComponentProps<typeof RadixTextArea>;
type Validation = { tone: "error" | "warning" | "success" | "info"; message: ReactNode };

// `variant` is locked to "surface" — `soft` and `classic` are intentionally not exposed.
export interface TextAreaProps extends Omit<RadixRootProps, "variant" | "color"> {
  /** Radix's 26 colours or the oxblood preset ([[part-colour-parity]]). */
  color?: AccentColor;
  label?: ReactNode;
  info?: ReactNode;
  endSlot?: ReactNode;
  /** Persistent helper line under the field — calm guidance that holds in any validation state. */
  description?: ReactNode;
  validation?: Validation;
  /** Show a live character counter (current / maxLength) at the bottom-right of the support row. Requires `maxLength`. */
  showCount?: boolean;
}

type TextAreaControlProps = Omit<TextAreaProps, "label" | "info" | "endSlot" | "description" | "validation" | "showCount">;

/* Radix writes data-accent-color on the field's root div, and the rest of the props and the ref reach the
 * textarea inside it. So oxblood reaches that root from the ref, one element up ([[part-colour-parity]]). */
const textAreaRoot = (node: HTMLTextAreaElement) => node.closest(".rt-TextAreaRoot");

// The control inside the Field — pulls id / aria-describedby / aria-invalid from the Field context.
const TextAreaControl = forwardRef<ComponentRef<typeof RadixTextArea>, TextAreaControlProps>(
  function TextAreaControl({ size, color, ...rest }, ref) {
    const resolvedSize = useResolvedSize("control", size);
    const aria = useFieldControl();
    const own = useAccentColorRef<HTMLTextAreaElement>(color, ref, textAreaRoot);
    return <RadixTextArea ref={own} variant="surface" size={resolvedSize} color={accentColorProps(color).color} {...aria} {...rest} />;
  },
);

// forwardRef so the ref reaches the inner `<textarea>` node. Load-bearing for anything that has to drive that
// node imperatively (read its `scrollHeight`, then set a `height` so the box grows with its content): the wrap
// routes `className` and `style` to the ROOT `<div>` that paints the field's border, NOT to the textarea, so
// there is no styling path to it. The underlying wrap puts the ref straight on the textarea — no merge needed.
export const TextArea = forwardRef<ComponentRef<typeof RadixTextArea>, TextAreaProps>(function TextArea(
  { label, info, endSlot, description, validation, size, showCount, maxLength, value, defaultValue, onChange, ...rest },
  ref,
) {
  // Resolve size once so the Field shell scales its helper/message text with the field.
  const resolvedSize = useResolvedSize("control", size);
  // Track the value length for the counter — internal state when uncontrolled, the value itself when controlled.
  const isControlled = value !== undefined;
  const [internalLen, setInternalLen] = useState(() => String(defaultValue ?? "").length);
  const len = isControlled ? String(value ?? "").length : internalLen;
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!isControlled) setInternalLen(e.currentTarget.value.length);
    onChange?.(e);
  };
  const counterOn = !!showCount && maxLength != null;
  // Nameless field = WCAG 4.1.2 failure. Warn loudly in dev when neither `label` nor an aria name is set.
  const ariaLabel = (rest as Record<string, unknown>)["aria-label"];
  const ariaLabelledby = (rest as Record<string, unknown>)["aria-labelledby"];
  useEffect(() => {
    if (DEV_WARN && label == null && ariaLabel == null && ariaLabelledby == null) {
      console.warn(
        "TextArea: a field with no `label` needs `aria-label` or `aria-labelledby` for an accessible name (WCAG 4.1.2).",
      );
    }
  }, [label, ariaLabel, ariaLabelledby]);

  return (
    <Field.Root validation={validation} description={description} size={resolvedSize}>
      {label != null && <Field.Label info={info} endSlot={endSlot}>{label}</Field.Label>}
      <TextAreaControl ref={ref} size={size} maxLength={maxLength} value={value} defaultValue={defaultValue} onChange={handleChange} {...rest} />
      {(description != null || validation != null || counterOn) && (
        // Support row — helper/message on the left, the counter bottom-right (canonical multiline placement).
        <Flex justify="between" align="start" gap="3">
          <Box style={{ minWidth: 0, flex: 1 }}>
            {description != null && <Field.Description>{description}</Field.Description>}
            <Field.Message />
          </Box>
          {counterOn && (
            // aria-hidden: the limit is conveyed by the native maxLength; the counter is a visual aid.
            // `rt-ds-textarea-count` is the hook the tabular-figures rule targets (components.css):
            // the counter ticks on every keystroke, and it is right-aligned in the support row, so
            // proportional digits would walk its left edge as the count crosses digit shapes.
            <Text aria-hidden className="rt-ds-textarea-count" size={resolvedSize === "3" ? "2" : "1"}
                  style={{ color: "var(--ds-text-weak)", flexShrink: 0, whiteSpace: "nowrap", lineHeight: resolvedSize === "3" ? "20px" : "16px" }}>
              {len}/{maxLength}
            </Text>
          )}
        </Flex>
      )}
    </Field.Root>
  );
});
