import { type ComponentProps } from "react";
import { ContextMenu as RadixContextMenu } from "@radix-ui/themes";
import { useUISize, type UISize } from "../../theme/SizeContext";
import { accentColorProps, type AccentColor } from "../../theme/Provider";

/* ContextMenu — the right-click command menu. A thin wrapper over Radix Themes' compound ContextMenu:
 * the SAME command menu as DropdownMenu, but opened by right-clicking (or Shift+F10 / the menu key on)
 * its wrapped target rather than from a visible trigger. Content is locked to the opaque `solid` variant
 * ([[floating-surface-fill]]); Item gains `tone="danger"` ([[destructive-tone]]) → `data-tone`, re-painting the destructive item from the
 * accent-aware error family (error text at rest, a weak error tint on highlight). The danger paint reuses
 * the shared `.rt-BaseMenuItem` skin — the [[destructive-tone]] rule in components.css already reaches ContextMenu items
 * with no new CSS (D7).
 *
 * The 2-size clamp exception: Radix's menu Content `size` accepts ONLY "1" | "2" (default 2), so the
 * standard control lane (which maps large → "3") is OUT OF RANGE — Radix's extract-props substitutes its
 * own default and the lane silently drops. ContextMenu is therefore a documented two-size lane: read the
 * global uiSize and clamp { small: "1", medium: "2", large: "2" } — an explicit `size` still wins. Same
 * RULE as the Tabs clamp (each vendor step lands on the tier whose control box it equals), different
 * table: menu steps are 24/32px — the control lane's BOTTOM two boxes, so {1,2,2} matches at medium —
 * where tab steps are 32/40px, the TOP two, so Tabs maps {1,1,2} and matches at medium and large.
 *
 * Isolation convention (documented in the story): put a `<ContextMenu.Separator/>` before a destructive
 * item and give it a leading glyph + a verb label — colour is never the only cue (WCAG 1.4.1). Never use
 * Radix's `color` prop for destructive intent (it bypasses the collision layer). A ContextMenu is a
 * secondary affordance — its actions must also be reachable another way, since right-click is easy to
 * miss. Sub/Label/Group/Separator pass through unchanged. Checkbox/Radio items pass through too, with
 * `color` typed to take the oxblood preset ([[part-colour-parity]]). */
type ContentProps = ComponentProps<typeof RadixContextMenu.Content>;
type ItemProps = ComponentProps<typeof RadixContextMenu.Item>;
type CheckboxItemProps = ComponentProps<typeof RadixContextMenu.CheckboxItem>;
type RadioItemProps = ComponentProps<typeof RadixContextMenu.RadioItem>;

/** The clamped menu size lane — the only two steps Radix's menu surfaces accept. */
export type MenuSize = "1" | "2";

const MENU_SIZE_CLAMP: Record<UISize, MenuSize> = { small: "1", medium: "2", large: "2" };

/** Resolve a menu surface's size: an explicit step wins; otherwise the global uiSize CLAMPED to "1" | "2"
 *  (large → "2", never the out-of-range "3" the raw control lane would return — Radix would swap that for
 *  its own default and the lane would go unnoticed). Shared with MoreMenu, which forwards the resolved step
 *  to its DropdownMenu.Content so every System menu surface lands on the same two steps. */
export function useClampedMenuSize(explicit: MenuSize | undefined): MenuSize {
  const uiSize = useUISize();
  return explicit ?? MENU_SIZE_CLAMP[uiSize];
}

type ContextMenuContentProps = Omit<ContentProps, "variant" | "size" | "color"> & {
  size?: MenuSize;
  /** Radix's 26 colours or the oxblood preset ([[part-colour-parity]]). */
  color?: AccentColor;
};

function ContextMenuContent({ size, color, ...props }: ContextMenuContentProps) {
  const resolvedSize = useClampedMenuSize(size);
  return <RadixContextMenu.Content variant="solid" size={resolvedSize} {...accentColorProps(color)} {...props} />;
}

/* Radix writes a checkbox or radio item's colour straight from its prop, with no list of colours in
 * the way, so oxblood passes through as is and lands where the other 26 do ([[part-colour-parity]]). The cast only
 * widens Radix's type. */
function ContextMenuCheckboxItem({ color, ...props }: Omit<CheckboxItemProps, "color"> & { color?: AccentColor }) {
  return <RadixContextMenu.CheckboxItem color={color as CheckboxItemProps["color"]} {...props} />;
}
function ContextMenuRadioItem({ color, ...props }: Omit<RadioItemProps, "color"> & { color?: AccentColor }) {
  return <RadixContextMenu.RadioItem color={color as RadioItemProps["color"]} {...props} />;
}

export interface ContextMenuItemProps extends Omit<ItemProps, "color"> {
  /** Destructive intent — re-paints from the accent-aware error family ([[destructive-tone]]). Never Radix's `color`. */
  tone?: "danger";
}
function ContextMenuItem({ tone, ...props }: ContextMenuItemProps) {
  return <RadixContextMenu.Item data-tone={tone} {...props} />;
}

export const ContextMenu = {
  Root: RadixContextMenu.Root,
  Trigger: RadixContextMenu.Trigger,
  Content: ContextMenuContent,
  Item: ContextMenuItem,
  Label: RadixContextMenu.Label,
  Group: RadixContextMenu.Group,
  Separator: RadixContextMenu.Separator,
  Sub: RadixContextMenu.Sub,
  SubTrigger: RadixContextMenu.SubTrigger,
  SubContent: RadixContextMenu.SubContent,
  CheckboxItem: ContextMenuCheckboxItem,
  RadioGroup: RadixContextMenu.RadioGroup,
  RadioItem: ContextMenuRadioItem,
};
