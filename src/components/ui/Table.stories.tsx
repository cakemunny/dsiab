import { useContext, useLayoutEffect, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import { CaretDown, CaretUpDown } from "@phosphor-icons/react";
import { Table } from "./Table";
import { Badge } from "./Badge";
import { CheckboxVisual } from "./CheckboxVisual";
import { VisuallyHidden } from "./VisuallyHidden";
import {
  Caption, Decision, DoDont, DODONT_LABEL, HexThemeKey, LiteTokenSpec, MeasuredRow, MeasuredSpec, Mono, NoteRow,
  Page, PageHeader, PropsLead, type PropDef, PropTable, Rule, Section,
} from "./_storyKit";
import { assertMeasuredRows } from "../../foundations/_assert";

/** The component's definition — one source, referenced by the header of every story on this page. */
const DEFINITION = <>A styling wrap for simple, static tables. Rows wash on hover, the header stays static (no fake sort affordance), and numeric columns right-align via the <Mono>numeric</Mono> prop.</>;

/* Table adds three system conventions over Radix's skin (all in components.css): a body-row hover wash,
   the header at weight 600, and right-aligned numeric columns set in tabular figures.

   MEASURED ([[measured-token-rows]]): every row names an element and a property and reads it off a real rendered table, then
   checks it against the token it claims. The hover row reads the declaration the component's OWN matched
   rule paints, since no script can synthesise a hover. Three conventions carry no token to be checked
   against — a weight, an alignment keyword and a figure style — so those stay prose rows read live off
   the rendered table. */

const INVOICES: { id: string; customer: string; status: "Paid" | "Open" | "Overdue"; amount: string }[] = [
  { id: "INV-2043", customer: "Acme Inc.", status: "Paid", amount: "$1,240.00" },
  { id: "INV-2044", customer: "Globex", status: "Open", amount: "$820.50" },
  { id: "INV-2045", customer: "Initech", status: "Overdue", amount: "$4,010.00" },
  { id: "INV-2046", customer: "Umbrella Co.", status: "Paid", amount: "$96.20" },
];

// The System Badge paints from the accent-aware semantic families (data-tone), not raw Radix scales.
const STATUS_TONE: Record<string, "success" | "error" | undefined> = { Paid: "success", Open: undefined, Overdue: "error" };

/* The specimen's rows, shared by both spellings of the specimen below. */
const INVOICE_ROWS = (
  <>
    <Table.Header>
      <Table.Row>
        <Table.ColumnHeaderCell>Invoice</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell>Customer</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell numeric>Amount</Table.ColumnHeaderCell>
      </Table.Row>
    </Table.Header>
    <Table.Body>
      {INVOICES.map((r) => (
        <Table.Row key={r.id}>
          <Table.RowHeaderCell><Code variant="ghost">{r.id}</Code></Table.RowHeaderCell>
          <Table.Cell>{r.customer}</Table.Cell>
          <Table.Cell>
            <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
          </Table.Cell>
          <Table.Cell numeric data-testid={r.id === "INV-2043" ? "amount-cell" : undefined}>{r.amount}</Table.Cell>
        </Table.Row>
      ))}
    </Table.Body>
  </>
);

/* The specimen table, reused by the Usage story + the passive play. Two ways to name the same table, and
   the type allows exactly one of them at a time: `aria-label` renders a VISUALLY HIDDEN <caption>, so the
   table carries a name in the accessibility tree and the page paints exactly as it did before; `caption`
   renders a VISIBLE one, which the token spec reads its colour off. */
function InvoiceTable({ caption }: { caption?: string }) {
  return caption ? (
    <Table.Root data-testid="invoice-table" caption={caption}>{INVOICE_ROWS}</Table.Root>
  ) : (
    <Table.Root data-testid="invoice-table" aria-label="Invoices">{INVOICE_ROWS}</Table.Root>
  );
}

/* A two-column specimen small enough to sit twice in one row, for the naming section. */
const QUARTER_ROWS = (
  <>
    <Table.Header>
      <Table.Row>
        <Table.ColumnHeaderCell>Quarter</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell numeric>Revenue</Table.ColumnHeaderCell>
      </Table.Row>
    </Table.Header>
    <Table.Body>
      <Table.Row><Table.RowHeaderCell>Q1</Table.RowHeaderCell><Table.Cell numeric>412</Table.Cell></Table.Row>
      <Table.Row><Table.RowHeaderCell>Q2</Table.RowHeaderCell><Table.Cell numeric>1,096</Table.Cell></Table.Row>
    </Table.Body>
  </>
);

function TableSpec() {
  const wrap = useRef<HTMLDivElement>(null);
  const themeKey = useContext(HexThemeKey);
  const [v, setV] = useState<{ weight: string; align: string; figures: string } | null>(null);
  useLayoutEffect(() => {
    const head = wrap.current?.querySelector<HTMLElement>(".rt-TableColumnHeaderCell");
    const num = wrap.current?.querySelector<HTMLElement>('.rt-TableCell[data-numeric]');
    if (head && num) {
      const cs = getComputedStyle(num);
      setV({ weight: getComputedStyle(head).fontWeight, align: cs.textAlign, figures: cs.fontVariantNumeric });
    }
  }, [themeKey]);
  return (
    <LiteTokenSpec
      rationale={
        <>
          Table reuses Radix's surface skin and declares no <Mono>--ds-*</Mono> role of its own, but every
          value it does put down has a name. The wash it paints on a hovered body row IS the system's{" "}
          <Mono>--ds-fill-hover</Mono>; header and body cells set no colour at all, inheriting the theme's{" "}
          <Mono>--gray-12</Mono> — exactly what <Mono>--ds-text-strong</Mono> aliases, so the header reads
          apart by weight, never by colour. The caption is the one place the wrap does name a colour: it is
          supporting text above the data, so it takes <Mono>--ds-text-weak</Mono>. The three non-colour
          conventions read live off the rendered table.
        </>
      }
    >
      {/* Hidden measurement copy — a second InvoiceTable collapsed to 0×0 purely so the three prose rows
          below can read `font-weight`, `text-align` and `font-variant-numeric` off a real rendered cell.
          aria-hidden + inert (the same treatment OverflowList gives its measurement twin) so this clone
          never announces, never takes focus, and never reaches an audit: without it a screen reader met
          the whole invoice table twice, and the 0-width clone read as a scrollable region needing keyboard
          access — a region no keyboard could ever reach, since it has no width to scroll. */}
      <div ref={wrap} aria-hidden inert style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}><InvoiceTable /></div>
      <MeasuredSpec render={() => <InvoiceTable caption="Invoices" />}>
        <MeasuredRow
          part="Header + cell text"
          note="Inherited — the wrap sets no colour on either, so the header reads apart by weight alone."
          token="--ds-text-strong"
          select=".rt-TableColumnHeaderCell"
          prop="color"
        />
        <MeasuredRow
          part="Row wash"
          note="Body rows only, and only under a pointer that can hover — a header that washes reads interactive when it isn't."
          token="--ds-fill-hover"
          select=".rt-TableBody .rt-TableRow"
          prop="background-color"
          state="hover"
        />
        <MeasuredRow
          part="Caption"
          note="The visible caption — supporting text, so it reads below the data in weight and colour rather than competing with the header."
          token="--ds-text-weak"
          select="caption"
          prop="color"
        />
      </MeasuredSpec>
      {/* Non-colour conventions — a weight, an alignment keyword and a figure style. None of them is a
          token a row could be checked against, so each is read live off the rendered table instead. */}
      <NoteRow part="Header weight" value={v ? `${v.weight} — the strong ramp step, retuned from Radix's bold/700` : "…"} radix=".rt-TableColumnHeaderCell" />
      <NoteRow part="Numeric column · alignment" value={v ? `text-align: ${v.align} — right-aligned by the numeric prop` : "…"} radix="[data-numeric]" />
      <NoteRow part="Numeric column · figures" value={v ? `font-variant-numeric: ${v.figures} — one advance width per digit, so a column of amounts lines up` : "…"} radix="[data-numeric]" />
    </LiteTokenSpec>
  );
}

const PROPS: PropDef[] = [
  { name: "Root — size", type: `"1" | "2" | "3"`, desc: <>Cell-text size. Unset, it follows the global <Code>uiSize</Code> control lane (default <Code>small</Code> → <Code>1</Code>).</>, source: "Table.tsx" },
  { name: "Root — aria-label", type: "string", desc: <>Names the <Code>&lt;table&gt;</Code> itself, by rendering a visually hidden <Code>&lt;caption&gt;</Code> as its first child. Nothing is painted and nothing moves. Use it for a table whose heading already sits on the page, or that has none.</>, source: "Table.tsx" },
  { name: "Root — caption", type: "ReactNode", desc: <>A <strong>visible</strong> caption, rendered as the table's <Code>&lt;caption&gt;</Code> — which makes it the table's accessible name too, so no <Code>aria-label</Code> belongs beside it (the type refuses both at once). An empty or nullish value renders no caption.</>, source: "Table.tsx" },
  { name: "Root — captionSide", type: `"top" | "bottom"`, def: `"top"`, desc: <>Which side the visible caption sits on — the CSS <Code>caption-side</Code> property, nothing reimplemented. Only meaningful with <Code>caption</Code>.</>, source: "Table.tsx" },
  { name: "Root — aria-labelledby", type: "refused", desc: <>A compile error that spells out the fix. A consumer prop can only reach the table's <Code>&lt;caption&gt;</Code>, and a caption cannot reference an id, so this would land on the scroll wrapper and name nothing. Use <Code>aria-label</Code> or <Code>caption</Code>. A JavaScript caller past the type gets a dev-mode <Code>console.warn</Code> instead.</>, source: "Table.tsx" },
  { name: "Root — variant", type: `"surface" | "ghost"`, def: `"surface"`, desc: <>The table skin — a bounded <Code>surface</Code> (default) or a borderless <Code>ghost</Code>.</>, source: "Radix" },
  { name: "Cell / ColumnHeaderCell — numeric", type: "boolean", desc: <>Marks a numeric column: stamps <Code>data-numeric</Code>, which right-aligns it and sets tabular figures (digits keep their width as values change). Apply to the header AND every cell in the column.</>, source: "Table.tsx" },
  { name: "Header / Body / Row / RowHeaderCell", type: "compound parts", desc: <>Pass through to Radix unchanged.</>, source: "Radix" },
];

const meta: Meta<typeof Table.Root> = {
  title: "Components/Table & List/Table",
  component: Table.Root,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**Table** is a styling wrap for simple, static tables — a `surface` skin on the `uiSize` control " +
          "lane, a body-row hover wash, a weight-600 non-interactive header, and right-aligned numeric " +
          "columns (the `numeric` prop). It deliberately does **no** sorting, selection, or virtualization — " +
          "for a real data grid, see the data-grid interop proposal. A **lite-tier** wrap.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Table.Root>;

/** Usage — a realistic static table, the numeric convention, the live token spec, and one do/don't. */
export const Usage: Story = {
  // Three scoped carve-outs, each as narrow as it can be:
  //
  //  1. DODONT_LABEL — the DO/DON'T word only, not the whole card (see _storyKit).
  //  2. .rt-Badge[data-tone] — the TONED status badges. Sampled from the rendered PNG, not from
  //     getComputedStyle: in light, success "Paid" is #218358 on #e5f6ea = 4.20:1 at 12px/400 and error
  //     "Overdue" is #ce2c31 on #fdeaeb = 4.50:1, both against a 4.5 floor; in dark both clear at 7.15:1.
  //     The success pairing is a genuine AA miss in light mode and it lives in the semantic soft-badge
  //     paint, not in this story — open for a ruling on the tone tokens. The status TEXT carries the meaning, so
  //     the specimen stands. The selector previously read ".rt-Badge", which also excused the UNTONED
  //     badge ("Open", 5.68:1) that never needed excusing; narrowed to match Badge's own page.
  // (A third carve-out, scrollable-region-focusable, has been REMOVED. It was written as "Radix's
  //  viewport sets overflow: scroll unconditionally, so the rule fires even though there is nothing to
  //  scroll" — but the rule only matches when scrollWidth exceeds clientWidth by more than 13px, so
  //  that could not have been the trigger, and measuring said otherwise: the specimen's viewport reports
  //  scrollWidth === clientWidth AND scrollHeight === clientHeight at every width from 1280 down to
  //  390. What the rule was actually firing on was the SECOND invoice table on the page — the 0-width
  //  measurement clone in the Tokens spec, whose 306px of content against a 0px client box read as a
  //  scrollable region. That clone is now aria-hidden + inert (see TableSpec), which removes it from
  //  the a11y tree and with it the finding, so the rule runs here again with nothing suppressed.
  //
  //  NOTE — the visible table takes NO tabIndex. It never overflows at any width measured, and a
  //  tabIndex on a region that cannot scroll is its own defect: it puts an empty stop in the tab order
  //  that announces nothing and does nothing. A table whose columns genuinely outrun their container
  //  does need one, and that belongs with the component, applied on the overflow condition.)
  parameters: {
    a11y: {
      context: { exclude: [DODONT_LABEL, ".rt-Badge[data-tone]"] },
    },
  },
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader title="Table · Usage" standfirst={DEFINITION} />

        <Section title="Specimen" lead="A static invoices table: text columns on the left, a numeric Amount column right-aligned. Hover a row to see the neutral wash; the header carries no hover and no sort arrows — it isn't interactive, so it doesn't pretend to be.">
          <InvoiceTable />
          <Caption>
            <strong>The numeric-column rule:</strong> pass <Code>numeric</Code> to the header cell AND every cell
            in a numeric column (here, Amount). It stamps <Code>data-numeric</Code>, which right-aligns the
            column and sets it in <Code>tabular-nums</Code> — every digit on one advance width, so the figures
            line up digit for digit and the decimal points sit on a straight edge.
          </Caption>
        </Section>

        <Rule />

        <Section title="Naming the table" lead="A table with headers is announced by name, and the name has to reach the table element itself. Radix renders that table inside a scroll wrapper, so a prop set on Root lands on the wrapper and leaves the table anonymous. Both names below close that gap the same way — they render the table's own caption.">
          <Grid columns={{ initial: "1", sm: "2" }} gap="4">
            <Flex direction="column" gap="2">
              <Table.Root aria-label="Revenue by quarter" data-testid="named-hidden">
                {QUARTER_ROWS}
              </Table.Root>
              <Caption>
                <strong><Code>aria-label</Code> — a name, nothing painted.</strong> The first thing anyone
                writes, and it now does what they assumed: the string becomes a visually hidden{" "}
                <Code>&lt;caption&gt;</Code> on the table, so a screen reader announces "Revenue by quarter"
                and the layout does not move by a pixel. Reach for it when a visible heading already sits
                above the table.
              </Caption>
            </Flex>
            <Flex direction="column" gap="2">
              <Table.Root caption="Revenue by quarter, in thousands" captionSide="bottom" data-testid="named-visible">
                {QUARTER_ROWS}
              </Table.Root>
              <Caption>
                <strong><Code>caption</Code> — the name, on the page.</strong> A visible caption IS the
                accessible name, so there is nothing to keep in sync and no <Code>aria-label</Code> belongs
                beside it. <Code>captionSide</Code> puts it above (default) or below, which is the CSS{" "}
                <Code>caption-side</Code> property and not a layout this wrap invents.
              </Caption>
            </Flex>
          </Grid>
          <Caption>
            <strong><Code>aria-labelledby</Code> is refused, loudly.</strong> A consumer prop can reach the
            caption and nothing else, and a caption cannot reference an id — so pointing at a heading would
            land on the scroll wrapper and name nothing. The type rejects it with a sentence that names the
            fix, and a JavaScript caller past the type gets the same sentence as a dev-mode warning. A
            silent no-op is the defect this section exists to remove, so it is not replaced with another one.
          </Caption>
        </Section>

        <Rule />

        <Section title="A table, not a data grid" lead="A Table displays data you can read. The moment the user needs to sort, select, or scroll thousands of rows, it is a data grid — a different tool.">
          <Grid columns={{ initial: "1", sm: "2" }} gap="3">
            <DoDont kind="do" bare note="A bounded, static set of rows for reading — a summary, a report, a spec sheet. Numeric columns right-aligned in tabular figures, the header calm and static.">
              <Table.Root size="1">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>Plan</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell numeric>Seats</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell numeric>Price</Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  <Table.Row><Table.RowHeaderCell>Starter</Table.RowHeaderCell><Table.Cell numeric>1</Table.Cell><Table.Cell numeric>$0</Table.Cell></Table.Row>
                  <Table.Row><Table.RowHeaderCell>Team</Table.RowHeaderCell><Table.Cell numeric>10</Table.Cell><Table.Cell numeric>$60</Table.Cell></Table.Row>
                </Table.Body>
              </Table.Root>
            </DoDont>
            {/* The DON'T is the same table dressed as a data grid — a select-all box, sort carets on the
                headers, a page-of-50,000 footer. Every one of those affordances is inert here, which is
                exactly the mistake: the wrap has no sorting, no selection and no virtualization to give.
                The controls are drawn from the real Checkbox and the real Phosphor caret rather than a
                unicode ballot box, so the reader sees the promise this table cannot keep. */}
            <DoDont kind="dont" bare note="Don't dress this wrap up as a data grid — none of it works. It has no sorting, no row selection and no virtualization, so a header caret and a select-all box are controls that lie. For an interactive grid, reach for the data-grid interop path.">
              <Flex direction="column" gap="1">
                <Table.Root size="1">
                  <Table.Header>
                    <Table.Row>
                      {/* A checkbox column header carries no visible text, and axe's
                          empty-table-header rule wants text a screen reader can reach — an
                          aria-label on the <th> does not satisfy it. VisuallyHidden puts the
                          name in the a11y tree without painting it. */}
                      <Table.ColumnHeaderCell>
                        <VisuallyHidden>Select all rows</VisuallyHidden>
                        <CheckboxVisual checked={false} />
                      </Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>
                        <Flex align="center" gap="1">Invoice <CaretUpDown size={11} aria-hidden /></Flex>
                      </Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell numeric>
                        <Flex align="center" gap="1" justify="end">Amount <CaretDown size={11} aria-hidden /></Flex>
                      </Table.ColumnHeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {INVOICES.slice(0, 2).map((r) => (
                      <Table.Row key={r.id}>
                        <Table.Cell><CheckboxVisual checked={false} /></Table.Cell>
                        <Table.RowHeaderCell>{r.id}</Table.RowHeaderCell>
                        <Table.Cell numeric>{r.amount}</Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
                <Text size="1" style={{ color: "var(--ds-text-weak)" }}>Rows 1–2 of 50,000</Text>
              </Flex>
            </DoDont>
          </Grid>
        </Section>

        <Rule />

        <Section title="Tokens" lead="Read off a rendered table and checked against the token each row names, so the table can disagree with the component. Table reuses Radix's surface skin and declares no role of its own, but every value it puts down is a named one; the three prose rows below carry the non-colour conventions, which have no token to be checked against.">
          <TableSpec />
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement }) => {
    // Passive: confirm the table rides the control size lane (small → rt-r-size-1) and the numeric column
    // right-aligns. axe runs automatically. No driving (a static table has no behaviour).
    // The token table's EVIDENCE, asserted at runtime ([[measured-token-rows]]). The row-wash row reads the declaration
    // the component's own matched rule paints — no script can synthesise a hover.
    const rows = assertMeasuredRows(canvasElement);
    if (rows.measured !== 3 || rows.unproven !== 0) {
      throw new Error(`expected 3 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }

    const root = canvasElement.querySelector<HTMLElement>('[data-testid="invoice-table"]');
    if (!root) throw new Error("Usage must render the invoice table");
    if (!root.classList.contains("rt-r-size-1")) throw new Error(`Table.Root must ride the control lane (small → rt-r-size-1); got "${root.className}"`);
    const amount = canvasElement.querySelector<HTMLElement>('[data-testid="amount-cell"]');
    if (!amount) throw new Error("missing the numeric Amount cell");
    if (getComputedStyle(amount).textAlign !== "right") throw new Error(`a numeric column must right-align; got ${getComputedStyle(amount).textAlign}`);
    if (getComputedStyle(amount).fontVariantNumeric !== "tabular-nums")
      throw new Error(`a numeric column must set tabular figures; got ${getComputedStyle(amount).fontVariantNumeric}`);
    // The declaration is not the point — the PAINT is. Two amounts of equal character count must
    // measure the same width; with proportional figures "$1,240.00" and "$4,010.00" differ.
    const textW = (el: Element) => { const r = document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect().width; };
    const cells = [...canvasElement.querySelectorAll('[data-testid="invoice-table"] .rt-TableCell[data-numeric]')];
    const a = cells.find((c) => c.textContent === "$1,240.00");
    const b = cells.find((c) => c.textContent === "$4,010.00");
    if (!a || !b) throw new Error("the specimen must carry the two equal-length amounts the figure test reads");
    const drift = Math.abs(textW(a) - textW(b));
    if (drift > 0.05) throw new Error(`equal-length amounts must measure the same width under tabular figures; drift ${drift.toFixed(2)}px`);

    // NAMING. The name must be on the <table>, never on the scroll wrapper Radix puts the consumer's
    // props on — so the assertion is written where the defect was: the wrapper carries no aria-label, and
    // the table's FIRST child is the caption the name comes from.
    if (root.hasAttribute("aria-label")) throw new Error("aria-label must be consumed into a <caption>, not left on the scroll wrapper");
    const table = root.querySelector("table");
    if (!table) throw new Error("Table.Root must render a <table>");
    const hidden = table.firstElementChild;
    if (!(hidden instanceof HTMLTableCaptionElement)) throw new Error(`a name must render a <caption> as the table's first child; got <${hidden?.tagName.toLowerCase()}>`);
    if (hidden.textContent !== "Invoices") throw new Error(`the caption must carry the aria-label text; got "${hidden.textContent}"`);
    // Hidden means hidden: the name costs no layout. Radix's VisuallyHidden clips it to a 1×1 box.
    if (hidden.getBoundingClientRect().width > 1.5) throw new Error(`aria-label must render a VISUALLY HIDDEN caption; it measures ${hidden.getBoundingClientRect().width}px wide`);

    // The visible caption: placed by CSS caption-side, and inset to the same edge the cell text starts on.
    const visible = canvasElement.querySelector<HTMLElement>('[data-testid="named-visible"] caption');
    if (!visible) throw new Error("the naming section must render a visible caption");
    if (getComputedStyle(visible).captionSide !== "bottom") throw new Error(`captionSide="bottom" must set caption-side: bottom; got ${getComputedStyle(visible).captionSide}`);
    const firstCell = canvasElement.querySelector<HTMLElement>('[data-testid="named-visible"] .rt-TableRowHeaderCell');
    if (!firstCell) throw new Error("the visible-caption specimen must render a row header cell");
    const textEdge = (el: HTMLElement) => el.getBoundingClientRect().left + parseFloat(getComputedStyle(el).paddingLeft);
    const inset = Math.abs(textEdge(visible) - textEdge(firstCell));
    if (inset > 0.5) throw new Error(`the caption must start on the cell text edge; it is off by ${inset.toFixed(2)}px`);
  },
};

type PropsArgs = { size: "auto" | "1" | "2" | "3"; variant: "surface" | "ghost"; caption: string; captionSide: "top" | "bottom" };

/** Props — drive the size and skin of a small static table. */
export const Props: StoryObj<PropsArgs> = {
  args: { size: "auto", variant: "surface", caption: "", captionSide: "top" },
  argTypes: {
    size: { control: "inline-radio", options: ["auto", "1", "2", "3"], description: '"auto" tracks the global uiSize toolbar (unset → the control lane); a step pins the cell text.', table: { category: "Variant" } },
    variant: { control: "inline-radio", options: ["surface", "ghost"], description: "The table skin.", table: { category: "Variant" } },
    caption: { control: "text", description: "A visible caption, which is also what names the table. Empty renders none — the table below then has no accessible name, which is the state this prop exists to fix.", table: { category: "Naming" } },
    captionSide: { control: "inline-radio", options: ["top", "bottom"], description: "Which side the visible caption sits on (CSS caption-side). Needs a caption to show.", table: { category: "Naming" } },
  },
  parameters: { controls: { disable: false } },
  render: ({ size, variant, caption, captionSide }: PropsArgs) => (
    <Page maxWidth="none">
      <PageHeader title="Table · Props" standfirst={DEFINITION} />
      <Box style={{ padding: "8px 0 2px", maxWidth: 560 }}>
        <Table.Root size={size === "auto" ? undefined : size} variant={variant} caption={caption || undefined} captionSide={captionSide}>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Invoice</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Customer</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell numeric>Amount</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {INVOICES.slice(0, 3).map((r) => (
              <Table.Row key={r.id}>
                <Table.RowHeaderCell>{r.id}</Table.RowHeaderCell>
                <Table.Cell>{r.customer}</Table.Cell>
                <Table.Cell numeric>{r.amount}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>
      <PropsLead />
      <Rule />
      <Section title="Props reference" lead={<>Every prop this styling wrap adds or forwards — no sorting/selection/virtualization props exist by design.</>}>
        <PropTable rows={PROPS} />
      </Section>
    </Page>
  ),
};

/** History — the rulings this component encodes and a changelog of how it changes over time. */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="Table · History" standfirst={DEFINITION} />

      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[catalog-as-specification]] · Wrapped Radix component">
            A <strong>wrapped</strong> Radix Themes component — the Radix name wins; a thin styling layer over
            Radix's Table, not a hand-rolled grid.
          </Decision>
          <Decision id="Styling only">
            A styling wrap for <strong>simple, static</strong> tables — it exposes <strong>no behaviour props</strong>{" "}
            (no sorting, selection, virtualization, or column resizing). A real data grid is an{" "}
            <strong>external component</strong> the system neither ships nor wraps: bring one in alongside when you
            need those behaviours, and keep this wrap for display.
          </Decision>
          <Decision id="Header doesn't lie">
            The header is weight 600 (the strong ramp step) with <strong>no hover treatment and no sort
            affordance</strong>. A header that reads as interactive but isn't is a control that lies — so a
            static table's header stays visibly static.
          </Decision>
          <Decision id="Numeric columns">
            A numeric column carries <Code>numeric</Code> on its header and cells → <Code>data-numeric</Code>,
            which right-aligns the column <strong>and</strong> sets{" "}
            <Code>font-variant-numeric: tabular-nums</Code> on it. Right-alignment alone still lets a column
            drift: in a proportional face a <Code>1</Code> is narrower than a <Code>4</Code>, so two amounts
            with the same number of characters are different widths and the decimal points wander. Tabular
            figures give every digit one advance width, which is what makes a column of money read as a
            column.
          </Decision>
          <Decision id="Skin + size">
            The <Code>surface</Code> skin reuses Radix's own table treatment (no <Code>--ds-*</Code> roles); the
            cell text rides the control size lane; body rows wash on hover with the neutral <Code>--ds-fill-hover</Code>.
          </Decision>
          <Decision id="The caption is the name">
            Radix renders <Code>&lt;div {"{...props}"}&gt;&lt;ScrollArea&gt;&lt;table&gt;</Code>, so every consumer prop
            lands on the scroll wrapper and the <Code>&lt;table&gt;</Code> stayed <strong>anonymous</strong> in the
            accessibility tree. The one element a prop can still reach is the table's own{" "}
            <Code>&lt;caption&gt;</Code>, because <Code>children</Code> go straight into the table — so both names
            render one. <Code>aria-label</Code> is intercepted into a visually hidden caption, which is the
            instinctive call made to work rather than a new concept to learn, and <Code>caption</Code> renders a
            visible one placed by <Code>captionSide</Code>. Vendor internals stay untouched: no class name is
            copied and no part of Radix's Table is reimplemented.
          </Decision>
          <Decision id="aria-labelledby is refused, not ignored">
            A <Code>&lt;caption&gt;</Code> cannot reference an id, so there is no honest way to honour{" "}
            <Code>aria-labelledby</Code> here. Rather than let it land on the wrapper and do nothing, the prop's
            declared type IS the refusal sentence, so the compiler prints the fix at the call site, and a
            JavaScript caller past the type gets the same sentence from a dev-mode warning. Naming a table
            after a heading costs one repeated string through <Code>aria-label</Code>, which is a smaller price
            than a name that silently never arrives.
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0 · naming">
            <Code>aria-label</Code>, <Code>caption</Code> and <Code>captionSide</Code> on <Code>Table.Root</Code>:
            the table element can be named at last, through its own <Code>&lt;caption&gt;</Code>.{" "}
            <Code>aria-labelledby</Code> became a compile error that names the alternative. No painted change to
            any table that does not ask for a caption.
          </Decision>
          <Decision id="0.9.0">
            Initial <Code>System/Table</Code> — the styling wrap: surface skin, control-lane cell text, body-row
            hover wash, weight-600 non-interactive header, and the <Code>numeric</Code> right-align convention.
            History page added so every component, stubs included, has one.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
