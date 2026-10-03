import { createContext, useContext, type CSSProperties, type ComponentProps, type ReactNode } from "react";
import * as ToggleGroup from "@radix-ui/react-toggle-group";
import { Button, type ButtonProps } from "./Button";
import { CONTROL_MEMBER_STEP, useResolvedSize } from "../../theme/SizeContext";

/* ToggleButtonGroup — a set of related toggle buttons where exactly one (type="single") or any number
 * (type="multiple") can be pressed at once. Composes @radix-ui/react-toggle-group: each Item is a
 * `ToggleGroup.Item asChild` over our Button at `priority="tertiary"` (ghost) — the SAME composition
 * ToggleButton uses — so every item reuses the whole Button chrome AND inherits the pressed paint from
 * ToggleButton's D11 rule for FREE: ToggleGroup marks the selected item's ghost Button `data-state="on"`,
 * and components.css's `.rt-variant-ghost[data-state="on"]:not([data-disabled])` selector paints the
 * accent-aware `--ds-fill-selected-subtle` fill, a 1px `--ds-stroke-accent-weak` edge and a weight-600 `--ds-text-strong` label.
 *
 * THE NON-COLOUR CUE IS ToggleButton'S, AND IT IS CONDITIONAL. On a LABELLED item the inherited
 * weight-600 carries it: real characters get heavier, which is still there with the hue removed. On an
 * ICON-ONLY item that weight lands on ZERO text characters and is inert — the fill and its 1px edge are
 * then the only difference between selected and unselected, i.e. colour alone (WCAG 1.4.1). An icon-only item must
 * therefore pass `pressedIcon`, exactly as an icon-only ToggleButton does: same prop name, same
 * semantics (it swaps the rest content while the item is on), so the two components share one vocabulary.
 *
 * How the swap happens without reading the group's state: an Item cannot tell whether it is selected —
 * Radix keeps the group value in an unexported context — but it does not need to, because Radix stamps
 * `data-state="on"|"off"` on this very button. Both faces are rendered and a CSS rule keyed on that
 * attribute shows exactly one. The hidden face is hidden with `display:none` (not opacity/visibility),
 * which takes it OUT of the accessibility tree, so a screen reader reads one glyph and never two.
 *
 * D1 (uncontrolled) — `value`/`onValueChange` (controlled) OR `defaultValue` (uncontrolled): Radix's
 * primitive gives uncontrolled state for free, matching the platform convention (mirrors ToggleButton's D1).
 *
 * D2 (roving-tabindex, an a11y UPGRADE over Astryx) — react-toggle-group wraps its items in a
 * RovingFocusGroup, so the WHOLE group is ONE tab stop and Arrow/Home/End move a roving focus between the
 * items, where Astryx made every button its own tab stop. type="single" → the group is a `radiogroup` of
 * `radio` items; type="multiple" → a `toolbar` of aria-pressed toggle buttons. Either way the group needs
 * an accessible name → pass `label` (→ aria-label).
 *
 * Size cascades — the group resolves `size` once via `useResolvedSize("control", size)` (never Astryx's
 * `md`) and hands the concrete step to every item's Button through context.
 *
 * THE GROUP IS ONE CONTROL IN ITS ROW ([[toggle-group-box]]), which is what its container is for. A lone ToggleButton
 * claims the whole step box ([[control-box-per-step]]); a group claims that box ONCE, for itself — 24 / 32 / 40px at steps
 * 1 / 2 / 3 — and its members render ONE STEP DOWN inside it (ruled): small buttons in a medium
 * tray, 24-in-32 / 32-in-40, floored at step 1 where member and box coincide. A member is a part of a
 * control, not a control in the row — its glyphs, box and pressed paint are all genuinely the smaller
 * step's. That container is the component's, not a story's: docs specimens used to draw a bordered Box
 * around the group by hand, which put a 46px "control" next to a 32px Select at the medium tier.
 *
 * Width reservation (reused from ToggleButton) — because the D11 rule bolds a selected item's LABEL to
 * 600, a naive text item would grow a few px when selected and shift its siblings. Each item stacks a
 * hidden, always-600 duplicate of its content in the same grid cell as the visible label, so the cell
 * always sizes to the bold width and switching the selection never reflows the row. The duplicate holds
 * BOTH faces too and is swapped by the same CSS rule, so it reserves the width of whichever face is
 * showing (ToggleButton's `pressedIcon` behaves identically — a pressed face is expected to be the same
 * optical size as the rest face, which is what a weight/fill variant of the same glyph gives you). */

type GroupSize = "1" | "2" | "3";

// Carries the group's resolved size step to each item's Button — a group-level `size` cascades to items
// (unset → the uiSize control lane, default small → "1"). Read by Item; never set by consumers.
const GroupSizeContext = createContext<ButtonProps["size"]>(undefined);

type SharedRootProps = {
  /** Accessible name for the group → `aria-label` (its radiogroup/toolbar has no visible label of its own). */
  label?: string;
  /** Radix size step applied to every item's Button. Unset → the global `uiSize` control lane (small → "1"). */
  size?: GroupSize;
};

// Astryx's `type="single" | "multiple"` union, mapped exactly onto Radix's discriminated Root props (each
// member carries its own `value`/`defaultValue`/`onValueChange` shape — string vs string[]). `asChild` is
// removed: the Root is always our own <ToggleGroup.Root> wrapper node.
export type ToggleButtonGroupRootProps =
  | (Omit<ToggleGroup.ToggleGroupSingleProps, "asChild"> & SharedRootProps)
  | (Omit<ToggleGroup.ToggleGroupMultipleProps, "asChild"> & SharedRootProps);

function ToggleButtonGroupRoot({ label, size, className, ...rest }: ToggleButtonGroupRootProps) {
  const resolvedSize = useResolvedSize("control", size) as ButtonProps["size"];
  // Members render ONE STEP DOWN ([[toggle-group-box]] as corrected the same day): the GROUP owns the step
  // box; a member is a part inside it, not a control in the row — small buttons sitting in a medium
  // tray. Floor at step 1: a step-1 group holds step-1 members (there is no smaller step), so the
  // inset collapses at the floor exactly like every other secondary tier in the system.
  const memberSize: ButtonProps["size"] = CONTROL_MEMBER_STEP[(resolvedSize ?? "1") as "1" | "2" | "3"];
  // `rt-ds-toggle-group` gives the Root its own CONTAINER (components.css): the group is ONE control in
  // its row, so its outer box IS the step box — 24 / 32 / 40 at steps 1 / 2 / 3 — and it paints the tray
  // its members sit in ([[toggle-group-box]]). `data-size` carries the step this component already resolved, because the
  // vendor's box variable (`--base-button-height`) is declared on the BUTTON element and cannot be read
  // from a div — the same stamping Calendar, FileInput and Pagination use.
  return (
    <GroupSizeContext.Provider value={memberSize}>
      <ToggleGroup.Root
        aria-label={label}
        data-size={resolvedSize}
        className={["rt-ds-toggle-group", className].filter(Boolean).join(" ")}
        {...rest}
      />
    </GroupSizeContext.Provider>
  );
}

// The width-reservation structure, identical to ToggleButton's: a hidden always-600 duplicate stacked over
// the visible label in one grid cell, so the visible weight flip on select never changes offsetWidth.
const RESERVE_WRAP: CSSProperties = { display: "inline-grid", placeItems: "center", verticalAlign: "middle" };
const LABEL_CELL: CSSProperties = {
  gridArea: "1 / 1",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "var(--space-1)",
};

export interface ToggleButtonGroupItemProps extends Omit<ComponentProps<typeof ToggleGroup.Item>, "asChild"> {
  /**
   * Optional icon shown while this item is selected — swaps the rest content. Omit it and the same
   * content renders in both states. Same prop, same name and same semantics as ToggleButton's.
   * REQUIRED on an ICON-ONLY item: the inherited weight-600 cue has no characters to act on there, so
   * without a glyph swap the selected state is carried by the fill and its 1px edge, both colour differences (WCAG 1.4.1, Use of Color).
   */
  pressedIcon?: ReactNode;
  /** Item content — a label, an icon, or both. Needs a text label (or `aria-label`) for its accessible name. */
  children?: ReactNode;
}

function ToggleButtonGroupItem({ children, pressedIcon, disabled, ...rest }: ToggleButtonGroupItemProps) {
  const size = useContext(GroupSizeContext);
  // An icon-only item carries its accessible name as `aria-label` (the documented contract), and that
  // presence doubles as the shape marker: `data-icon-only` squares it to the control box ([[control-box-per-step]] amendment).
  const iconOnly = rest["aria-label"] != null && rest["aria-label"] !== "";
  // Both faces are DECLARED; the CSS picks one off the `data-state` Radix already stamps on the button
  // (see the file header). Without `pressedIcon` only the one face exists, so no swap rule can hide it.
  const faces =
    pressedIcon === undefined ? (
      children
    ) : (
      <>
        <span data-ds-toggle-face="off">{children}</span>
        <span data-ds-toggle-face="on">{pressedIcon}</span>
      </>
    );
  return (
    <ToggleGroup.Item asChild disabled={disabled} {...rest}>
      <Button priority="tertiary" size={size} data-icon-only={iconOnly ? "" : undefined}>
        <span style={RESERVE_WRAP}>
          <span aria-hidden data-ds-toggle-reserve style={{ ...LABEL_CELL, visibility: "hidden", fontWeight: 600 }}>
            {faces}
          </span>
          <span data-ds-toggle-label style={LABEL_CELL}>{faces}</span>
        </span>
      </Button>
    </ToggleGroup.Item>
  );
}

export const ToggleButtonGroup = {
  Root: ToggleButtonGroupRoot,
  Item: ToggleButtonGroupItem,
};
