import { forwardRef, type ComponentProps, type ComponentRef, type ReactNode } from "react";
import { SegmentedControl as RadixSegmentedControl } from "@radix-ui/themes";
import { useResolvedSize } from "../../theme/SizeContext";

/* SegmentedControl — a flush inline row of mutually-exclusive options that picks a VALUE (a setting, a
 * mode, a filter), not a page view. A thin wrapper over Radix Themes' compound SegmentedControl: Root
 * rides the uiSize CONTROL lane (a segmented row is a control, sized alongside Buttons and inputs, so an
 * unset size follows the small→1 control step); Item adds ONE slot, `startContent` — an optional leading
 * icon before the label. The selected segment reuses Radix's own skin — a raised surface tile that slides
 * over the track — so the wrap declares no --ds-* roles of its own (the skin-reuse pattern shared with
 * Separator / Kbd). Distinct from Tabs, which switches the VIEW of one screen; a SegmentedControl
 * switches a value in place. */
type RootProps = ComponentProps<typeof RadixSegmentedControl.Root>;
type RadixItemProps = ComponentProps<typeof RadixSegmentedControl.Item>;

function SegmentedControlRoot({ size, ...props }: RootProps) {
  const resolvedSize = useResolvedSize("control", size) as RootProps["size"];
  return <RadixSegmentedControl.Root size={resolvedSize} {...props} />;
}

export interface SegmentedControlItemProps extends RadixItemProps {
  /**
   * Optional leading icon, rendered before the label — the same `startContent` slot name the shared
   * `Item` row primitive uses, so the system has ONE word for "content before the label". Decorative
   * by contract: it is wrapped `aria-hidden`, and the label stays the segment's accessible name.
   */
  startContent?: ReactNode;
}

/* Item — Radix's segment plus the optional leading-icon slot.
 *
 * NO layout CSS is needed for the icon: Radix's own `.rt-SegmentedControlItemLabel` is already
 * `display:flex; align-items:center` with a SIZE-SCALED `gap` (--space-1/2/3 at size 1/2/3), so an icon
 * rendered as the label's first child lands left of the text, optically centred, at the gap the size step
 * prescribes — the flush track and the sliding selected tile are untouched. The one rule the system does
 * add (components.css) is the icon wrapper's own box: `display:flex` (a block-level flex box has no
 * baseline strut) + `flex-shrink:0`, so a long label never squeezes the glyph.
 *
 * Radix renders `children` TWICE inside the segment — an absolutely-positioned inactive label and the
 * active one (it cross-fades between the regular and medium weights without reflowing) — so the icon is
 * duplicated with them and the two labels keep matching widths. Both copies are aria-hidden.
 *
 * The label is the accessible name, so a segment normally carries text. For a genuinely icon-only
 * segment, put the icon in `children` and give the Item an `aria-label` — but prefer a label: a
 * segmented row's job is to show the CURRENT VALUE in words.
 *
 * forwardRef so the ref reaches the underlying segment button — the bare passthrough this replaces
 * forwarded it, and a Tooltip/Popover trigger wrapped around a segment registers the node via a ref.
 */
const SegmentedControlItem = forwardRef<ComponentRef<typeof RadixSegmentedControl.Item>, SegmentedControlItemProps>(
  function SegmentedControlItem({ startContent, children, ...props }, ref) {
    return (
      <RadixSegmentedControl.Item ref={ref} {...props}>
        {startContent != null && (
          <span className="rt-ds-segmented-icon" aria-hidden="true">
            {startContent}
          </span>
        )}
        {children}
      </RadixSegmentedControl.Item>
    );
  },
);

export const SegmentedControl = {
  Root: SegmentedControlRoot,
  Item: SegmentedControlItem,
};
