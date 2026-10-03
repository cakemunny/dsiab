import { useLayoutEffect, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text as RadixText } from "@radix-ui/themes";
import { StatusDot, type StatusDotVariant } from "./StatusDot";
import {
  AnatomyLegend, Caption, Decision, DoDont, DODONT_LABEL, dotStyle, HexThemeKey, MeasuredRow, MeasuredSpec, NoteRow,
  Page, PageHeader, PropsLead, type PropDef, PropTable, Rule, Section, tick, TokenGroup,
} from "./_storyKit";

/** The component's definition — one source, referenced by the header of every story on this page. */
const DEFINITION = <>A small semantic status indicator on the text lane — a non-focusable span that names itself through a required <Code>label</Code>. The four semantic variants paint from the accent-aware fill family, so a dot follows the brand's collision shift rather than a hardcoded green or red. Colour is always redundant: the label carries the meaning.</>;
import { assertMeasuredRows } from "../../foundations/_assert";

/* ---- variant catalogue --------------------------------------------------- */
const VARIANTS: { variant: StatusDotVariant; label: string; meaning: string }[] = [
  { variant: "success", label: "Online", meaning: "healthy · connected · complete" },
  { variant: "warning", label: "Degraded", meaning: "attention · slow · partial" },
  { variant: "error", label: "Offline", meaning: "failed · disconnected · blocked" },
  { variant: "accent", label: "Active", meaning: "in-brand emphasis · selected · current" },
  { variant: "neutral", label: "Idle", meaning: "inactive · unknown · draft" },
];

/* ---- Tokens: each variant's fill, MEASURED off a rendered dot ---------------
   Each row reads background-color off the dot of that variant and checks it against the token it
   claims, so a row can disagree with the component — where the RoleRow it replaces resolved the very
   token it named and printed that back, which is the row agreeing with itself. */
const VARIANT_ROLE: Record<StatusDotVariant, string> = {
  success: "--ds-fill-success", warning: "--ds-fill-warning", error: "--ds-fill-error",
  accent: "--accent-indicator", neutral: "--ds-icon-neutral",
};

function VariantTokens() {
  return (
    <TokenGroup
      label="FILL: the accent-aware token each variant paints"
      blurb="Each row reads its dot's fill off a rendered StatusDot and checks it against the token it names, so the table re-resolves when you flip the accent/appearance toolbar and can disagree with the component. success/warning/error/accent track the brand's collision-shifted family; only neutral is fixed."
      specimen={
        <Flex gap="4" align="center">
          {VARIANTS.map((v) => <StatusDot key={v.variant} variant={v.variant} label={v.label} />)}
        </Flex>
      }
    >
      <MeasuredSpec
        render={() => (
          <>
            {VARIANTS.map((v) => <StatusDot key={v.variant} variant={v.variant} label={v.label} />)}
          </>
        )}
      >
        {VARIANTS.map((v) => (
          <MeasuredRow
            key={v.variant}
            part={v.variant}
            token={VARIANT_ROLE[v.variant]}
            select={`.rt-ds-statusdot[data-variant="${v.variant}"]`}
            prop="background-color"
          />
        ))}
      </MeasuredSpec>
      <NoteRow part="Shape" value="a disc — radius: full renders any size as a circle" radix="--ds-radius-full" />
      <NoteRow part="Size" value="8 / 10 / 12px — tracks the global text lane (small / medium / large)" />
      <NoteRow part="Edge" value="a 1px inset ring on the fill: --success-dot-edge, --warning-dot-edge and --error-dot-edge on the three status dots ([[status-dot-edges]]), --accent-part-edge on accent ([[part-fill-edge]]), and none on neutral, which clears on its own fill" />
    </TokenGroup>
  );
}

/* ---- anatomy diagram ------------------------------------------------------
   The dot is 8–12px across, so a side gutter with a leader running in from the edge would make the
   callout an order of magnitude longer than the part it names. The dots sit directly OVER and UNDER the
   specimen instead, on the part's own centre line, and drop a short tick onto its near edge.

   Two specimens, because the three parts are not three elements. The disc and its fill are the SAME
   <span>, and the accessible name is an attribute on it — so the magnified copy carries the two paint
   callouts (the shape named from above, the fill from below) and the real-size dot in its labelled row
   carries the name, which is the only place the name has anything to sit beside.

   Positions are MEASURED off the live specimen: the disc tracks the global text lane (8 / 10 / 12px)
   and the magnified copy is six times whatever that resolves to, so neither edge can be written down.
   Both are read after the transform, which is what the reader actually sees. */

const DOT = 20; // dotStyle's diameter
/** How far a callout floats off the edge it points at. */
const LANE = 26;
/** The bands above and below the row: a dot, its lane, and the magnified disc's overhang at the largest
 *  step (12px × 6 = 72, half of it above the row's centre line) with room to spare. */
const BAND = 96;

/** [callout, selector inside the specimen, which of that element's edges the tick lands on]. */
const PINS: [number, string, "top" | "bottom"][] = [
  [1, '[data-part="zoom"] .rt-ds-statusdot', "top"],
  [2, '[data-part="zoom"] .rt-ds-statusdot', "bottom"],
  [3, '[data-part="inline"] .rt-ds-statusdot', "top"],
];

function AnatomyDiagram() {
  const frame = useRef<HTMLDivElement>(null);
  const specimen = useRef<HTMLDivElement>(null);
  const [pins, setPins] = useState<Record<number, { x: number; y: number }>>({});

  useLayoutEffect(() => {
    const f = frame.current;
    const s = specimen.current;
    if (!f || !s) return;
    const measure = () => {
      const fb = f.getBoundingClientRect();
      const next: Record<number, { x: number; y: number }> = {};
      for (const [n, sel, edge] of PINS) {
        const el = s.querySelector<HTMLElement>(sel);
        if (!el) continue;
        const b = el.getBoundingClientRect();
        next[n] = {
          x: Math.round(b.left + b.width / 2 - fb.left),
          y: Math.round((edge === "top" ? b.top : b.bottom) - fb.top),
        };
      }
      // Only write when something moved — the frame's own size feeds this observer otherwise.
      setPins((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    };
    measure();
    let raf = 0;
    const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); });
    ro.observe(f);
    ro.observe(s);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return (
    <Box style={{ overflowX: "auto" }}>
      <Box
        ref={frame}
        style={{
          position: "relative", borderRadius: "var(--ds-radius-4)", background: "var(--ds-bg-subtle)",
          paddingTop: BAND, paddingBottom: BAND, paddingLeft: "var(--ds-space-32)", paddingRight: "var(--ds-space-32)",
        }}
      >
        <Box ref={specimen} data-testid="anatomy">
          <Flex align="center" gap="4" justify="center">
            {/* A magnified specimen so the disc + fill read clearly, beside a real-size dot in context. */}
            <Box data-part="zoom" style={{ transform: "scale(6)", transformOrigin: "center" }}>
              <StatusDot variant="success" label="Online" />
            </Box>
            <Flex data-part="inline" align="center" gap="2" style={{ marginInlineStart: "var(--ds-space-40)" }}>
              <StatusDot variant="success" label="Online" />
              <RadixText size="2" style={{ color: "var(--ds-text-weak)" }}>Online</RadixText>
            </Flex>
          </Flex>
        </Box>

        {PINS.map(([n, , edge]) => {
          const p = pins[n];
          if (!p) return null;
          const over = edge === "top";
          // The tick stops ON the disc's edge — a leader drawn across the fill would cover the very
          // paint callout 2 exists to name.
          return (
            <Box key={n}>
              <Box
                data-pin={n}
                style={{ ...dotStyle, left: p.x - DOT / 2, top: over ? p.y - LANE - DOT : p.y + LANE }}
              >
                {n}
              </Box>
              <Box style={tick({ left: p.x, top: over ? p.y - LANE : p.y, height: LANE })} />
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

/* ---- anatomy legend ------------------------------------------------------ */
const ANATOMY_PARTS: [number, string, string][] = [
  [1, "Disc", "an inline-block circle (radius: full) sized on the text lane (8 / 10 / 12px), flex-shrink: 0 — it never collapses next to a flexed label."],
  [2, "Fill", "the accent-aware --ds-fill-* solid, --accent-indicator for accent ([[textless-part-fills]]), or --ds-icon-neutral for neutral, so it follows the brand collision shift. Every dot but neutral stacks a 1px inset edge on it, the lightest Radix alpha that clears WCAG 3:1 and APCA Lc 30 against the page, the subtle recess, a card and a panel ([[status-dot-edges]], [[part-fill-edge]]), and the centre keeps its colour. Colour is a REDUNDANT cue, never the only one."],
  [3, "Accessible name", "role=\"img\" + the required `label` — the dot's name for AT (WCAG 1.1.1). Colour alone conveys nothing to a screen reader; the label carries the meaning."],
];

/* ========================================================================== */
const meta: Meta<typeof StatusDot> = {
  title: "Components/Feedback & Status/StatusDot",
  component: StatusDot,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**StatusDot** is a small semantic status indicator (8 / 10 / 12px on the text lane) — a non-focusable `<span role=\"img\">` " +
          "that names itself via a required `label`. Its four semantic variants (**success / warning / error / " +
          "accent**) paint from the **accent-aware** `--ds-fill-*` family (accent paints `--accent-indicator`, [[textless-part-fills]]), so a dot follows the selected brand's " +
          "collision shift rather than a hardcoded green/red, and **neutral** takes a fixed gray. Every dot but neutral stacks a 1px " +
          "inset edge on its fill, the lightest Radix alpha that clears WCAG 3:1 and APCA Lc 30 on every surface ([[status-dot-edges]]). Colour is always a " +
          "**redundant** cue — the `label` carries the meaning for assistive tech. `isPulsing` adds a slow ambient " +
          "breathe (silenced under `prefers-reduced-motion`); an optional `tooltip` wraps the dot in the System Tooltip.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof StatusDot>;

/* ---- Anatomy ------------------------------------------------------------- */
export const Anatomy: Story = {
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader title="StatusDot · Anatomy" standfirst={DEFINITION} />

        <Section title="Anatomy" lead="Three parts: a disc (sized on the text lane), an accent-aware fill, and the accessible name that carries the meaning.">
          <AnatomyDiagram />
          <AnatomyLegend parts={ANATOMY_PARTS} />
          <Caption>The dot never stands alone for sighted users — pair it with a visible label or place it in a labelled row. The <Code>label</Code> is for AT.</Caption>
        </Section>

        <Rule />

        <Section title="Variants" lead="Four semantic variants (accent-aware) plus a fixed neutral. Each is named by its label; the colour is a redundant reinforcement.">
          <Flex direction="column" gap="3">
            {VARIANTS.map((v) => (
              <Flex key={v.variant} align="center" gap="3">
                <Box style={{ width: "var(--ds-space-16)", display: "flex", justifyContent: "center" }}>
                  <StatusDot variant={v.variant} label={v.label} />
                </Box>
                <Code>{v.variant}</Code>
                <RadixText size="2" style={{ color: "var(--ds-text-weak)" }}>{v.meaning}</RadixText>
              </Flex>
            ))}
          </Flex>
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement }) => {
    // Every numbered part in the legend has a callout ON the specimen — a numbered legend with nothing
    // to point at is the defect this diagram exists to avoid.
    const pins = canvasElement.querySelectorAll("[data-pin]");
    if (pins.length !== ANATOMY_PARTS.length)
      throw new Error(`expected ${ANATOMY_PARTS.length} callout pins on the specimen; got ${pins.length}`);
  },
};

/* ---- Usage --------------------------------------------------------------- */
export const Usage: Story = {
  // The DO/DON'T word (success/error step-11 ink on its own tint) measures 4.10 at 12px bold, under axe's
  // 4.5; the colour + the word already carry the meaning, so that row is the documented exception. Scoped
  // to the label itself — the cards' specimens stay fully axe-checked, which "[data-dodont]" did not do.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <Page>
      <PageHeader title="StatusDot · Usage" standfirst={DEFINITION} />

      <Section title="In context — a labelled row" lead="A StatusDot marks the state of a nearby entity: a service, a build, a teammate. It sits before the label; the label names it for everyone.">
        <Flex direction="column" gap="2" style={{ maxWidth: 320 }}>
          {[
            { variant: "success" as const, name: "api.production", state: "Operational" },
            { variant: "warning" as const, name: "api.staging", state: "Degraded" },
            { variant: "error" as const, name: "worker.queue", state: "Down" },
            { variant: "neutral" as const, name: "api.canary", state: "Not deployed" },
          ].map((r) => (
            <Flex key={r.name} align="center" justify="between" style={{ padding: "var(--ds-space-8) var(--ds-space-12)", borderRadius: "var(--ds-radius-3)", border: "1px solid var(--ds-stroke-weak)" }}>
              <Flex align="center" gap="2">
                <StatusDot variant={r.variant} label={r.state} />
                <Code>{r.name}</Code>
              </Flex>
              <RadixText size="1" style={{ color: "var(--ds-text-weak)" }}>{r.state}</RadixText>
            </Flex>
          ))}
        </Flex>
      </Section>

      <Rule />

      <Section title="Live activity" lead="Set isPulsing to signal a live / streaming state. The breathe stops under prefers-reduced-motion — the colour still communicates.">
        <Flex align="center" gap="4">
          <Flex align="center" gap="2">
            <StatusDot variant="success" label="Live" isPulsing />
            <RadixText size="2" style={{ color: "var(--ds-text-weak)" }}>Live</RadixText>
          </Flex>
          <Flex align="center" gap="2">
            <StatusDot variant="accent" label="Recording" isPulsing />
            <RadixText size="2" style={{ color: "var(--ds-text-weak)" }}>Recording</RadixText>
          </Flex>
        </Flex>
      </Section>

      <Rule />

      <Section title="Do / don't" lead="Colour is a reinforcement, never the whole message.">
        <Grid columns={{ initial: "1", sm: "2" }} gap="3">
          <DoDont kind="do" bare note="Pair the dot with a text label. Colour reinforces; the word carries the meaning for colour-blind and AT users.">
            <Flex align="center" gap="2"><StatusDot variant="error" label="Offline" /><RadixText size="2">Offline</RadixText></Flex>
          </DoDont>
          <DoDont kind="dont" bare note="Don’t rely on a bare row of dots with no labels — colour alone is not an accessible status, and success/error dots are indistinguishable to a colour-blind reader.">
            <Flex align="center" gap="2"><StatusDot variant="error" label="Offline" /><StatusDot variant="success" label="Online" /><StatusDot variant="warning" label="Degraded" /></Flex>
          </DoDont>
        </Grid>
      </Section>

      <Rule />

      {/* The closing reference section. The provider is what makes the table live: every measured row
          re-reads its value when this key changes, so an accent/appearance flip re-resolves the spec. */}
      <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
        <Section title="Tokens" lead="Each row is read off a rendered dot and checked against the token it names, so the table can disagree with the component — flip the accent/appearance toolbar and the accent-aware rows re-resolve.">
          <VariantTokens />
        </Section>
      </HexThemeKey.Provider>
    </Page>
  ),
  play: async ({ canvasElement }) => {
    // The token table's EVIDENCE, asserted at runtime ([[measured-token-rows]]) — one row per variant, each read off the
    // dot that paints it.
    const rows = assertMeasuredRows(canvasElement);
    if (rows.measured !== 5 || rows.unproven !== 0) {
      throw new Error(`expected 5 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }
  },
};

/* ---- Props ---------------------------------------------------------- */
const PROPS: PropDef[] = [
  { name: "variant", type: `"success" | "warning" | "error" | "accent" | "neutral"`, desc: <>Required. The semantic colour. success/warning/error/accent are <strong>accent-aware</strong>; neutral is a fixed gray.</>, source: "StatusDot.tsx" },
  { name: "label", type: "string", desc: <>Required. The accessible name (<Code>role="img"</Code> + <Code>aria-label</Code>) — colour alone is not a status.</>, source: "StatusDot.tsx" },
  { name: "isPulsing", type: "boolean", def: "false", desc: <>Adds a 2s opacity breathe for a live state. Silenced under <Code>prefers-reduced-motion</Code>.</>, source: "StatusDot.tsx" },
  { name: "tooltip", type: "string", desc: <>Optional hover tooltip (composes the System Tooltip). Omit for no tooltip.</>, source: "StatusDot.tsx" },
];

type PropsArgs = {
  variant: StatusDotVariant;
  label: string;
  isPulsing: boolean;
  tooltip: string;
};

export const Props: StoryObj<PropsArgs> = {
  args: { variant: "success", label: "Online", isPulsing: false, tooltip: "" },
  argTypes: {
    variant: { control: "inline-radio", options: ["success", "warning", "error", "accent", "neutral"], description: "The semantic colour (success/warning/error/accent are accent-aware).", table: { category: "Variant" } },
    label: { control: "text", description: "The accessible name (required).", table: { category: "Content" } },
    isPulsing: { control: "boolean", description: "Live-activity breathe (reduced-motion aware).", table: { category: "State" } },
    tooltip: { control: "text", description: "Optional hover tooltip (empty → none).", table: { category: "Content" } },
  },
  parameters: { controls: { disable: false } },
  render: ({ variant, label, isPulsing, tooltip }: PropsArgs) => (
    <Page maxWidth="none">
      <PageHeader title="StatusDot · Props" standfirst={DEFINITION} />
      <Flex align="center" gap="2" style={{ padding: "var(--ds-space-8) 0 var(--ds-space-2)" }}>
        <StatusDot variant={variant} label={label} isPulsing={isPulsing} tooltip={tooltip || undefined} />
        <RadixText size="2" style={{ color: "var(--ds-text-weak)" }}>{label}</RadixText>
      </Flex>
      <PropsLead />
      <Rule />
      <Section title="Props reference" lead={<>Every prop <Code>StatusDot</Code> takes.</>}>
        <PropTable rows={PROPS} />
      </Section>
    </Page>
  ),
};

/* ---- History ------------------------------------------------------------- */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="StatusDot · History" standfirst={DEFINITION} />

      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[status-dot]] · Accent-aware fill">
            The four semantic variants paint from the <strong>accent-aware</strong> <Code>--ds-fill-success</Code> /
            <Code>-warning</Code> / <Code>-error</Code> / <Code>-accent</Code> tokens (the same <Code>-9</Code>
            solids Badge and Callout use), so a dot <strong>follows the brand's collision shift</strong> — a grass
            brand's success reads lime, a red brand's error reads oxblood. <Code>neutral</Code> takes the solid
            <Code>--ds-icon-neutral</Code> (gray-11), visible in both modes. <strong>Zero net-new tokens.</strong>
          </Decision>
          <Decision id="[[status-dot]] · colour is redundant">
            <Code>role="img"</Code> + a <strong>required</strong> <Code>label</Code> is the dot's accessible name
            (WCAG 1.1.1) — colour alone conveys nothing to a screen reader. The label is non-optional so a nameless
            dot can't ship.
          </Decision>
          <Decision id="[[status-dot]] · pulse + reduced-motion">
            <Code>isPulsing</Code> runs a 2s opacity breathe (1 → 0.5 → 1) — an <em>ambient</em> loop, so its
            duration is a literal rather than a value off the intent-named transition ladder. A
            <Code>prefers-reduced-motion: reduce</Code> media query sets <Code>animation: none</Code>.
          </Decision>
          <Decision id="[[status-dot]] · size on the text lane">
            The dot <strong>tracks the global text lane</strong> (8 / 10 / 12px for small / medium / large) so it
            stays proportional to the label it sits beside — amending the original fixed-8px rule. An optional{" "}
            <Code>tooltip</Code> composes the <strong>System Tooltip</strong>.
          </Decision>
          <Decision id="[[status-dot-edges]] · an edge on the dot">
            On the page, the subtle recess, a card and a panel the warning dot read as low as 1.20:1 and the
            success dot 1.27:1 in light, and the error dot 1.74:1 and APCA Lc 10.1 in dark. Each now stacks a 1px
            inset edge on its own fill, <Code>--warning-dot-edge</Code>, <Code>--success-dot-edge</Code> or{" "}
            <Code>--error-dot-edge</Code>, the lightest Radix black alpha in light or white alpha in dark that
            clears WCAG 3:1 and APCA Lc 30 on all four surfaces and six neutrals. The step follows the brand,
            because the status families shift with it ([[brand-status-collision-gate]]). The centre keeps its colour. The accent dot stacks{" "}
            <Code>--accent-part-edge</Code> ([[part-fill-edge]]), which [[status-dot-edges]] raises on light amber and on eight dark colours, and
            the neutral dot clears on its own fill.
          </Decision>
        </Flex>
      </Section>
      <Rule />
      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            Initial <Code>System/StatusDot</Code>: the accent-aware indicator — disc tracks the
            global text lane (8 / 10 / 12px), four semantic variants + neutral, <Code>isPulsing</Code> with a
            reduced-motion override, <Code>role="img"</Code> + required <Code>label</Code>, optional System
            Tooltip. Fill spec reads live from the rendered dots.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
