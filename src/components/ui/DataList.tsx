import { createContext, isValidElement, useContext, type ComponentProps, type ReactNode } from "react";
import { DataList as RadixDataList } from "@radix-ui/themes";
import { useResolvedSize } from "../../theme/SizeContext";
import { accentColorProps, useAccentColorRef, type AccentColor } from "../../theme/Provider";

/* DataList — a metadata display: the label/value pairs that describe the details of ONE entity (an
 * order summary, a user-profile panel, a resource's properties). A thin wrapper over Radix Themes'
 * compound DataList. Root rides the uiSize CONTROL lane, so a spec sheet reads at the same size step as
 * the inputs and buttons beside it; Item / Label pass through untouched.
 *
 * It reuses Radix's OWN DataList skin and declares no --ds-* roles of its own — the label paints on
 * Radix's muted label tint (--gray-a11), the value on the default strong text colour (--gray-12, which
 * is exactly what --ds-text-strong aliases), straight from Radix's scale. It renders a semantic <dl>/<dt>/<dd>, so
 * it is for metadata PAIRS describing one entity, NOT a Table of rows and columns across many.
 *
 * The one prop we ADD is `labelGap` — Radix's `size` sets a single `gap` shorthand across both axes and
 * exposes no way to widen the label-to-value gutter alone, so a long-label spec sheet had to trade its
 * row rhythm for column breathing room. `labelGap` takes a --space step and sets the column gutter only.
 *
 * NUMERIC ALIGNMENT IS DEFERRED, AND THE REASON IS THE API, NOT THE CSS. The system's convention is
 * that a number which updates in place is set in tabular figures (GUIDELINES §3), and every other
 * adopter could take it as one declaration on a selector that already existed. DataList cannot: a `<dd>`
 * holds whatever the caller puts in it — an amount, a date, a name, a Badge — so there is nothing on the
 * element to tell CSS which values are numeric. Giving it the treatment therefore means a `numeric` prop
 * on `DataList.Value`, mirroring the `data-numeric` idiom Table already ships. That is NET-NEW API on a
 * lite wrap, which is a ruling this component has not had. A blanket over every `<dd>` is the rejected
 * alternative: it would set figures on prose. Until that ruling exists, a caller who wants aligned
 * amounts either reaches for `Table` (rows and columns are first-class there) or sets the property on
 * the value they pass in.
 *
 * That `numeric`-prop ruling is still open. When it lands, the rule registers
 * in `TABULAR_SITES` (`src/components/ui/_tabular-figures.stories.tsx`) like every other adopter. */
type RootProps = ComponentProps<typeof RadixDataList.Root>;

/** A step on the shared Radix spacing scale (`--space-1` … `--space-9`). */
export type SpaceStep = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

/**
 * What a list does with a value too wide for its column ([[data-list-overflow]]).
 *
 * `"wrap"` reflows the value onto a second line, which is Radix's own behaviour and therefore the
 * default. `"truncate"` holds every value to one line and ends it in an ellipsis.
 */
export type DataListOverflow = "wrap" | "truncate";

/* The root's declared policy, read by DataList.Value so one list renders ONE behaviour for all of its
   values. Defaulting to "wrap" is what keeps an undeclared list rendering exactly as it did. */
const OverflowPolicy = createContext<DataListOverflow>("wrap");

export type DataListRootProps = RootProps & {
  /** Widen (or tighten) the gutter between the LABEL column and the VALUE column, independent of the
   * row gap. Radix ships one `gap` shorthand off the `size` class — size 1 = var(--space-3), 2 =
   * var(--space-4), 3 = calc(var(--space-4) * 1.25) — covering both axes at once, with no separate
   * prop, so a spec sheet that wants its values further from their labels has to give up its row
   * rhythm too. This is the missing knob: a step on the shared --space scale, so the gutter stays
   * snapped to the system's spacing rhythm rather than becoming a loose pixel value.
   *
   * Applied inline, which beats the size class's shorthand on the column axis only; the row gap keeps
   * following `size`. Horizontal orientation only — vertical stacks the value UNDER its label, so
   * there is no column gutter to set (the row gap owns that spacing). */
  labelGap?: SpaceStep;
  /** The list's OVERFLOW POLICY ([[data-list-overflow]]): what happens to a value wider than its column.
   *
   * Radix paints the root `overflow-wrap: anywhere`, so a value wrapped mid-token unless the caller
   * happened to put a truncating component inside it, which is how one rail came to show a wrapping
   * model name, a wrapping hostname and an ellipsised branch in three consecutive rows. Truncation
   * versus wrapping is a decision per LIST, so it is declared here and every value obeys it.
   *
   * `"truncate"` hands the hidden text back: the value carries a `title` with its full string, which
   * is the standing obligation in `src/utils/truncation.ts`. One value may still differ, deliberately,
   * through `truncate` on `DataList.Value`. */
  overflow?: DataListOverflow;
};

function DataListRoot({ size, labelGap, overflow = "wrap", className, style, ...props }: DataListRootProps) {
  const resolvedSize = useResolvedSize("control", size) as RootProps["size"];
  // labelGap first so an explicit `style` from the caller still wins — the escape hatch stays open.
  const rootStyle = labelGap ? { columnGap: `var(--space-${labelGap})`, ...style } : style;
  return (
    <OverflowPolicy.Provider value={overflow}>
      <RadixDataList.Root
        size={resolvedSize}
        /* The root is the CONTAINER its own rows answer (tokens/components.css): a details panel is
           resized by the layout around it, not by the viewport, so the gutter reads the panel. */
        className={className ? `rt-ds-datalist ${className}` : "rt-ds-datalist"}
        data-ds-overflow={overflow}
        style={rootStyle}
        {...props}
      />
    </OverflowPolicy.Provider>
  );
}

type ValueProps = ComponentProps<typeof RadixDataList.Value>;

export type DataListValueProps = ValueProps & {
  /** Opt this ONE value out of the list's policy, in either direction: `true` truncates it inside a
   * wrapping list, `false` lets it wrap inside a truncating one.
   *
   * The case that earns it is a long opaque identifier a reader scans rather than reads (a git branch,
   * a content hash) sitting among values that are short enough to wrap harmlessly. State it at the call
   * site, because a list that decides this row by row is the defect [[data-list-overflow]] fixes. */
  truncate?: boolean;
};

/* The text a truncated value has to keep reachable. GUIDELINES §9 allows an ellipsis only where a
   mechanism reveals the full string, so the component derives the `title` from the value's own children
   rather than trusting every call site to remember one. A value whose text is produced INSIDE a
   component (rather than passed through as children) cannot be read this way: pass `title` for that. */
function textOf(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return "";
}

function DataListValue({ truncate, title, children, ...props }: DataListValueProps) {
  const policy = useContext(OverflowPolicy);
  const clamped = truncate ?? policy === "truncate";
  return (
    <RadixDataList.Value
      data-ds-truncate={clamped ? "" : undefined}
      title={clamped ? title ?? (textOf(children) || undefined) : title}
      {...props}
    >
      {children}
    </RadixDataList.Value>
  );
}

type LabelProps = Omit<ComponentProps<typeof RadixDataList.Label>, "color"> & {
  /** Radix's 26 colours or the oxblood preset ([[part-colour-parity]]). */
  color?: AccentColor;
};

/* Radix writes data-accent-color on the label after the rest of its props, so an attribute passed in
 * never lands. Oxblood reaches that same label through a ref ([[part-colour-parity]]). Otherwise a pass-through. */
function DataListLabel({ color, ref, ...props }: LabelProps) {
  const own = useAccentColorRef<HTMLElement>(color, ref);
  return <RadixDataList.Label ref={own} color={accentColorProps(color).color} {...props} />;
}

export const DataList = {
  Root: DataListRoot,
  Item: RadixDataList.Item,
  Label: DataListLabel,
  Value: DataListValue,
};
