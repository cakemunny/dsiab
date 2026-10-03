import { Children, cloneElement, Fragment, isValidElement, type ComponentProps, type ReactNode } from "react";
import { Flex } from "@radix-ui/themes";
import { useButtonOrder, type ButtonOrder } from "../../theme/ButtonOrderContext";
import { checkAsChild } from "../../foundations/asChildContract";

/**
 * A cluster of related controls (buttons, icon buttons) with the system's default
 * inter-control gap. The gap is a fixed `2` (8px) at every `uiSize` — it reads well
 * next to controls of any size, so it doesn't scale with them. Override `gap` for a
 * looser/tighter cluster, or any other Flex prop (`direction`, `align`, `justify`, …).
 *
 * **Order + alignment:** the primary (solid) action anchors per the system `buttonOrder`
 * (`primary-first` by default). The cluster's alignment FOLLOWS the order — `primary-first`
 * left-aligns the group (primary leftmost); `primary-last` pins it to the end (primary
 * rightmost). Pass `order` to override for a cluster that must deviate (e.g. a destructive
 * confirm that always reads safe-action-first), or an explicit `justify` to override the
 * alignment. The DOM order is reordered (so tab order follows the visual order); a group
 * with no solid child is left untouched (natural order, no forced alignment).
 *
 * **`asChild`:** the consumer's element becomes the cluster itself, and the buttons are ITS children
 * — `<ButtonGroup asChild><nav aria-label="Actions"><Button …/>…</nav></ButtonGroup>` renders one
 * `<nav>` carrying the cluster's Flex classes. The ordering runs one level down in that case, so a
 * slotted cluster anchors its primary exactly like a plain one.
 *
 * @example
 * <ButtonGroup>
 *   <Button priority="primary">Save</Button>
 *   <Button priority="secondary">Cancel</Button>
 * </ButtonGroup>
 */
export type ButtonGroupProps = Omit<ComponentProps<typeof Flex>, "order"> & {
  /** Override the system `buttonOrder` for this cluster. */
  order?: ButtonOrder;
};

// True when the child is a primary (solid) action — or a single-element wrapper around one (e.g.
// `AlertDialog.Action` / `Tooltip` wrapping a `<Button priority="primary">`), so a cluster of dialog
// primitives still anchors correctly. Recurses only through single-child wrappers (never ambiguous).
const isPrimary = (child: ReactNode): boolean => {
  if (!isValidElement(child)) return false;
  const props = child.props as { priority?: string; children?: ReactNode };
  if (props.priority === "primary") return true;
  const inner = Children.toArray(props.children);
  return inner.length === 1 && isPrimary(inner[0]);
};

/** Flatten `<>…</>` wrappers one level at a time so a Fragment-wrapped cluster is still SEEN as its
 *  individual buttons. `Children.toArray` treats a Fragment as ONE child, so without this a caller that
 *  passes `footer={<><Button/><Button priority="primary"/></>}` silently loses buttonOrder: `isPrimary`
 *  only recurses through SINGLE-child wrappers, so a two-button Fragment reports no primary and the group
 *  falls through to "author's order, no anchoring". That failed silently in a Dialog specimen — the panel
 *  rendered Cancel-first while every real dialog rendered primary-first. Flattening here fixes every
 *  caller at once rather than each call site remembering. */
const flattenFragments = (nodes: ReactNode[]): ReactNode[] =>
  nodes.flatMap((child) =>
    isValidElement(child) && child.type === Fragment
      ? flattenFragments(Children.toArray((child.props as { children?: ReactNode }).children))
      : [child],
  );

export function ButtonGroup({ gap = "2", align = "center", wrap = "wrap", justify, order, asChild, children, ...rest }: ButtonGroupProps) {
  const ctxOrder = useButtonOrder();
  const resolved = order ?? ctxOrder;
  // Dev-only. Names THIS component before Radix's Slot throws its anonymous version from inside
  // node_modules, and reports a child whose props would silently override the cluster's own.
  if (asChild) checkAsChild("ButtonGroup", children, { element: "div" });
  // With `asChild` the buttons are the slotted element's children, not ours, so read the cluster from
  // there and give Radix's Slot the ONE element it requires. Handing it `ordered` instead would throw:
  // `Children.toArray` rewraps even a lone element as an array, and `Slot` takes no array.
  const slotted = asChild && isValidElement<{ children?: ReactNode }>(children) ? children : null;
  const kids = flattenFragments(Children.toArray(slotted ? slotted.props.children : children));
  const primaries = kids.filter(isPrimary);
  const others = kids.filter((k) => !isPrimary(k));
  const hasPrimary = primaries.length > 0;
  // No solid child → nothing to anchor; keep the author's order + alignment untouched.
  const ordered = !hasPrimary ? kids : resolved === "primary-last" ? [...others, ...primaries] : [...primaries, ...others];
  // Alignment follows the order: primary-first anchors the cluster to the start (left in LTR),
  // primary-last pins it to the end (right). An explicit `justify` overrides.
  const resolvedJustify = justify ?? (hasPrimary ? (resolved === "primary-last" ? "end" : "start") : undefined);
  return (
    <Flex gap={gap} align={align} wrap={wrap} justify={resolvedJustify} asChild={asChild} {...rest}>
      {slotted ? cloneElement(slotted, undefined, ordered) : ordered}
    </Flex>
  );
}
