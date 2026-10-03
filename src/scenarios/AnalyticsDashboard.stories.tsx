import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Flex, Grid } from "@radix-ui/themes";
import { ArrowDown, ArrowUp, BellSimple, CaretDown, Export, Globe, Sparkle } from "@phosphor-icons/react";
import { Heading, type HeadingProps } from "../components/ui/Heading";
import { Text } from "../components/ui/Text";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { Link } from "../components/ui/Link";
import { Select } from "../components/ui/Select";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { DateRangeInput } from "../components/ui/DateRangeInput";
import { Table } from "../components/ui/Table";
import { Pagination } from "../components/ui/Pagination";
import { StatusDot } from "../components/ui/StatusDot";
import { Timestamp } from "../components/ui/Timestamp";
import { Progress } from "../components/ui/Progress";
import { Separator } from "../components/ui/Separator";
import { Skeleton } from "../components/ui/Skeleton";
import { Toolbar } from "../components/ui/Toolbar";
import { Tooltip } from "../components/ui/Tooltip";
import { ToggleButtonGroup } from "../components/ui/ToggleButtonGroup";
import { NumberInput } from "../components/ui/NumberInput";
import { EmptyState } from "../components/ui/EmptyState";
import type { DateRange } from "../dates/dateTypes";
import { useResolvedSize } from "../theme/SizeContext";

/* A generic recreation of a product analytics dashboard, at rest and full-bleed.
 *
 * CHARTS ARE HAND-DRAWN SVG ON PURPOSE. The registry ships no chart, plot or sparkline component
 * (checked: the roster has no charting entry, and `Markdown` / `CodeBlock` / `Icon` are the only
 * out-of-scope rows), so the sparklines and the time-series panel below are presentational `<svg>`
 * drawn inline inside a Card. Every stroke and fill reads a `--ds-*` semantic token through `var()`
 * — no Radix scale step, no hex — so the drawing follows the brand's collision shift like everything
 * around it. This is NOT a charting abstraction and must not grow into one: if the system ever wants
 * charts, that is a component with a registry entry, not a helper hiding in a scenario page.
 */

/* ---- data (invented) ----------------------------------------------------- */

const SESSIONS = [5120, 5480, 5310, 6040, 6620, 6180, 5890, 6450, 7210, 7880, 7540, 8320, 9050, 9410];
const PRIOR = [4890, 4720, 5010, 5180, 5320, 5100, 4980, 5240, 5490, 5610, 5380, 5720, 5940, 6080];
const AXIS_MAX = 10_000;
const DAY_LABELS: ReadonlyArray<[index: number, label: string]> = [
  [0, "Sep 4"], [3, "Sep 7"], [6, "Sep 10"], [9, "Sep 13"], [13, "Sep 17"],
];

/* `hint` is the delta's tooltip — a dashboard number that moved is the first thing a reader questions,
   so every delta carries the comparison it was computed against. `loading` marks the one tile the
   backend is still recomputing for the newly-chosen range: a dashboard fills in as its queries land. */
const KPIS = [
  {
    label: "Sessions", value: "128,412", delta: "18.4%", up: true, loading: false,
    hint: "128,412 this period against 108,441 in the 14 days before it.",
    spark: [38, 41, 39, 46, 52, 49, 58, 61, 66, 71, 69, 78, 84, 91],
  },
  {
    label: "Signups", value: "4,908", delta: "34.1%", up: true, loading: false,
    hint: "4,908 this period against 3,660 in the 14 days before it.",
    spark: [12, 13, 12, 15, 14, 17, 16, 19, 23, 27, 26, 31, 35, 38],
  },
  {
    label: "Activation rate", value: "38.6%", delta: "2.9 pts", up: true, loading: true,
    hint: "38.6% this period against 35.7% in the 14 days before it.",
    spark: [30, 31, 30, 32, 33, 32, 34, 33, 35, 36, 35, 37, 38, 39],
  },
  {
    label: "Median session", value: "4m 12s", delta: "6.8%", up: false, loading: false,
    hint: "4m 12s this period against 4m 30s in the 14 days before it.",
    spark: [58, 57, 59, 55, 54, 56, 52, 51, 53, 49, 48, 47, 45, 44],
  },
] as const;

const SOURCES = [
  { source: "Organic search", sessions: "42,180", conversion: "3.8%", change: "+12.4%", up: true },
  { source: "Referral · partner blog", sessions: "18,940", conversion: "6.2%", change: "+34.1%", up: true },
  { source: "Direct", sessions: "16,305", conversion: "2.9%", change: "-1.2%", up: false },
  { source: "Email digest", sessions: "11,720", conversion: "5.4%", change: "+8.7%", up: true },
  { source: "Paid social", sessions: "9,480", conversion: "1.7%", change: "-14.3%", up: false },
  { source: "Community forum", sessions: "6,240", conversion: "4.1%", change: "+2.2%", up: true },
] as const;

const INSIGHTS = [
  {
    body: "Signups from referral rose 34% after Tuesday's release. One partner blog post is carrying most of it, and it has not peaked yet.",
    confidence: "High confidence", tone: "success" as const, action: "Open referral breakdown",
  },
  {
    body: "Median session length fell 6.8%, but only on mobile. Desktop is flat across the same window, which points at the new onboarding sheet.",
    confidence: "Medium confidence", tone: "info" as const, action: "Compare by device",
  },
  {
    body: "Paid social conversion has slipped for nine consecutive days while spend held steady at the daily cap.",
    confidence: "Worth checking", tone: "warning" as const, action: "View campaign detail",
  },
];

// Fixed at module load so the refresh line always reads a couple of minutes old, never drifting.
const LAST_REFRESH = new Date(Date.now() - 2 * 60 * 1000).toISOString();

/* ---- SVG drawing (tokens only) ------------------------------------------- */

/** Map a series onto a box and return an SVG path command string. */
function seriesPath(values: readonly number[], max: number, x0: number, x1: number, y0: number, y1: number): string {
  const step = (x1 - x0) / (values.length - 1);
  return values
    .map((v, i) => `${i === 0 ? "M" : "L"}${(x0 + i * step).toFixed(1)} ${(y1 - (v / max) * (y1 - y0)).toFixed(1)}`)
    .join(" ");
}

function Sparkline({ values, up }: { values: readonly number[]; up: boolean }) {
  const w = 160;
  const h = 40;
  const max = Math.max(...values) * 1.15;
  const line = seriesPath(values, max, 0, w, 4, h - 2);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden focusable="false" style={{ width: "100%", height: 40, display: "block" }}>
      <path d={`${line} L${w} ${h} L0 ${h} Z`} fill="var(--ds-fill-weak)" />
      <path
        d={line}
        fill="none"
        stroke={up ? "var(--ds-fill-success)" : "var(--ds-fill-error)"}
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// The right edge stops short of the 960 viewBox so the last centred x-axis label still fits.
const PLOT = { x0: 64, x1: 918, y0: 16, y1: 248 };

function SessionsChart() {
  const { x0, x1, y0, y1 } = PLOT;
  const ticks = [0, 2500, 5000, 7500, 10_000];
  const current = seriesPath(SESSIONS, AXIS_MAX, x0, x1, y0, y1);
  const prior = seriesPath(PRIOR, AXIS_MAX, x0, x1, y0, y1);
  const step = (x1 - x0) / (SESSIONS.length - 1);
  const endY = y1 - (SESSIONS[SESSIONS.length - 1] / AXIS_MAX) * (y1 - y0);

  return (
    <svg
      viewBox="0 0 960 288"
      role="img"
      aria-label="Sessions per day for the selected range, rising from about 5,100 to about 9,400, plotted against the previous period which stays near 5,500."
      style={{ width: "100%", height: "auto", display: "block" }}
    >
      {ticks.map((t) => {
        const y = y1 - (t / AXIS_MAX) * (y1 - y0);
        return (
          <g key={t}>
            <line x1={x0} x2={x1} y1={y} y2={y} stroke="var(--ds-stroke-weak)" strokeWidth="1" />
            <text x={x0 - 12} y={y + 4} textAnchor="end" fontSize="12" fill="var(--ds-text-weak)">
              {t === 0 ? "0" : `${t / 1000}k`}
            </text>
          </g>
        );
      })}
      <path d={`${current} L${x1} ${y1} L${x0} ${y1} Z`} fill="var(--ds-fill-accent-weak)" />
      <path d={prior} fill="none" stroke="var(--ds-stroke-strong)" strokeWidth="1.5" strokeDasharray="5 4" strokeLinecap="round" />
      <path d={current} fill="none" stroke="var(--accent-indicator)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {/* [[mark-on-tint-edge]]: the same line again in --accent-mark-edge, the step that clears 3:1 and APCA Lc 30 against
          the area under the line as well as the card, so the whole line reads in the stacked shade. It
          paints nothing on the colours whose line clears both on its fill alone. */}
      <path d={current} fill="none" stroke="var(--accent-mark-edge)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x1} cy={endY} r="4" fill="var(--accent-indicator)" stroke="var(--ds-bg-base)" strokeWidth="2" />
      {/* The point's own 1px edge, inside the ring the page colour draws, as the StatusDot carries it. */}
      <circle cx={x1} cy={endY} r="2.5" fill="none" stroke="var(--accent-part-edge)" strokeWidth="1" />
      {DAY_LABELS.map(([i, label]) => (
        <text key={label} x={x0 + i * step} y={y1 + 26} textAnchor="middle" fontSize="12" fill="var(--ds-text-weak)">
          {label}
        </text>
      ))}
    </svg>
  );
}

function LegendSwatch({ paint, edge, dashed }: { paint: string; edge?: string; dashed?: boolean }) {
  return (
    <span
      aria-hidden
      style={{
        width: 18, height: dashed ? 0 : 3, flexShrink: 0,
        borderRadius: "var(--ds-radius-full)",
        background: dashed ? "transparent" : paint,
        borderTop: dashed ? `2px dashed ${paint}` : undefined,
        boxShadow: edge ? `inset 0 0 0 1px ${edge}` : undefined,
      }}
    />
  );
}

/* ---- regions -------------------------------------------------------------- */

function FilterBar() {
  const [range, setRange] = useState<DateRange>({ start: "2026-09-04", end: "2026-09-17" });
  const [env, setEnv] = useState("production");
  const [grain, setGrain] = useState("day");

  return (
    <Flex
      align="center"
      justify="between"
      gap="5"
      wrap="wrap"
      px="6"
      py="4"
      style={{ borderBottom: "1px solid var(--ds-stroke-weak)", background: "var(--ds-bg-subtle)" }}
    >
      <Flex direction="column" gap="1">
        {/* Radix Heading defaults to h1; this is the screen's only one, and it is a PAGE title, so
            it takes the page heading lane unpinned (20/24/28). It used to pin `size="6"`, which
            froze it at 24px whatever the tier said. */}
        <Heading>Product analytics</Heading>
        <Text style={{ color: "var(--ds-text-weak)" }}>
          Web and mobile web · all properties
        </Text>
      </Flex>
      {/* The SHIPPED Toolbar owns this row. This page used to declare its own `function Toolbar()`,
          which shadowed the registry component and hand-rolled the row as a `Flex align="end"`, so
          every member hung off the bottom edge instead of sharing one centre line. The component
          centres its members, seeds the control tier to every child, and draws the group rules, so
          the page only says WHICH controls belong together. The page title stays OUTSIDE the
          toolbar: `role="toolbar"` is for the control set, not for the screen heading. */}
      <Toolbar.Root
        aria-label="Report filters"
        dividers
        start={
          <>
            {/* Group 1, the slice of data: which dates, which environment. */}
            <>
              <DateRangeInput aria-label="Reporting date range" value={range} onValueChange={(v) => v && setRange(v)} width={210} />
              {/* The Select's leading-icon affix is a block wrapper, so it needs an explicit box to
                  size against. Without one it eats the whole toolbar row as a stretched flex item. */}
              <Box style={{ width: 190 }}>
                <Select value={env} onValueChange={setEnv}>
                  <Select.Trigger icon={<Globe />} aria-label="Environment" />
                  <Select.Content>
                    <Select.Item value="production">Production</Select.Item>
                    <Select.Item value="staging">Staging</Select.Item>
                    <Select.Item value="preview">Preview builds</Select.Item>
                  </Select.Content>
                </Select>
              </Box>
            </>
            {/* Group 2, the comparison the whole screen is drawn against: the grain it is bucketed
                by, and whether the prior period is drawn at all. */}
            <>
              <SegmentedControl.Root value={grain} onValueChange={setGrain} aria-label="Comparison grain">
                <SegmentedControl.Item value="day">Day</SegmentedControl.Item>
                <SegmentedControl.Item value="week">Week</SegmentedControl.Item>
                <SegmentedControl.Item value="month">Month</SegmentedControl.Item>
              </SegmentedControl.Root>
              {/* The comparison is a persistent report setting, so it is a surface Select like the
                  Environment Select in the first group. A ToggleButton is for a transient tool such as Bold.
                  The value drives nothing, because this page is a simulation. The trigger holds 12.5em, from
                  the longest option's measured width at the large tier (196px at 16px type), so choosing an
                  option never resizes it or moves the row. */}
              <Select defaultValue="previous">
                <Select.Trigger aria-label="Comparison" style={{ width: "12.5em" }} />
                <Select.Content>
                  <Select.Item value="previous">vs. previous period</Select.Item>
                  <Select.Item value="none">No comparison</Select.Item>
                </Select.Content>
              </Select>
            </>
          </>
        }
        end={
          /* Export is a PLAIN child, not `Toolbar.Button asChild`. Registering it as a roving item
             is what the component documents, and here it breaks the row: the toolbar then owns one
             roving stop, the first Tab delegates straight to Export, and the four members ahead of
             it are skipped on the way forward (measured: Tab 1 landed on Export, Tab 2 on the first
             KPI delta). Those members are inputs, which this toolbar cannot register as roving
             items by ruling (the [[toolbar-slots]] deferral). So the row keeps one tab stop per control, in
             visual order, and the toolbar contributes its role, its name and its layout. */
          <Button priority="primary">
            <Export /> Export
          </Button>
        }
      />
    </Flex>
  );
}

function MetricRow() {
  // The tile's label is a heading inside a card, so it rides chromeHeading (14/16/18, [[chrome-heading-lane]]) rather
  // than the page lane, which would put a 28px label over the number it labels.
  const tileLabel = useResolvedSize<HeadingProps["size"]>("chromeHeading", undefined);
  // The VALUE is display type — the rung above a page heading (28/35/60, [[display-size-lane]]). It used to pin
  // `size="7"`, which is exactly what this lane resolves at small, so the default tier is unchanged
  // and the figure finally grows with the tier instead of sitting in a box that inflates around it.
  const tileValue = useResolvedSize<HeadingProps["size"]>("display", undefined);
  return (
    <Grid columns={{ initial: "1", sm: "2", lg: "4" }} gap="4">
      {KPIS.map((kpi) => (
        <Card key={kpi.label}>
          <Flex direction="column" gap="3">
            {/* The LABEL is the tile's heading and the VALUE is a value. The value was an `h2`
                sized 7, which put a bare number into the document outline — a screen-reader user
                navigating by heading heard "128,412" as a section title. `Text` takes the number
                back out of the outline. */}
            <Heading as="h2" size={tileLabel} style={{ color: "var(--ds-text-weak)", fontWeight: 400 }}>
              {kpi.label}
            </Heading>
            <Flex align="baseline" gap="3" wrap="wrap">
              {/* `loading` false renders the children untouched, so one piece of markup drives both
                  states and the tile never changes shape when the query lands. */}
              <Skeleton loading={kpi.loading}>
                <Text size={tileValue} weight="bold" style={{ fontVariantNumeric: "tabular-nums", display: "block" }}>{kpi.value}</Text>
              </Skeleton>
              {kpi.loading ? (
                <Skeleton>
                  <Text weight="medium">{kpi.delta}</Text>
                </Skeleton>
              ) : (
                <Tooltip content={kpi.hint}>
                  {/* Focusable so the hint is reachable without a pointer: the delta is the one number
                      on the tile whose meaning depends on a comparison the tile does not print.
                      The row is a Text so the arrow's 1em default and the percentage read one step —
                      pinned at "2" the words stayed 14px while the glyph grew 14px -> 18px. */}
                  <Text asChild weight="medium">
                    <Flex
                      align="center" gap="1" tabIndex={0}
                      style={{
                        color: kpi.up ? "var(--ds-text-success)" : "var(--ds-text-error)",
                        borderRadius: "var(--ds-radius-2)",
                      }}
                    >
                      {kpi.up ? <ArrowUp aria-hidden /> : <ArrowDown aria-hidden />}
                      {kpi.delta}
                    </Flex>
                  </Text>
                </Tooltip>
              )}
            </Flex>
            {kpi.loading ? <Skeleton width="100%" height="40px" /> : <Sparkline values={kpi.spark} up={kpi.up} />}
            <Text style={{ color: "var(--ds-text-weak)" }}>
              {kpi.loading ? "Recomputing for this range" : "vs. previous 14 days"}
            </Text>
          </Flex>
        </Card>
      ))}
    </Grid>
  );
}

function ChartPanel() {
  // A page-level filter is a flush SegmentedControl (the toolbar's grain); a panel-local view switch is
  // a spaced ToggleButtonGroup, so the two never read as the same control at two scopes. "Area" is the
  // shape actually drawn below — the selected item has to be the truth the panel is showing.
  const [chartType, setChartType] = useState("area");
  // A panel header inside a Card: chromeHeading (14/16/18, [[chrome-heading-lane]]), not the page lane the h1 takes.
  const panelHeading = useResolvedSize<HeadingProps["size"]>("chromeHeading", undefined);
  return (
    <Card>
      <Flex direction="column" gap="4">
        <Flex align="start" justify="between" gap="4" wrap="wrap">
          <Flex direction="column" gap="1">
            <Heading as="h2" size={panelHeading}>Sessions over time</Heading>
            <Text style={{ color: "var(--ds-text-weak)" }}>
              Sep 4 – Sep 17, hourly rollup shown by day
            </Text>
          </Flex>
          <ToggleButtonGroup.Root
            type="single"
            label="Chart type"
            value={chartType}
            // A single-select ToggleGroup emits "" when the pressed item is pressed again; a chart
            // always draws as something, so an empty value is dropped rather than stored.
            onValueChange={(v: string) => { if (v) setChartType(v); }}
          >
            <ToggleButtonGroup.Item value="line">Line</ToggleButtonGroup.Item>
            <ToggleButtonGroup.Item value="bar">Bar</ToggleButtonGroup.Item>
            <ToggleButtonGroup.Item value="area">Area</ToggleButtonGroup.Item>
          </ToggleButtonGroup.Root>
        </Flex>
        <Flex align="center" justify="end" gap="4" wrap="wrap">
          <Flex align="center" gap="2">
            <LegendSwatch paint="var(--accent-indicator)" edge="var(--accent-part-edge)" />
            <Text>This period</Text>
          </Flex>
          <Flex align="center" gap="2">
            <LegendSwatch paint="var(--ds-stroke-strong)" dashed />
            <Text style={{ color: "var(--ds-text-weak)" }}>Previous period</Text>
          </Flex>
        </Flex>
        <SessionsChart />
      </Flex>
    </Card>
  );
}

function InsightsPanel() {
  const panelHeading = useResolvedSize<HeadingProps["size"]>("chromeHeading", undefined);
  return (
    <Card>
      <Flex direction="column" gap="4">
        {/* The glyph sits INSIDE the heading so Phosphor's 1em default reads the heading's own
            font-size; as a sibling in a plain Flex it would inherit the 16px root and stay frozen
            while the words stepped. It is aria-hidden, so the accessible name is unchanged. */}
        <Heading as="h2" size={panelHeading} style={{ display: "flex", alignItems: "center", gap: "var(--ds-space-8)" }}>
          <Sparkle aria-hidden style={{ color: "var(--ds-icon-interactive)", flexShrink: 0 }} />
          What changed
        </Heading>
        <Flex direction="column" gap="4">
          {INSIGHTS.map((insight, i) => (
            <Flex key={insight.action} direction="column" gap="2">
              {i > 0 && <Separator size="4" mb="2" />}
              <Text>{insight.body}</Text>
              {/* `Link` deliberately sets no size of its own — it inherits the surrounding text.
                  In a bare Flex that surrounding text is the CARD, whose font-size is the container
                  lane (14/16/18), so the action link measured a step ABOVE the insight it belongs
                  to (12/14/16). Wrapping the row in a Text supplies the right context. */}
              <Text asChild>
                <Flex align="center" justify="between" gap="3" wrap="wrap">
                  <Badge tone={insight.tone}>{insight.confidence}</Badge>
                  <Link href="#">{insight.action}</Link>
                </Flex>
              </Text>
            </Flex>
          ))}
        </Flex>
        <Text style={{ color: "var(--ds-text-weak)" }}>
          Generated from the selected range. Review before sharing.
        </Text>
      </Flex>
    </Card>
  );
}

function Breakdown() {
  const [page, setPage] = useState(1);
  const panelHeading = useResolvedSize<HeadingProps["size"]>("chromeHeading", undefined);
  return (
    <Card>
      <Flex direction="column" gap="4">
        <Heading as="h2" size={panelHeading}>Traffic by source</Heading>
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Source</Table.ColumnHeaderCell>
              {/* Table ships no sort affordance by design (D14), so the sortable columns carry a real
                  button plus aria-sort — the header itself never pretends to be interactive. No
                  `size`: pinned at "1" these stayed a 24px control while their own table rows grew
                  36px -> 48px, so the header read as a different density from the data under it. */}
              <Table.ColumnHeaderCell numeric aria-sort="descending">
                <Button priority="tertiary">Sessions <CaretDown aria-hidden /></Button>
              </Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell numeric aria-sort="none">
                <Button priority="tertiary">Conversion</Button>
              </Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell numeric>Change</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {SOURCES.map((row) => (
              <Table.Row key={row.source}>
                <Table.RowHeaderCell>{row.source}</Table.RowHeaderCell>
                <Table.Cell numeric>{row.sessions}</Table.Cell>
                <Table.Cell numeric>{row.conversion}</Table.Cell>
                <Table.Cell numeric>
                  <Text style={{ color: row.up ? "var(--ds-text-success)" : "var(--ds-text-error)" }}>{row.change}</Text>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
        <Pagination page={page} onChange={setPage} totalItems={24} pageSize={6} variant="count" label="Traffic sources" />
      </Flex>
    </Card>
  );
}

/* The threshold and the alerts it produces are ONE feature, so they share one panel: the control that
   sets the rule sits directly above the list of what the rule caught. The list being empty is the
   honest state for this range — no dialog, no hidden surface, and nothing here opens. */
function AlertsPanel() {
  const [floor, setFloor] = useState(4500);
  const panelHeading = useResolvedSize<HeadingProps["size"]>("chromeHeading", undefined);
  return (
    <Card>
      <Flex direction="column" gap="4">
        <Heading as="h2" size={panelHeading}>Session alerts</Heading>
        <NumberInput
          label="Alert below"
          description="Flags any day in the range that drops under this number."
          value={floor}
          onValueChange={setFloor}
          min={0}
          max={50_000}
          step={100}
          isIntegerOnly
          units="sessions"
          width={220}
        />
        {/* size="1" because this sits inside a Card, not on a page: at the default its h3 title
            rendered at 20px above the card's own h2 at 18px and the KPI h2s at 14px ([[empty-state-size]]). Since
            [[chrome-heading-lane]] the step is no longer inert — steps 1 and 2 read the chromeHeading lane, so this
            title now tracks the tier at 14/16/18 alongside the panel heading above it. */}
        <EmptyState
          size="1"
          icon={<BellSimple />}
          title="Nothing tripped this rule"
          description={`Every day from Sep 4 to Sep 17 stayed above ${floor.toLocaleString("en-US")} sessions.`}
        />
      </Flex>
    </Card>
  );
}

function StatusStrip() {
  return (
    <Flex
      align="center" justify="between" gap="4" wrap="wrap" px="6" py="3"
      style={{ borderTop: "1px solid var(--ds-stroke-weak)", background: "var(--ds-bg-subtle)" }}
    >
      <Flex align="center" gap="2">
        <StatusDot variant="success" label="Streaming" isPulsing />
        <Text style={{ color: "var(--ds-text-weak)" }}>Last refreshed</Text>
        <Timestamp value={LAST_REFRESH} format="relative" />
      </Flex>
      <Flex align="center" gap="3">
        <Text style={{ color: "var(--ds-text-weak)" }}>Exporting sessions-sep.csv</Text>
        <Box style={{ width: 180 }}>
          <Progress value={68} aria-label="Export progress" />
        </Box>
        <Text style={{ fontVariantNumeric: "tabular-nums" }}>68%</Text>
      </Flex>
    </Flex>
  );
}

function Dashboard() {
  return (
    <Flex direction="column" style={{ minHeight: "100vh", background: "var(--ds-bg-base)" }}>
      <FilterBar />
      <Box px="6" py="5" style={{ flex: 1 }}>
        <Flex direction="column" gap="5">
          <MetricRow />
          <Grid columns={{ initial: "1", lg: "minmax(0, 2fr) minmax(0, 1fr)" }} gap="4" align="start">
            <ChartPanel />
            <InsightsPanel />
          </Grid>
          <Grid columns={{ initial: "1", lg: "minmax(0, 2fr) minmax(0, 1fr)" }} gap="4" align="start">
            <Breakdown />
            <AlertsPanel />
          </Grid>
        </Flex>
      </Box>
      <StatusStrip />
    </Flex>
  );
}

const meta: Meta = {
  title: "UI examples/Analytics dashboard",
  parameters: {
    layout: "fullscreen",
    // Showcase pages assert nothing and are registered as fully axe-off in
    // src/foundations/axe-scope.node-check.ts under ruling [[showcases-and-fixture]]. They are visual
    // references, not evidence. The composition fixture carries the axe role.
    a11y: { test: "off" },
  },
};
export default meta;
type Story = StoryObj;

export const Screen: Story = { name: "Analytics dashboard", render: () => <Dashboard /> };
