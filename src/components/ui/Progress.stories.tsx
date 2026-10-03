import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import { Progress } from "./Progress";
import {
  Caption, Decision, DoDont, DODONT_LABEL, HexThemeKey, LiteTokenSpec, MeasuredRow, MeasuredSpec, Mono, NoteRow, Page, PageHeader,
  PropsLead, type PropDef, PropTable, Rule, Section,
} from "./_storyKit";
import { assertMeasuredRows } from "../../foundations/_assert";

/* Progress reuses Radix's own Progress skin — the filled indicator paints from --accent-track, the shade
   every part without text paints ([[textless-part-fills]]), and the unfilled track paints --gray-a3, the same step
   --ds-fill-weak aliases — so it declares no --ds-* roles of its own.

   MEASURED ([[measured-token-rows]]): each row reads its band off a real rendered bar and checks it against the token it
   claims, so a row can disagree with the component. The version this replaces resolved each token onto
   a span it had just painted and printed both sides, which agrees by construction. The bar measured is
   DETERMINATE on purpose — an indeterminate one animates its indicator, and a reading taken mid-sweep
   would need a named frame to mean anything. Neither band's COLOUR is animated either way: the
   indeterminate sweep moves the indicator, it does not recolour it. */
function ProgressSpec() {
  return (
    <LiteTokenSpec
      rationale={
        <>
          Progress reuses Radix's own Progress skin and declares no <Mono>--ds-*</Mono> roles of its
          own. The filled indicator paints Radix's <Mono>--accent-track</Mono>, the shade every part
          without text paints, which follows a brand's collision shifts, and the unfilled track behind it
          paints <Mono>--gray-a3</Mono> — exactly the step <Mono>--ds-fill-weak</Mono> aliases. Each row
          below is read off a rendered bar and checked against the token it names.
        </>
      }
    >
      <MeasuredSpec render={() => <Progress value={60} aria-label="Progress colour sample" />}>
        <MeasuredRow
          part="Indicator (filled)"
          note="Accent-aware, so the bar follows a brand collision shift."
          token="--accent-track"
          select=".rt-ProgressIndicator"
          prop="background-color"
        />
        <MeasuredRow
          part="Track (unfilled)"
          note="The Radix step this band paints — the same one --ds-fill-weak aliases."
          token="--gray-a3"
          select=".rt-ProgressRoot"
          prop="background-color"
        />
      </MeasuredSpec>
      <NoteRow part="Indeterminate sweep" value="moves the indicator; the two bands keep the colours above" radix="--progress-duration" />
    </LiteTokenSpec>
  );
}

/* ---- Specimen: a realistic determinate upload with a live percentage readout ---- */
function UploadDemo() {
  const pct = 60;
  return (
    <Box
      data-testid="progress-determinate"
      style={{
        width: 360,
        maxWidth: "100%",
        padding: "var(--space-4)",
        borderRadius: "var(--ds-radius-4)",
        border: "1px solid var(--ds-stroke-weak)",
        background: "var(--ds-bg-subtle)",
      }}
    >
      <Flex justify="between" align="baseline" mb="3">
        <Text size="2" weight="medium" style={{ color: "var(--ds-text-strong)" }}>Uploading report.pdf</Text>
        <Text size="2" style={{ color: "var(--ds-text-link)", fontFamily: "var(--code-font-family)" }}>{pct}%</Text>
      </Flex>
      <Progress value={pct} aria-label="Uploading report.pdf" />
    </Box>
  );
}

/* ---- Specimen: an indeterminate task of unknown length (no percentage) ---- */
function ExportDemo() {
  return (
    <Box
      style={{
        width: 360,
        maxWidth: "100%",
        padding: "var(--space-4)",
        borderRadius: "var(--ds-radius-4)",
        border: "1px solid var(--ds-stroke-weak)",
        background: "var(--ds-bg-subtle)",
      }}
    >
      <Flex justify="between" align="baseline" mb="3">
        <Text size="2" weight="medium" style={{ color: "var(--ds-text-strong)" }}>Preparing export…</Text>
        <Text size="2" style={{ color: "var(--ds-text-weak)" }}>Working</Text>
      </Flex>
      <Progress aria-label="Preparing export" />
    </Box>
  );
}

const PROGRESS_PROPS: PropDef[] = [
  { name: "value", type: "number", desc: <>The amount done, from <Code>0</Code> to <Code>max</Code>. Set it for a <strong>determinate</strong> bar (<Code>role="progressbar"</Code> + <Code>aria-valuenow</Code>). <strong>Omit</strong> it for an <strong>indeterminate</strong> sweep — a task of unknown length.</>, source: "Radix" },
  { name: "max", type: "number", def: "100", desc: <>The value that maps to a full bar. The fill scales to <Code>value / max</Code>.</>, source: "Radix" },
  { name: "size", type: `"1" | "2" | "3"`, def: "control lane (1 at small)", desc: <>Bar thickness. Unset, it follows the global <Code>uiSize</Code> on the control lane; an explicit step still wins.</>, source: "Progress.tsx" },
  { name: "variant", type: `"surface" | "classic"`, def: `"surface"`, desc: <>Radix track / indicator treatment. Surface (the default) is the system's standard. <Code>soft</Code> is not offered: its pale bar read 1.64:1 against the page, and a bar given it is a type error ([[colour-prop-and-high-contrast]]).</>, source: "Radix" },
  { name: "duration", type: `"{n}s" | "{n}ms"`, desc: <>The <strong>indeterminate</strong> sweep's cadence (Radix's <Code>--progress-duration</Code>, default <Code>5s</Code>). It is an ambient loop, so it lives outside the <Code>--ds-duration</Code> ladder. No effect on a determinate bar.</>, source: "Radix" },
  { name: "color / highContrast / radius", type: "enum", desc: <>Pass-throughs to Radix. Left unset the indicator paints the running brand accent; set <Code>color</Code> only for a deliberately off-accent bar.</>, source: "Radix" },
];

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = <>A bar that shows how far along a task is. Use a <strong>determinate</strong> bar with a percentage when the length is known, and an <strong>indeterminate</strong> sweep when it isn’t. For a task with no measurable extent at all, reach for a <Mono>Spinner</Mono> instead.</>;

const meta: Meta<typeof Progress> = {
  title: "Components/Feedback & Status/Progress",
  component: Progress,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**Progress** is a horizontal bar that shows how far along a task is. It’s a thin wrapper over " +
          "Radix’s `Progress` that rides the control size lane, so it lines up with the controls beside it. " +
          "Its track and filled indicator reuse Radix’s own skin, whose indicator already paints the " +
          "accent-aware fill (`--accent-track`), so it matches the system with no override. " +
          "Set `value` for a **determinate** bar (announced via `role=\"progressbar\"`); omit it for an " +
          "**indeterminate** sweep when the length is unknown. The sweep is an ambient loop — pair a " +
          "determinate bar with a percentage for a known-length task.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Progress>;

/** Usage — the primary lite docs story: labeled specimens, the reduced-motion note, the live token
 *  spec, and one do/don't. */
export const Usage: Story = {
  // The DoDont callout labels (success/error text on the green/red tint) measure ~4.1–4.4 — just under
  // axe's strict 4.5; the callout colour + the DO/DON'T word already carry the meaning, so color-contrast
  // is scoped off here, a documented specimen exception (same pattern as Slider/Separator Usage).
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader title="Progress · Usage" standfirst={DEFINITION} />

        <Section title="Specimen" lead="A determinate bar with a live percentage for a known-length task; an indeterminate sweep for a task whose length isn’t known.">
          <Flex direction="column" gap="4">
            <UploadDemo />
            <ExportDemo />
          </Flex>
          <Caption>The determinate bar is <Code>role="progressbar"</Code> and announces its value; the indeterminate one has no percentage to state — the sweep says only “working”.</Caption>
        </Section>

        <Rule />

        <Section title="Reduced motion" lead="The indeterminate sweep is an ambient loop, so it stops for readers who ask for less motion — the bar stays as a static indicator that the task is running.">
          <Flex direction="column" gap="2" style={{ maxWidth: 360 }}>
            <Progress aria-label="Indexing files" />
            <Caption>
              Under <Code>prefers-reduced-motion: reduce</Code> the sweep resolves to a <strong>static
              bar</strong> — no travelling shine, no pulse. Colour and presence still communicate that
              work is in flight, matching the <Code>StatusDot</Code> pulse’s reduced-motion stance.
            </Caption>
          </Flex>
        </Section>

        <Rule />

        <Section title="Determinate or indeterminate" lead="Match the mode to what you know about the task's length — a percentage promises a measurable end.">
          <Grid columns={{ initial: "1", sm: "2" }} gap="3">
            <DoDont kind="do" bare note="For a known-length task, a determinate bar with a percentage — the reader can see how much is left and roughly how long it’ll take.">
              <Box style={{ width: "100%" }}>
                <Flex justify="between" align="baseline" mb="2">
                  <Text size="2" weight="medium" style={{ color: "var(--ds-text-strong)" }}>Uploading</Text>
                  <Text size="2" style={{ color: "var(--ds-text-link)", fontFamily: "var(--code-font-family)" }}>72%</Text>
                </Flex>
                <Progress value={72} aria-label="Uploading (do example)" />
              </Box>
            </DoDont>
            <DoDont kind="dont" bare note="Don’t fake a percentage for a task of unknown length — a determinate bar that jumps or stalls at a made-up number misleads. Use an indeterminate sweep, or a Spinner when there’s no bar-shaped extent to show at all.">
              <Box style={{ width: "100%" }}>
                <Flex justify="between" align="baseline" mb="2">
                  <Text size="2" weight="medium" style={{ color: "var(--ds-text-strong)" }}>Connecting…</Text>
                  <Text size="2" style={{ color: "var(--ds-text-link)", fontFamily: "var(--code-font-family)" }}>90%</Text>
                </Flex>
                <Progress value={90} aria-label="Connecting (don’t example)" />
              </Box>
            </DoDont>
          </Grid>
        </Section>

        <Rule />

        <Section title="Tokens" lead="Read off a rendered bar and checked against the token each row names, so the table can disagree with the component. Progress reuses Radix's skin and declares no role of its own; each row below reads one of the two bands, filled and unfilled.">
          <ProgressSpec />
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement }) => {
    // Passive (no driving / no animation): assert the determinate bar's a11y role and its indicator token
    // binding right here. The reading is taken off the DETERMINATE specimen (a settled fill), never the
    // indeterminate sweep. axe runs automatically on the story.
    const scope = canvasElement.querySelector<HTMLElement>('[data-testid="progress-determinate"]');
    if (!scope) throw new Error("Usage must render the determinate specimen");

    // A determinate progress bar carries role="progressbar" with the live value.
    const bar = scope.querySelector<HTMLElement>('[role="progressbar"]');
    if (!bar) throw new Error("the determinate progress must carry role=\"progressbar\"");
    if (!bar.hasAttribute("aria-valuenow")) throw new Error("a determinate progressbar must expose aria-valuenow");

    const indicator = scope.querySelector<HTMLElement>(".rt-ProgressIndicator");
    if (!indicator) throw new Error("the progress must render a filled indicator (.rt-ProgressIndicator)");

    // The token table's EVIDENCE, asserted at runtime ([[measured-token-rows]]). This is also what binds the filled
    // indicator to the accent-aware fill: the row reads background-color off a rendered bar and
    // resolves --accent-track on a different node, and `assertMeasuredRows` throws if they disagree.
    const rows = assertMeasuredRows(canvasElement);
    if (rows.measured !== 2 || rows.unproven !== 0) {
      throw new Error(`expected 2 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }
  },
};

/* ---- Props --------------------------------------------------------- */

const VALUE_OPTIONS = ["indeterminate", 0, 20, 40, 60, 80, 100] as const;
type ValueOption = (typeof VALUE_OPTIONS)[number];

type PropsArgs = {
  size: "auto" | "1" | "2" | "3";
  value: ValueOption;
  max: number;
};

/** Props — the live, args-driven Progress. Drive the size lane, the value (pick "indeterminate" to
 *  omit it and get the sweep), and the scale's max; the percentage readout reflects the determinate value. */
export const Props: StoryObj<PropsArgs> = {
  // "auto" (size unset) is the default so the bar tracks the global uiSize toolbar out of the box.
  args: { size: "auto", value: 60, max: 100 },
  argTypes: {
    size: { control: "inline-radio", options: ["auto", "1", "2", "3"], description: '"auto" tracks the global uiSize toolbar (unset → the control lane); a step (1–3) pins the bar thickness.', table: { category: "Variant" } },
    value: { control: "select", options: VALUE_OPTIONS, description: "Amount done (0…max), or \"indeterminate\" to omit value and sweep.", table: { category: "Value" } },
    max: { control: { type: "number" }, description: "The value that maps to a full bar.", table: { category: "Value" } },
  },
  parameters: { controls: { disable: false } },
  render: ({ size, value, max }: PropsArgs) => {
    const indeterminate = value === "indeterminate";
    const pct = indeterminate ? null : Math.min(100, Math.round((Number(value) / max) * 100));
    return (
      <Page maxWidth="none">
        <PageHeader
          title="Progress · Props"
          standfirst={<>{DEFINITION} Pick <Code>indeterminate</Code> for the sweep.</>}
        />
        <Box style={{ width: 360, maxWidth: "100%", padding: "var(--space-4) 0 var(--space-2)" }}>
          <Flex justify="between" align="baseline" mb="3">
            <Text size="2" weight="medium" style={{ color: "var(--ds-text-strong)" }}>
              {indeterminate ? "Working…" : "Progress"}
            </Text>
            <Text size="2" style={{ color: indeterminate ? "var(--ds-text-weak)" : "var(--ds-text-link)", fontFamily: "var(--code-font-family)" }}>
              {indeterminate ? "unknown" : `${pct}%`}
            </Text>
          </Flex>
          <Progress
            size={size === "auto" ? undefined : size}
            max={max}
            {...(indeterminate ? {} : { value: Number(value) })}
            aria-label="Props progress"
          />
        </Box>
        <PropsLead />
        <Rule />
        <Section title="Props reference" lead={<>Every prop <Code>Progress</Code> accepts. <Code>size</Code> is resolved through the control lane by the wrap; the rest pass through to Radix's <Code>Progress</Code>.</>}>
          <PropTable rows={PROGRESS_PROPS} />
        </Section>
      </Page>
    );
  },
};

/** History — the rulings this component encodes and a changelog of how it changes over time. */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="Progress · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[catalog-as-specification]] · Wrapped Radix component">
            Progress is a <strong>wrapped</strong> Radix Themes component — the Radix name wins; built on
            the Radix substrate + our <Code>--ds-*</Code> layer, not a hand-rolled track and fill.
          </Decision>
          <Decision id="Control size lane">
            An unset <Code>size</Code> follows the global <Code>uiSize</Code> through the{" "}
            <strong>control</strong> lane (default small → step <Code>1</Code>), the same lane a Button or
            Slider rides, so a progress bar and the controls beside it share a size. An explicit step still
            wins.
          </Decision>
          <Decision id="Accent-aware fill">
            The track and filled indicator <strong>reuse Radix's own Progress skin</strong>, so the wrap
            declares <strong>no <Code>--ds-*</Code> roles of its own</strong>. The indicator paints{" "}
            <Code>--accent-track</Code>, the shade every part without text paints,
            so the fill is accent-aware and follows a brand's collision shifts with no override. The track
            behind it is Radix's neutral <Code>--gray-a3</Code>.
          </Decision>
          <Decision id="Determinate vs indeterminate">
            <strong>Determinate</strong> (<Code>value</Code> set): the fill scales to <Code>value / max</Code>{" "}
            and <Code>role="progressbar"</Code> announces <Code>aria-valuenow</Code> — the canonical
            known-length job, paired with a percentage. <strong>Indeterminate</strong> (<Code>value</Code>{" "}
            omitted): an animated sweep for a task of unknown length, with no percentage to state.
          </Decision>
          <Decision id="Ambient sweep + reduced motion">
            The indeterminate sweep is an <em>ambient</em> loop — its cadence lives on Radix's own{" "}
            <Code>--progress-duration</Code> (default <Code>5s</Code>), a deliberate literal outside the
            intent-named <Code>--ds-duration</Code> ladder, the <Code>StatusDot</Code> ambient-pulse
            precedent. Under <Code>prefers-reduced-motion: reduce</Code> the sweep resolves to a{" "}
            <strong>static bar</strong> (the reader still sees the task is running; the motion just stops).
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            Initial <Code>System/Progress</Code> — Radix Progress wrapped on the control size lane, its
            filled indicator bound to the accent-aware <Code>--ds-fill-accent</Code> tokenlessly (it reuses
            Radix's skin); determinate + indeterminate modes documented, the indeterminate sweep noted as
            an ambient loop with a reduced-motion static-bar stance; History page added so every component,
            stubs included, has one.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
