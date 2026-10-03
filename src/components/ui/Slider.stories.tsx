import { useState, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import { Slider } from "./Slider";
import { Field } from "./Field";
import {
  Caption, Decision, DoDont, DODONT_LABEL, HexThemeKey, KeyBinding, KeyRow, MeasuredRow, MeasuredSpec, Mono, NoteRow,
  Page, PageHeader, PropsLead, type PropDef, PropTable, Rule, Section, TokenGroup, toHex,
} from "./_storyKit";
import { assertMeasuredRows } from "../../foundations/_assert";

// Resolve a CSS custom property to an sRGB hex, as it computes on `el` (P3-safe via the canvas).
function tokenHex(el: Element, name: string): string {
  const probe = document.createElement("span");
  el.appendChild(probe);
  probe.style.color = `var(${name})`;
  const hex = toHex(getComputedStyle(probe).color);
  probe.remove();
  return hex;
}

/* ---- Specimens ------------------------------------------------------------ */

/* ONE VALUE DISPLAY PER SLIDER. A slider states its value once: the paired box where there is one (it
   reports AND edits), otherwise this label-row readout. Never both — a number printed twice, a few
   pixels apart, gives the reader two things to reconcile and nothing to do with the second. */

/** The label-row readout: the value display a slider carries when it has NO numeric box. Tabular figures
 *  so the digits don't jitter under a drag, and the label's own colour — it is a peer of the label, not a
 *  link and not code.
 *
 *  THE INLINE `fontVariantNumeric` IS A GAP MARKER (GUIDELINES §3, case 3). The readout is composed by
 *  the CALLER into `Field.Label`'s `endSlot` — Slider ships `showInput` (a paired numeric field, which
 *  takes the system's numeric-field rule) but no element for this readout, so there is nothing in the
 *  DOM for a rule in `components.css` to select and nothing to register in `TABULAR_SITES`. Giving it
 *  one means NET-NEW API on Slider — the same ruling `DataList.Value`'s numeric treatment is deferred
 *  for, and deliberately not taken here. Until it lands, the caller sets the property on the value it
 *  passes in, exactly as DataList's own note tells a caller to. When it lands, this helper goes away and
 *  the rule moves into `components.css` beside `.rt-ds-slider-mark-label`. */
function ValueReadout({ children }: { children: ReactNode }) {
  return (
    <Text size="2" style={{ color: "var(--ds-text-strong)", fontVariantNumeric: "tabular-nums" }}>
      {children}
    </Text>
  );
}

/** The plain job: one value, a label, and a readout that tracks the thumb. No box, so the readout is the
 *  one value display. */
function VolumeDemo() {
  const [value, setValue] = useState([60]);
  return (
    <Box data-testid="slider-specimen" style={{ width: 340, maxWidth: "100%" }}>
      <Field.Root>
        <Field.Label endSlot={<ValueReadout>{value[0]}%</ValueReadout>}>Volume</Field.Label>
        <Slider value={value} onValueChange={setValue} formatValue={(v) => `${v}%`} />
      </Field.Root>
    </Box>
  );
}

/** The headline pairing: the value is editable as a NUMBER, not only draggable — so the box IS the
 *  readout and the label row stays clear.
 *  `doubled` renders the anti-pattern the DON'T panel pins: the identical control, plus a second copy of
 *  the value in the label row. Nothing else differs between the two panels. */
function OpacityDemo({ doubled }: { doubled?: boolean }) {
  const [value, setValue] = useState([72]);
  return (
    <Box style={{ width: 340, maxWidth: "100%" }}>
      <Field.Root>
        <Field.Label endSlot={doubled ? <ValueReadout>{value[0]}%</ValueReadout> : undefined}>
          Layer opacity
        </Field.Label>
        <Slider value={value} onValueChange={setValue} showInput formatValue={(v) => `${v}%`} />
      </Field.Root>
    </Box>
  );
}

/* The one COMPLETE field shell on the page — label, description and message wrapped around the control.
   A slider rides the shared Field, and that composition is worth SEEING once rather than only being
   described in prose, so exactly one specimen carries the full tree; the rest stay label-only.
   The description states the SCALE the boxes accept, which the track only implies — deliberately not the
   neighbour-clamping mechanics, because the section caption already carries those and a description that
   repeats its own caption is the duplication this page just finished removing.
   It is passed to `Field.Root` as well as rendered: the Root is what flips `hasDescription` and hands the
   id down, so without the prop the line would paint but never reach the thumbs via `aria-describedby`. */
const PRICE_DESCRIPTION = "$0 to $1,000, in $10 steps.";

/** A price range: two thumbs, two boxes, one on each side of the track. Two bounds, two displays — still
 *  one per value. */
function PriceRangeDemo() {
  const [value, setValue] = useState([250, 750]);
  return (
    <Box data-testid="slider-field-shell" style={{ width: 420, maxWidth: "100%" }}>
      <Field.Root description={PRICE_DESCRIPTION}>
        <Field.Label>Price</Field.Label>
        <Slider
          value={value}
          onValueChange={setValue}
          min={0}
          max={1000}
          step={10}
          showInput
          minStepsBetweenThumbs={5}
          formatValue={(v) => `$${v}`}
        />
        <Field.Description>{PRICE_DESCRIPTION}</Field.Description>
        <Field.Message />
      </Field.Root>
    </Box>
  );
}

const QUALITY_MARKS = [
  { value: 0, label: "Draft" },
  { value: 25, label: "Low" },
  { value: 50, label: "Standard" },
  { value: 75, label: "High" },
  { value: 100, label: "Master" },
];

/** Regular detents with names — the thumb rests on a named stop and announces that name. */
function QualityDemo() {
  const [value, setValue] = useState([50]);
  return (
    <Box style={{ width: 400, maxWidth: "100%" }}>
      <Field.Root>
        <Field.Label>Export quality</Field.Label>
        <Slider value={value} onValueChange={setValue} step={25} marks={QUALITY_MARKS} />
      </Field.Root>
    </Box>
  );
}

const EXPORT_MARKS = [
  { value: 320, label: "Thumb" },
  { value: 640, label: "Small" },
  { value: 1024, label: "Web" },
  { value: 1600, label: "Large" },
  { value: 2048, label: "Print" },
];

/** Irregular detents — there is no grid to step along, so the thumb snaps stop-to-stop. */
function ExportWidthDemo() {
  const [value, setValue] = useState([1024]);
  return (
    <Box style={{ width: 400, maxWidth: "100%" }}>
      <Field.Root>
        <Field.Label endSlot={<ValueReadout>{value[0]} px</ValueReadout>}>Export width</Field.Label>
        <Slider value={value} onValueChange={setValue} min={320} max={2048} step={null} marks={EXPORT_MARKS} formatValue={(v) => `${v} pixels`} />
      </Field.Root>
    </Box>
  );
}

/** The Keyboard page's live target: a real labelled control, so a key press has a number to move. */
function KeyboardDemo() {
  const [value, setValue] = useState([50]);
  return (
    <Box style={{ width: 320, maxWidth: "100%" }}>
      <Field.Root>
        <Field.Label endSlot={<ValueReadout>{value[0]}%</ValueReadout>}>Playback speed</Field.Label>
        <Slider value={value} onValueChange={setValue} formatValue={(v) => `${v}%`} />
      </Field.Root>
    </Box>
  );
}

/** Unlabelled detents at every step — the tick row reads as a ruler, not a legend. */
function TemperatureDemo() {
  const [value, setValue] = useState([21]);
  return (
    <Box style={{ width: 340, maxWidth: "100%" }}>
      <Field.Root>
        <Field.Label endSlot={<ValueReadout>{value[0]}°C</ValueReadout>}>Target temperature</Field.Label>
        <Slider value={value} onValueChange={setValue} min={16} max={28} step={1} marks formatValue={(v) => `${v} degrees`} />
      </Field.Root>
    </Box>
  );
}

/* ---- Tokens --------------------------------------------------------------- */

/* The track, range and thumb are Radix's own skin; the detent layer is ours. Every colour row is
   MEASURED off a real slider rendered for the purpose — the property is read from the element that
   paints it and checked against the token the row names, so a row can disagree with the component. */
function SliderSpec() {
  return (
    <Flex direction="column" gap="3">
      <TokenGroup
        label="TRACK · RANGE · THUMB"
        blurb="Radix's own slider skin, measured off a rendered control — the drift guard."
        specimen={
          <div style={{ width: 220 }}>
            <Slider defaultValue={[60]} aria-label="Token sample" />
          </div>
        }
      >
        <MeasuredSpec render={() => <Slider defaultValue={[60]} aria-label="Track measurement" />}>
          <MeasuredRow
            part="Range (filled)" note="The part of the track behind the value, in the shade every part without text paints."
            token="--accent-track" select=".rt-SliderRange" prop="background-color"
          />
          <MeasuredRow
            part="Track (unfilled)" note="The groove the range runs in."
            token="--gray-a3" select=".rt-SliderTrack" prop="background-color"
          />
        </MeasuredSpec>
        <NoteRow part="Thumb face" value="Radix paints the thumb a literal white, bound to no token — nothing for a row to check it against" />
        <NoteRow
          part="Thumb ring"
          value="Radix's 1px --black-a4 ring with a black alpha stacked on it where the white thumb falls under 3:1 against its range, track or surface ([[neutral-part-stacks]])"
          radix="--accent-slider-thumb-stack"
        />
      </TokenGroup>

      <TokenGroup label="THE PARTS THAT ARE OURS" blurb="The detent layer paints from the system's quiet-chrome roles; the value box is the shared field surface.">
        <MeasuredSpec
          render={() => (
            <>
              <Slider defaultValue={[2]} min={0} max={4} step={1} marks={[{ value: 0, label: "0" }, { value: 4, label: "4" }]} aria-label="Detent measurement" />
              <Slider disabled defaultValue={[2]} min={0} max={4} step={1} marks aria-label="Disabled detent measurement" />
            </>
          )}
        >
          <MeasuredRow
            part="Detent tick" note="The small neutral mark under an enabled track."
            token="--ds-fill-medium" select=".rt-ds-slider-stack:not(:has([data-disabled])) .rt-ds-slider-tick" prop="background-color"
          />
          <MeasuredRow
            part="Tick, disabled" note="Read off a rendered disabled slider, so this is the paint as it lands."
            token="--ds-stroke-disabled" select=".rt-ds-slider-stack:has(.rt-SliderRoot[data-disabled]) .rt-ds-slider-tick" prop="background-color"
          />
          <MeasuredRow
            part="Mark label" note="The number under a labelled detent."
            token="--ds-text-weak" select=".rt-ds-slider-mark-label" prop="color"
          />
        </MeasuredSpec>
        <NoteRow part="Tick size" value="1 × 4px, radius --ds-radius-1" />
        <NoteRow part="Mark label type" value="--font-size-1 / --line-height-1, tabular-nums" />
        <NoteRow part="Value box" value="Radix TextField surface — inherits the shared validation paint + focus ring" radix=".rt-TextFieldRoot" />
      </TokenGroup>
    </Flex>
  );
}

/* ---- Props ---------------------------------------------------------------- */

const SLIDER_PROPS: PropDef[] = [
  { name: "value / defaultValue", type: "number[]", def: "[min]", desc: <>Controlled / uncontrolled position — always an array, one entry per thumb (<Code>[n]</Code> is a single value, <Code>[lo, hi]</Code> a range).</>, source: "Slider.tsx" },
  { name: "onValueChange", type: "(v: number[]) => void", desc: <>Fires on every change while dragging or key-stepping. Pair with <Code>value</Code> to drive a live readout.</>, source: "Slider.tsx" },
  { name: "onValueCommit", type: "(v: number[]) => void", desc: <>Fires once the interaction settles (pointer release, key up, or a typed value committing). The hook for a save or a refetch, so a drag doesn't fire one request per frame.</>, source: "Slider.tsx" },
  { name: "min", type: "number", def: "0", desc: <>Lower bound — the value at the track's start edge.</>, source: "Slider.tsx" },
  { name: "max", type: "number", def: "100", desc: <>Upper bound — the value at the track's end edge.</>, source: "Slider.tsx" },
  { name: "step", type: "number | null", def: "1", desc: <>Snap granularity and the arrow-key increment. <Code>null</Code> snaps to the nearest <Code>marks</Code> entry instead of a fixed grid — for irregular detents. <Code>null</Code> with no marks is a misuse and logs an error.</>, source: "Slider.tsx" },
  { name: "marks", type: "SliderMark[] | true", desc: <>Detents. An array places a tick per entry — <Code>{"{ value, label? }"}</Code> — and <Code>true</Code> places an unlabelled tick at every <Code>step</Code>. Marks outside the scale are dropped; over 500 are refused.</>, source: "Slider.tsx" },
  { name: "showInput", type: "boolean", def: "false", desc: <>Pairs the track with an editable numeric box per bound, so a value can be typed. Suppressed (track alone) when <Code>step={"{null}"}</Code>, when vertical, or above two thumbs.</>, source: "Slider.tsx" },
  { name: "inputPosition", type: `"flank" | "end"`, def: `"flank"`, desc: <><Code>flank</Code> puts a range's boxes either side of the track; <Code>end</Code> puts both after it. A single-value slider always reads track then box.</>, source: "Slider.tsx" },
  { name: "minStepsBetweenThumbs", type: "number", def: "0", desc: <>Minimum gap between two thumbs, counted in <Code>step</Code>s. It <strong>blocks</strong> the move that would close the gap — the thumb stops rather than pushing its neighbour along.</>, source: "Slider.tsx · Radix" },
  { name: "thumbLabels", type: "string[]", desc: <>Accessible name per thumb, in value order. Defaults to <Code>Minimum</Code> / <Code>Maximum</Code> on a range; each is announced together with the field label.</>, source: "Slider.tsx" },
  { name: "formatValue", type: "(v: number) => string", desc: <>Formats the unlabelled mark labels, the spoken <Code>aria-valuetext</Code>, and the paired box's affixes (a <Code>72%</Code> format renders a <Code>%</Code> suffix inside the box; the box itself stays a raw number editor).</>, source: "Slider.tsx" },
  { name: "size", type: `"1" | "2" | "3"`, def: `control lane (1 at small)`, desc: <>Track + thumb scale. Unset, it follows the global <Code>uiSize</Code> control lane (default <Code>small</Code> → <Code>1</Code>). An explicit step still wins.</>, source: "Slider.tsx" },
  { name: "orientation", type: `"horizontal" | "vertical"`, def: `"horizontal"`, desc: <>Which way the track runs. A vertical slider needs a parent with height, and suppresses the paired box.</>, source: "Radix" },
  { name: "inverted", type: "boolean", def: "false", desc: <>Flips the scale so <Code>min</Code> sits at the end edge. Marks follow the flip.</>, source: "Radix" },
  { name: "disabled", type: "boolean", def: "false", desc: <>Inert + dimmed; thumbs leave the tab order, the range clears, and the paired boxes disable with it.</>, source: "Radix" },
  { name: "variant", type: `"surface" | "classic"`, def: `"surface"`, desc: <>Track/range treatment from Radix's own skin. Surface is the system's standard. <Code>soft</Code> is not offered: its pale range read 1.40:1 against the page, and a slider given it is a type error ([[colour-prop-and-high-contrast]]).</>, source: "Radix" },
  { name: "color / highContrast / radius", type: "enum", desc: <>Pass-throughs to the Radix skin. Left unset the slider paints the running brand accent; set <Code>color</Code> only for a deliberately off-accent control.</>, source: "Radix" },
  { name: "aria-label / aria-labelledby", type: "string", desc: <>Accessible name. Inside a <Code>Field.Root</Code> the field's label supplies it automatically — the thumb reads it by <Code>aria-labelledby</Code>, because <Code>htmlFor</Code> cannot name a span.</>, source: "Slider.tsx" },
];

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = <>Pick a value, or a start→end range, along a scale. Always show the number — in the label row, or in a numeric box the reader can type into where an exact value matters. For a handful of named choices, reach for a <Mono>SegmentedControl</Mono> or <Mono>RadioGroup</Mono> instead.</>;

const meta: Meta<typeof Slider> = {
  title: "Components/Choice/Slider",
  component: Slider,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**Slider** picks a value — or a start→end range — along a scale. Beyond dragging, it carries the " +
          "three things a real control panel needs: **detents** (labelled stops the thumb snaps to), a **paired " +
          "numeric box** that both reports and edits the value so nobody has to pixel-hunt a thumb, and a " +
          "**range** whose two ends are independently typeable. It composes the raw Radix slider primitive " +
          "while wearing Radix Themes' own class names, so the track/range/thumb skin comes from the same " +
          "stylesheet as the stock component and cannot drift, and the filled range still resolves the " +
          "accent-aware `--accent-track`. Full keyboard control: arrows step, Home/End jump the bounds, " +
          "Page Up/Down and Shift+arrow take a ten-step stride.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Slider>;

/** Usage — the standfirst, the canonical specimen, the live token spec, and the do/don't. */
export const Usage: Story = {
  // The DoDont callout labels (success/error text on the green/red tint) measure ~4.1–4.4 — just under
  // axe's strict 4.5; the callout colour + the DO/DON'T word already carry the meaning, so color-contrast
  // is scoped off here, a documented specimen exception.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader title="Slider · Usage" standfirst={DEFINITION} />

        <Section title="Specimen" lead="One value along a continuous range — the canonical slider job.">
          <VolumeDemo />
        </Section>

        <Rule />

        <Section title="One value display" lead="One value display per slider. Where there is a numeric box, the box is the readout — it reports the value and edits it. Where there is no box, the label row carries the readout instead.">
          <Grid columns={{ initial: "1", sm: "2" }} gap="3">
            <DoDont kind="do" bare note="The box reports the value and takes an exact one. Nothing else on the row repeats it, so there is one number to read and one place to change it.">
              <Box style={{ width: "100%" }}>
                <OpacityDemo />
              </Box>
            </DoDont>
            <DoDont kind="dont" bare note="The same control with a readout added above the box — the value stated twice, a few pixels apart. The second copy answers a question the first already did, and cannot be edited, so it reads as a control that is out of sync with itself.">
              <Box style={{ width: "100%" }}>
                <OpacityDemo doubled />
              </Box>
            </DoDont>
          </Grid>
        </Section>

        <Rule />

        <Section title="Tokens" lead="Every colour row is MEASURED off a real slider rendered for the purpose — the property is read from the element that paints it and checked against the token the row names, so a row can disagree with the component. The track, range and thumb are Radix's own skin (no --ds-* role of ours); the detent layer is ours and names its roles.">
          <SliderSpec />
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement }) => {
    // Passive assertions only (no driving, no drag): the specimen's a11y shape and its range token binding.
    // axe runs automatically on the story.
    const scope = canvasElement.querySelector<HTMLElement>('[data-testid="slider-specimen"]');
    if (!scope) throw new Error("Usage must render the labelled specimen slider");

    const thumb = scope.querySelector<HTMLElement>('[role="slider"]');
    if (!thumb) throw new Error('the slider thumb must carry role="slider"');
    if (!thumb.hasAttribute("aria-valuenow")) throw new Error("the slider thumb must expose aria-valuenow");
    // The thumb is named by the Field label through aria-labelledby (htmlFor can't name a span).
    const labelledBy = thumb.getAttribute("aria-labelledby");
    if (!labelledBy) throw new Error("the thumb must be named by the field label via aria-labelledby");
    if (!document.getElementById(labelledBy.split(" ").pop()!)) {
      throw new Error(`the thumb's aria-labelledby must resolve; got "${labelledBy}"`);
    }
    // aria-valuetext carries the formatted value — without it a detent/format is inaudible.
    if (thumb.getAttribute("aria-valuetext") !== "60%") {
      throw new Error(`the thumb must expose the formatted aria-valuetext; got "${thumb.getAttribute("aria-valuetext")}"`);
    }

    // The filled range is bound to the accent-aware --accent-track. Probe INSIDE the .radix-themes root
    // (canvasElement is above it, where the token doesn't resolve).
    const range = scope.querySelector<HTMLElement>(".rt-SliderRange");
    if (!range) throw new Error("the slider must render a filled range (.rt-SliderRange)");
    const themeRoot = canvasElement.querySelector<HTMLElement>(".radix-themes") ?? scope;
    const want = tokenHex(themeRoot, "--accent-track");
    const got = toHex(getComputedStyle(range).backgroundColor);
    if (got !== want) throw new Error(`the filled range must resolve --accent-track; got ${got} vs ${want}`);

    // The token table's EVIDENCE, asserted at runtime: every measured row read a real slider node,
    // resolved its claim somewhere else, and the two agree. Five rows, none unproven.
    const rows = assertMeasuredRows(canvasElement);
    if (rows.measured !== 5 || rows.unproven !== 0) {
      throw new Error(`expected 5 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }
  },
};

/** ValueInput — the paired numeric box: report the value AND edit it, without touching the thumb. */
export const ValueInput: Story = {
  // SIDEBAR LEAF, in the house's sentence case. Left to Storybook the export name is
  // title-cased into "Value Input", which then disagrees with this page's own h1 —
  // the header suffix is the role humanized ("Value input"), and the sidebar is the
  // same page. An explicit `name` does not change the story id.
  name: "Value input",
  render: () => (
    <Page>
      <PageHeader
        title="Slider · Value input"
        standfirst={<>{DEFINITION} A thumb is a great way to explore a scale and a terrible way to hit exactly 72. Pair the track with a numeric box and the control does both jobs: drag to feel the range, type to land the number.</>}
      />

      <Section title="One value" lead="Track, then box. Typing moves the thumb; the thumb updates the box. The box is the whole value display — nothing above it repeats the number.">
        <OpacityDemo />
      </Section>

      <Rule />

      <Section title="A range" lead="Two thumbs, two boxes — one on each side of the track, so each box sits at the end it controls.">
        <PriceRangeDemo />
        <Caption>
          Each box is clamped against its neighbour as well as the scale, and that neighbour is mirrored into
          the box's own bounds — so the low box cannot be typed past the high one.{" "}
          <Code>minStepsBetweenThumbs</Code> keeps them a set distance apart by <strong>blocking</strong> the
          move that would close the gap, never by pushing the other thumb along.
        </Caption>
      </Section>

      <Rule />

      <Section title="What a typed value does" lead="The commit contract, in the order a keystroke meets it.">
        <Box style={{ borderRadius: "var(--ds-radius-4)", border: "1px solid var(--ds-stroke-weak)", overflow: "hidden", background: "var(--ds-bg-subtle)" }}>
          {[
            ["While typing", "The box shows exactly what was typed and the thumb stays put. A partial entry is not a value yet."],
            ["Valid and on-step", "Commits live, per keystroke — the thumb tracks what is being typed."],
            ["Blur or Enter", "Commits. Out of range clamps to the bound, then snaps to step — type 150 into a 0–100 scale and the box lands on 100, with “150 was corrected to 100” announced assertively."],
            ["Unparseable or empty", "Reverts to the last committed value, also announced. Neither case raises a validation message — that channel is for standing problems, not a keystroke."],
          ].map(([k, v]) => (
            <Flex key={k} align="start" gap="4" style={{ padding: "10px 16px", borderTop: "1px solid var(--ds-stroke-weak)" }}>
              <Text size="1" weight="bold" style={{ width: 168, flexShrink: 0, color: "var(--ds-text-weak)", letterSpacing: "0.06em" }}>{k}</Text>
              <Text size="2" style={{ color: "var(--ds-text-strong)", lineHeight: 1.6, flex: 1, minWidth: 0 }}>{v}</Text>
            </Flex>
          ))}
        </Box>
      </Section>
    </Page>
  ),
};

/** Detents — marks, labels, and snapping to an irregular set of stops. */
export const Detents: Story = {
  render: () => (
    <Page>
      <PageHeader
        title="Slider · Detents"
        standfirst={<>{DEFINITION} Marks turn a continuous scale into a set of stops. Label them when the stops mean something ("Standard", "Print"); leave them bare when they are just a ruler. Either way the thumb announces where it landed, so a detent is not a purely visual promise.</>}
      />

      <Section title="Labelled stops" lead="A regular grid of named stops — step and marks agree, so every arrow press lands on a name.">
        <QualityDemo />
        <Caption>
          The stop's name is the value display here — the thumb rests on "Standard" and announces it, so
          there is no number to print. The two outer labels are anchored inward rather than centred on their
          ticks, the way a chart axis treats the ends of its scale: centred, half of "Draft" and half of
          "Master" would hang outside the control and collide with whatever sits beside it in a form column.
        </Caption>
      </Section>

      <Rule />

      <Section title="Irregular stops" lead="Export presets are not a grid — the gaps between them differ. step={null} snaps the thumb to the nearest mark, and the arrow keys walk stop to stop.">
        <ExportWidthDemo />
        <Caption>
          The paired numeric box is suppressed in this mode — a typed number has no meaning against stops it
          cannot reach — so the label row carries the readout. These stops are named for their preset but
          measured in pixels, which is why this one prints a number where the named scale above does not.
        </Caption>
      </Section>

      <Rule />

      <Section title="A bare ruler" lead="marks={true} places an unlabelled tick at every step — the granularity is visible without a legend crowding the control.">
        <TemperatureDemo />
        <Caption>
          With no labels underneath, the ticks are the only thing carrying the granularity — so they are painted
          to clear the 3:1 contrast floor a non-text UI component owes, not drawn as a hairline.
        </Caption>
      </Section>
    </Page>
  ),
};

/* ---- Keyboard contract ---------------------------------------------------- */

const SLIDER_KEYS: KeyBinding[] = [
  { keys: ["←", "→", "↑", "↓"], action: <>Move the focused thumb one <Code>step</Code> along the scale — back / forward on a horizontal track, down / up on a vertical one. Under RTL the horizontal pair mirrors.</>, src: "radix" },
  { keys: ["Home", "End"], action: <>Jump the thumb to <Code>min</Code> / <Code>max</Code> — the two ends of the scale.</>, src: "radix" },
  { keys: ["Page Up", "Page Down", "Shift + arrow"], action: <>Move by a coarse stride — ten <Code>step</Code>s at once — for crossing a wide range quickly.</>, src: "radix" },
  { keys: ["Tab"], action: <>Move to the next thumb, then on to the paired value box. A range is two tab stops plus its boxes — each one separately named.</>, src: "radix" },
  { keys: ["Enter"], action: <>In the value box: commit what was typed. Out-of-range clamps to the bound and announces the correction; unparseable text reverts.</>, src: "system" },
];

/** Keyboard — the full key → action contract, plus what changes when the thumb snaps to marks. */
export const Keyboard: Story = {
  render: () => (
    <Page maxWidth={900}>
      <PageHeader title="Slider · Keyboard" standfirst={DEFINITION} />
      <Section
        title="Keyboard"
        lead={<>The full key → action contract. <Code>Tab</Code> moves focus to the thumb (a range has two thumbs, so two tab stops); the keys below then move the focused thumb along the scale.</>}
      >
        <Flex direction="column" gap="2">
          <KeyboardDemo />
          <Caption>A live target — <Code>Tab</Code> to the thumb, then try the keys. The readout is the fastest way to see what each one did.</Caption>
        </Flex>
        <Box style={{ borderRadius: "var(--ds-radius-4)", border: "1px solid var(--ds-stroke-weak)", overflow: "hidden", background: "var(--ds-bg-subtle)" }}>
          {SLIDER_KEYS.map((b) => <KeyRow key={b.keys.join("+")} {...b} />)}
        </Box>
      </Section>

      <Rule />

      <Section title="When the thumb snaps to marks" lead="With step={null} the same keys move mark to mark instead of by a fixed amount, so no press is ever a no-op.">
        <Flex direction="column" gap="2">
          <ExportWidthDemo />
          <Caption>
            Arrows move one stop; <Code>Page Up</Code> / <Code>Page Down</Code> and <Code>Shift</Code>+arrow
            move ten; <Code>Home</Code> / <Code>End</Code> jump to the first and last stop.
          </Caption>
        </Flex>
      </Section>

      <Rule />

      <Section title="Screen readers" lead="What a thumb announces.">
        <Box style={{ borderRadius: "var(--ds-radius-4)", border: "1px solid var(--ds-stroke-weak)", overflow: "hidden", background: "var(--ds-bg-subtle)" }}>
          {[
            ["Name", "The field's label. On a range the thumb's own name comes first: “Minimum, Price”."],
            ["Value", "aria-valuenow, plus aria-valuetext when there is something better to say than a bare number — the name of the detent the thumb is resting on, or the formatted value."],
            ["Bounds", "aria-valuemin / aria-valuemax. On a range each thumb reports its neighbour, not the global bound, so the announced limit is the one that actually applies."],
            ["Corrections", "A typed value that had to be clamped or reverted is announced assertively — a correction is never silent."],
          ].map(([k, v]) => (
            <Flex key={k} align="start" gap="4" style={{ padding: "10px 16px", borderTop: "1px solid var(--ds-stroke-weak)" }}>
              <Text size="1" weight="bold" style={{ width: 120, flexShrink: 0, color: "var(--ds-text-weak)", letterSpacing: "0.06em" }}>{k}</Text>
              <Text size="2" style={{ color: "var(--ds-text-strong)", lineHeight: 1.6, flex: 1, minWidth: 0 }}>{v}</Text>
            </Flex>
          ))}
        </Box>
      </Section>
    </Page>
  ),
};

/* ---- Props ----------------------------------------------------------- */

type PropsArgs = {
  size: "auto" | "1" | "2" | "3" | "inherit";
  min: number;
  max: number;
  step: number;
  marks: boolean;
  showInput: boolean;
  inputPosition: "flank" | "end";
  range: boolean;
  disabled: boolean;
};

/** Props — the live, args-driven Slider. Drive the size lane, the scale, the detents, the paired
 *  box and the range.
 *  The value display follows the one-display rule rather than sitting beside it: with `showInput` on the
 *  box IS the readout, so the label row stays clear; switch the box off and the readout moves into the
 *  label row. Toggling `showInput` is therefore the rule, demonstrated. */
export const Props: StoryObj<PropsArgs> = {
  args: { size: "auto", min: 0, max: 100, step: 10, marks: true, showInput: true, inputPosition: "flank", range: false, disabled: false },
  argTypes: {
    size: { control: "inline-radio", options: ["auto", "1", "2", "3", "inherit"], description: '"auto" tracks the global uiSize toolbar (unset → the control lane); a step pins the track + thumb scale; "inherit" opts out (Radix default).', table: { category: "Variant" } },
    min: { control: { type: "number" }, description: "Lower bound of the scale.", table: { category: "Scale" } },
    max: { control: { type: "number" }, description: "Upper bound of the scale.", table: { category: "Scale" } },
    step: { control: { type: "number" }, description: "Snap granularity + arrow-key increment.", table: { category: "Scale" } },
    marks: { control: "boolean", description: "Place an unlabelled tick at every step.", table: { category: "Detents" } },
    showInput: { control: "boolean", description: "Pair the track with an editable numeric box.", table: { category: "Input" } },
    inputPosition: { control: "inline-radio", options: ["flank", "end"], description: "Where a range's two boxes sit — either side of the track, or both after it.", table: { category: "Input" } },
    range: { control: "boolean", description: "Two thumbs instead of one.", table: { category: "Scale" } },
    disabled: { control: "boolean", description: "Inert + dimmed; thumbs leave the tab order.", table: { category: "State" } },
  },
  parameters: { controls: { disable: false } },
  render: ({ size, min, max, step, marks, showInput, inputPosition, range, disabled }: PropsArgs) => {
    const span = max - min;
    const [single, setSingle] = useState<number[]>([min + span / 2]);
    const [pair, setPair] = useState<number[]>([min + span / 4, min + (span * 3) / 4]);
    const value = range ? pair : single;
    const setValue = range ? setPair : setSingle;
    return (
      <Page maxWidth="none">
        <PageHeader
          title="Slider · Props"
          standfirst={<>{DEFINITION} Switch <Code>showInput</Code> off and the value display moves from the box to the label row — one display either way.</>}
        />
        <Box style={{ width: 460, maxWidth: "100%", padding: "16px 0 8px" }}>
          <Field.Root>
            <Field.Label endSlot={showInput ? undefined : <ValueReadout>{value.join(" – ")}</ValueReadout>}>
              Value
            </Field.Label>
            <Slider
              value={value}
              onValueChange={setValue}
              size={size === "auto" ? undefined : size}
              min={min}
              max={max}
              step={step}
              marks={marks || undefined}
              showInput={showInput}
              inputPosition={inputPosition}
              disabled={disabled}
            />
          </Field.Root>
        </Box>
        <PropsLead />
        <Rule />
        <Section title="Props reference" lead={<>Every prop <Code>Slider</Code> accepts. <Code>size</Code> is resolved through the control lane by the wrap; the pass-throughs reach the Radix primitive unchanged.</>}>
          <PropTable rows={SLIDER_PROPS} />
        </Section>
      </Page>
    );
  },
};

/** History — the rulings this component encodes and a changelog of how it changes over time. */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="Slider · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="Primitive + borrowed skin">
            Radix Themes' <Code>Slider</Code> accepts <strong>no children</strong> — its type omits them and it
            hardcodes track, range and one thumb per value. Marks, a per-thumb name and a paired input are
            therefore structurally impossible through it. So this composes the <strong>raw Radix slider
            primitive</strong> (the same primitive the stock component renders) while wearing the stock
            component's own class names. The skin is sourced from the same stylesheet and cannot drift; only
            the additions are ours. This is the same trick <Code>CheckboxVisual</Code> uses to wear the
            Checkbox's box without re-drawing it.
          </Decision>
          <Decision id="Accent-aware fill">
            The filled range still paints <Code>--accent-track</Code>, the shade every part without text
            paints, so it follows a brand's collision shift with no override,
            and the wrap declares no colour role for the track, range or thumb. Only the detent layer is ours,
            and it borrows the neutral chrome roles.
          </Decision>
          <Decision id="Detents">
            A tick — with an optional label — per mark. Positions use <strong>Radix's own thumb-offset
            maths</strong>, not a raw <Code>left: X%</Code>: Radix insets each thumb by half its width so its
            centre stays on the track at the extremes, and a percentage-positioned tick therefore drifts half
            a thumb away from the thumb it marks at both ends. The layer is <Code>aria-hidden</Code> and
            <Code>pointer-events: none</Code> — the detent already reaches assistive tech through{" "}
            <Code>aria-valuetext</Code>, so a second silent copy would only add noise, and a geometry layer
            must never eat a drag. Silent is not the same as decorative: on a bare ruler the tick is the only
            thing carrying the granularity, so it paints from <Code>--ds-fill-medium</Code> to clear the 3:1
            contrast floor a non-text UI component owes. Marks outside the scale are dropped and the set is
            capped at 500, past which a tick is noise, not a stop.
          </Decision>
          <Decision id="Snap to marks">
            <Code>step={"{null}"}</Code> snaps to the nearest mark rather than a fixed grid, for scales whose
            stops are irregular (shutter speeds, ISO). Keyboard stepping is taken over in that mode so the
            arrows walk stop-to-stop; a fixed ±step would land between detents and snap straight back, which
            reads as a dead control.
          </Decision>
          <Decision id="Paired numeric box">
            <Code>showInput</Code> pairs the track with an editable box per bound — the point being that an
            exact value can be <strong>typed</strong>, never pixel-hunted. Typing is free while focused; a
            valid, in-range, on-step number commits live; blur and Enter commit. It is suppressed where it
            would lie: against irregular detents, on a vertical track, and past two thumbs. The box is a plain
            Radix TextField, not our <Code>NumberInput</Code> — NumberInput owns its own field shell, so
            nesting it would grow a second label, description and message tree inside this one.
          </Decision>
          <Decision id="One value display">
            <strong>The box IS the readout.</strong> Where there is a box it both reports and edits, so a
            second copy of the value — a label-row readout, a tooltip bubble over the thumb — is printing the
            same number twice a few pixels apart: two things to reconcile, and nothing to do with the second.
            A slider with no box carries its readout in the label row instead. One display per value, always;
            a range has two bounds, so two boxes, still one each. This is also why the value bubble is not
            built: a bubble is the answer only when there is nothing else reporting the value.
          </Decision>
          <Decision id="A box that never resizes">
            The box is sized once, for the <strong>widest value its scale can legally hold</strong> — not for
            the value it currently shows. A box that grew as <Code>9</Code> ticked over to <Code>10</Code>{" "}
            would twitch under every drag, and one sized to the current value would truncate the moment the
            value reached the bound. That width is <strong>measured, not counted</strong>: the widest strings
            are laid out by the browser in the box's own type and the result read back, so the box follows a
            change of font family, size lane, scale or letter-spacing instead of being tuned to one of them.
          </Decision>
          <Decision id="Clamp, not reject">
            A typed value outside the bounds is <strong>clamped</strong> to the bound and announced
            assertively ("150 was corrected to 100"); an unparseable or empty box reverts, also announced.
            Neither touches the validation channel, which is reserved for standing problems. That is a{" "}
            <strong>settled, deliberate exception</strong> to the rule the plain number field follows —
            reject an out-of-range entry, never quietly rewrite it. The exception holds because a slider's
            bounds are <em>already visible</em>: the track physically ends, and dragging past the end
            yields <Code>max</Code>. Typing past the end does what dragging past the end does. A bare
            number field has no visible bound, which is exactly why reject-and-revert is right there.
          </Decision>
          <Decision id="Names for every thumb">
            The primitive names the two thumbs of a range in hardcoded English and leaves a{" "}
            <strong>single thumb nameless entirely</strong>. Every thumb gets a name here, and inside a{" "}
            <Code>Field.Root</Code> that name is announced together with the field's label ("Minimum, Price").
            The plumbing is <Code>aria-labelledby</Code>, not <Code>htmlFor</Code>: a thumb is a{" "}
            <Code>span</Code>, and <Code>htmlFor</Code> only names a labelable element — pointing it at a span
            is a silent no-op. The field shell grew a <Code>labelId</Code> for exactly this.
          </Decision>
          <Decision id="Neighbour-constrained bounds">
            On a range, the primitive reports the <em>global</em> min and max on both thumbs — which tells
            assistive tech the lower thumb may travel past the upper one. Each thumb here reports its{" "}
            <strong>neighbour</strong> as its bound instead, which is what the multi-thumb pattern requires,
            and the wrapper carries <Code>role="group"</Code> so the pair announces as one control.
          </Decision>
          <Decision id="Gap blocks, never pushes">
            <Code>minStepsBetweenThumbs</Code> <strong>blocks</strong> a move that would close the gap: the
            dragged thumb simply stops. It does not push its neighbour along, which is what some other slider
            libraries do and is a genuinely different feel — worth knowing before you reach for it. Thumbs can
            never cross either (values re-sort on every change), so there is no "allow cross" escape hatch to
            look for.
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0 · rebuilt on the raw primitive">
            Rebuilt on the raw slider primitive wearing the stock skin, so it could gain what the closed
            component cannot carry: detent marks (with snap-to-marks for irregular scales), a paired numeric
            box that both reports and edits the value, and the accessibility the primitive omits —{" "}
            <Code>aria-valuetext</Code>, a name on every thumb, and neighbour-constrained bounds on a range.
            Clamp-on-type documented as a divergence from the number field's reject rule.
          </Decision>
          <Decision id="0.9.0">
            Initial <Code>System/Slider</Code> — the stock Radix slider wrapped on the control size lane, its
            filled range bound to the accent-aware fill by skin reuse; the accessible name forwarded to a
            single nameless thumb.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
