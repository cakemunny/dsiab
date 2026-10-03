import {
  Children,
  Fragment,
  createContext,
  forwardRef,
  isValidElement,
  useContext,
  type ComponentProps,
  type ComponentRef,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";
import * as RadixToolbar from "@radix-ui/react-toolbar";
import { Slottable } from "@radix-ui/themes";
import { checkAsChild } from "../../foundations/asChildContract";
import { CONTROL_STEP_TO_UISIZE, SizeContext, useResolvedSize } from "../../theme/SizeContext";

/* Toolbar — a role="toolbar" container for a set of RELATED controls, with roving-tabindex keyboard nav
 * (the whole toolbar is ONE tab stop; Arrow/Home/End move a roving focus between items). Composes
 * @radix-ui/react-toolbar, which supplies the role, the roving focus, and orientation. Our layer adds:
 *
 *   1. A start / center / end SLOT layout (D3). Layout is CSS grid `1fr auto 1fr` when a center slot is
 *      present (so center is truly centered), else `justify-content: space-between` (start leads, end
 *      trails). Vertical orientation stacks the same three regions down the block axis.
 *   2. `size` — cascades the control tier to every composed control via the shared SizeContext (an unset
 *      Button/IconButton then resolves to the toolbar's tier), never Astryx's `md` default.
 *   3. `dividers` — interleaves a styled `Toolbar.Separator` between the groups within each slot.
 *   4. `asChild` — hands the toolbar's own element to the consumer. The role, the roving focus, the
 *      orientation, the layout and the style merge onto their element and the three regions render
 *      INSIDE it, through Radix's `Slottable`. `children` exists for that one purpose and is typed
 *      as required with `asChild` and forbidden without it, because the content of a toolbar is its
 *      three slots. Passing the prop used to throw from inside Radix, which is the defect this
 *      closes.
 *
 * CONSTRAINED children (the agent-gap / registration model, D3): compose the System children that EXIST —
 * `Button` / `IconButton` through `Toolbar.Button asChild` (they become roving toolbar items), and the raw
 * Radix `Toolbar.ToggleGroup` / `Toolbar.ToggleItem` / `Toolbar.Link` / `Toolbar.Separator` as Radix
 * provides. A System `ToggleButtonGroup` can be nested too — it keeps its OWN roving scope, so it reads as a
 * single self-contained tab stop within the toolbar (its arrows move ITS items). Astryx's any-focusable
 * DOM-query focus engine (`useListFocus`) and its `useKeyboardHint` are deliberately NOT lifted — the
 * constrained-children model makes them unnecessary here (see the History story).
 *
 * forwardRef: Radix's roving focus moves between items by DOM-node ref, so every composed control must
 * forward its ref — Button (Task 4) and IconButton both do. */

type Orientation = "horizontal" | "vertical";
type ToolbarSize = "1" | "2" | "3";

// `size` is a Radix step for API parity with every other System control; the toolbar seeds it back
// into the SizeContext so composed controls inherit it ([[container-size-seeding]]). The step ⇄ tier map is shared rather
// than kept privately here — ChatComposer seeds from the same table.

// Root broadcasts its orientation so a `Toolbar.Separator` (auto-inserted or hand-placed) can size its thin
// line along the correct axis without the consumer wiring anything.
const ToolbarOrientationContext = createContext<Orientation>("horizontal");

type RadixRootProps = ComponentProps<typeof RadixToolbar.Root>;

interface ToolbarBaseProps extends Omit<RadixRootProps, "orientation" | "children" | "asChild"> {
  /** Leading region — the primary controls. The only slot most toolbars need. */
  start?: ReactNode;
  /** Optional middle region. When present the layout becomes a grid so this region is TRULY centered. */
  center?: ReactNode;
  /** Trailing region — pinned to the far end (right in LTR horizontal, bottom in vertical). */
  end?: ReactNode;
  /** Roving axis + visual flow. `horizontal` → Arrow Left/Right; `vertical` → Arrow Up/Down. */
  orientation?: Orientation;
  /** Control tier for every composed control (Button/IconButton/ToggleButtonGroup). Unset → the global
   *  `uiSize` control lane (default `small` → `1`). Never Astryx's `md`. */
  size?: ToolbarSize;
  /** Insert a styled separator between the groups you pass into each slot (Astryx's `dividers`). */
  dividers?: boolean;
}

/** `asChild` and `children` move together: the child IS the element the toolbar renders as, so it is
 *  required with `asChild` and rejected without it. The toolbar's content is its `start`/`center`/`end`
 *  slots, so a loose child would otherwise become a fourth region nothing positions. */
export type ToolbarProps = ToolbarBaseProps &
  (
    | {
        /** Render as the child element instead of Radix's own `div`, merging the toolbar's role,
         *  roving focus, layout and style onto it. */
        asChild: true;
        /** The element the toolbar renders as. Receives the start/center/end regions as its children. */
        children: ReactElement;
      }
    | { asChild?: false; children?: never }
  );

// Expand ONE level of fragments so `start={<><GroupA/><GroupB/></>}` yields two divider-separable groups
// (Children.toArray keeps a fragment as a single node). Non-fragment children pass straight through.
function slotGroups(node: ReactNode): ReactNode[] {
  const out: ReactNode[] = [];
  for (const child of Children.toArray(node)) {
    if (isValidElement(child) && child.type === Fragment) {
      out.push(...Children.toArray((child.props as { children?: ReactNode }).children));
    } else {
      out.push(child);
    }
  }
  return out;
}

function withDividers(node: ReactNode, place: string): ReactNode {
  const groups = slotGroups(node);
  if (groups.length < 2) return node;
  return groups.flatMap((group, i) =>
    i === 0 ? [group] : [<ToolbarSeparator key={`div-${place}-${i}`} />, group],
  );
}

export const ToolbarRoot = forwardRef<ComponentRef<typeof RadixToolbar.Root>, ToolbarProps>(function ToolbarRoot(
  { start, center, end, orientation = "horizontal", size, dividers, style, asChild, children, ...rest },
  ref,
) {
  const resolvedStep = useResolvedSize("control", size) as ToolbarSize;
  const uiSize = CONTROL_STEP_TO_UISIZE[resolvedStep] ?? "small";
  const horizontal = orientation === "horizontal";
  const hasCenter = center != null && center !== false;

  // Each slot lays its groups along the toolbar axis; separators (when `dividers`) stretch across the item row.
  const slotBase: CSSProperties = {
    display: "flex",
    flexDirection: horizontal ? "row" : "column",
    alignItems: "center",
    gap: "var(--space-2)",
  };

  const renderSlot = (node: ReactNode, place: "start" | "center" | "end"): ReactNode => {
    if (node == null || node === false) return hasCenter ? <div key={place} /> : null;
    // In grid mode each region anchors to its edge (start/center/end) along the toolbar axis.
    const anchor: CSSProperties = hasCenter
      ? horizontal
        ? { justifySelf: place }
        : { alignSelf: place }
      : {};
    return (
      <div key={place} style={{ ...slotBase, ...anchor }}>
        {dividers ? withDividers(node, place) : node}
      </div>
    );
  };

  const layout: CSSProperties = hasCenter
    ? {
        display: "grid",
        ...(horizontal
          ? { gridTemplateColumns: "1fr auto 1fr", alignItems: "center" }
          : { gridTemplateRows: "1fr auto 1fr", justifyItems: "center" }),
        gap: "var(--space-3)",
      }
    : {
        display: "flex",
        flexDirection: horizontal ? "row" : "column",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "var(--space-3)",
      };

  // Dev-only. The union type already refuses a missing or non-element child at compile time, so this
  // is for the caller who arrived from untyped JavaScript or through a cast. It names the toolbar
  // rather than leaving Radix's `Primitive.div` to throw anonymously from inside node_modules, and it
  // reports a child that declares its own `role`, which would replace the toolbar role that the
  // roving focus and the whole widget's semantics rest on.
  if (asChild) checkAsChild("Toolbar.Root", children, { element: "div", owns: { role: "toolbar" } });
  return (
    <SizeContext.Provider value={uiSize}>
      <ToolbarOrientationContext.Provider value={orientation}>
        <RadixToolbar.Root
          ref={ref}
          asChild={asChild}
          orientation={orientation}
          style={{ ...layout, ...style }}
          {...rest}
        >
          {/* The slot target, when there is one. `Slottable` tells Slot WHICH child is the consumer's
              element; the three regions beside it become that element's children, so the toolbar
              becomes their `nav` / `section` / `header` instead of nesting inside one. */}
          {asChild ? <Slottable>{children}</Slottable> : null}
          {renderSlot(start, "start")}
          {renderSlot(center, "center")}
          {renderSlot(end, "end")}
        </RadixToolbar.Root>
      </ToolbarOrientationContext.Provider>
    </SizeContext.Provider>
  );
});

export interface ToolbarSeparatorProps extends ComponentProps<typeof RadixToolbar.Separator> {}

// A thin `--ds-stroke-weak` rule. Radix orients the separator opposite the toolbar; we size the line on the
// matching axis and let it stretch across the item row/column. No !important — it's our own headless element.
//
// The PAINT lives in the stylesheet (`.rt-ds-toolbar-separator`, tokens/components.css) rather than inline:
// an inline value cannot be told apart from one a docs page applied, so a row reading this hairline back
// could never be accepted as the component's own paint. The dimensions stay inline — they follow the
// toolbar's orientation, which arrives through React context and has no DOM signal to key CSS off.
export const ToolbarSeparator = forwardRef<ComponentRef<typeof RadixToolbar.Separator>, ToolbarSeparatorProps>(
  function ToolbarSeparator({ className, style, ...rest }, ref) {
    const horizontal = useContext(ToolbarOrientationContext) === "horizontal";
    const dims: CSSProperties = horizontal
      ? { width: 1, alignSelf: "stretch", margin: "0 var(--space-1)" }
      : { height: 1, alignSelf: "stretch", margin: "var(--space-1) 0" };
    return (
      <RadixToolbar.Separator
        ref={ref}
        className={["rt-ds-toolbar-separator", className].filter(Boolean).join(" ")}
        style={{ flexShrink: 0, ...dims, ...style }}
        {...rest}
      />
    );
  },
);

/* The compound export. `Root` is our slot-layout wrapper; `Separator` is styled + orientation-aware; the rest
 * are Radix's roving item wrappers, passed straight through (compose System controls via `Button asChild`). */
export const Toolbar = {
  Root: ToolbarRoot,
  Button: RadixToolbar.Button,
  Link: RadixToolbar.Link,
  Separator: ToolbarSeparator,
  ToggleGroup: RadixToolbar.ToggleGroup,
  ToggleItem: RadixToolbar.ToggleItem,
};
