import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import { Section } from "./Section";
import {
  Caption, Decision, DoDont, DODONT_LABEL, HexThemeKey, LiteTokenSpec, MeasuredRow, MeasuredSpec, Mono, NoteRow,
  Page, PageHeader, PropsLead, type PropDef, PropTable, Rule,
  // NOTE the name collision: _storyKit ALSO exports a `Section` (a docs section heading). The COMPONENT
  // under test is the Radix Section imported above; the storyKit primitive is aliased to DocSection so the
  // page never renders the wrong one.
  Section as DocSection,
} from "./_storyKit";
import { awaitMeasuredRows } from "../../foundations/_assert";

/* Section is a documented re-export of Radix Themes' vertical-rhythm block — no paint, no --ds-* roles,
   and its `size` is a VERTICAL-PADDING scale passed through untouched (never resolved via the size lane).
   It has no COLOUR spec to read, but it is not tokenless: its whole contract is a spacing one, and the
   Tokens section below reads each step's rendered padding off the DOM and names the --space token behind
   it. A passive play asserts the size class passes through unchanged. */

/* The --space step each size's vertical padding resolves to. Steps 1–3 sit on the shared scale; step 4 is
   the one Radix computes directly, because the scale tops out at --space-9 (the step-3 value) and step 4
   needs to go beyond it — so it names no token and stays a note rather than claiming one. */
const SIZE_TOKEN: Record<string, string> = { "1": "--space-5", "2": "--space-7", "3": "--space-9" };
const SIZE_STEPS = ["1", "2", "3"] as const;

/* Each step's padding is MEASURED off a rendered Section of that size and checked against the --space
   token it claims, so the numbers on the page can't drift from the component (and follow the --scaling
   factor if the theme changes it). */
function SectionSpec() {
  return (
    <LiteTokenSpec
      rationale={
        <>
          Section paints nothing and declares no <Mono>--ds-*</Mono> colour roles — its only token story is
          spacing. Each <Mono>size</Mono> step sets the block's top AND bottom padding from the shared{" "}
          <Mono>--space</Mono> scale, so a page's vertical rhythm is made of the same steps as the gaps
          inside its components. Every row below is read off a rendered Section of that size.
        </>
      }
    >
      <MeasuredSpec
        render={() => (
          <>
            {SIZE_STEPS.map((s) => (
              <Section key={s} size={s} data-probe={s} />
            ))}
          </>
        )}
      >
        {SIZE_STEPS.map((s) => (
          <MeasuredRow
            key={s}
            part={`size="${s}" padding`}
            token={SIZE_TOKEN[s]}
            select={`[data-probe="${s}"]`}
            prop="padding-top"
          />
        ))}
      </MeasuredSpec>
      <NoteRow part={`size="4" padding`} value="calc(80px × --scaling) — above the scale's top step, so it names no token" />
    </LiteTokenSpec>
  );
}

const SECTION_PROPS: PropDef[] = [
  {
    name: "size",
    type: `"1" | "2" | "3" | "4"`,
    def: `"3"`,
    desc: (
      <>
        Vertical-padding step — the block's top/bottom breathing room: <Code>1</Code> 24px, <Code>2</Code>{" "}
        40px, <Code>3</Code> 64px, <Code>4</Code> 80px. Passed through <strong>untouched</strong>; it is
        padding, not the type-size lane, so it does not follow the ambient type size. Accepts a responsive
        object, e.g. <Code>{`{ initial: "2", md: "4" }`}</Code>.
      </>
    ),
    source: "Radix",
  },
  {
    name: "display",
    type: `"none" | "initial"`,
    desc: (
      <>
        Whether the region takes part in layout. <Code>"none"</Code> removes it; <Code>"initial"</Code>{" "}
        (unset) renders it. Accepts a responsive object — the idiomatic way to drop a section on small
        screens, e.g. <Code>{`{ initial: "none", md: "initial" }`}</Code>.
      </>
    ),
    source: "Radix",
  },
  {
    name: "asChild",
    type: "boolean",
    def: "false",
    desc: (
      <>
        Merge the Section's props onto its single child instead of rendering a <Code>div</Code> — e.g. to
        let a semantic <Code>{`<section>`}</Code> element carry the rhythm.
      </>
    ),
    source: "Radix",
  },
];

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = <>A vertical-rhythm block: a page region with even top and bottom padding so stacked regions breathe consistently. Its <Mono>size</Mono> sets the padding step — not the type size.</>;

const meta: Meta<typeof Section> = {
  title: "Components/Container/Section",
  component: Section,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**Section** is a vertical-rhythm block — a page region with even, generous top and bottom " +
          "padding so stacked regions breathe consistently down a long page. It’s a thin wrapper over " +
          "Radix’s `Section`, shipped as a documented re-export. Its `size` (1–4) is a **vertical-padding** " +
          "scale (24 / 40 / 64 / 80px), the block’s breathing room — not a type-size lane, so it passes " +
          "through untouched. It paints nothing and owns no `--ds-*` roles. A **lite-tier** wrap — one " +
          "Usage specimen plus a Props.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Section>;

/* One specimen band: the tinted, bordered box IS the frame; the Section inside supplies the vertical
   padding (its `size`), and the inner Flex supplies horizontal inset only. The empty tinted space above
   and below the text is the Section's top/bottom padding at that size — the thing being demonstrated. */
function Band({
  size, testid, px, label, heading, body,
}: {
  size: "1" | "2" | "3" | "4";
  testid: string;
  px: string;
  label: string;
  heading: string;
  body: string;
}) {
  return (
    <Flex direction="column" gap="2">
      <Text size="1" style={{ color: "var(--ds-text-weak)" }}>
        <Code>{`size="${size}"`}</Code> — {px} vertical padding
      </Text>
      <Box
        style={{
          background: "var(--ds-bg-subtle)",
          border: "1px solid var(--ds-stroke-weak)",
          borderRadius: "var(--ds-radius-4)",
          overflow: "hidden",
        }}
      >
        <Section size={size} data-testid={testid}>
          <Flex direction="column" gap="1" px="6">
            <Text size="1" weight="bold" style={{ color: "var(--ds-text-weak)", letterSpacing: "0.06em" }}>
              {label}
            </Text>
            <Text as="p" size="4" weight="bold" style={{ color: "var(--ds-text-strong)" }}>
              {heading}
            </Text>
            <Text size="2" style={{ color: "var(--ds-text-weak)", maxWidth: "var(--ds-text-measure)", lineHeight: 1.6 }}>
              {body}
            </Text>
          </Flex>
        </Section>
      </Box>
    </Flex>
  );
}

/* ---- Usage specimens: the same three regions, spaced two ways ----------------
   A region label on a hairline-separated band, small enough to sit in a two-column Usage grid. The DO
   column lets Section own the vertical padding; the DON'T column hand-sets it per region, which is what
   the "just use a Box" instinct actually produces once three people have edited the page. */
const usageFrame = {
  background: "var(--ds-bg-subtle)",
  border: "1px solid var(--ds-stroke-weak)",
  borderRadius: "var(--ds-radius-4)",
  overflow: "hidden",
} as const;

function RegionLabel({ children }: { children: string }) {
  return (
    <Text size="1" weight="bold" style={{ color: "var(--ds-text-weak)", letterSpacing: "0.06em" }}>
      {children}
    </Text>
  );
}

const USAGE_REGIONS = ["OVERVIEW", "PRICING", "SUPPORT"] as const;

/** Every region on the same step — the gap between any two regions is the same, by construction. */
function EvenRhythm() {
  return (
    <Box style={usageFrame}>
      {USAGE_REGIONS.map((r, i) => (
        <Box key={r} style={i > 0 ? { borderTop: "1px solid var(--ds-stroke-weak)" } : undefined}>
          <Section size="1">
            <Flex px="4"><RegionLabel>{r}</RegionLabel></Flex>
          </Section>
        </Box>
      ))}
    </Box>
  );
}

/** The same three regions with the padding typed in per region — 24, 14, 34 — which is how it drifts. */
function DriftedRhythm() {
  return (
    <Box style={usageFrame}>
      {USAGE_REGIONS.map((r, i) => (
        <Box
          key={r}
          style={{
            padding: `${[24, 14, 34][i]}px 0`,
            borderTop: i > 0 ? "1px solid var(--ds-stroke-weak)" : undefined,
          }}
        >
          <Flex px="4"><RegionLabel>{r}</RegionLabel></Flex>
        </Box>
      ))}
    </Box>
  );
}

/** Usage — the primary lite docs story: a specimen that makes the vertical rhythm visible, plus the
 *  live spacing spec behind each step. */
export const Usage: Story = {
  // The DO/DON'T word (success/error step-11 ink on its own tint) measures 4.10 at 12px bold, under axe's
  // 4.5; the colour + the word already carry the meaning, so that row is the documented exception. Scoped
  // to the label itself — the cards' specimens stay fully axe-checked, which "[data-dodont]" did not do.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}-${globals.uiSize}`}>
    <Page>
      <PageHeader title="Section · Usage" standfirst={DEFINITION} />

      <DocSection
        title="Specimen"
        lead="Three stacked regions at different size steps. The tinted surface makes each block's top and bottom padding visible, so the size difference reads as breathing room — not as bigger type."
      >
        <Flex direction="column" gap="5">
          <Band
            size="1"
            testid="sec-1"
            px="24px"
            label="OVERVIEW"
            heading="One themeable layer"
            body="A design system layers brand-themeable tokens over a component library, so every screen inherits the same type, colour and spacing without re-deciding them each time."
          />
          <Band
            size="2"
            testid="sec-2"
            px="40px"
            label="HOW IT WORKS"
            heading="Roles, not raw values"
            body="Components read semantic roles rather than fixed colours. Swap the brand and every surface re-paints at once, because the roles resolve against the active theme."
          />
          <Band
            size="4"
            testid="sec-4"
            px="80px"
            label="ADOPTION"
            heading="The house style by default"
            body="Teams pull the same building blocks, so a new screen ships in the house style with no extra effort and design review can focus on flow instead of re-checking colour and spacing."
          />
        </Flex>

        <Caption>
          The one thing to hold onto: <Code>size</Code> is a <strong>vertical-padding</strong> scale — the
          block's top and bottom breathing room — distinct from the type-size lanes that drive control and
          text sizing. It scales the rhythm around content, never the content itself.
        </Caption>
      </DocSection>

      <Rule />

      <DocSection
        title="Why not just pad a Box"
        lead="The question this component has to answer is why not just put padding on a Box — the padding is one line either way. The answer is that Section is not a way to write padding, it is a way to stop deciding it: every region on the page draws its breathing room from the same four steps, so the rhythm holds as regions are added, reordered and rewritten by people who never see each other's values."
      >
        <Grid columns={{ initial: "1", sm: "2" }} gap="3">
          <DoDont
            kind="do"
            bare
            note={<>Three page regions, each a <Mono>Section</Mono> on the same step. The space above and below every region is identical because nobody chose it — and it stays identical when a fourth region lands next quarter. Change the step and the whole page re-times together.</>}
          >
            <EvenRhythm />
          </DoDont>
          <DoDont
            kind="dont"
            bare
            note={<>The same three regions with the padding typed in per region — 24, 14, 34. Every value looked reasonable to whoever wrote it; nothing here is a bug, and that is the problem, because there is no value to point at as wrong when the page stops feeling even.</>}
          >
            <DriftedRhythm />
          </DoDont>
        </Grid>
        <Caption>
          A <Mono>Box</Mono> with padding IS the right call for space <strong>inside</strong> a thing — the
          inset of a card, the gap between a label and its field, anywhere the number belongs to that
          component and to nothing else. Section earns its place one level up, where the spacing is a
          relationship <em>between</em> regions rather than a property of any one of them. The tell: if
          changing the number should change how one component looks, use a Box; if it should change how the
          page reads, that is a Section.
        </Caption>
      </DocSection>

      <Rule />

      <DocSection
        title="Tokens"
        lead="Section owns no colour roles — its token story is the spacing scale. Each step's padding is measured off a rendered Section of that size and checked against the --space token it claims."
      >
        <SectionSpec />
        <Caption>
          Steps <Code>1</Code>–<Code>3</Code> land on the shared <Code>--space</Code> scale, which is why a
          page's rhythm and a component's internal gaps feel like one system. Step <Code>4</Code> is the
          exception: the scale's top step is <Code>--space-9</Code>, the value step <Code>3</Code> already
          uses, so the widest breathing room is computed past it. Nothing here paints — the surface, border
          and text in the specimen above belong to the specimen, not the component.
        </Caption>
      </DocSection>
    </Page>
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement }) => {
    // The token table's EVIDENCE, asserted at runtime — each row read a REAL rendered Section of its size.
    // `awaitMeasuredRows` blocks until every row has recorded its evidence (a row whose element
    // mounts late retries for up to 60 frames before it reports), then runs the identical assertions.
    const rows = await awaitMeasuredRows(canvasElement);
    if (rows.measured !== 3 || rows.unproven !== 0) {
      throw new Error(`expected 3 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }

    // Passive (no driving, no flash): assert `size` passes through UNTOUCHED — each Section carries the
    // Radix size class matching the value given, not a resolved/shifted step. axe runs automatically.
    const checks: [string, string][] = [
      ["sec-1", "rt-r-size-1"],
      ["sec-2", "rt-r-size-2"],
      ["sec-4", "rt-r-size-4"],
    ];
    for (const [id, cls] of checks) {
      const el = canvasElement.querySelector<HTMLElement>(`[data-testid="${id}"]`);
      if (!el) throw new Error(`Specimen must render the Section "${id}"`);
      if (!el.classList.contains(cls)) {
        throw new Error(`Section ${id} must pass size through untouched → expected class ${cls}; got "${el.className}"`);
      }
    }
  },
};

type PropsArgs = {
  size: "1" | "2" | "3" | "4";
  display: "none" | "initial";
  asChild: boolean;
};

/** Props — the live, args-driven Section. Drive the vertical-padding step and layout visibility. */
export const Props: StoryObj<PropsArgs> = {
  args: { size: "3", display: "initial", asChild: false },
  argTypes: {
    size: {
      control: "inline-radio",
      options: ["1", "2", "3", "4"],
      description: "Vertical-padding step (24 / 40 / 64 / 80px). Passed through untouched — not the type-size lane.",
      table: { category: "Layout" },
    },
    display: {
      control: "inline-radio",
      options: ["none", "initial"],
      description: "Whether the section renders (initial) or is removed from layout (none).",
      table: { category: "Layout" },
    },
    asChild: {
      control: false,
      description: "Merge props onto the single child element instead of rendering a div.",
      table: { category: "Advanced" },
    },
  },
  parameters: { controls: { disable: false } },
  render: ({ size, display }: PropsArgs) => (
    <Page maxWidth="none">
      <PageHeader
        title="Section · Props"
        standfirst={<>{DEFINITION} Set <Code>display</Code> to <Code>none</Code> to drop the section from layout.</>}
      />
      <Box
        style={{
          background: "var(--ds-bg-subtle)",
          border: "1px solid var(--ds-stroke-weak)",
          borderRadius: "var(--ds-radius-4)",
          overflow: "hidden",
        }}
      >
        <Section size={size} display={display}>
          <Flex direction="column" gap="1" px="6">
            <Text as="p" size="4" weight="bold" style={{ color: "var(--ds-text-strong)" }}>Section body</Text>
            <Text size="2" style={{ color: "var(--ds-text-weak)", maxWidth: "var(--ds-text-measure)", lineHeight: 1.6 }}>
              The tinted band is the Section. The empty space above and below this text is its vertical padding
              at the chosen size — try each step to feel the rhythm change.
            </Text>
          </Flex>
        </Section>
      </Box>
      <PropsLead />
      <Rule />
      <DocSection title="Props reference" lead={<>Every prop <Code>Section</Code> accepts — all pass through to Radix's <Code>Section</Code> unchanged; margin and layout props flow through too.</>}>
        <PropTable rows={SECTION_PROPS} />
      </DocSection>
    </Page>
  ),
};

/** History — the rulings this component encodes and a changelog of how it changes over time. */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="Section · History" standfirst={DEFINITION} />
      <DocSection title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[catalog-as-specification]] · Wrapped Radix component">
            Section is a <strong>wrapped</strong> Radix Themes component — the Radix name wins; built on the
            Radix substrate + our <Code>--ds-*</Code> layer, a documented re-export rather than a hand-rolled
            block.
          </Decision>
          <Decision id="Vertical padding">
            <Code>size</Code> is a <strong>vertical-padding</strong> scale — the block's top/bottom breathing
            room (24 / 40 / 64 / 80px for <Code>1</Code>–<Code>4</Code>) — <em>not</em> a type-size lane. It is
            passed through <strong>untouched</strong>: unlike a control or a container, a Section does not ride
            the global size resolver, so its rhythm stays independent of the ambient type size.
          </Decision>
          <Decision id="No paint">
            Section owns <strong>no <Code>--ds-*</Code> roles</strong> and paints nothing — it contributes
            vertical rhythm only. Background, text and border come from whatever it wraps, so there is no
            colour spec. Its token spec is a <strong>spacing</strong> one instead: steps <Code>1</Code>–
            <Code>3</Code> resolve to <Code>--space-5</Code> / <Code>--space-7</Code> / <Code>--space-9</Code>{" "}
            on the shared scale, and step <Code>4</Code> is computed past the scale's top step.
          </Decision>
        </Flex>
      </DocSection>

      <Rule />

      <DocSection title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            Initial <Code>System/Section</Code> — Radix Section wrapped as a documented re-export; its{" "}
            <Code>size</Code> passed through as a vertical-padding scale (never resolved through the size lane);
            no paint and no <Code>--ds-*</Code> roles; History page added so every component, stubs included,
            has one.
          </Decision>
        </Flex>
      </DocSection>
    </Page>
  ),
};
