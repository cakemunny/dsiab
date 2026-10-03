import { createContext, useContext, useId, type ComponentProps, type ReactNode } from "react";
import { CheckboxGroup as RadixCheckboxGroup } from "@radix-ui/themes";
import { useResolvedSize } from "../../theme/SizeContext";
import { accentColorProps, type AccentColor } from "../../theme/Provider";
import { useOptionalFieldGroupControl, useGroupItemDescribedBy, GroupItemBody } from "./Field";

type RootProps = ComponentProps<typeof RadixCheckboxGroup.Root>;
type CheckboxGroupRootProps = Omit<RootProps, "variant" | "color"> & {
  /** Radix's 26 colours or the oxblood preset ([[part-colour-parity]]). Every item paints what the same item paints on
   *  a page of that colour. */
  color?: AccentColor;
};

/* Radix hands the group's colour to each item through its own context and writes it on each item's
 * checkbox. It drops oxblood before that, so the root hands oxblood to the items here, and each item
 * writes it on the same checkbox ([[part-colour-parity]]). */
const OxbloodItems = createContext(false);

const CheckboxGroupRoot = ({ size, color, ...rest }: CheckboxGroupRootProps) => {
  const resolvedSize = useResolvedSize("control", size);
  // Inside a FieldGroup, auto-wire the group name (label) + support-text describedby; standalone, this
  // is null and the group behaves exactly as before. `rest` wins so a caller can still override.
  const groupAria = useOptionalFieldGroupControl();
  return (
    <OxbloodItems.Provider value={color === "oxblood"}>
      <RadixCheckboxGroup.Root variant="surface" size={resolvedSize} color={accentColorProps(color).color} {...groupAria} {...rest} />
    </OxbloodItems.Provider>
  );
};

type ItemProps = ComponentProps<typeof RadixCheckboxGroup.Item> & {
  /** Optional secondary line under the item label — a price, scope, or qualifier. Top-aligned, weak tone. */
  description?: ReactNode;
};

const CheckboxGroupItem = ({ description, children, "aria-describedby": callerDescribedBy, ...rest }: ItemProps) => {
  const descId = useId();
  const describedBy = useGroupItemDescribedBy(callerDescribedBy, description != null ? descId : undefined);
  const oxblood = useContext(OxbloodItems) ? accentColorProps("oxblood") : undefined;
  return (
    <RadixCheckboxGroup.Item {...oxblood} {...rest} aria-describedby={describedBy}>
      <GroupItemBody descId={descId} description={description}>{children}</GroupItemBody>
    </RadixCheckboxGroup.Item>
  );
};

/**
 * The checkbox group root, locked to `variant="surface"` — `soft` and `classic` are not exposed.
 * `<CheckboxGroup>` IS the root and is the canonical form; `CheckboxGroup.Root` is an alias for the
 * very same component, so a snippet copied from the Radix Themes docs resolves rather than throwing.
 *
 * `CheckboxGroup.Item` forwards every Radix Item prop and adds an optional `description` line under
 * the label.
 *
 * The group renders no label of its own — give it an `aria-label` or `aria-labelledby`. A nameless
 * group is a WCAG 4.1.2 failure.
 *
 * @example
 * <CheckboxGroup name="fruit" aria-label="Fruit">
 *   <CheckboxGroup.Item value="apple">Apple</CheckboxGroup.Item>
 *   <CheckboxGroup.Item value="banana" description="Ripe">Banana</CheckboxGroup.Item>
 * </CheckboxGroup>
 */
export const CheckboxGroup = Object.assign(CheckboxGroupRoot, {
  // `CheckboxGroup` IS the root; `Root` is the SAME component under its Radix name so a copied Radix
  // Themes snippet resolves. Same alias shape as `Tabs.Nav.Root` (Tabs.tsx).
  Root: CheckboxGroupRoot,
  Item: CheckboxGroupItem,
});
