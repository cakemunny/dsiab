import { useEffect, type ComponentProps, type ReactNode } from "react";
import { Table as RadixTable } from "@radix-ui/themes";
import { useResolvedSize } from "../../theme/SizeContext";
import { VisuallyHidden } from "./VisuallyHidden";

// Dev-only accessibility warning, resolved once at module load — the Avatar/Badge pattern verbatim
// (see Avatar.tsx for why this is a `try` rather than a `typeof process` guard).
const DEV_WARN = (() => {
  try {
    return process.env.NODE_ENV !== "production";
  } catch {
    return false;
  }
})();

/* Table — a STYLING wrap for simple, static tables (D14). A thin compound wrapper over Radix Themes'
 * Table that adds the system's table conventions and NOTHING else — deliberately no sorting, selection,
 * virtualization, or column behaviour. A real data grid is an external component this system does not
 * ship or wrap; bring one in alongside, and keep this wrap for display tables.
 *
 * Root defaults to the `surface` variant (an opaque, bounded table) and rides the uiSize CONTROL lane, so
 * the cell text sits at the same size step as the controls around it. The system CSS (components.css) adds
 * three things on top of Radix's skin: a body-row hover wash (`--ds-fill-hover`); the header at weight 600
 * (the strong ramp step, retuned from Radix's bold) WITHOUT any hover or sort affordance — a header that
 * reads as interactive but isn't is a control that lies; and right-alignment + tabular figures for
 * numeric columns.
 *
 * NUMERIC COLUMNS: pass `numeric` to a `Cell` / `ColumnHeaderCell` in a numeric column. It stamps
 * `data-numeric`, which right-aligns the column AND sets `font-variant-numeric: tabular-nums` on it, so
 * every digit takes one advance width and a column of figures lines up instead of drifting by the width
 * of a "1". Apply it to the whole column (header + cells).
 *
 * Header / Body / Row / RowHeaderCell pass through unchanged.
 *
 * NAMING THE TABLE: Radix renders `<div {...consumerProps}><ScrollArea><table>{children}</table></ScrollArea></div>`,
 * so every prop a consumer sets lands on the scroll wrapper and the <table> itself stays anonymous in the
 * accessibility tree. The one element a consumer prop CAN reach is the table's own <caption>, because Radix
 * puts `children` directly inside the <table>. So both names render one:
 *
 *   aria-label   → a visually hidden <caption> (name only, zero layout cost) — the instinctive call works.
 *   caption      → a visible <caption>, placed by `captionSide` ("top" default / "bottom" via caption-side).
 *
 * The two are mutually exclusive in the TYPE: a visible caption IS the name, and there is no way to give the
 * table a second, different one (an aria-label cannot reach the <table> element). `aria-labelledby` is
 * refused the same way, because a <caption> cannot reference an id — the refusal is the declared type, so
 * the compiler prints the instruction, and a JS caller gets the dev warning instead. */
type RadixRootProps = ComponentProps<typeof RadixTable.Root>;

/* The refusal message IS the type, so TypeScript quotes it back at the call site. */
type AriaLabelledByRefused =
  "Table.Root cannot take aria-labelledby: it would land on the scroll wrapper, and a <caption> (the only element this prop can reach) cannot reference an id. Use aria-label for a hidden caption, or the caption prop for a visible one.";

type NamingProps =
  | {
      /** Names the <table> by rendering a visually hidden <caption>. Use `caption` for a visible one. */
      "aria-label"?: string;
      caption?: never;
      captionSide?: never;
    }
  | {
      "aria-label"?: never;
      /** A visible <caption>. It is the table's accessible name, so it needs no aria-label beside it. */
      caption?: ReactNode;
      /** Which side the visible caption sits on — CSS `caption-side`. Default "top". */
      captionSide?: "top" | "bottom";
    };

type RootProps = Omit<RadixRootProps, "aria-label" | "aria-labelledby"> &
  NamingProps & { "aria-labelledby"?: AriaLabelledByRefused };

function TableRoot({
  size,
  variant = "surface",
  caption,
  captionSide = "top",
  children,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  ...props
}: RootProps) {
  const resolvedSize = useResolvedSize("control", size) as RadixRootProps["size"];

  // An empty caption is no caption: `caption={row.title}` with nothing to say must not paint a blank
  // line above the header, and `caption={cond ? text : null}` is how conditional content is written.
  const hasCaption = caption != null && caption !== "";

  // The type refuses aria-labelledby and refuses the two names together; a JavaScript caller reaching
  // past the type hears it here rather than shipping the silent no-op this component exists to fix.
  useEffect(() => {
    if (!DEV_WARN) return;
    if (ariaLabelledBy != null) {
      console.warn(
        "Table.Root: `aria-labelledby` cannot name a table — it lands on the scroll wrapper, never on the <table>. Use `aria-label` for a hidden caption, or `caption` for a visible one (WCAG 1.3.1, 4.1.2).",
      );
    }
    if (ariaLabelledBy == null && hasCaption && ariaLabel) {
      console.warn(
        "Table.Root: `caption` already names the table, so the `aria-label` beside it is ignored. Keep whichever name the reader should get.",
      );
    }
  }, [ariaLabelledBy, hasCaption, ariaLabel]);

  // A <caption> must be the table's FIRST child, which is why it is rendered here rather than left to the
  // consumer: `children` are the row groups, and this puts the caption in front of them.
  const captionNode = hasCaption ? (
    <caption data-side={captionSide}>{caption}</caption>
  ) : ariaLabel ? (
    <VisuallyHidden asChild>
      <caption>{ariaLabel}</caption>
    </VisuallyHidden>
  ) : null;

  return (
    <RadixTable.Root variant={variant} size={resolvedSize} {...props}>
      {captionNode}
      {children}
    </RadixTable.Root>
  );
}

type CellProps = ComponentProps<typeof RadixTable.Cell> & { numeric?: boolean };
function TableCell({ numeric, ...props }: CellProps) {
  return <RadixTable.Cell data-numeric={numeric ? "" : undefined} {...props} />;
}

type ColumnHeaderCellProps = ComponentProps<typeof RadixTable.ColumnHeaderCell> & { numeric?: boolean };
function TableColumnHeaderCell({ numeric, ...props }: ColumnHeaderCellProps) {
  return <RadixTable.ColumnHeaderCell data-numeric={numeric ? "" : undefined} {...props} />;
}

export const Table = {
  Root: TableRoot,
  Header: RadixTable.Header,
  Body: RadixTable.Body,
  Row: RadixTable.Row,
  Cell: TableCell,
  ColumnHeaderCell: TableColumnHeaderCell,
  RowHeaderCell: RadixTable.RowHeaderCell,
};
