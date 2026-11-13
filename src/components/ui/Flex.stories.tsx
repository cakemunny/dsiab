import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box } from "./Box";
import { Code } from "./Code";
import { Flex } from "./Flex";
import { Grid } from "./Grid";
import { Text } from "./Text";
import {
  Caption, Decision, DoDont, DODONT_LABEL, HexThemeKey, MeasuredRow, MeasuredSpec, Mono, Page, PageHeader,
  PropsLead, type PropDef, PropTable, Rule, Scenario, Section, TokenGroup,
} from "./_storyKit";
import { awaitMeasuredRows } from "../../foundations/_assert";

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = (
  <>
    Flex places its children along one axis, a row or a column, with a gap from the shared spacing
    scale between them. Every prop takes a breakpoint object, so a row can become a column on a phone.
    It is pure layout: no paint, no size lane.
  </>
);

/* Flex declares no --ds-* paint roles and rides no size lane. Its token contract is spacing: `gap` snaps
   to the --space scale, and the Tokens section reads each step's rendered gutter off the DOM. */

function Chip({ children, grow }: { children: string; grow?: boolean }) {
  return (
    <Box
      data-testid="flex-chip"
      flexGrow={grow ? "1" : undefined}
      p="2"
      style={{ background: "var(--ds-bg-subtle)", border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)" }}
    >
      <Text size="1" style={{ color: "var(--ds-text-strong)" }}>{children}</Text>
    </Box>
  );
}

const GAP_STEPS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

function FlexSpec() {
  return (
    <TokenGroup
      label="GAP · THE SPACING SCALE"
      specimen={
        <Flex gap="4">
          {["", "", ""].map((_, i) => (
            <Box key={i} style={{ width: 56, height: 26, borderRadius: "var(--ds-radius-2)", background: "var(--ds-fill-accent-weak)", border: "1px solid var(--ds-stroke-accent-weak)" }} />
          ))}
        </Flex>
      }
      blurb="Three items at gap=4. Every step below is measured off a rendered Flex and checked against the token it claims."
    >
      <MeasuredSpec
        render={() => (
          <>
            {GAP_STEPS.map((s) => (
              <Flex key={s} gap={s} data-probe={s}>
                <Box /><Box />
              </Flex>
            ))}
          </>
        )}
      >
        {GAP_STEPS.map((s) => (
          <MeasuredRow key={s} part={`gap="${s}"`} token={`--space-${s}`} select={`[data-probe="${s}"]`} prop="column-gap" />
        ))}
      </MeasuredSpec>
    </TokenGroup>
  );
}

const FLEX_PROPS: PropDef[] = [
  { name: "direction", type: `"row" | "column" | "row-reverse" | "column-reverse"`, desc: <>The axis the children run along; <Code>row</Code> by default.</>, source: "Radix" },
  { name: "gap", type: `"0"–"9" | string`, desc: <>Space between children, snapped to the <Code>--space</Code> scale. <Code>gapX</Code> / <Code>gapY</Code> set a single axis.</>, source: "Radix" },
  { name: "align", type: `"start" | "center" | "end" | "baseline" | "stretch"`, desc: <>Cross-axis alignment (<Code>align-items</Code>).</>, source: "Radix" },
  { name: "justify", type: `"start" | "center" | "end" | "between"`, desc: <>Main-axis distribution (<Code>justify-content</Code>).</>, source: "Radix" },
  { name: "wrap", type: `"nowrap" | "wrap" | "wrap-reverse"`, desc: <>Whether children may wrap onto further lines; <Code>nowrap</Code> by default.</>, source: "Radix" },
  { name: "p, m, width, flexGrow …", type: "Box layout props", desc: <>Every Box layout prop applies too: padding and margin on the <Code>--space</Code> scale, size, position and flex-item props.</>, source: "Radix" },
];

const meta: Meta<typeof Flex> = {
  title: "Components/Container/Flex",
  component: Flex,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**Flex** is Radix Themes' one-axis layout primitive, surfaced under the System import. It " +
          "carries no `--ds-*` overrides and no size lane: pure layout, never paint. `gap` snaps to the " +
          "`--space` scale, and every prop is responsive.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Flex>;

/** Usage — the primary lite docs story: the specimen, the layouts Flex is reached for, the live spacing
 *  spec, and the one honest do/don't. */
export const Usage: Story = {
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}-${globals.uiSize}`}>
    <Page>
      <PageHeader title="Flex · Usage" standfirst={DEFINITION} />

      <Section title="Specimen" lead="A row of filter chips with a gap from the shared spacing scale, wrapping onto a second line when the panel is narrow.">
        <Flex direction="column" gap="4">
          <Flex gap="2" wrap="wrap" data-testid="flex-specimen">
            {["All", "Open", "In review", "Merged", "Closed", "Drafts", "Mine"].map((c) => <Chip key={c}>{c}</Chip>)}
          </Flex>
          <Caption>
            Written as <Code>{`<Flex gap="2" wrap="wrap">`}</Code>. Each chip sizes to its own label; a grid
            would force them into equal tracks.
          </Caption>
        </Flex>
      </Section>

      <Rule />

      <Section title="Layouts" lead="The things a Flex is reached for. Each is a different prop doing the work.">
        <Grid columns={{ initial: "1", sm: "2" }} gapX="6" gapY="5">
          <Scenario label="A ROW WITH A GAP" caption={<>The default: children in a row, <Mono>gap</Mono> between them on the <Mono>--space</Mono> scale.</>}>
            <Flex gap="3" data-testid="flex-row"><Chip>Name</Chip><Chip>Owner</Chip><Chip>Updated</Chip></Flex>
          </Scenario>
          <Scenario label="A COLUMN" caption={<><Mono>direction="column"</Mono> stacks the same children, for a form or a settings list.</>}>
            <Flex direction="column" gap="2" data-testid="flex-column"><Chip>Profile</Chip><Chip>Security</Chip><Chip>Billing</Chip></Flex>
          </Scenario>
          <Scenario label="ONE ITEM TAKES THE REST" caption={<>A child with <Mono>flexGrow="1"</Mono> absorbs the free space, so a search field fills the row beside a fixed control.</>}>
            <Flex gap="2" data-testid="flex-grow"><Chip grow>Search issues…</Chip><Chip>Filter</Chip></Flex>
          </Scenario>
          <Scenario label="A RESPONSIVE AXIS" caption={<>A breakpoint object — <Mono>{`{ initial: "column", sm: "row" }`}</Mono> — stacks on a phone and lines up on a wider screen.</>}>
            <Flex direction={{ initial: "column", sm: "row" }} gap="2" data-testid="flex-responsive"><Chip>Step 1</Chip><Chip>Step 2</Chip><Chip>Step 3</Chip></Flex>
          </Scenario>
        </Grid>
      </Section>

      <Rule />

      <Section title="One axis, or reach for Grid" lead="Flex is for one axis. When cells must line up across rows as well as along them, that is a Grid.">
        <Grid columns={{ initial: "1", sm: "2" }} gap="3">
          <DoDont kind="do" bare note="One row of things that size to their content: Flex lets each keep its own width, with one gap between them.">
            <Flex gap="2"><Chip>Save</Chip><Chip>Cancel</Chip><Chip>More…</Chip></Flex>
          </DoDont>
          <DoDont kind="dont" bare note={<>Rows of a table built from Flex rows: nothing lines the columns up, so the second row's cells drift out from under the first. Two dimensions are a <Mono>Grid</Mono> job.</>}>
            <Flex direction="column" gap="2">
              <Flex gap="2"><Chip>Name</Chip><Chip>Owner</Chip><Chip>Updated</Chip></Flex>
              <Flex gap="2"><Chip>Atlas project</Chip><Chip>Dana</Chip><Chip>Jul 3</Chip></Flex>
            </Flex>
          </DoDont>
        </Grid>
      </Section>

      <Rule />

      <Section title="Tokens" lead="Flex paints nothing and owns no --ds-* colour roles. Its token contract is spacing: each gap step is measured off a rendered Flex and checked against the --space token it claims.">
        <FlexSpec />
      </Section>
    </Page>
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement }) => {
    const rows = await awaitMeasuredRows(canvasElement);
    if (rows.measured !== 9 || rows.unproven !== 0) {
      throw new Error(`expected 9 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }
    const flex = canvasElement.querySelector<HTMLElement>('[data-testid="flex-specimen"]');
    if (!flex) throw new Error("Usage must render the specimen Flex");
    if (getComputedStyle(flex).display !== "flex") throw new Error(`the specimen must be a flex container; got display:${getComputedStyle(flex).display}`);
    const column = canvasElement.querySelector<HTMLElement>('[data-testid="flex-column"]');
    if (!column || getComputedStyle(column).flexDirection !== "column") throw new Error("the column scenario must lay out as a column");
  },
};

type PropsArgs = {
  direction: "row" | "column";
  gap: "0" | "2" | "3" | "4" | "6" | "8";
  align: "start" | "center" | "end" | "baseline" | "stretch";
  justify: "start" | "center" | "end" | "between";
  wrap: "nowrap" | "wrap";
};

/** Props — the live, args-driven Flex. */
export const Props: StoryObj<PropsArgs> = {
  args: { direction: "row", gap: "3", align: "center", justify: "start", wrap: "wrap" },
  argTypes: {
    direction: { control: "select", options: ["row", "column"], description: "The axis children run along.", table: { category: "Layout" } },
    gap: { control: "select", options: ["0", "2", "3", "4", "6", "8"], description: "Space between children, on the --space scale.", table: { category: "Layout" } },
    align: { control: "select", options: ["start", "center", "end", "baseline", "stretch"], description: "align-items.", table: { category: "Layout" } },
    justify: { control: "select", options: ["start", "center", "end", "between"], description: "justify-content.", table: { category: "Layout" } },
    wrap: { control: "select", options: ["nowrap", "wrap"], description: "flex-wrap.", table: { category: "Layout" } },
  },
  parameters: { controls: { disable: false } },
  render: ({ direction, gap, align, justify, wrap }: PropsArgs) => (
    <Page maxWidth="none">
      <PageHeader title="Flex · Props" standfirst={DEFINITION} />
      <Box py="4">
        <Flex direction={direction} gap={gap} align={align} justify={justify} wrap={wrap}>
          {["Overview", "Activity", "Billing", "Members", "Reports"].map((l) => <Chip key={l}>{l}</Chip>)}
        </Flex>
      </Box>
      <PropsLead />
      <Rule />
      <Section title="Props reference" lead={<>The key layout props <Code>Flex</Code> accepts — all pass through to Radix's <Code>Flex</Code>, and every one is responsive.</>}>
        <PropTable rows={FLEX_PROPS} />
      </Section>
    </Page>
  ),
};

/** History — the rulings this component encodes and a changelog of how it changes over time. */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="Flex · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[system-layout-layers]] · A system layer, not a raw import">
            Flex is published by the system, so every part of it, its pages included, imports layout from
            the system and never from Radix directly. Because it is pure layout there is nothing to override,
            so the wrap is a documented <Code>export</Code>, as Grid's is.
          </Decision>
          <Decision id="[[surface-wraps]] · No paint, no size lane">
            Flex declares no <Code>--ds-*</Code> roles and rides no size lane. Its token contract is spacing —{" "}
            <Code>gap</Code> on the <Code>--space</Code> scale — read live off rendered elements in the Usage story.
          </Decision>
        </Flex>
      </Section>
      <Rule />
      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="Unreleased">
            Initial <Code>System/Flex</Code> — Radix Flex surfaced as a documented re-export, so code built on
            the system stops importing layout from Radix directly.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
