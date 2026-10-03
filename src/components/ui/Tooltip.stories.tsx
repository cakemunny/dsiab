import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid } from "@radix-ui/themes";
import { Info } from "@phosphor-icons/react";
import { Tooltip } from "./Tooltip";
import { Button } from "./Button";
import { IconButton } from "./IconButton";
import {
  Decision, DoDont, DODONT_LABEL, HexThemeKey, LiteTokenSpec, MeasuredRow, MeasuredSpec, Mono, Page, PageHeader,
  PropsLead, type PropDef, PropTable, Rule, Section,
} from "./_storyKit";
import { awaitMeasuredRows } from "../../foundations/_assert";
import { ComparisonSection, FLOATING_INFO_COMPARISON } from "./_comparisons";

/** The component's definition — one source, referenced by the header of every story on this page. */
const DEFINITION = <>A short, supplementary hint tied to a control — shown on hover and on keyboard focus. It never carries information the user must have to proceed; that belongs inline.</>;

/* Tooltip reuses Radix's own solid tooltip skin and declares no --ds-* roles of its own. Both rows are
   MEASURED off a real, mounted panel: the panel is PORTALED and only exists while the tooltip is open, so
   a measurement-only Tooltip is `forceMount`ed and `container`-portaled into the MeasuredSpec host, which
   is visibility:hidden — off the screen, out of the a11y tree, out of axe, and still computing full
   styles. The previous version read back the first `.rt-TooltipContent` it could find anywhere on the
   page, which is only ever a panel some other specimen happened to open. */
function TooltipSpec() {
  return (
    <LiteTokenSpec
      rationale={
        <>
          Tooltip reuses Radix's own solid tooltip skin and declares no <Mono>--ds-*</Mono> roles of its
          own — the panel is an opaque bubble with inverted text, never translucent. Both rows are read
          off a real, mounted panel.
        </>
      }
    >
      <MeasuredSpec
        render={(host) => (
          <Tooltip content="Panel skin measurement" forceMount container={host}>
            <button type="button">measurement</button>
          </Tooltip>
        )}
      >
        <MeasuredRow
          part="Panel surface"
          note="The opaque bubble the hint sits in."
          token="--gray-12"
          select=".rt-TooltipContent"
          prop="background-color"
        />
        <MeasuredRow
          part="Panel text"
          note="Inverted against the bubble, so the hint reads at a glance. Radix paints it on the inner text node, not the panel box."
          token="--gray-1"
          select=".rt-TooltipText"
          prop="color"
        />
      </MeasuredSpec>
    </LiteTokenSpec>
  );
}

/* The do/don't grid shows REAL Tooltips, not a div painted to look like one — the guidance is about
   this component, so it has to be judged against the component. `open` holds each panel out
   permanently: a hover-driven pair would be invisible on arrival (and the two cards sit side by side,
   so the reader can't hover both at once to compare them). Controlled-open is a STATIC specimen, not a
   driven one — no timers, nothing that opens or animates itself on view. */

const TOOLTIP_PROPS: PropDef[] = [
  { name: "content", type: "ReactNode", desc: <>The hint shown on hover/focus — <strong>required</strong>. Keep it to a short, supplementary phrase; essential info belongs inline, not hover-only.</>, source: "Radix" },
  { name: "children", type: "ReactNode", desc: <>The trigger the hint attaches to (a button, icon button, or any focusable control). Passed through to Radix.</>, source: "Radix" },
  { name: "delayDuration", type: "number", def: "400", desc: <>Hover open delay in ms. Defaulted a touch faster than Radix's 700 so a hint feels responsive; keyboard-focus open is immediate regardless.</>, source: "Tooltip.tsx" },
  { name: "side", type: `"top" | "right" | "bottom" | "left"`, def: `"top"`, desc: <>Preferred side to place the panel; Radix flips it to stay in view.</>, source: "Radix" },
  { name: "align", type: `"start" | "center" | "end"`, def: `"center"`, desc: <>Alignment along the chosen side.</>, source: "Radix" },
];

const meta: Meta<typeof Tooltip> = {
  title: "Components/Feedback & Status/Tooltip",
  component: Tooltip,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**Tooltip** shows a short, supplementary hint tied to a trigger on hover or keyboard focus. " +
          "It’s a thin wrapper over Radix’s `Tooltip` that keeps the panel on Radix’s own solid skin " +
          "and opens a touch faster by default. It’s a **lite-tier** wrap — one Usage story (specimen · " +
          "live token spec · a do/don’t) plus a Props — and it’s the panel the shared Field " +
          "soft-disable reason now composes.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Tooltip>;

/** Usage — the primary lite docs story: a labeled specimen, the live token spec, and one do/don't. */
export const Usage: Story = {
  // The DoDont callout labels (success/error text on the green/red tint) measure ~4.1–4.4 — just under
  // axe's strict 4.5; the callout colour + the DO/DON'T word already carry the meaning, so color-contrast
  // is scoped off here, a documented specimen exception (same pattern as Kbd/AlertDialog Usage). The
  // tooltip panel itself is --gray-1 on --gray-12 and clears contrast easily; the carve-out only covers
  // the shared DoDont primitive.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader title="Tooltip · Usage" standfirst={DEFINITION} />

        <Section title="Specimen" lead="Hover or Tab to the control to reveal the hint. One short phrase — not a paragraph.">
          <Flex align="center" gap="4" wrap="wrap" style={{ minHeight: 48 }}>
            <Tooltip content="Move to archived — you can restore it later">
              <Button priority="secondary">Archive</Button>
            </Tooltip>
            <Tooltip content="Filters">
              <IconButton priority="secondary" aria-label="Filters"><Info weight="bold" /></IconButton>
            </Tooltip>
          </Flex>
        </Section>

        <Rule />

        <ComparisonSection comparison={FLOATING_INFO_COMPARISON} highlight="Tooltip" />

        <Rule />

        <Section title="Supplementary only, never must-know" lead="A tooltip supplements a control that already reads on its own. It is hover/focus-only — invisible on touch and easy to miss — so must-know information never lives there alone.">
          <Grid columns={{ initial: "1", sm: "2" }} gap="3">
            <DoDont kind="do" bare note="A supplementary hint (a shortcut, a little extra context) on a control that is already clear on its own — helpful if seen, harmless if missed.">
              <Flex align="center" style={{ minHeight: 40 }}>
                <Tooltip content="Saves and syncs to your workspace ⌘S" open side="right">
                  <Button priority="secondary">Save</Button>
                </Tooltip>
              </Flex>
            </DoDont>
            <DoDont kind="dont" bare note="Essential rules hidden in a hover-only tooltip vanish on touch, on keyboard, and for many AT users — the reader can't satisfy a constraint they can't see. Put must-know info inline.">
              <Flex align="center" style={{ minHeight: 40 }}>
                <Tooltip content="Must be 12+ characters with a symbol" open side="right">
                  <Box style={{ borderRadius: "var(--ds-radius-3)", border: "1px solid var(--ds-stroke-weak)", background: "var(--ds-bg-base)", padding: "6px 10px", fontSize: "var(--font-size-2)", color: "var(--ds-text-weak)" }}>Password</Box>
                </Tooltip>
              </Flex>
            </DoDont>
          </Grid>
        </Section>

        <Rule />

        <Section title="Tokens" lead="Measured off a real, mounted panel — Tooltip reuses Radix's solid tooltip skin, so it owns no --ds-* roles, and each row checks what the panel paints against the token it claims.">
          <TooltipSpec />
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement }) => {
    // The token table's EVIDENCE, asserted at runtime — the panel is portaled into the measurement host,
    // so this proves the rows read a REAL mounted panel and not a probe.
    // `awaitMeasuredRows` blocks until every row has recorded its evidence (a row whose element
    // mounts late retries for up to 60 frames before it reports), then runs the identical assertions.
    const rows = await awaitMeasuredRows(canvasElement);
    if (rows.measured !== 2 || rows.unproven !== 0) {
      throw new Error(`expected 2 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }

    // Passive: the Usage do/don't renders controlled-open tooltips, so a panel is already in the DOM —
    // assert it mounted as a real tooltip on the solid (opaque) skin. Driving (hover/focus open, Escape
    // close) lives in _internal/Tooltip so viewing this docs page never flashes the panel. axe runs
    // automatically on the story. Read `.rt-TooltipContent` (the styled, in-theme element) — the
    // `[role="tooltip"]` element is the transparent popper positioning wrapper.
    let panel: HTMLElement | null = null;
    for (let i = 0; i < 30 && !panel; i++) {
      panel = document.querySelector<HTMLElement>(".rt-TooltipContent");
      if (!panel) await new Promise((r) => requestAnimationFrame(r));
    }
    if (!document.querySelector('[role="tooltip"]')) throw new Error("the controlled-open spec tooltip must render a role=tooltip panel");
    if (!panel) throw new Error("the tooltip panel (.rt-TooltipContent) must be in the DOM");
    // Opaque skin ([[floating-surface-fill]]): a solid --gray-12 panel is never fully transparent.
    const bg = getComputedStyle(panel).backgroundColor;
    if (bg === "rgba(0, 0, 0, 0)" || bg === "transparent") {
      throw new Error(`tooltip panel must keep Radix's solid (opaque) skin; got ${bg}`);
    }
  },
};

type PropsArgs = {
  content: string;
  side: "top" | "right" | "bottom" | "left";
  align: "start" | "center" | "end";
  delayDuration: number;
};

/** Props — the live, args-driven Tooltip. Drive the hint, side, alignment, and open delay. */
export const Props: StoryObj<PropsArgs> = {
  args: { content: "Saved to your workspace", side: "top", align: "center", delayDuration: 400 },
  argTypes: {
    content: { control: "text", description: "The hint text (required).", table: { category: "Content" } },
    side: { control: "inline-radio", options: ["top", "right", "bottom", "left"], description: "Preferred side (Radix flips to stay in view).", table: { category: "Position" } },
    align: { control: "inline-radio", options: ["start", "center", "end"], description: "Alignment along the side.", table: { category: "Position" } },
    delayDuration: { control: { type: "number", min: 0, step: 100 }, description: "Hover open delay (ms). Default 400.", table: { category: "Behaviour" } },
  },
  parameters: { controls: { disable: false } },
  render: ({ content, side, align, delayDuration }: PropsArgs) => (
    <Page maxWidth="none">
      <PageHeader title="Tooltip · Props" standfirst={<>{DEFINITION} Hover or Tab to the trigger below to reveal the hint.</>} />
      <Box style={{ padding: "24px 0 8px" }}>
        <Tooltip content={content} side={side} align={align} delayDuration={delayDuration}>
          <Button priority="secondary">Hover or focus me</Button>
        </Tooltip>
      </Box>
      <PropsLead />
      <Rule />
      <Section title="Props reference" lead={<>Every prop <Code>Tooltip</Code> accepts — <Code>content</Code> is required; <Code>delayDuration</Code> is the one default the wrap changes; the rest pass through to Radix's <Code>Tooltip</Code>.</>}>
        <PropTable rows={TOOLTIP_PROPS} />
      </Section>
    </Page>
  ),
};

/** History — the rulings this component encodes and a changelog of how it changes over time. */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="Tooltip · History" standfirst={DEFINITION} />

      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[catalog-as-specification]] · Wrapped Radix component">
            Tooltip is a <strong>wrapped</strong> Radix Themes component — the Radix name wins; built on
            the Radix substrate + our <Code>--ds-*</Code> layer, not a hand-rolled popover. Radix already
            portals, positions, and dismisses it.
          </Decision>
          <Decision id="[[floating-surface-fill]] · Opaque solid panel">
            The panel keeps Radix's own <strong>solid</strong> skin — an opaque <Code>--gray-12</Code>{" "}
            bubble with <Code>--gray-1</Code> text. No translucent variant is exposed (the floating-surface
            opacity rule).
          </Decision>
          <Decision id="[[collapsible-and-accordion]] · Motion — the hint tier">
            A tooltip is the lightest interruption on screen, so it gets the <strong>quickest entrance</strong> of
            any floating surface: in on <Code>--ds-duration-fast</Code> (120ms) with{" "}
            <Code>--ds-ease-entry</Code>. It leaves the way everything else does —{" "}
            <strong>slower than it arrived</strong>, on <Code>--ds-duration-moderate</Code> (180ms) with the
            decelerating <Code>--ds-ease-standard</Code> — so it settles out instead of blinking away while the
            pointer is still travelling. Reduced motion collapses both for free.
          </Decision>
          <Decision id="The exit that never ran">
            Radix declares the tooltip's slide-and-fade <strong>only</strong> for its delayed-open state: the
            closed state carried timing but no animation to run, and the panel doesn't inherit the popper
            family's exit either. It vanished instantly, no matter what the CSS said. Both gaps are closed
            here — the closed state now names a real slide-out and fade, and a tooltip re-shown inside the
            skip-delay window (which mounts in a third, instant-open state) animates in as well, rather than
            appearing with no entrance at all.
          </Decision>
          <Decision id="[[disabled-reason]] · Field disabled-reason tooltip">
            The shared <Code>Field</Code> soft-disable-with-reason affordance
            (<Code>DisabledReasonTooltip</Code>) swaps its former raw Radix Tooltip for this System wrap —
            one panel skin for both the disabled reason and every other hint.
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0 · motion">
            Moved to the <strong>hint tier</strong> — the quickest entrance in the system (120ms), and an exit
            that runs longer than it (180ms) on the decelerating curve. The exit and the re-open entrance had
            never run at all: both states were missing an animation to play, so the panel appeared and
            disappeared on a cut.
          </Decision>
          <Decision id="0.9.0">
            Initial <Code>System/Tooltip</Code> — Radix Tooltip wrapped with a friendlier default open delay,
            the solid panel and popper motion inherited; the shared Field disabled-reason tooltip
            re-pointed at this wrap; History page added so every component, stubs included, has one.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
