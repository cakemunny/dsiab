import { useContext, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import { DataList, type DataListOverflow, type SpaceStep } from "./DataList";
import {
  Caption, Decision, DoDont, DODONT_LABEL, HexThemeKey, LiteTokenSpec, MeasuredRow, MeasuredSpec, Mono, NoteRow, Page, PageHeader,
  PropsLead, type PropDef, PropTable, Rule, Scenario, Section,
} from "./_storyKit";
import { assertMeasuredRows } from "../../foundations/_assert";

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = (
  <>
    Label/value pairs that describe the details of one entity — an order summary, a profile panel, a
    resource's properties. A semantic <Mono>&lt;dl&gt;</Mono>, riding the control size lane, reusing
    Radix's own skin.
  </>
);

/* The gap Radix derives from each `size` step — ONE shorthand covering both axes (there is no separate
   column-gap prop, which is why the wrap adds `labelGap`). Named here so the token spec can print the
   token behind the measured pixels instead of a bare number. */
const SIZE_GAP: Record<string, string> = {
  "1": "var(--space-3)",
  "2": "var(--space-4)",
  "3": "calc(var(--space-4) × 1.25)",
};

/* DataList reuses Radix's own DataList skin (no --ds-* roles of its own): the value paints on the
   default strong text colour (--gray-12 = --ds-text-strong) and the label on Radix's muted label tint
   (--gray-a11).

   MEASURED ([[measured-token-rows]]): each colour row names an element and a property, reads that property off a real
   rendered list, and checks it against the token it claims — so a row can disagree with the component.
   The version this replaces resolved each token onto a span it had just painted and printed both sides,
   which agrees by construction. The two gap rows stay prose: they show the thing `labelGap` exists to
   unpick — unset, the row gap and the label-to-value gutter are the SAME shorthand, resolved from
   `size`, so there is no one token a row could be checked against. */

function DataListSpec() {
  const wrap = useRef<HTMLDivElement>(null);
  const themeKey = useContext(HexThemeKey);
  const [v, setV] = useState<{ rowGap: string; columnGap: string; step: string } | null>(null);
  useLayoutEffect(() => {
    const listEl = wrap.current?.querySelector<HTMLElement>(".rt-DataListRoot");
    if (!listEl) return;
    const listCs = getComputedStyle(listEl);
    setV({
      rowGap: listCs.rowGap,
      columnGap: listCs.columnGap,
      // Which size step the list landed on (unset → the control lane's default), read off the element.
      step: listEl.className.match(/rt-r-size-(\d)/)?.[1] ?? "1",
    });
  }, [themeKey]);
  const gapToken = v ? SIZE_GAP[v.step] ?? "the size step's gap" : "";
  return (
    <LiteTokenSpec
      rationale={
        <>
          DataList reuses Radix's own skin and declares no <Mono>--ds-*</Mono> roles of its own — the
          value resolves to the default strong text colour (<Mono>--gray-12</Mono>, which is exactly what{" "}
          <Mono>--ds-text-strong</Mono> aliases) and the label to Radix's muted label tint
          (<Mono>--gray-a11</Mono>), so a bare list already matches with no override. Spacing comes from
          the <Mono>--space</Mono> scale by way of <Mono>size</Mono>: one gap shorthand feeds both the row
          rhythm and the label-to-value gutter, which is what <Mono>labelGap</Mono> splits apart.
        </>
      }
    >
      {/* An off-screen REAL list, kept only for the two gap rows below — they read the used row-gap and
          column-gap off it. The specimen a reader looks at renders in the section above. */}
      <div ref={wrap} style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
        <DataList.Root>
          <DataList.Item>
            <DataList.Label>Status</DataList.Label>
            <DataList.Value>Paid</DataList.Value>
          </DataList.Item>
        </DataList.Root>
      </div>
      <MeasuredSpec
        render={() => (
          <DataList.Root>
            <DataList.Item>
              <DataList.Label>Status</DataList.Label>
              <DataList.Value>Paid</DataList.Value>
            </DataList.Item>
          </DataList.Root>
        )}
      >
        <MeasuredRow part="Value colour" token="--ds-text-strong" select=".rt-DataListValue" prop="color" />
        <MeasuredRow
          part="Label colour"
          note="Radix's muted label tint — the label is the quieter half of the pair."
          token="--gray-a11"
          select=".rt-DataListLabel"
          prop="color"
        />
      </MeasuredSpec>
      <NoteRow part="Row gap" value={v ? `${v.rowGap} — ${gapToken}, from size="${v.step}"` : "…"} />
      <NoteRow part="Label → value gap" value={v ? `${v.columnGap} — ${gapToken}, until labelGap overrides it` : "…"} />
    </LiteTokenSpec>
  );
}

/* A framed details panel — the surface a DataList lives on in a product (a summary card, a properties
   pane). Border + subtle fill + radius from the --ds-* layer so the specimen reads as a real panel, not
   a bare list floating on the page. */
function DetailPanel({ children, width = 340 }: { children: ReactNode; width?: number }) {
  return (
    <Box
      style={{
        width,
        maxWidth: "100%",
        background: "var(--ds-bg-subtle)",
        border: "1px solid var(--ds-stroke-weak)",
        borderRadius: "var(--ds-radius-4)",
        padding: "var(--space-4)",
      }}
    >
      {children}
    </Box>
  );
}

/* The label→value gutter, MEASURED. Renders one deployment panel and prints the column gap the browser
   actually resolved for it, so the difference between the size-derived default and an explicit labelGap
   is a number the reader can check on the page — not a claim in a caption. */
function GapSpecimen({ labelGap, testId }: { labelGap?: SpaceStep; testId: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const themeKey = useContext(HexThemeKey);
  const [gap, setGap] = useState("");
  useLayoutEffect(() => {
    const el = wrap.current?.querySelector<HTMLElement>(".rt-DataListRoot");
    if (el) setGap(getComputedStyle(el).columnGap);
  }, [themeKey, labelGap]);
  return (
    <Box ref={wrap}>
      <DetailPanel width={300}>
        <DataList.Root labelGap={labelGap} data-testid={testId}>
          <DataList.Item>
            <DataList.Label>Region</DataList.Label>
            <DataList.Value>us-east-1</DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label>Instance</DataList.Label>
            <DataList.Value>m6i.large</DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label>Runtime</DataList.Label>
            <DataList.Value>Node 22</DataList.Value>
          </DataList.Item>
        </DataList.Root>
      </DetailPanel>
      <Text as="p" size="1" mt="2" style={{ color: "var(--ds-text-weak)", fontFamily: "var(--code-font-family)" }}>
        column-gap: {gap || "—"}
      </Text>
    </Box>
  );
}

/* The orientation choice, shown rather than described. Both panels carry the SAME pairs at the SAME width
   so the only variable is the axis — and each prints the grid the browser actually resolved for it, which
   is where the difference physically lives: horizontal is a two-track grid (label column, value column),
   vertical is one track with the value on the row beneath its label. Read live, like every other number
   on this page. NOTE the component cannot flow pairs left-to-right along a line — the root is always a
   grid of rows — so an inline metadata strip is not an orientation of this component; see the caption. */
function OrientationSpecimen({ orientation, testId }: { orientation: "horizontal" | "vertical"; testId: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const themeKey = useContext(HexThemeKey);
  const [placed, setPlaced] = useState("");
  useLayoutEffect(() => {
    const el = wrap.current?.querySelector<HTMLElement>(".rt-DataListRoot");
    const dt = el?.querySelector("dt");
    const dd = el?.querySelector("dd");
    if (!el || !dt || !dd) return;
    const label = dt.getBoundingClientRect();
    const value = dd.getBoundingClientRect();
    // Where the value lands relative to its own label — the two numbers the orientation decides.
    const inset = Math.round(value.left - label.left);
    setPlaced(`value +${inset}px, ${value.top < label.bottom ? "same row" : "next row"}`);
  }, [themeKey, orientation]);
  return (
    <Box ref={wrap}>
      <DetailPanel width={300}>
        <DataList.Root orientation={orientation} data-testid={testId}>
          <DataList.Item>
            <DataList.Label>Owner</DataList.Label>
            <DataList.Value>Dana Okoye</DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label>Environment</DataList.Label>
            <DataList.Value>Production · us-east-1</DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label>Last deploy</DataList.Label>
            <DataList.Value>Jul 3, 2026 at 14:20</DataList.Value>
          </DataList.Item>
        </DataList.Root>
      </DetailPanel>
      <Text as="p" size="1" mt="2" style={{ color: "var(--ds-text-weak)", fontFamily: "var(--code-font-family)" }}>
        {placed || "—"}
      </Text>
    </Box>
  );
}

/* The pairs both overflow specimens carry. The host name is the row that makes the policy visible: it
   is the one value wide enough to overrun the panel, so a wrapping list gains a line there and a
   truncating list does not. */
const FIT_ROWS: { label: string; value: string }[] = [
  { label: "Region", value: "us-east-1" },
  { label: "Host", value: "ip-10-0-14-203.compute.internal" },
  { label: "Runtime", value: "Node 22" },
];

/* The declared overflow POLICY, shown rather than described. Same pairs, same panel, one list on the
   default and one declaring truncate, and each prints what the browser resolved for its own values:
   the white-space it landed on and how many lines the three rows actually occupy. */
function PolicySpecimen({ overflow, testId }: { overflow: DataListOverflow; testId: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const themeKey = useContext(HexThemeKey);
  const [read, setRead] = useState("");
  useLayoutEffect(() => {
    const root = wrap.current?.querySelector<HTMLElement>(".rt-DataListRoot");
    if (!root) return;
    const measured = lineRead(root);
    setRead(`white-space: ${measured.whiteSpace} · ${FIT_ROWS.length} rows on ${measured.lines} lines`);
  }, [themeKey, overflow]);
  return (
    <Box ref={wrap}>
      <DetailPanel width={300}>
        <DataList.Root overflow={overflow} data-testid={testId}>
          {FIT_ROWS.map((row) => (
            <DataList.Item key={row.label}>
              <DataList.Label>{row.label}</DataList.Label>
              <DataList.Value>{row.value}</DataList.Value>
            </DataList.Item>
          ))}
        </DataList.Root>
      </DetailPanel>
      <Text as="p" size="1" mt="2" style={{ color: "var(--ds-text-weak)", fontFamily: "var(--code-font-family)" }}>
        {read || "…"}
      </Text>
    </Box>
  );
}

/* The two numbers every readout on this page needs: the white-space the values landed on, and the
   lines they occupy between them. Read off the rendered list, never asserted. */
function lineRead(root: HTMLElement): { whiteSpace: string; lines: number } {
  const values = Array.from(root.querySelectorAll<HTMLElement>(".rt-DataListValue"));
  const first = values[0] ? getComputedStyle(values[0]) : null;
  const lines = values.reduce((total, value) => {
    const step = parseFloat(getComputedStyle(value).lineHeight) || value.getBoundingClientRect().height;
    return total + Math.max(1, Math.round(value.getBoundingClientRect().height / step));
  }, 0);
  return { whiteSpace: first ? first.whiteSpace : "…", lines };
}

/* The container bands, measured. The SAME list at three panel widths, each printing the panel's own
   inline size, the label column the browser resolved for it, the gutter between a label and its value,
   and the lines the three rows take. Nothing here is a media query: the panels are all on one page at
   one viewport, so the only thing that differs is the width of the box around the list. */
function FitSpecimen({ width, testId }: { width: number; testId: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const themeKey = useContext(HexThemeKey);
  const [read, setRead] = useState("");
  useLayoutEffect(() => {
    const root = wrap.current?.querySelector<HTMLElement>(".rt-DataListRoot");
    const label = root?.querySelector<HTMLElement>(".rt-DataListLabel");
    const item = root?.querySelector<HTMLElement>(".rt-DataListItem");
    if (!root || !label || !item) return;
    const itemCs = getComputedStyle(item);
    const stacked = itemCs.display === "flex";
    setRead(
      [
        `container ${Math.round(root.getBoundingClientRect().width)}px`,
        stacked ? "stacked" : `label ${Math.round(label.getBoundingClientRect().width)}px`,
        `gutter ${stacked ? itemCs.rowGap : getComputedStyle(root).columnGap}`,
        `${lineRead(root).lines} lines`,
      ].join(" · "),
    );
  }, [themeKey, width]);
  return (
    <Box ref={wrap} style={{ flex: "0 0 auto" }}>
      <DetailPanel width={width}>
        <DataList.Root overflow="truncate" data-testid={testId}>
          {FIT_ROWS.map((row) => (
            <DataList.Item key={row.label}>
              <DataList.Label>{row.label}</DataList.Label>
              <DataList.Value>{row.value}</DataList.Value>
            </DataList.Item>
          ))}
        </DataList.Root>
      </DetailPanel>
      <Text as="p" size="1" mt="2" style={{ color: "var(--ds-text-weak)", fontFamily: "var(--code-font-family)" }}>
        {read || "…"}
      </Text>
    </Box>
  );
}

const DATALIST_VALUE_PROPS: PropDef[] = [
  {
    name: "truncate",
    type: "boolean",
    def: "the list's policy",
    desc: (
      <>
        Opts <strong>this one value</strong> out of the list's policy, in either direction:{" "}
        <Code>true</Code> truncates it inside a wrapping list, <Code>false</Code> lets it wrap inside a
        truncating one. The case that earns it is a long opaque identifier a reader scans rather than
        reads (a git branch, a content hash) among values short enough to wrap harmlessly. A truncated
        value carries a <Code>title</Code> with its full string, derived from its own children.
      </>
    ),
    source: "DataList.tsx",
  },
];

const DATALIST_PROPS: PropDef[] = [
  {
    name: "labelGap",
    type: `"1" – "9"`,
    def: "—",
    desc: (
      <>
        Widens the gutter between the <strong>label</strong> column and the <strong>value</strong> column
        on its own, as a step on the <Code>--space</Code> scale. Left unset, that gutter comes from{" "}
        <Code>size</Code>, whose single <Code>gap</Code> shorthand also sets the row rhythm — so without
        this you can only push values away from their labels by loosening the rows too. Horizontal
        orientation only: vertical stacks the value under its label, where there is no column to gap.
      </>
    ),
    source: "DataList.tsx",
  },
  {
    name: "orientation",
    type: `"horizontal" | "vertical"`,
    def: `"horizontal"`,
    desc: <>Horizontal lays label and value side by side (a spec sheet); vertical stacks the value under its label (narrow columns, longer values). Responsive.</>,
    source: "Radix",
  },
  {
    name: "overflow",
    type: `"wrap" | "truncate"`,
    def: `"wrap"`,
    desc: (
      <>
        The list's <strong>overflow policy</strong>: what happens to a value wider than its column.{" "}
        <Code>"wrap"</Code> reflows it onto a second line, which is Radix's own behaviour and therefore
        the default. <Code>"truncate"</Code> holds every value to one line and ends it in an ellipsis,
        with the full string kept reachable through a derived <Code>title</Code>. One list renders one
        behaviour: a value that genuinely has to differ says so with <Code>truncate</Code> on{" "}
        <Code>DataList.Value</Code>.
      </>
    ),
    source: "DataList.tsx",
  },
  {
    name: "size",
    type: `"1" | "2" | "3"`,
    def: `control lane`,
    desc: <>The type + gap step. Left unset it rides the uiSize <strong>control lane</strong> (small → <Code>1</Code>, medium → <Code>2</Code>, large → <Code>3</Code>), so a spec sheet matches the controls beside it; an explicit value wins per instance.</>,
    source: "DataList.tsx",
  },
  {
    name: "trim",
    type: `"normal" | "start" | "end" | "both"`,
    def: "—",
    desc: <>Leading-trim: crops the extra space above the first row's cap-height / below the last row's baseline so the list optically aligns to a neighbouring edge. Responsive.</>,
    source: "Radix",
  },
];

const meta: Meta<typeof DataList.Root> = {
  title: "Components/Content/DataList",
  component: DataList.Root,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**DataList** shows label/value pairs, the metadata of a single entity, like an order summary " +
          "or a profile detail panel. It is a thin wrapper over Radix's `DataList`: `Root` rides the uiSize " +
          "control lane (so a spec sheet reads at the same step as the controls beside it) and `Item` / " +
          "`Label` pass through. It adds two props of its own: `labelGap`, a `--space` step that " +
          "widens the label-to-value gutter without touching the row rhythm `size` gives you, and " +
          "`overflow`, the one rule the whole list follows when a value will not fit its column. It reuses " +
          "Radix's own skin (no `--ds-*` roles of its own) and " +
          "renders a semantic `<dl>`/`<dt>`/`<dd>`, so it is for metadata **pairs**, not a Table of rows and " +
          "columns. `orientation` runs each pair side by side (the default) or stacks the value under its " +
          "label, and below a container breakpoint the horizontal pair stacks on its own. It is a " +
          "**lite-tier** wrap: a Usage story (specimen · live token spec · orientation · the label gap · a " +
          "do/don't), an Overflow story (the policy · the one deliberate exception · the container bands) " +
          "and a Props.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof DataList.Root>;

/** Usage — the primary lite docs story: a realistic specimen, the live token spec, and one do/don't. */
export const Usage: Story = {
  // The DoDont callout labels (success/error text on the green/red tint) measure ~4.1–4.4 — just under
  // axe's strict 4.5; the callout colour + the DO/DON'T word already carry the meaning, so color-contrast
  // is scoped off here for JUST those cards, a documented specimen exception (same pattern as Separator).
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}-${globals.uiSize}`}>
      <Page>
        <PageHeader title="DataList · Usage" standfirst={DEFINITION} />

        <Section title="Specimen" lead="An order summary: the metadata of one invoice as label/value pairs.">
          <DetailPanel>
            <DataList.Root data-testid="datalist-specimen">
              <DataList.Item>
                <DataList.Label>Order</DataList.Label>
                <DataList.Value>#INV-2043</DataList.Value>
              </DataList.Item>
              <DataList.Item>
                <DataList.Label>Status</DataList.Label>
                <DataList.Value>Paid</DataList.Value>
              </DataList.Item>
              <DataList.Item>
                <DataList.Label>Amount</DataList.Label>
                <DataList.Value>$1,240.00</DataList.Value>
              </DataList.Item>
              <DataList.Item>
                <DataList.Label>Issued</DataList.Label>
                <DataList.Value>Jul 3, 2026</DataList.Value>
              </DataList.Item>
              <DataList.Item>
                <DataList.Label>Customer</DataList.Label>
                <DataList.Value>Acme Inc.</DataList.Value>
              </DataList.Item>
            </DataList.Root>
          </DetailPanel>
        </Section>

        <Rule />

        <Section
          title="Orientation"
          lead="Which way each pair runs. Horizontal — the default, and what every other specimen on this page shows — sets the label beside its value, so the panel reads as a scannable two-column spec sheet. Vertical stacks the value under its label, handing it the panel's full width. Same pairs, same width in both, so the axis is the only difference."
        >
          <Grid columns={{ initial: "1", sm: "2" }} gap="5">
            <Scenario
              label="HORIZONTAL (DEFAULT)"
              caption={<>Label and value share a row, so the eye can run down either column — the labels as a key, the values as the data. Right whenever the values are short enough that two columns fit without either one wrapping.</>}
            >
              <OrientationSpecimen orientation="horizontal" testId="orientation-horizontal" />
            </Scenario>
            <Scenario
              label={`ORIENTATION="VERTICAL"`}
              caption={<>The value gets the whole width and the label becomes a heading above it. Reach for it in a narrow column — a sidebar, a drawer, a mobile layout — or when values are long enough that the horizontal split would wrap them into a ragged second column.</>}
            >
              <OrientationSpecimen orientation="vertical" testId="orientation-vertical" />
            </Scenario>
          </Grid>
          <Caption>
            Both readouts are measured off the rendered pair — where the first value sits relative to its
            own label. That is the whole of what <Mono>orientation</Mono> decides.{" "}
            <Mono>orientation</Mono> is responsive, so a panel can stack on a phone and split from a
            breakpoint up. What it cannot do is run pairs <em>along</em> a line: a DataList root is always
            a grid of rows, so an inline metadata strip (<Mono>Owner · Updated · Size</Mono> all on one
            line) is not an orientation of this component — build that from a <Mono>Flex</Mono> of{" "}
            <Mono>Text</Mono>.
          </Caption>
        </Section>

        <Rule />

        <Section
          title="Label-to-value gap"
          lead="One knob the base component doesn't offer: the gutter between the two columns, set on its own. Radix derives a single gap from size that covers BOTH axes, so loosening the columns would otherwise loosen the rows with them. labelGap sets the column gutter only — on the same spacing scale — and leaves the row rhythm alone."
        >
          <Grid columns={{ initial: "1", sm: "2" }} gap="5">
            <Scenario
              label="UNSET"
              caption={<>The gutter follows <Mono>size</Mono> — the same value as the row gap. Right for most panels: short labels, values close enough to scan as pairs.</>}
            >
              <GapSpecimen testId="gap-default" />
            </Scenario>
            <Scenario
              label={`LABELGAP="6"`}
              caption={<>The columns separate; the rows keep their original rhythm. Reach for it when the values are the thing being scanned down — figures, IDs, statuses — and the labels are just their key.</>}
            >
              <GapSpecimen labelGap="6" testId="gap-wide" />
            </Scenario>
          </Grid>
          <Caption>
            Both readouts are measured off the rendered list, not asserted. <Mono>labelGap</Mono> takes a{" "}
            <Mono>--space</Mono> step (<Mono>"1"</Mono>–<Mono>"9"</Mono>), so a widened gutter is still on
            the system's spacing rhythm rather than a loose pixel value.
          </Caption>
        </Section>

        <Rule />

        <Section title="One thing's metadata, not many things" lead="DataList is for the metadata of one thing. When you're listing many things across the same columns, that's a table.">
          <Grid columns={{ initial: "1", sm: "2" }} gap="3">
            <DoDont kind="do" bare note="One entity's details as label/value pairs — a summary or properties panel. Each row is a distinct field of the SAME thing.">
              <DataList.Root>
                <DataList.Item>
                  <DataList.Label>Plan</DataList.Label>
                  <DataList.Value>Team</DataList.Value>
                </DataList.Item>
                <DataList.Item>
                  <DataList.Label>Seats</DataList.Label>
                  <DataList.Value>12</DataList.Value>
                </DataList.Item>
                <DataList.Item>
                  <DataList.Label>Renews</DataList.Label>
                  <DataList.Value>Aug 1, 2026</DataList.Value>
                </DataList.Item>
              </DataList.Root>
            </DoDont>
            <DoDont kind="dont" bare note={<>Don't force many entities into a DataList — each label becomes a fake row header and the shared columns collapse into one crammed value. That's tabular data: reach for a <Code>Table</Code> (<Code>System/Table &amp; List/Table</Code>), where rows and columns are first-class.</>}>
              <DataList.Root>
                <DataList.Item>
                  <DataList.Label>Order 1</DataList.Label>
                  <DataList.Value>Acme · $1,240 · Paid</DataList.Value>
                </DataList.Item>
                <DataList.Item>
                  <DataList.Label>Order 2</DataList.Label>
                  <DataList.Value>Globex · $820 · Due</DataList.Value>
                </DataList.Item>
                <DataList.Item>
                  <DataList.Label>Order 3</DataList.Label>
                  <DataList.Value>Initech · $2,010 · Paid</DataList.Value>
                </DataList.Item>
              </DataList.Root>
            </DoDont>
          </Grid>
        </Section>

        <Rule />

        <Section title="Tokens" lead="Every colour read off the rendered rows and checked against the token the row names, so the table can disagree with the component. DataList reuses Radix's skin, so it owns no --ds-* roles of its own: the value lands on --ds-text-strong, the label on Radix's muted --gray-a11 tint, and both gaps come off the --space scale by way of size.">
          <DataListSpec />
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement }) => {
    // Passive (no driving / no flash): a DataList has no open/close behaviour, so its semantic contract
    // is asserted right here. axe runs automatically on the story.
    // The token table's EVIDENCE, asserted at runtime ([[measured-token-rows]]): both colour rows read a real rendered
    // list, resolved their claim on a different node, and the two agree.
    const rows = assertMeasuredRows(canvasElement);
    if (rows.measured !== 2 || rows.unproven !== 0) {
      throw new Error(`expected 2 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }

    const dl = canvasElement.querySelector<HTMLElement>('[data-testid="datalist-specimen"]');
    if (!dl) throw new Error("Usage must render the specimen DataList");
    if (dl.tagName.toLowerCase() !== "dl") throw new Error(`DataList.Root must render a <dl>; got <${dl.tagName.toLowerCase()}>`);

    const labels = dl.querySelectorAll("dt");
    const values = dl.querySelectorAll("dd");
    if (labels.length === 0 || values.length === 0) throw new Error("a DataList must render label (<dt>) / value (<dd>) pairs");
    if (labels.length !== values.length) throw new Error(`each label needs a value; got ${labels.length} <dt> and ${values.length} <dd>`);

    // labelGap moves the COLUMN gutter alone: the widened list's column gap must exceed the default's,
    // while both keep the identical row gap that `size` gives them. That is the whole contract.
    const def = canvasElement.querySelector<HTMLElement>('[data-testid="gap-default"]');
    const wide = canvasElement.querySelector<HTMLElement>('[data-testid="gap-wide"]');
    if (!def || !wide) throw new Error("the gap section must render the default and the labelGap specimen");
    const defCs = getComputedStyle(def);
    const wideCs = getComputedStyle(wide);
    if (!(parseFloat(wideCs.columnGap) > parseFloat(defCs.columnGap))) {
      throw new Error(`labelGap must widen the label→value gutter; got ${wideCs.columnGap} vs ${defCs.columnGap}`);
    }
    if (parseFloat(wideCs.rowGap) !== parseFloat(defCs.rowGap)) {
      throw new Error(`labelGap must leave the row rhythm alone; got ${wideCs.rowGap} vs ${defCs.rowGap}`);
    }

    // Orientation is a CHOICE the page now shows, so it's asserted where it physically lives: the pair
    // shares a row in horizontal (same top, different x) and stacks in vertical (same x, different top).
    // Reading the class or the prop back would prove nothing about what the reader sees.
    const pair = (id: string) => {
      const root = canvasElement.querySelector<HTMLElement>(`[data-testid="${id}"]`);
      if (!root) throw new Error(`the orientation section must render the ${id} specimen`);
      const dt = root.querySelector("dt");
      const dd = root.querySelector("dd");
      if (!dt || !dd) throw new Error(`${id} must render a label/value pair`);
      return { dt: dt.getBoundingClientRect(), dd: dd.getBoundingClientRect() };
    };
    const h = pair("orientation-horizontal");
    if (!(h.dd.left > h.dt.right)) {
      throw new Error("horizontal must set the value beside its label, not under it");
    }
    const v = pair("orientation-vertical");
    if (!(v.dd.top >= v.dt.bottom)) {
      throw new Error("vertical must stack the value under its label");
    }
    if (Math.abs(v.dd.left - v.dt.left) > 1) {
      throw new Error(`vertical must align the value to its label's left edge; off by ${Math.round(Math.abs(v.dd.left - v.dt.left))}px`);
    }
  },
};

/** Overflow — the policy a list declares for values too wide for their column, and the container
 *  breakpoints that reshape the pair when the panel around it narrows. */
export const Overflow: Story = {
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}-${globals.uiSize}`}>
      <Page>
        <PageHeader
          title="DataList · Overflow"
          standfirst={
            <>
              {DEFINITION} This page covers what it does when a value will not fit: the policy it
              declares for all of its values, the one value allowed to differ, and the container
              widths at which the pair reshapes.
            </>
          }
        />

        <Section
          title="One list, one behaviour"
          lead="Truncation versus wrapping is a decision per LIST, not per row. Radix paints the root overflow-wrap: anywhere, so before this prop existed a value wrapped unless the caller happened to put a truncating component inside it, and a panel could show a wrapping hostname two rows above an ellipsised branch. overflow states the rule once and every value obeys it."
        >
          <Grid columns={{ initial: "1", sm: "2" }} gap="5">
            <Scenario
              label="WRAP (DEFAULT)"
              caption={<>The value reflows onto a second line and the row grows taller. Right when the values are prose, or short enough that the occasional second line costs nothing.</>}
            >
              <PolicySpecimen overflow="wrap" testId="overflow-wrap" />
            </Scenario>
            <Scenario
              label={`OVERFLOW="TRUNCATE"`}
              caption={<>Every value holds one line and ends in an ellipsis, so the panel keeps a fixed rhythm however long a value runs. Right for a spec sheet of identifiers that is scanned down rather than read across.</>}
            >
              <PolicySpecimen overflow="truncate" testId="overflow-truncate" />
            </Scenario>
          </Grid>
          <Caption>
            Both readouts are measured off the rendered list. Truncation hides text, so the component
            hands it back: a truncated value carries a <Mono>title</Mono> holding its full string,
            derived from the value's own children, and the string stays in the accessibility tree
            because the clipping is visual only. That is the condition GUIDELINES §9 puts on an
            ellipsis, and the standing obligation in <Mono>src/utils/truncation.ts</Mono>.
          </Caption>
        </Section>

        <Rule />

        <Section
          title="The one value allowed to differ"
          lead="A long opaque identifier is the real exception: a git branch or a content hash is scanned for its shape, not read to the end, so it can truncate among values that wrap harmlessly. That is a per-item opt-in the caller states, never something a composed child decides by accident."
        >
          <Box style={{ maxWidth: 320 }}>
            <DetailPanel width={300}>
              <DataList.Root data-testid="overflow-exception">
                <DataList.Item>
                  <DataList.Label>Message</DataList.Label>
                  <DataList.Value>Rework the refund adapter</DataList.Value>
                </DataList.Item>
                <DataList.Item>
                  <DataList.Label>Branch</DataList.Label>
                  <DataList.Value truncate>agent/billing-sdk-migration</DataList.Value>
                </DataList.Item>
                <DataList.Item>
                  <DataList.Label>Author</DataList.Label>
                  <DataList.Value>Dana Okoye</DataList.Value>
                </DataList.Item>
              </DataList.Root>
            </DetailPanel>
          </Box>
          <Caption>
            The list keeps the default policy and the branch alone declares <Mono>truncate</Mono>. The
            prop runs both ways: <Mono>truncate</Mono> is <Mono>false</Mono> to let one value wrap
            inside a truncating list.
          </Caption>
          <PropTable rows={DATALIST_VALUE_PROPS} />
        </Section>

        <Rule />

        <Section
          title="The gutter answers the panel"
          lead="A details panel is resized by the layout around it, not by the viewport, so the label column and the pair itself answer a CONTAINER query on the list's own root. Three panels, one page, one viewport: the only variable is the width of the box around each list."
        >
          <Flex gap="5" wrap="wrap" align="start">
            <FitSpecimen width={340} testId="fit-wide" />
            <FitSpecimen width={284} testId="fit-tight" />
            <FitSpecimen width={214} testId="fit-stacked" />
          </Flex>
          <Caption>
            Three bands, and both thresholds are measured rather than picked. At <Mono>256px</Mono> the
            label column drops the flat <Mono>120px</Mono> floor Radix gives it and falls back to the
            labels' own width: below that, the floor plus the default gutter would leave the value
            column narrower than the label column keying it. At <Mono>15.3em</Mono> the pair stacks,
            which is the width at which the widest label, the size step's gutter and the widest value
            can no longer share one line. That second threshold is stated in <Mono>em</Mono> because
            all three of its terms ride the ui-size tier, so the breakpoint moves with the type: the
            same rule fires at 184 / 214 / 245px across small, medium and large. The column gap itself
            stays where the caller put it, since a container query cannot restyle the element that owns
            the container and <Mono>labelGap</Mono> lives there.
          </Caption>
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement }) => {
    const list = (id: string) => {
      const root = canvasElement.querySelector<HTMLElement>(`[data-testid="${id}"]`);
      if (!root) throw new Error(`the page must render the ${id} specimen`);
      return root;
    };
    const values = (id: string) => Array.from(list(id).querySelectorAll<HTMLElement>(".rt-DataListValue"));

    // The POLICY: one list, one behaviour. Asserted on what the browser resolved for each value, not
    // on the prop that asked for it.
    const wrapped = values("overflow-wrap");
    const truncated = values("overflow-truncate");
    if (wrapped.some((v) => getComputedStyle(v).whiteSpace === "nowrap")) {
      throw new Error("a wrapping list must leave every value free to reflow");
    }
    if (!truncated.every((v) => getComputedStyle(v).whiteSpace === "nowrap")) {
      throw new Error("a truncating list must hold EVERY value to one line, not some of them");
    }
    // The long host name is the row the policy is visible on: it wraps in one panel and not the other.
    const lines = (v: HTMLElement) =>
      Math.round(v.getBoundingClientRect().height / (parseFloat(getComputedStyle(v).lineHeight) || 1));
    if (!(lines(wrapped[1]) > 1)) throw new Error("the wrapping specimen must show a value reflowing");
    if (lines(truncated[1]) !== 1) throw new Error("the truncating specimen must hold that value to one line");

    // TRUNCATION HANDS THE TEXT BACK (§9 1.4.12): every clipped value carries its full string.
    for (const v of truncated) {
      if (v.getAttribute("title") !== v.textContent) {
        throw new Error(`a truncated value must carry its full text as a title; got "${v.getAttribute("title")}"`);
      }
    }

    // The exception is ONE value, opted in deliberately, and it keeps its text reachable too.
    const exception = values("overflow-exception");
    const clipped = exception.filter((v) => v.hasAttribute("data-ds-truncate"));
    if (clipped.length !== 1) throw new Error(`the exception panel must truncate exactly one value; got ${clipped.length}`);
    if (clipped[0].getAttribute("title") !== "agent/billing-sdk-migration") {
      throw new Error("the opted-in value must carry its full branch name as a title");
    }

    // The CONTAINER BANDS: the same list at three panel widths reshapes, and the narrowest stacks the
    // value under its label at the label's own left edge.
    const labelWidth = (id: string) => {
      const dt = list(id).querySelector<HTMLElement>(".rt-DataListLabel");
      if (!dt) throw new Error(`${id} must render a label`);
      return dt.getBoundingClientRect().width;
    };
    if (!(labelWidth("fit-wide") > labelWidth("fit-tight"))) {
      throw new Error(`the tight band must release the label floor; got ${labelWidth("fit-wide")} then ${labelWidth("fit-tight")}`);
    }
    const stackedItem = list("fit-stacked").querySelector<HTMLElement>(".rt-DataListItem");
    const stackedLabel = list("fit-stacked").querySelector<HTMLElement>(".rt-DataListLabel");
    const stackedValue = list("fit-stacked").querySelector<HTMLElement>(".rt-DataListValue");
    if (!stackedItem || !stackedLabel || !stackedValue) throw new Error("fit-stacked must render a pair");
    const dt = stackedLabel.getBoundingClientRect();
    const dd = stackedValue.getBoundingClientRect();
    if (!(dd.top >= dt.bottom)) throw new Error("the narrowest band must stack the value under its label");
    if (Math.abs(dd.left - dt.left) > 1) {
      throw new Error(`a stacked value must align to its label's left edge; off by ${Math.round(Math.abs(dd.left - dt.left))}px`);
    }
    // A stacked row still has to fit the panel it stacked for.
    const stackedRoot = list("fit-stacked");
    if (stackedRoot.scrollWidth > stackedRoot.clientWidth + 1) {
      throw new Error(`a stacked list must not overflow its panel; overflowed by ${stackedRoot.scrollWidth - stackedRoot.clientWidth}px`);
    }
  },
};

type PropsArgs = {
  orientation: "horizontal" | "vertical";
  size: "auto" | "1" | "2" | "3";
  labelGap: "from size" | SpaceStep;
  trim: "normal" | "start" | "end" | "both";
};

/** Props — the live, args-driven DataList. Drive orientation, size step, the label-to-value
 *  gutter, and leading-trim. */
export const Props: StoryObj<PropsArgs> = {
  // "auto" (size unset) is the default so the list tracks the global uiSize toolbar out of the box.
  args: { orientation: "horizontal", size: "auto", labelGap: "from size", trim: "normal" },
  argTypes: {
    orientation: { control: "inline-radio", options: ["horizontal", "vertical"], description: "Side-by-side vs stacked pairs.", table: { category: "Variant" } },
    size: { control: "inline-radio", options: ["auto", "1", "2", "3"], description: 'Type + gap step. "auto" tracks the global uiSize toolbar (unset, control lane); a step pins it.', table: { category: "Variant" } },
    labelGap: {
      control: "select",
      options: ["from size", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
      description: "Label→value gutter as a --space step, set independently of the row gap. 'from size' leaves it unset, so it follows the size step. Horizontal orientation only.",
      table: { category: "Layout" },
    },
    trim: { control: "inline-radio", options: ["normal", "start", "end", "both"], description: "Leading-trim: crop the cap/baseline space at the list's edges.", table: { category: "Variant" } },
  },
  parameters: { controls: { disable: false } },
  render: ({ orientation, size, labelGap, trim }: PropsArgs) => (
    <Page maxWidth="none">
      {/* The one sentence this page adds to the shared definition: what to watch when the control that
          only exists on this page — labelGap — is moved. */}
      <PageHeader
        title="DataList · Props"
        standfirst={<>{DEFINITION} Move <strong>labelGap</strong> up the scale to watch the values slide away from their labels while the rows hold their spacing — and note it does nothing in <Code>vertical</Code>, where the pair stacks and there is no column to gap.</>}
      />
      <Box style={{ padding: "16px 0 8px" }}>
        <DetailPanel width={orientation === "vertical" ? 260 : 360}>
          <DataList.Root
            orientation={orientation}
            size={size === "auto" ? undefined : size}
            labelGap={labelGap === "from size" ? undefined : labelGap}
            trim={trim}
          >
            <DataList.Item>
              <DataList.Label>Order</DataList.Label>
              <DataList.Value>#INV-2043</DataList.Value>
            </DataList.Item>
            <DataList.Item>
              <DataList.Label>Status</DataList.Label>
              <DataList.Value>Paid</DataList.Value>
            </DataList.Item>
            <DataList.Item>
              <DataList.Label>Amount</DataList.Label>
              <DataList.Value>$1,240.00</DataList.Value>
            </DataList.Item>
            <DataList.Item>
              <DataList.Label>Issued</DataList.Label>
              <DataList.Value>Jul 3, 2026</DataList.Value>
            </DataList.Item>
          </DataList.Root>
        </DetailPanel>
      </Box>
      <PropsLead />
      <Rule />
      <Section title="Props reference" lead={<>Every prop <Code>DataList.Root</Code> accepts on top of the <Code>&lt;dl&gt;</Code> attributes. <Code>labelGap</Code> is ours; <Code>size</Code> is wrapped to ride the control lane; <Code>orientation</Code> and <Code>trim</Code> pass through to Radix.</>}>
        <PropTable rows={DATALIST_PROPS} />
      </Section>
    </Page>
  ),
};

/** History — the rulings this component encodes and a changelog of how it changes over time. */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="DataList · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[catalog-as-specification]] · Wrapped Radix component">
            DataList is a <strong>wrapped</strong> Radix Themes component — the Radix name wins; built on
            the Radix substrate + our <Code>--ds-*</Code> layer, not a hand-rolled list.
          </Decision>
          <Decision id="Control lane">
            <Code>Root</Code> rides the uiSize <strong>control lane</strong> — a spec sheet reads at the
            same size step as the inputs and buttons beside it (small → <Code>1</Code>, medium →{" "}
            <Code>2</Code>, large → <Code>3</Code>). An explicit <Code>size</Code> still wins per instance.
          </Decision>
          <Decision id="Skin reuse">
            It reuses Radix's own DataList skin and declares <strong>no <Code>--ds-*</Code> roles</strong>:
            the value paints on the default strong text colour (<Code>--gray-12</Code>, exactly what{" "}
            <Code>--ds-text-strong</Code> aliases) and the label on Radix's muted label tint — no new CSS,
            no new token.
          </Decision>
          <Decision id="Label gap">
            Radix derives ONE <Code>gap</Code> shorthand from <Code>size</Code> — it sets the row rhythm
            and the label-to-value gutter together, with no prop to separate them, so a panel that wanted
            its values further from their labels had to loosen its rows too. The wrap adds{" "}
            <Code>labelGap</Code>: a <Code>--space</Code> step applied to the <strong>column</strong>{" "}
            gutter only. It stays optional (unset = whatever <Code>size</Code> gives) and stays on the
            spacing scale, so the escape hatch can't introduce a loose pixel value.
          </Decision>
          <Decision id="Metadata pairs">
            DataList renders a semantic <Code>&lt;dl&gt;</Code>/<Code>&lt;dt&gt;</Code>/<Code>&lt;dd&gt;</Code>{" "}
            — label/value <strong>pairs describing ONE entity</strong>, not rows and columns across many.
            When the data is tabular, that's a <Code>Table</Code> (<Code>System/Table &amp; List/Table</Code>),
            not this.
          </Decision>
          <Decision id="[[data-list-overflow]] · Overflow policy and container fit">
            Truncation versus wrapping is decided <strong>per list</strong>, never globally and never
            row by row. <Code>overflow</Code> declares it on the root and every value obeys, with one
            value free to differ through <Code>truncate</Code> on <Code>DataList.Value</Code>. A
            truncated value keeps a derived <Code>title</Code>, because an ellipsis is only allowed
            where the full string stays reachable. The label/value gutter answers a{" "}
            <strong>container</strong> query on the root rather than the viewport: a details panel is
            resized by the layout around it, so at <Code>256px</Code> the label column drops Radix's
            flat <Code>120px</Code> floor and at <Code>15.3em</Code> the pair stacks.
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0 · [[data-list-overflow]]">
            <Code>overflow</Code> added on <Code>Root</Code> and <Code>truncate</Code> on{" "}
            <Code>Value</Code>, so a list states one rule for values too wide for their column and a
            single value opts out on purpose. The root became a container, so the label column releases
            Radix's flat 120px floor and the pair stacks on the panel's own width rather than the
            viewport's.
          </Decision>
          <Decision id="0.9.0">
            Initial <Code>System/DataList</Code> — Radix DataList wrapped, <Code>Root</Code> bound to the
            control size lane; its skin reused tokenlessly (the value colour resolves to{" "}
            <Code>--ds-text-strong</Code>); <Code>labelGap</Code> added so the label-to-value gutter can be
            set independently of the row rhythm; History page added so every component, stubs included,
            has one.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
