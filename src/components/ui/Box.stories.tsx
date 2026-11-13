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
    Box is one container element: it takes padding and margin from the shared spacing scale, and size,
    position and flex-item props, so one part of a page can be spaced and placed without a stylesheet.
    It is pure layout: no paint, no size lane.
  </>
);

/* Box declares no --ds-* paint roles and rides no size lane. Its token contract is spacing: padding and
   margin snap to the --space scale, and the Tokens section reads each padding step off the DOM. */

const SURFACE = { background: "var(--ds-bg-subtle)", border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)" } as const;

const PAD_STEPS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

function BoxSpec() {
  return (
    <TokenGroup
      label="PADDING · THE SPACING SCALE"
      specimen={
        <Box p="4" style={SURFACE}>
          <Box style={{ height: 26, borderRadius: "var(--ds-radius-2)", background: "var(--ds-fill-accent-weak)", border: "1px solid var(--ds-stroke-accent-weak)" }} />
        </Box>
      }
      blurb="A Box at p=4. Every step below is measured off a rendered Box and checked against the token it claims."
    >
      <MeasuredSpec render={() => <>{PAD_STEPS.map((s) => <Box key={s} p={s} data-probe={s} />)}</>}>
        {PAD_STEPS.map((s) => (
          <MeasuredRow key={s} part={`p="${s}"`} token={`--space-${s}`} select={`[data-probe="${s}"]`} prop="padding-top" />
        ))}
      </MeasuredSpec>
    </TokenGroup>
  );
}

const BOX_PROPS: PropDef[] = [
  { name: "p, px, py, pt, pr, pb, pl", type: `"0"–"9" | string`, desc: <>Padding, snapped to the <Code>--space</Code> scale.</>, source: "Radix" },
  { name: "m, mx, my, mt, mr, mb, ml", type: `"0"–"9" | "-1"–"-9" | string`, desc: <>Margin on the same scale, negative steps included.</>, source: "Radix" },
  { name: "width, height, minWidth, maxWidth …", type: "string", desc: <>Size, as any CSS length.</>, source: "Radix" },
  { name: "display", type: `"none" | "inline" | "inline-block" | "block" | "contents"`, desc: <>The element's display; <Code>none</Code> hides it at a breakpoint.</>, source: "Radix" },
  { name: "position, inset, top …", type: `"static" | "relative" | "absolute" | "fixed" | "sticky"`, desc: <>Positioning, for an overlay or a pinned part.</>, source: "Radix" },
  { name: "flexGrow, flexShrink, flexBasis, gridColumn …", type: "string", desc: <>How the Box behaves as the child of a Flex or a Grid.</>, source: "Radix" },
  { name: "as, asChild", type: `"div" | "span" | boolean`, desc: <>Render a span in place of the div, or merge the props onto the single child.</>, source: "Radix" },
];

const meta: Meta<typeof Box> = {
  title: "Components/Container/Box",
  component: Box,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**Box** is Radix Themes' container element, surfaced under the System import. It carries no " +
          "`--ds-*` overrides and no size lane: pure layout, never paint. Padding and margin snap to the " +
          "`--space` scale, and every layout prop is responsive.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Box>;

/** Usage — the primary lite docs story: the specimen, what a Box is reached for, the live spacing spec,
 *  and the one honest do/don't. */
export const Usage: Story = {
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}-${globals.uiSize}`}>
    <Page>
      <PageHeader title="Box · Usage" standfirst={DEFINITION} />

      <Section title="Specimen" lead="A padded panel: the padding comes from the shared spacing scale, and the paint comes from the system's roles, applied by the part that owns them.">
        <Flex direction="column" gap="4">
          <Box p="4" style={SURFACE} data-testid="box-specimen">
            <Text as="p" size="2" weight="medium" style={{ color: "var(--ds-text-strong)" }}>Weekly summary</Text>
            <Text as="p" size="1" mt="1" style={{ color: "var(--ds-text-weak)" }}>12 issues closed, 4 opened.</Text>
          </Box>
          <Caption>
            Written as <Code>{`<Box p="4">`}</Code>. The panel's fill and edge are roles read in a style; Box
            itself adds only the padding.
          </Caption>
        </Flex>
      </Section>

      <Rule />

      <Section title="Layouts" lead="What a Box is reached for. Each is a different prop doing the work.">
        <Grid columns={{ initial: "1", sm: "2" }} gapX="6" gapY="5">
          <Scenario label="PADDING ON THE SCALE" caption={<><Mono>p</Mono>, <Mono>px</Mono> and <Mono>py</Mono> take <Mono>--space</Mono> steps, so a panel's padding matches the components inside it.</>}>
            <Box px="5" py="3" style={SURFACE} data-testid="box-padding"><Text size="1">px="5" py="3"</Text></Box>
          </Scenario>
          <Scenario label="A FLEX OR GRID CHILD" caption={<>A Box inside a Flex takes <Mono>flexGrow</Mono>, <Mono>flexBasis</Mono> or <Mono>gridColumn</Mono>, so one item claims more room than its siblings.</>}>
            <Flex gap="2"><Box flexGrow="1" p="2" style={SURFACE}><Text size="1">flexGrow="1"</Text></Box><Box p="2" style={SURFACE}><Text size="1">fixed</Text></Box></Flex>
          </Scenario>
          <Scenario label="HIDDEN AT A BREAKPOINT" caption={<>A breakpoint object on <Mono>display</Mono> — <Mono>{`{ initial: "none", md: "block" }`}</Mono> — removes a part on a phone.</>}>
            <Box display={{ initial: "none", md: "block" }} p="2" style={SURFACE}><Text size="1">Shown from md up</Text></Box>
          </Scenario>
          <Scenario label="A POSITIONED PART" caption={<><Mono>position</Mono> and <Mono>inset</Mono> pin a part, a badge on a corner, without a stylesheet.</>}>
            <Box position="relative" p="5" style={SURFACE}>
              <Box position="absolute" top="2" right="2" px="2" style={{ ...SURFACE, background: "var(--ds-fill-accent-weak)" }}><Text size="1">New</Text></Box>
            </Box>
          </Scenario>
        </Grid>
      </Section>

      <Rule />

      <Section title="A container, or reach for Flex" lead="Box spaces one element. When it arranges its children, a Flex or a Grid says so, and keeps the gap on the scale.">
        <Grid columns={{ initial: "1", sm: "2" }} gap="3">
          <DoDont kind="do" bare note="A row of items in a Flex with a gap: the spacing is one value, set once, on the scale.">
            <Flex gap="2"><Box p="2" style={SURFACE}><Text size="1">Save</Text></Box><Box p="2" style={SURFACE}><Text size="1">Cancel</Text></Box></Flex>
          </DoDont>
          <DoDont kind="dont" bare note={<>A margin on each Box to space a row: the gap is repeated on every child, and the last one carries a margin nothing needs. Arranging children is a <Mono>Flex</Mono> job.</>}>
            <Box><Box display="inline-block" mr="2" p="2" style={SURFACE}><Text size="1">Save</Text></Box><Box display="inline-block" mr="2" p="2" style={SURFACE}><Text size="1">Cancel</Text></Box></Box>
          </DoDont>
        </Grid>
      </Section>

      <Rule />

      <Section title="Tokens" lead="Box paints nothing and owns no --ds-* colour roles. Its token contract is spacing: each padding step is measured off a rendered Box and checked against the --space token it claims.">
        <BoxSpec />
      </Section>
    </Page>
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement }) => {
    const rows = await awaitMeasuredRows(canvasElement);
    if (rows.measured !== 9 || rows.unproven !== 0) {
      throw new Error(`expected 9 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }
    const box = canvasElement.querySelector<HTMLElement>('[data-testid="box-specimen"]');
    if (!box) throw new Error("Usage must render the specimen Box");
    // --space-4 is a calc() over --scaling, so it is resolved through a probe, not read as text.
    const probe = document.createElement("div");
    probe.style.width = "var(--space-4)";
    box.appendChild(probe);
    const want = getComputedStyle(probe).width;
    probe.remove();
    const pad = getComputedStyle(box).paddingTop;
    if (pad !== want) throw new Error(`the specimen's padding reads ${pad}, not --space-4 (${want})`);
  },
};

type PropsArgs = { p: "0" | "2" | "4" | "6" | "8"; display: "block" | "inline-block" };

/** Props — the live, args-driven Box. */
export const Props: StoryObj<PropsArgs> = {
  args: { p: "4", display: "block" },
  argTypes: {
    p: { control: "select", options: ["0", "2", "4", "6", "8"], description: "Padding, on the --space scale.", table: { category: "Layout" } },
    display: { control: "select", options: ["block", "inline-block"], description: "display.", table: { category: "Layout" } },
  },
  parameters: { controls: { disable: false } },
  render: ({ p, display }: PropsArgs) => (
    <Page maxWidth="none">
      <PageHeader title="Box · Props" standfirst={DEFINITION} />
      <Box py="4">
        <Box p={p} display={display} style={SURFACE}><Text size="2">A Box at p="{p}"</Text></Box>
      </Box>
      <PropsLead />
      <Rule />
      <Section title="Props reference" lead={<>The key layout props <Code>Box</Code> accepts — all pass through to Radix's <Code>Box</Code>, and every one is responsive.</>}>
        <PropTable rows={BOX_PROPS} />
      </Section>
    </Page>
  ),
};

/** History — the rulings this component encodes and a changelog of how it changes over time. */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="Box · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[system-layout-layers]] · A system layer, not a raw import">
            Box is published by the system, so every part of it, its pages included, imports layout from the
            system and never from Radix directly. Because it is pure layout there is nothing to override, so
            the wrap is a documented <Code>export</Code>, as Grid's is.
          </Decision>
          <Decision id="[[surface-wraps]] · No paint, no size lane">
            Box declares no <Code>--ds-*</Code> roles and rides no size lane. Its token contract is spacing —
            padding and margin on the <Code>--space</Code> scale — read live off rendered elements in the
            Usage story.
          </Decision>
        </Flex>
      </Section>
      <Rule />
      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="Unreleased">
            Initial <Code>System/Box</Code> — Radix Box surfaced as a documented re-export, so code built on
            the system stops importing layout from Radix directly.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
