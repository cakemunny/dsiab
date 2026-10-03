import { createContext, forwardRef, useCallback, useContext, useRef, useState, type ComponentProps, type ComponentPropsWithoutRef, type ElementRef } from "react";
import { DropdownMenu as RadixDropdownMenu } from "@radix-ui/themes";
import { accentColorProps, type AccentColor } from "../../theme/Provider";
import { useClampedMenuSize, type MenuSize } from "./ContextMenu";

/* DropdownMenu — an actions/navigation menu from a trigger. A thin wrapper over Radix Themes' compound
 * DropdownMenu: Content is locked to the opaque `solid` variant ([[floating-surface-fill]]) and rides the CLAMPED two-step menu
 * lane; Item gains `tone="danger"` ([[destructive-tone]]) → `data-tone`, re-painting the destructive item from the
 * accent-aware error family (text-first at rest, a weak error tint on highlight — CSS in components.css).
 * Root and Trigger add one behaviour, opening on the click assistive technology sends (below).
 *
 * The 2-size clamp exception: Radix's menu Content `size` accepts ONLY "1" | "2" (default 2), so the
 * standard control lane (which maps large → "3") is OUT OF RANGE. Radix's extract-props does not drop an
 * out-of-range value — it SUBSTITUTES its own default — so the lane would go silently unnoticed rather
 * than fail loudly. Every System menu surface therefore shares one clamp (`useClampedMenuSize`, declared
 * with ContextMenu): { small: "1", medium: "2", large: "2" }, an explicit `size` still wins.
 *
 * Isolation convention (documented in the story): put a `<Separator/>` before a destructive item and
 * give it a leading glyph + a verb label — colour is never the only cue (WCAG 1.4.1). Never use Radix's
 * `color` prop for destructive intent (it bypasses the collision layer). Sub parts and
 * Label/Group/Separator pass through unchanged. Checkbox/Radio items pass through too, with `color`
 * typed to take the oxblood preset ([[part-colour-parity]]). */
type RootProps = ComponentProps<typeof RadixDropdownMenu.Root>;
type TriggerProps = ComponentPropsWithoutRef<typeof RadixDropdownMenu.Trigger>;
type ContentProps = ComponentProps<typeof RadixDropdownMenu.Content>;
type ItemProps = ComponentProps<typeof RadixDropdownMenu.Item>;
type CheckboxItemProps = ComponentProps<typeof RadixDropdownMenu.CheckboxItem>;
type RadioItemProps = ComponentProps<typeof RadixDropdownMenu.RadioItem>;

/* THE MENU OPENS ON THE CLICK ASSISTIVE TECHNOLOGY SENDS (Radix #1963, #2700).
 *
 * Radix's trigger toggles only on pointerdown and on keydown, and it has no click handler. VoiceOver's
 * VO+Space in Safari and Firefox and NVDA's browse-mode Enter send a click with no pointerdown
 * before it, and so does `element.click()`. Measured on the bare Radix trigger, that click left the
 * menu closed while Select, Popover and Dialog triggers opened on it. So Root owns the open state and
 * shares a toggle, and Trigger toggles on a click that no pointer gesture began.
 *
 * A pointer gesture is marked on pointerdown, the event Radix toggles on. The mark clears one
 * task after the document's next pointerup, caught in the capture phase, so the click that ends the
 * same gesture still sees it. The document listener is needed because a modal menu sets
 * `pointer-events: none` on the body, and that gesture's pointerup and click then never reach the
 * trigger. Keyboard opening needs nothing here, because Radix's keydown handler prevents the default
 * action and no click follows it. */
const MenuToggleContext = createContext<(() => void) | null>(null);

function DropdownMenuRoot({ open: openProp, defaultOpen = false, onOpenChange, ...props }: RootProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : uncontrolledOpen;
  const setOpen = useCallback(
    (next: boolean) => {
      if (!controlled) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [controlled, onOpenChange],
  );
  const toggle = useCallback(() => setOpen(!open), [setOpen, open]);
  return (
    <MenuToggleContext.Provider value={toggle}>
      <RadixDropdownMenu.Root {...props} open={open} onOpenChange={setOpen} />
    </MenuToggleContext.Provider>
  );
}

const DropdownMenuTrigger = forwardRef<ElementRef<typeof RadixDropdownMenu.Trigger>, TriggerProps>(
  function DropdownMenuTrigger({ onPointerDown, onClick, ...props }, ref) {
    const toggle = useContext(MenuToggleContext);
    const pointerGesture = useRef(false);
    const handlePointerDown: TriggerProps["onPointerDown"] = (event) => {
      onPointerDown?.(event);
      pointerGesture.current = true;
      const release = () => {
        document.removeEventListener("pointerup", release, true);
        document.removeEventListener("pointercancel", release, true);
        setTimeout(() => { pointerGesture.current = false; }, 0);
      };
      document.addEventListener("pointerup", release, true);
      document.addEventListener("pointercancel", release, true);
    };
    const handleClick: TriggerProps["onClick"] = (event) => {
      onClick?.(event);
      if (event.defaultPrevented || pointerGesture.current || props.disabled || !toggle) return;
      toggle();
    };
    return <RadixDropdownMenu.Trigger {...props} ref={ref} onPointerDown={handlePointerDown} onClick={handleClick} />;
  },
);

function DropdownMenuContent({ size, color, ...props }: Omit<ContentProps, "variant" | "size" | "color"> & { size?: MenuSize; color?: AccentColor }) {
  const resolvedSize = useClampedMenuSize(size);
  return <RadixDropdownMenu.Content variant="solid" size={resolvedSize} {...accentColorProps(color)} {...props} />;
}

/* Radix writes a checkbox or radio item's colour straight from its prop, with no list of colours in
 * the way, so oxblood passes through as is and lands where the other 26 do ([[part-colour-parity]]). The cast only
 * widens Radix's type. */
function DropdownMenuCheckboxItem({ color, ...props }: Omit<CheckboxItemProps, "color"> & { color?: AccentColor }) {
  return <RadixDropdownMenu.CheckboxItem color={color as CheckboxItemProps["color"]} {...props} />;
}
function DropdownMenuRadioItem({ color, ...props }: Omit<RadioItemProps, "color"> & { color?: AccentColor }) {
  return <RadixDropdownMenu.RadioItem color={color as RadioItemProps["color"]} {...props} />;
}

export interface DropdownMenuItemProps extends Omit<ItemProps, "color"> {
  /** Destructive intent — re-paints from the accent-aware error family ([[destructive-tone]]). Never Radix's `color`. */
  tone?: "danger";
}
function DropdownMenuItem({ tone, ...props }: DropdownMenuItemProps) {
  return <RadixDropdownMenu.Item data-tone={tone} {...props} />;
}

/** An actions/navigation menu from a trigger. `Content` is locked to the opaque `solid` variant and
 * rides the clamped two-step menu lane; `Item` gains `tone="danger"` for destructive intent. Sub /
 * CheckboxItem / RadioItem (with `color` typed to take oxblood) and Label / Group / Separator pass
 * through from Radix Themes unchanged.
 *
 * `TriggerIcon` IS DELIBERATELY ABSENT — a Radix Themes snippet using `<DropdownMenu.TriggerIcon />`
 * will throw "Element type is invalid" here. It is not a menu part: Radix exports it as an alias of its
 * internal `ChevronDownIcon` (dropdown-menu.d.ts: `ChevronDownIcon as TriggerIcon`; the two are the same
 * function object). `src/index.ts` already withholds `ChevronDownIcon` and its three siblings by ruling —
 * this system draws with `@phosphor-icons/react`, and Radix's icons are a second family on a different
 * grid (Radix: fixed `width="9" viewBox="0 0 9 9"`; Phosphor: `width="1em" viewBox="0 0 256 256"`).
 * Re-exporting it under this name would re-admit through the back door the exact icon the front door
 * excludes, and leave a consumer two down-carets with no rule for choosing.
 *
 * The system's down-caret is Phosphor `CaretDown` at `weight="bold"`, `aria-hidden` (as in Collapsible,
 * TopNav and ChatToolCalls). A labelled trigger that wants one composes it:
 *   <DropdownMenu.Trigger><Button priority="secondary">Options <CaretDown weight="bold" aria-hidden /></Button></DropdownMenu.Trigger>
 * Most System menus trigger from an icon button instead (DotsThree), which needs no caret at all. */
export const DropdownMenu = {
  Root: DropdownMenuRoot,
  Trigger: DropdownMenuTrigger,
  Content: DropdownMenuContent,
  Item: DropdownMenuItem,
  Label: RadixDropdownMenu.Label,
  Group: RadixDropdownMenu.Group,
  Separator: RadixDropdownMenu.Separator,
  Sub: RadixDropdownMenu.Sub,
  SubTrigger: RadixDropdownMenu.SubTrigger,
  SubContent: RadixDropdownMenu.SubContent,
  CheckboxItem: DropdownMenuCheckboxItem,
  RadioGroup: RadixDropdownMenu.RadioGroup,
  RadioItem: DropdownMenuRadioItem,
};
