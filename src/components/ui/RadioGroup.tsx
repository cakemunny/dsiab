import { createContext, useContext, useId, type ComponentProps, type ReactNode } from "react";
import { RadioGroup as RadixRadioGroup } from "@radix-ui/themes";
import { useResolvedSize } from "../../theme/SizeContext";
import { accentColorProps, type AccentColor } from "../../theme/Provider";
import { useOptionalFieldGroupControl, useGroupItemDescribedBy, GroupItemBody } from "./Field";

type RootProps = ComponentProps<typeof RadixRadioGroup.Root>;
type RadioGroupRootProps = Omit<RootProps, "variant" | "color"> & {
  /** Radix's 26 colours or the oxblood preset ([[part-colour-parity]]). Every item paints what the same item paints on
   *  a page of that colour. */
  color?: AccentColor;
};

/* Radix hands the group's colour to each item through its own context and writes it on each item's
 * radio. It drops oxblood before that, so the root hands oxblood to the items here, and each item
 * writes it on the same radio ([[part-colour-parity]]). */
const OxbloodItems = createContext(false);

const RadioGroupRoot = ({ size, color, ...rest }: RadioGroupRootProps) => {
  const resolvedSize = useResolvedSize("control", size);
  // Inside a FieldGroup, auto-wire aria-labelledby (label) + aria-describedby onto the native
  // role=radiogroup; standalone, this is null and behaviour is unchanged. `rest` wins on conflict.
  const groupAria = useOptionalFieldGroupControl();
  return (
    <OxbloodItems.Provider value={color === "oxblood"}>
      <RadixRadioGroup.Root variant="surface" size={resolvedSize} color={accentColorProps(color).color} {...groupAria} {...rest} />
    </OxbloodItems.Provider>
  );
};

type ItemProps = ComponentProps<typeof RadixRadioGroup.Item> & {
  /** Optional secondary line under the item label — a price, scope, or qualifier. Top-aligned, weak tone. */
  description?: ReactNode;
};

const RadioGroupItem = ({ description, children, "aria-describedby": callerDescribedBy, ...rest }: ItemProps) => {
  const descId = useId();
  const describedBy = useGroupItemDescribedBy(callerDescribedBy, description != null ? descId : undefined);
  const oxblood = useContext(OxbloodItems) ? accentColorProps("oxblood") : undefined;
  return (
    <RadixRadioGroup.Item {...oxblood} {...rest} aria-describedby={describedBy}>
      <GroupItemBody descId={descId} description={description}>{children}</GroupItemBody>
    </RadixRadioGroup.Item>
  );
};

/**
 * The radio group root, locked to `variant="surface"` — `soft` and `classic` are not exposed.
 * `<RadioGroup>` IS the root and is the canonical form; `RadioGroup.Root` is an alias for the very
 * same component, so a snippet copied from the Radix Themes docs resolves rather than throwing.
 *
 * `RadioGroup.Item` forwards every Radix Item prop and adds an optional `description` line under the
 * label. Item renders its own label when given `children`.
 *
 * The group renders no label of its own — give it an `aria-label` or `aria-labelledby`. A nameless
 * `role="radiogroup"` is a WCAG 4.1.2 failure.
 *
 * @example
 * <RadioGroup name="plan" aria-label="Plan">
 *   <RadioGroup.Item value="free">Free</RadioGroup.Item>
 *   <RadioGroup.Item value="pro" description="Billed yearly">Pro</RadioGroup.Item>
 * </RadioGroup>
 */
export const RadioGroup = Object.assign(RadioGroupRoot, {
  // `RadioGroup` IS the root; `Root` is the SAME component under its Radix name so a copied Radix
  // Themes snippet resolves. Same alias shape as `Tabs.Nav.Root` (Tabs.tsx).
  Root: RadioGroupRoot,
  Item: RadioGroupItem,
});
