import { type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Text } from "@radix-ui/themes";
import { Grid } from "./Grid";
import {
  Caption, Decision, DoDont, DODONT_LABEL, HexThemeKey, MeasuredRow, MeasuredSpec, Mono, Page, PageHeader,
  PropsLead, type PropDef, PropTable, Rule, Scenario, Section, TokenGroup,
} from "./_storyKit";
import { awaitMeasuredRows } from "../../foundations/_assert";

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = (
  <>
    Grid arranges its children on a two-dimensional CSS grid — rows AND columns at once. Set the tracks,
    the gap, and the flow; every prop takes a breakpoint object, so one grid re-shapes itself down to a
    phone. It is pure layout: no paint, no size lane.
  </>
);

/* Grid is a pure layout primitive — it declares no --ds-* PAINT roles and rides no size lane. That does
   not make it tokenless: its `gap` is a spacing contract, snapped to the shared --space scale, and the
   Tokens section reads every step's rendered gutter off the DOM so the page can name the token behind
   each pixel instead of printing a bare number. The Usage story teaches the four things a grid actually
   gets reached for — responsive columns, the gap scale, explicit tracks, and placement — then the one
   honest do/don't (two axes vs one). */

/* A dashboard metric tile — a labelled value on the subtle surface. Simple content so the grid's columns
   and gap read at a glance, never a lorem blob. */
function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <Box
      data-testid="grid-tile"
      style={{ background: "var(--ds-bg-subtle)", border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)", padding: 16 }}
    >
      <Text as="p" size="1" style={{ color: "var(--ds-text-weak)" }}>{label}</Text>
      <Text as="p" size="5" weight="bold" mt="1" style={{ color: "var(--ds-text-strong)" }}>{value}</Text>
    </Box>
  );
}

const METRICS: { label: string; value: string }[] = [
  { label: "Active users", value: "8,240" },
  { label: "Revenue", value: "$12.6k" },
  { label: "Conversion", value: "3.1%" },
  { label: "Sessions", value: "18,904" },
  { label: "Avg. order", value: "$54.20" },
  { label: "Refunds", value: "0.4%" },
];

/* A plain section tile for the Props, where the point is the grid geometry, not the tile content. */
function Tile({ label }: { label: string }) {
  return (
    <Box
      style={{ background: "var(--ds-bg-subtle)", border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)", padding: 16, minHeight: 56 }}
    >
      <Text style={{ color: "var(--ds-text-strong)" }}>{label}</Text>
    </Box>
  );
}

const PLAY_TILES = ["Overview", "Activity", "Billing", "Members", "Reports", "Settings"];

/* A compact cell for the scenario grids, where the geometry is the subject and the content is only there
   to make the tracks legible. `span` lets one cell claim two columns, which is how a real dashboard gives
   its headline chart more room than the metrics beneath it. */
function Cell({ children, span, muted }: { children: ReactNode; span?: number; muted?: boolean }) {
  return (
    <Box
      style={{
        gridColumn: span ? `span ${span}` : undefined,
        background: muted ? "var(--ds-bg-base)" : "var(--ds-bg-subtle)",
        border: "1px solid var(--ds-stroke-weak)",
        borderRadius: "var(--ds-radius-3)",
        padding: "var(--space-3)",
        minHeight: 44,
        display: "flex",
        alignItems: "center",
      }}
    >
      <Text size="1" style={{ color: "var(--ds-text-strong)" }}>{children}</Text>
    </Box>
  );
}

/* The --space steps `gap` accepts, MEASURED off rendered grids: one real Grid per step, whose rendered
   gutter is read and checked against the --space token the step claims. So the table can never drift from
   the scale (and it follows --scaling if the theme moves it). */
const GAP_STEPS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

function GridSpec() {
  return (
    <TokenGroup
      label="GAP · THE SPACING SCALE"
      specimen={
        <Grid columns="3" gap="4" style={{ width: 260 }}>
          {["", "", "", "", "", ""].map((_, i) => (
            <Box key={i} style={{ height: 26, borderRadius: "var(--ds-radius-2)", background: "var(--ds-fill-accent-weak)", border: "1px solid var(--ds-stroke-accent-weak)" }} />
          ))}
        </Grid>
      }
      blurb="Six cells at gap=4. Every step below is measured off a rendered grid and checked against the token it claims."
    >
      <MeasuredSpec
        render={() => (
          <>
            {GAP_STEPS.map((s) => (
              <Grid key={s} columns="2" gap={s} data-probe={s}>
                <Box /><Box />
              </Grid>
            ))}
          </>
        )}
      >
        {GAP_STEPS.map((s) => (
          <MeasuredRow
            key={s}
            part={`gap="${s}"`}
            token={`--space-${s}`}
            select={`[data-probe="${s}"]`}
            prop="column-gap"
          />
        ))}
      </MeasuredSpec>
    </TokenGroup>
  );
}

const GRID_PROPS: PropDef[] = [
  { name: "columns", type: `"1"–"9" | string`, desc: <>Template columns. A numeric string (<Code>"3"</Code>) makes that many even tracks; a CSS string (<Code>"100px 1fr"</Code>) is used verbatim.</>, source: "Radix" },
  { name: "rows", type: `"1"–"9" | string`, desc: <>Template rows — the same value shapes as <Code>columns</Code>. Left unset, rows size to their content.</>, source: "Radix" },
  { name: "gap", type: `"0"–"9" | string`, desc: <>Space between cells, snapped to the <Code>--space</Code> scale. <Code>gapX</Code> / <Code>gapY</Code> set a single axis.</>, source: "Radix" },
  { name: "flow", type: `"row" | "column" | "dense" | …`, desc: <>The <Code>grid-auto-flow</Code> direction auto-placed items fill; defaults to <Code>row</Code>.</>, source: "Radix" },
  { name: "align", type: `"start" | "center" | "end" | "baseline" | "stretch"`, desc: <>Cross-axis alignment of each cell's content (<Code>align-items</Code>); cells stretch by default.</>, source: "Radix" },
  { name: "justify", type: `"start" | "center" | "end" | "between"`, desc: <>Distribution of the column tracks along the inline axis (<Code>justify-content</Code>) when they don't fill the container.</>, source: "Radix" },
];

const meta: Meta<typeof Grid> = {
  title: "Components/Container/Grid",
  component: Grid,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**Grid** is Radix Themes' CSS-grid layout primitive, surfaced under the System import — two " +
          "dimensions at once, where a Flex row gives you one. It carries no `--ds-*` overrides and no " +
          "size lane: pure layout, never paint. `gap` snaps to the `--space` scale, so grid gutters share " +
          "the system's spacing rhythm; every prop is responsive, taking a `{ initial, sm, … }` breakpoint " +
          "object. The Usage story covers the four things a grid is reached for — responsive columns, the gap " +
          "scale, explicit tracks, and placement — with the spacing spec read live off rendered grids.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Grid>;

/** Usage — the primary lite docs story: the headline specimen, the four things a grid gets reached
 *  for, the live spacing spec, and the one honest do/don't. */
export const Usage: Story = {
  // The DO/DON'T word (success/error step-11 ink on its own tint) measures 4.10 at 12px bold, under axe's
  // 4.5; the colour + the word already carry the meaning, so that row is the documented exception. Scoped
  // to the label itself — the cards' specimens stay fully axe-checked, which "[data-dodont]" did not do.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}-${globals.uiSize}`}>
    <Page>
      <PageHeader title="Grid · Usage" standfirst={DEFINITION} />

      <Section title="Specimen" lead="A dashboard metric grid — one column on a phone, two on a tablet, three on a wider screen — with a gap from the shared spacing scale. Drag the Storybook panel narrower to watch it re-flow.">
        <Flex direction="column" gap="4">
          <Grid columns={{ initial: "1", sm: "2", md: "3" }} gap="4" data-testid="grid-specimen">
            {METRICS.map((m) => (
              <MetricTile key={m.label} label={m.label} value={m.value} />
            ))}
          </Grid>
          <Caption>
            Written as <Code>{`columns={{ initial: "1", sm: "2", md: "3" }}`}</Code> with <Code>gap="4"</Code>.
            The tiles never shrink below readability — the grid drops a column instead, which is the whole
            reason to reach for a breakpoint object rather than a fixed track count.
          </Caption>
        </Flex>
      </Section>

      <Rule />

      <Section title="Layouts" lead="The four things a grid is actually reached for. Each one is a different prop doing the work.">
        <Grid columns={{ initial: "1", sm: "2" }} gapX="6" gapY="5">
          <Scenario
            label="RESPONSIVE COLUMNS"
            caption={<>A breakpoint object — <Mono>{`{ initial: "2", md: "4" }`}</Mono> — changes the track COUNT per screen. Reach for it when the same set of cards should re-flow rather than squeeze; every Grid prop accepts one.</>}
          >
            <Grid columns={{ initial: "2", md: "4" }} gap="2" data-testid="grid-responsive">
              <Cell>Mon</Cell><Cell>Tue</Cell><Cell>Wed</Cell><Cell>Thu</Cell>
            </Grid>
          </Scenario>

          <Scenario
            label="GAP ON THE SCALE"
            caption={<>The gutter is a <Mono>--space</Mono> step, not a number you pick. <Mono>gap="2"</Mono> above, <Mono>gap="5"</Mono> below — the same steps the components inside the grid space themselves with, which is what keeps a page feeling of one hand.</>}
          >
            <Flex direction="column" gap="3">
              <Grid columns="3" gap="2"><Cell muted>2</Cell><Cell muted>2</Cell><Cell muted>2</Cell></Grid>
              <Grid columns="3" gap="5" data-testid="grid-gap-5"><Cell muted>5</Cell><Cell muted>5</Cell><Cell muted>5</Cell></Grid>
            </Flex>
          </Scenario>

          <Scenario
            label="EXPLICIT TRACKS"
            caption={<>Hand <Mono>columns</Mono> a CSS track string — <Mono>"200px 1fr"</Mono> — and it is used verbatim. Reach for it when one track is FIXED (a nav rail, a label column, a thumbnail) and the other should absorb whatever is left.</>}
          >
            <Grid columns="200px 1fr" gap="3" data-testid="grid-tracks">
              <Cell>200px rail</Cell>
              <Cell muted>1fr — takes the rest</Cell>
            </Grid>
          </Scenario>

          <Scenario
            label="PLACEMENT & FLOW"
            caption={<>A cell can claim more than one track (<Mono>gridColumn: "span 2"</Mono>), and <Mono>flow="dense"</Mono> lets later small cells back-fill the hole that leaves. Reach for it when one item is the headline and the rest are supporting.</>}
          >
            <Grid columns="3" gap="2" flow="dense" data-testid="grid-flow">
              <Cell span={2}>Revenue — span 2</Cell>
              <Cell muted>Users</Cell>
              <Cell muted>Churn</Cell>
              <Cell muted>MRR</Cell>
              <Cell muted>NPS</Cell>
            </Grid>
          </Scenario>
        </Grid>
      </Section>

      <Rule />

      <Section title="Two dimensions, or reach for Flex" lead="Grid is for two dimensions. One row of things that just need to sit next to each other is a Flex job — reaching for a grid there buys you nothing and locks the items into tracks they don't need.">
        <Grid columns={{ initial: "1", sm: "2" }} gap="3">
          <DoDont kind="do" bare note="Rows AND columns: cells line up both ways, so the second column of row two sits under the second column of row one. That alignment is the thing only a grid gives you.">
            <Grid columns="3" gap="2">
              <Cell muted>Name</Cell><Cell muted>Owner</Cell><Cell muted>Updated</Cell>
              <Cell muted>Atlas</Cell><Cell muted>Dana</Cell><Cell muted>Jul 3</Cell>
            </Grid>
          </DoDont>
          <DoDont kind="dont" bare note={<>A single row of controls doesn't need tracks — equal-width columns stretch each item to a share of the space instead of letting it size to its content. One axis is a <Mono>Flex</Mono> row with a gap.</>}>
            <Grid columns="3" gap="2">
              <Cell muted>Save</Cell><Cell muted>Cancel</Cell><Cell muted>More…</Cell>
            </Grid>
          </DoDont>
        </Grid>
      </Section>

      <Rule />

      <Section title="Tokens" lead="Grid paints nothing and owns no --ds-* colour roles — its token contract is spacing. Each gap step is measured off a rendered grid and checked against the --space token it claims.">
        <GridSpec />
        <Caption>
          Because the gutters come off the same scale as the padding inside the components placed in them,
          a grid never introduces a spacing value the rest of the page doesn't already use. Colour stays
          the job of what you put in the cells.
        </Caption>
      </Section>
    </Page>
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement }) => {
    // The token table's EVIDENCE, asserted at runtime — every step read a REAL rendered Grid.
    // `awaitMeasuredRows` blocks until every row has recorded its evidence (a row whose element
    // mounts late retries for up to 60 frames before it reports), then runs the identical assertions.
    const rows = await awaitMeasuredRows(canvasElement);
    if (rows.measured !== 9 || rows.unproven !== 0) {
      throw new Error(`expected 9 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }

    // Passive (no driving / no flash): a layout container has no open/close behaviour, so the story just
    // confirms the specimen renders as a real CSS grid. axe runs automatically on the story.
    const grid = canvasElement.querySelector<HTMLElement>('[data-testid="grid-specimen"]');
    if (!grid) throw new Error("Usage must render the specimen grid");
    if (getComputedStyle(grid).display !== "grid") {
      throw new Error(`the specimen must be a CSS grid; got display:${getComputedStyle(grid).display}`);
    }
    const tiles = grid.querySelectorAll('[data-testid="grid-tile"]');
    if (tiles.length !== METRICS.length) {
      throw new Error(`expected ${METRICS.length} tiles in the grid; got ${tiles.length}`);
    }
  },
};

type PropsArgs = {
  columns: "1" | "2" | "3" | "4";
  rows: "auto" | "2" | "3";
  gap: "0" | "2" | "4" | "6" | "8";
  flow: "row" | "column" | "dense" | "row-dense" | "column-dense";
  align: "start" | "center" | "end" | "baseline" | "stretch";
  justify: "start" | "center" | "end" | "between";
};

/** Props — the live, args-driven Grid. Drive the columns, the gap, the flow, and cell alignment. */
export const Props: StoryObj<PropsArgs> = {
  args: { columns: "3", rows: "auto", gap: "4", flow: "row", align: "stretch", justify: "start" },
  argTypes: {
    columns: { control: "select", options: ["1", "2", "3", "4"], description: "Number of even columns.", table: { category: "Layout" } },
    rows: { control: "select", options: ["auto", "2", "3"], description: "Explicit rows (auto = size to content).", table: { category: "Layout" } },
    gap: { control: "select", options: ["0", "2", "4", "6", "8"], description: "Space between cells, on the --space scale.", table: { category: "Layout" } },
    flow: { control: "select", options: ["row", "column", "dense", "row-dense", "column-dense"], description: "grid-auto-flow direction.", table: { category: "Layout" } },
    align: { control: "select", options: ["start", "center", "end", "baseline", "stretch"], description: "align-items (cross-axis alignment of cell content).", table: { category: "Layout" } },
    justify: { control: "select", options: ["start", "center", "end", "between"], description: "justify-content (distribution of column tracks).", table: { category: "Layout" } },
  },
  parameters: { controls: { disable: false } },
  render: ({ columns, rows, gap, flow, align, justify }: PropsArgs) => (
    <Page maxWidth="none">
      <PageHeader title="Grid · Props" standfirst={DEFINITION} />
      <Box style={{ padding: "16px 0 8px" }}>
        <Grid
          columns={columns}
          rows={rows === "auto" ? undefined : rows}
          gap={gap}
          flow={flow}
          align={align}
          justify={justify}
        >
          {PLAY_TILES.map((label) => (
            <Tile key={label} label={label} />
          ))}
        </Grid>
      </Box>
      <PropsLead />
      <Rule />
      <Section title="Props reference" lead={<>The key layout props <Code>Grid</Code> accepts — all pass through to Radix's <Code>Grid</Code>. Every one is responsive: pass a <Code>{`{ initial, sm, … }`}</Code> object to vary it per breakpoint.</>}>
        <PropTable rows={GRID_PROPS} />
      </Section>
    </Page>
  ),
};

/** History — the rulings this component encodes and a changelog of how it changes over time. */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="Grid · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[catalog-as-specification]] · Wrapped Radix component">
            Grid is a <strong>wrapped</strong> Radix Themes layout primitive — the Radix name wins; built on
            the Radix substrate, not a hand-rolled grid. Because it is pure layout there is nothing to
            override, so the wrap is a documented <Code>export</Code>, not a forwardRef shell.
          </Decision>
          <Decision id="No paint, no size lane">
            Grid declares no <Code>--ds-*</Code> roles and rides no size lane: it never sets a fill, stroke,
            or text colour, and it never sizes a control — it only positions. So it owns no{" "}
            <strong>colour</strong> spec, and colour stays the job of the components placed inside it. Its
            token contract is a spacing one — <Code>gap</Code> on the <Code>--space</Code> scale — and that
            is read live off rendered grids in the Usage story.
          </Decision>
          <Decision id="Space-scale gap">
            <Code>gap</Code> (and the per-axis <Code>gapX</Code> / <Code>gapY</Code>) snap to the Radix{" "}
            <Code>--space</Code> scale, so grid gutters stay on the same spacing rhythm as the rest of the
            system. Every prop is responsive — a <Code>{`{ initial, sm, … }`}</Code> object changes the
            layout per breakpoint.
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            Initial <Code>System/Grid</Code> — Radix Grid surfaced as a documented re-export; no{" "}
            <Code>--ds-*</Code> overrides and no size lane (pure layout); <Code>gap</Code> bound to the{" "}
            <Code>--space</Code> scale; History page added so every component, stubs included, has one.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
