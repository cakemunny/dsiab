import { type ComponentProps, type ReactNode } from "react";
import { DotsThreeVertical } from "@phosphor-icons/react";
import { DropdownMenu } from "./DropdownMenu";
import { IconButton, type IconButtonPriority } from "./IconButton";
// The menu-surface size clamp is declared once, in the wrapper that owns the Radix menu Content contract
// (ContextMenu), and reused here so the Content this composition forwards lands on the same two steps.
import { useClampedMenuSize, type MenuSize } from "./ContextMenu";

/* MoreMenu — the overflow "⋯" menu: a ghost icon-button carrying a three-dots glyph that opens a
 * DropdownMenu of SECONDARY actions. It is a small COMPOSITION, not a Radix wrap — it reuses two
 * shipped System components exactly as they are (IconButton for the trigger, DropdownMenu for the
 * surface) and adds no new component, token, or CSS. The trigger is a `tertiary` (ghost) IconButton by
 * default — the quiet affordance that stays out of the way until reached.
 *
 * `label` is REQUIRED and becomes the trigger's `aria-label`: an icon-only control has no text to name
 * it, so without an accessible name it is invisible to assistive tech (WCAG 4.1.2). The glyph defaults
 * to a vertical three-dots (`DotsThreeVertical`); pass `icon={<DotsThree/>}` for the horizontal variant.
 * Root state (`open` / `defaultOpen` / `onOpenChange` / `modal`) passes through; `contentProps` reaches
 * the DropdownMenu.Content (e.g. `align="end"` to hang the menu off a trailing ⋯).
 *
 * Size — TWO lanes, because the parts have different ceilings. An explicit `size` ("1" | "2") presets
 * BOTH parts, so they render at the identical step. Unset, the TRIGGER rides the global uiSize control
 * lane (it is a control among controls — at uiSize large it is step 3, matching the Button beside it),
 * while the MENU rides that lane CLAMPED to the two steps Radix's menu Content accepts ("1" | "2", large
 * → "2"); an out-of-range step would be silently swapped for Radix's own default. So at uiSize large the
 * trigger is step 3 and the menu holds at step 2 — the same pairing an IconButton-triggered DropdownMenu
 * renders, not a defect. The trigger's hit area clears 24×24 at every step, including the step-1 ghost
 * (WCAG 2.5.8; the floor is held for every ghost icon-button in components.css, not here).
 *
 * It is for overflow / SECONDARY actions only — the page's primary action always stays visible beside
 * the item, never hidden inside the ⋯. A destructive item follows the DropdownMenu contract: isolate it
 * below a `DropdownMenu.Separator` and give it a leading glyph + a verb label + `tone="danger"` (colour
 * is never the only cue). */
type RootProps = ComponentProps<typeof DropdownMenu.Root>;
type ContentProps = ComponentProps<typeof DropdownMenu.Content>;

export interface MoreMenuProps extends Omit<RootProps, "children"> {
  /** Accessible name for the icon-only trigger — REQUIRED. An unnamed ⋯ button is invisible to assistive tech (WCAG 4.1.2). */
  label: string;
  /** The trigger glyph. Defaults to a vertical three-dots (`DotsThreeVertical`); pass `<DotsThree/>` for the horizontal variant. */
  icon?: ReactNode;
  /** Trigger UI-priority grade. Defaults to `tertiary` (ghost) — the quiet overflow affordance. */
  priority?: IconButtonPriority;
  /** Control size for BOTH the trigger and the menu Content — an explicit step renders them identical.
   *  Unset → the trigger follows the global uiSize control lane, the menu that lane clamped to Radix's
   *  two menu steps (uiSize large → trigger step 3, menu step 2). */
  size?: MenuSize;
  /** Extra props forwarded to the `DropdownMenu.Content` (e.g. `align`, `side`, `sideOffset`). */
  contentProps?: Omit<ContentProps, "children" | "size">;
  /** The menu contents — `DropdownMenu.Item` / `Separator` / `Sub…`, exactly as DropdownMenu takes them. */
  children: ReactNode;
}

export function MoreMenu({ label, icon, priority = "tertiary", size, contentProps, children, ...rootProps }: MoreMenuProps) {
  // Resolved HERE and passed explicitly: DropdownMenu.Content's own default reads the raw control lane,
  // which hands Radix an out-of-range "3" at uiSize large. An explicit step wins over that lane.
  const menuSize = useClampedMenuSize(size);
  return (
    <DropdownMenu.Root {...rootProps}>
      <DropdownMenu.Trigger>
        <IconButton priority={priority} size={size} aria-label={label}>
          {icon ?? <DotsThreeVertical weight="bold" />}
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content size={menuSize} {...contentProps}>
        {children}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
