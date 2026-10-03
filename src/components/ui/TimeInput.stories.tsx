import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import { Info } from "@phosphor-icons/react";
import { TimeInput } from "./TimeInput";
import type { ISOTimeString } from "../../dates/timeParser";
import {
  AnatomyLegend, Caption, Decision, DoDont, DODONT_LABEL, dotStyle, HexThemeKey, hLine, type KeyBinding, KeyRow,
  MeasuredRow, MeasuredSpec, Mono, Muted, NoteRow, Page, PageHeader, PropsLead, type PropDef, PropTable, Rule, Scenario, Section,
  tick, TokenGroup,
} from "./_storyKit";
import { assertMeasuredRows } from "../../foundations/_assert";
import { ComparisonSection, DATE_TIME_COMPARISON } from "./_comparisons";

/** The component's definition — one source, referenced by the header of every story on this page. */
const DEFINITION = <>Reach for a TimeInput when the user enters <strong>a time of day</strong> and typing is often faster than fiddling — a meeting start, a reminder, an alarm. It accepts free text in many formats (<Code>3pm</Code>, <Code>15:00</Code>, <Code>3:00 PM</Code>) and steps by <Code>↑</Code> / <Code>↓</Code>; the wire value is always an ISO <Code>HH:MM</Code> string.</>;

/* These are the DOCS stories (History · Anatomy · Usage · Keyboard · Props) — static and calm on
   view. All behavioral plays live in `_timeinput.stories.tsx` (_internal/TimeInput behavior), so viewing a
   docs page never auto-drives the field (Storybook runs a story's play on view). The live specimens here
   stay manually interactive. */

const noop = () => {};
const iso = (s: string) => s as ISOTimeString;

/* ---- anatomy: the field specimen + callouts (OUTSIDE the field) ---------- */
function AnatomyDiagram() {
  return (
    <Box style={{ overflowX: "auto" }}>
      <Box style={{ position: "relative", width: "100%", minWidth: 480, maxWidth: 660, margin: "0 auto", height: 210, background: "var(--ds-bg-subtle)", borderRadius: "var(--ds-radius-4)", overflow: "hidden" }}>
        <Flex align="center" justify="center" style={{ position: "absolute", inset: 0 }}>
          <Box style={{ position: "relative", width: 300 }} data-size-lesson="anatomy callout geometry — the callouts are placed against this size-3 field; its inset clear ✕ holds step 1">
            <TimeInput
              size="3"
              label="Start time"
              info={<Info size={16} weight="regular" aria-hidden style={{ color: "var(--ds-icon-neutral)", display: "block" }} />}
              endSlot={<Text size="1" style={{ color: "var(--ds-text-weak)" }}>Optional</Text>}
              description="Type a time or use ↑ ↓."
              hasClear
              defaultValue={iso("14:30")}
              onValueChange={noop}
            />
          </Box>
        </Flex>
        {/* 1 — label */}
        <Box style={{ ...dotStyle, left: "calc(50% - 220px)", top: 58 }}>1</Box>
        <Box style={hLine({ left: "calc(50% - 198px)", top: 68, width: 44 })} />
        {/* 2 — info glyph (tick down onto the icon beside the label) */}
        <Box style={{ ...dotStyle, left: "calc(50% - 96px)", top: 12 }}>2</Box>
        <Box style={tick({ left: "calc(50% - 86px)", top: 32, height: 30 })} />
        {/* 3 — end-slot (from the right) */}
        <Box style={{ ...dotStyle, left: "calc(50% + 220px)", top: 58 }}>3</Box>
        <Box style={hLine({ left: "calc(50% + 150px)", top: 68, width: 48 })} />
        {/* 4 — clock glyph (leading identifier; tick up from below) */}
        <Box style={{ ...dotStyle, left: "calc(50% - 150px)", top: 150 }}>4</Box>
        <Box style={tick({ left: "calc(50% - 140px)", top: 108, height: 42 })} />
        {/* 5 — typed value / placeholder (tick up from below) */}
        <Box style={{ ...dotStyle, left: "calc(50% - 40px)", top: 150 }}>5</Box>
        <Box style={tick({ left: "calc(50% - 30px)", top: 108, height: 42 })} />
        {/* 6 — clear ✕ (from the right, upper) */}
        <Box style={{ ...dotStyle, left: "calc(50% + 220px)", top: 92 }}>6</Box>
        <Box style={hLine({ left: "calc(50% + 120px)", top: 102, width: 78 })} />
        {/* 7 — description */}
        <Box style={{ ...dotStyle, left: "calc(50% - 220px)", top: 128 }}>7</Box>
        <Box style={hLine({ left: "calc(50% - 198px)", top: 138, width: 44 })} />
      </Box>
    </Box>
  );
}

const ANATOMY_PARTS: [number, string, string][] = [
  [1, "Label", "the field’s name — sets the accessible name via htmlFor → id (shared Field.Label)"],
  [2, "Info", "an optional inline affordance beside the label — a tip icon or helper toggle (shared Field.Label)"],
  [3, "End-slot", "an optional pinned note at the far end of the label row — “Optional”, a count, an action"],
  [4, "Clock glyph", "a leading, decorative field identifier (aria-hidden — the label carries the name); --ds-icon-neutral"],
  [5, "Value / placeholder", "the free-text entry: type a time in many formats (“3pm”, “15:00”, “3:00 PM”); a committed value shows FORMATTED per hourFormat. ↑ / ↓ increment it in place. A greyed placeholder before entry."],
  [6, "Clear ✕", "the optional trailing clear (hasClear) — appears while a value is set, resets to empty; out of the tab order"],
  [7, "Description", "an optional helper line beneath; replaced by the validation message when a STANDING state is active"],
];

/* ========================================================================== */

const meta: Meta<typeof TimeInput> = {
  title: "Components/Date & Time/TimeInput",
  component: TimeInput,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**TimeInput** — a free-text time field with keyboard (↑ / ↓) increment, on the shared **Field** " +
          "shell. A **DateInput sibling minus the popover**: the input rides Radix `TextField.Root` (so the " +
          "accent-aware validation paint + system focus ring + affixes come for free), parsing uses " +
          "`parseTimeInput` (“3pm”, “15:00”, “3:00 PM”), and typed text **parses live** and **silently " +
          "reverts** if it never resolves — feeding the same two-channel feedback model (ephemeral announce vs " +
          "standing validation). ↑ / ↓ step the time by `increment` minutes (wrapping midnight), each step " +
          "announced politely. It stays a **plain text input** — deliberately not a spinbutton.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof TimeInput>;

/** Anatomy — the parts of the field and the two validation channels. The live token spec lives in Usage. */
export const Anatomy: Story = {
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader title="TimeInput · Anatomy" standfirst={DEFINITION} />

        <Section title="Anatomy — the field" lead="The shared label row carries the name plus an optional info affordance and a pinned end-slot; a leading clock glyph identifies the field; the input takes free-text (a committed value shows FORMATTED per hourFormat), with an optional clear ✕ in the trailing slot; a description helper sits beneath. The label row + support area are the same shared Field chrome as TextField — only the leading glyph and the ↑ / ↓ increment behaviour are particular to TimeInput.">
          <AnatomyDiagram />
          <AnatomyLegend parts={ANATOMY_PARTS} />
          <Caption>
            Only the <strong>label</strong> is required. The <strong>clock glyph</strong> is always present; the{" "}
            <strong>clear ✕</strong> (<Code>hasClear</Code>), the <strong>info</strong>, the{" "}
            <strong>end-slot</strong>, and the <strong>description</strong> are optional.
          </Caption>
        </Section>

        <Rule />

        <Section title="Two feedback channels" lead="The parse-feedback model that keeps the field honest — shared with DateInput. An ephemeral parse failure and a standing problem are DIFFERENT signals and never share a surface.">
          <Grid columns={{ initial: "1", sm: "2" }} gapX="6" gapY="4">
            <Flex direction="column" gap="2">
              <Text size="1" weight="bold" style={{ color: "var(--ds-text-weak)", letterSpacing: "0.06em" }}>EPHEMERAL — announce + revert</Text>
              <Muted>Unparseable text is announced assertively and silently reverts to the last valid value. It flags aria-invalid only WHILE pending — never a red border (the field is still valid). Greying the text alone would leave a screen-reader user with no signal at all.</Muted>
              <Box style={{ padding: 12, borderRadius: "var(--ds-radius-3)", background: "var(--ds-bg-subtle)", border: "1px solid var(--ds-stroke-weak)" }}>
                <Muted>“Didn’t recognize that time — kept 2:30 PM.”</Muted>
              </Box>
            </Flex>
            <Flex direction="column" gap="2">
              <Text size="1" weight="bold" style={{ color: "var(--ds-text-weak)", letterSpacing: "0.06em" }}>STANDING — validation channel</Text>
              <Muted>A committed value out of min/max (or a caller-supplied validation) paints the input border + tint + a message below — the accent-aware family, the same as any TextField.</Muted>
              <Box data-testid="ti-standing" style={{ maxWidth: 280 }}>
                <TimeInput label="Meeting start" max={iso("17:00")} defaultValue={iso("18:30")} onValueChange={noop} />
              </Box>
            </Flex>
          </Grid>
          <Caption>The standing specimen holds a value later than its <Mono>max</Mono>, so it wears the error border + a corrective message — a real problem the user must resolve, not a transient typo.</Caption>
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
};

/** Usage — when to reach for TimeInput, the field kept in context, and the live token spec that closes
 *  the page. */
export const Usage: Story = {
  // Semantic step-11 error text on the invalid-field wash: #ce2c31 on #fbe8ea = 4.42, under axe's 4.5.
  // Surfaced by narrowing the do/don't carve-out to the DO/DON'T word alone. Same unruled tone-on-tint
  // gap as Callout/Badge — it needs a ruling on the tone tokens, not a story-level fix.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL, "[style*='--ds-text-error']", '[data-field-part="message"][data-tone="error"]'] } } },
  render: (_args, { globals }) => (
    <Page>
      <PageHeader title="TimeInput · Usage" standfirst={DEFINITION} />

      <ComparisonSection comparison={DATE_TIME_COMPARISON} highlight="TimeInput" />

      <Rule />

      <Section title="12-hour and 24-hour" lead="hourFormat controls the DISPLAY only — the wire value is always ISO 24-hour HH:MM. Match the convention your audience reads.">
        <Grid columns={{ initial: "1", sm: "2" }} gapX="6" gapY="4">
          <Scenario label="12-HOUR (default)" caption={<>“2:30 PM”. The common consumer convention in en-US.</>}>
            <Box style={{ maxWidth: 280 }}>
              <TimeInput label="Start time" hourFormat="12h" defaultValue={iso("14:30")} onValueChange={noop} />
            </Box>
          </Scenario>
          <Scenario label="24-HOUR" caption={<>“14:30”. Operational / international contexts, or where seconds matter.</>}>
            <Box style={{ maxWidth: 280 }}>
              <TimeInput label="Start time" hourFormat="24h" hasSeconds defaultValue={iso("14:30:00")} onValueChange={noop} />
            </Box>
          </Scenario>
        </Grid>
        <Caption>Both fields above hold the SAME wire value; only the rendered string differs. Add <Mono>hasSeconds</Mono> when second-level precision matters (it flows through parsing, display, and the increment).</Caption>
      </Section>

      <Rule />

      <Section title="A typo is not a validation error" lead="The rule this component shares with DateInput: when typed text doesn’t resolve, revert quietly and SAY so out loud — don’t paint the field red. A reverted field is showing its last VALID value, so a standing error state would be a lie.">
        <Grid columns={{ initial: "1", sm: "2" }} gap="3">
          <DoDont kind="do" bare note="Unparseable text reverts to the last valid value with an assertive announcement (“Didn’t recognize that time — kept 2:30 PM.”). The field stays at neutral rest; aria-invalid was set only while the text was pending.">
            <Box style={{ maxWidth: 320 }}>
              <TimeInput aria-label="Start time (do)" defaultValue={iso("14:30")} onValueChange={noop} />
            </Box>
          </DoDont>
          <DoDont kind="dont" bare note="Painting a red validation border on a field that has silently reverted to a perfectly valid time — the user reads “error”, but the value shown is fine. Reserve the red channel for STANDING problems (out of min/max, or a real caller validation).">
            <Box style={{ maxWidth: 320 }}>
              <TimeInput aria-label="Start time (don’t)" defaultValue={iso("14:30")} validation={{ tone: "error", message: "Enter a valid time." }} onValueChange={noop} />
            </Box>
          </DoDont>
        </Grid>
        <Caption>The standing channel is still the right home for a genuine constraint — a value out of <Mono>min</Mono>/<Mono>max</Mono> synthesizes a corrective message automatically, and a caller can pass any <Code>validation</Code>.</Caption>
      </Section>

      <Rule />

      <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
        <Section title="Tokens" lead="Both colour rows are MEASURED off a real field rendered for the purpose — the property is read from the element that paints it and checked against the token the row names, so a row can disagree with the component. The input reuses Radix TextField.Root, so its border/fill + focus ring are the shared Field chrome (no popover surface to paint — TimeInput has none).">
          <TokenGroup label="INPUT (rest + affixes)" blurb="The input reuses Radix TextField.Root — its resting border/fill + the system focus ring ([[focus-ring]]) are shared Field chrome; only the affix glyphs are painted here.">
            <MeasuredSpec render={() => <TimeInput label="Measurement" defaultValue={iso("09:30")} onValueChange={noop} />}>
              <MeasuredRow
                part="Clock glyph (leading)" note="The decorative field identifier at the start of the input."
                token="--ds-icon-neutral" select=".rt-TextFieldSlot[data-side='left'] svg" prop="fill"
              />
              <MeasuredRow
                part="Focus ring" note="Read from the rule the field’s own stylesheet paints while the input holds focus. The accent base, with the stack alpha on top, 2px ([[focus-ring]])."
                token="--ds-stroke-focus" select=".rt-TextFieldRoot" prop="outline-color" state="focus"
              />
            </MeasuredSpec>
            <NoteRow part="Clear ✕ glyph" value="ghost IconButton — accent-tinted (fill:currentColor), the shared Typeahead/Select/DateInput clear affix, not --ds-icon-neutral" />
            <NoteRow part="Border (rest)" value="a 1px inset ring carried inside box-shadow, so no colour property carries it" radix="--gray-a7" />
          </TokenGroup>
        </Section>
      </HexThemeKey.Provider>
    </Page>
  ),
  play: async ({ canvasElement }) => {
    // The token table's EVIDENCE, asserted at runtime: both measured rows read a real field node,
    // resolved their claim somewhere else, and the two agree. Reads only — nothing drives the field.
    const rows = assertMeasuredRows(canvasElement);
    if (rows.measured !== 2 || rows.unproven !== 0) {
      throw new Error(`expected 2 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }
  },
};

/* ---- Keyboard contract --------------------------------------------------- */
const KEYS: KeyBinding[] = [
  { keys: ["Type"], action: <>Enter a time in many formats — <Code>3pm</Code>, <Code>15:00</Code>, <Code>3:00 PM</Code>, <Code>1430</Code>. It <strong>parses live</strong>: a resolved, in-range time fires immediately.</>, src: "system" },
  { keys: ["↑"], action: <>Increment the time by <Code>increment</Code> minutes (default 1), wrapping past midnight. An empty field <strong>seeds from the current time</strong> first. Announced politely.</>, src: "system" },
  { keys: ["↓"], action: <>Decrement by <Code>increment</Code> minutes, wrapping past midnight. Clamped at <Code>min</Code>/<Code>max</Code> (a step that would leave the range is a no-op).</>, src: "system" },
  { keys: ["Enter"], action: <>Commit the typed text — a resolved time is kept; unrecognized text <strong>silently reverts</strong> to the last value (announced assertively).</>, src: "system" },
  { keys: ["Tab"], action: <>Move focus on. Leaving the field <strong>commits</strong> the typed text (same as Enter).</>, src: "system" },
];

/** Keyboard — the complete key → action contract for the field. */
export const Keyboard: Story = {
  render: () => (
    <Page>
      <PageHeader title="TimeInput · Keyboard" standfirst={DEFINITION} />

      <Section title="Keyboard" lead={<>The full key → action contract. TimeInput is a <strong>plain text input</strong> (deliberately not a spinbutton) — free text plus <Code>↑</Code> / <Code>↓</Code> stepping. There is no popover.</>}>
        <Flex direction="column" gap="2">
          <Box style={{ maxWidth: 300 }}>
            <TimeInput label="Start time" description="Type a time, or use ↑ / ↓ to step." onValueChange={noop} />
          </Box>
          <Caption>A live target — type a time to see it parse, or press ↑ / ↓ to step (an empty field seeds from now).</Caption>
        </Flex>
        <TokenGroup label="TIMEINPUT">
          {KEYS.map((b) => <KeyRow key={b.keys.join("+")} {...b} />)}
        </TokenGroup>
        <Caption><strong>Screen reader</strong> — every ↑ / ↓ step announces the new time politely; an unrecognized typed entry announces its revert through an assertive live region.</Caption>
      </Section>
    </Page>
  ),
};

/* ---- Props ---------------------------------------------------------- */
const PROPS: PropDef[] = [
  { name: "value / defaultValue", type: "ISOTimeString", desc: <>Controlled / uncontrolled time, an ISO <Code>HH:MM</Code> or <Code>HH:MM:SS</Code> (24-hour) string. The human 12h/24h form is display only.</>, source: "TimeInput.tsx" },
  { name: "onValueChange", type: "(v: ISOTimeString | undefined) => void", desc: <>Required. Fires with the committed ISO time, or <Code>undefined</Code> when cleared. No <Code>null</Code>.</>, source: "TimeInput.tsx" },
  { name: "min / max", type: "ISOTimeString", desc: <>Allowed bounds — earlier/later times are rejected on commit and clamp the ↑ / ↓ increment. A committed value out of bounds surfaces a STANDING validation error.</>, source: "TimeInput.tsx" },
  { name: "hourFormat", type: `"12h" | "24h"`, def: `"12h"`, desc: <>Display format only; the wire value is always ISO 24-hour.</>, source: "TimeInput.tsx" },
  { name: "hasSeconds", type: "boolean", def: "false", desc: <>Parse, display, and step at second precision.</>, source: "TimeInput.tsx" },
  { name: "increment", type: "number", def: "1", desc: <>↑ / ↓ step size, in minutes.</>, source: "TimeInput.tsx" },
  { name: "placeholder", type: "string", def: `"Select a time"`, desc: <>Greyed hint while empty.</>, source: "TimeInput.tsx" },
  { name: "hasClear", type: "boolean", def: "false", desc: <>A trailing clear ✕ (out of tab order) while a value is set.</>, source: "TimeInput.tsx" },
  { name: "hasAutoFocus", type: "boolean", def: "false", desc: <>Focus the input on mount.</>, source: "TimeInput.tsx" },
  { name: "size", type: `"1" | "2" | "3"`, def: `"1"`, desc: <>Control size. Unset, it resolves from the global <Code>uiSize</Code> control lane (default <Code>small</Code> → <Code>1</Code>).</>, source: "TimeInput.tsx" },
  { name: "disabled", type: "boolean", def: "false", desc: <>Dims the input and makes it inert (native disabled — unless paired with a reason).</>, source: "TimeInput.tsx" },
  { name: "disabledReason", type: "string", desc: <>A non-empty reason SOFT-disables (aria-disabled + readOnly + reason tooltip + glyph) so the reason stays perceivable on hover and focus.</>, source: "TimeInput.tsx" },
  { name: "label / info / endSlot / description / validation", type: "Field props", desc: <>The shared <Code>Field</Code> shell. <Code>validation</Code> is the STANDING channel; ephemeral parse failures announce + revert instead. Pass none of label / description / validation to keep the control bare.</>, source: "TimeInput.tsx" },
  { name: "aria-label / aria-labelledby", type: "string", desc: <>Names a <strong>bare</strong> field (no visible <Code>label</Code>): pass the name as text, or the <Code>id</Code> of the element that already reads as its name. One of <Code>label</Code> / <Code>aria-label</Code> / <Code>aria-labelledby</Code> is required — an unnamed field fails WCAG 4.1.2, and a <Code>placeholder</Code> is not a name.</>, source: "TimeInput.tsx" },
  { name: "width", type: "number | string", desc: <>Constrain the field width.</>, source: "TimeInput.tsx" },
];

type PropsArgs = {
  showLabel: boolean;
  label: string;
  placeholder: string;
  description: string;
  validation: { tone: "error" | "warning" | "success" | "info"; message: string } | undefined;
  size: "auto" | "1" | "2" | "3";
  hourFormat: "12h" | "24h";
  hasSeconds: boolean;
  increment: number;
  hasClear: boolean;
  disabled: boolean;
  disabledReason: string;
};

/** Props — the live, args-driven field (uncontrolled; type or step, and drive every prop from Controls). */
export const Props: StoryObj<PropsArgs> = {
  args: {
    showLabel: true,
    label: "Start time",
    placeholder: "Select a time",
    description: "Type a time or use ↑ ↓.",
    validation: undefined,
    size: "auto",
    hourFormat: "12h",
    hasSeconds: false,
    increment: 1,
    hasClear: true,
    disabled: false,
    disabledReason: "",
  },
  argTypes: {
    showLabel: { name: "label (show)", control: "boolean", table: { category: "Field" } },
    label: { control: "text", if: { arg: "showLabel" }, table: { category: "Field" } },
    placeholder: { control: "text", table: { category: "Field" } },
    description: { name: "description (helper)", control: "text", table: { category: "Field" } },
    validation: {
      control: "inline-radio",
      options: ["none", "error", "warning", "success", "info"],
      mapping: {
        none: undefined,
        error: { tone: "error", message: "Choose a time in the allowed range." },
        warning: { tone: "warning", message: "Double-check this time." },
        success: { tone: "success", message: "That works." },
        info: { tone: "info", message: "You can change this later." },
      },
      table: { category: "Field" },
    },
    size: { control: "inline-radio", options: ["auto", "1", "2", "3"], description: '"auto" tracks the global uiSize toolbar (unset → the control lane); a step pins the field.', table: { category: "Variant" } },
    hourFormat: { control: "inline-radio", options: ["12h", "24h"], table: { category: "Behaviour" } },
    hasSeconds: { control: "boolean", table: { category: "Behaviour" } },
    increment: { control: { type: "number", min: 1, max: 60 }, table: { category: "Behaviour" } },
    hasClear: { name: "hasClear (✕)", control: "boolean", table: { category: "Behaviour" } },
    disabled: { control: "boolean", table: { category: "Variant" } },
    disabledReason: { control: "text", table: { category: "Variant" } },
  },
  parameters: { controls: { disable: false } },
  render: (args: PropsArgs) => {
    // A tiny controlled wrapper so the stepped/typed value persists in the demo.
    function Demo() {
      const [v, setV] = useState<ISOTimeString | undefined>(undefined);
      return (
        <TimeInput
          value={v}
          onValueChange={setV}
          label={args.showLabel ? args.label : undefined}
          aria-label={args.showLabel ? undefined : args.label || "Time"}
          placeholder={args.placeholder}
          description={args.description}
          validation={args.validation}
          size={args.size === "auto" ? undefined : args.size}
          hourFormat={args.hourFormat}
          hasSeconds={args.hasSeconds}
          increment={args.increment}
          hasClear={args.hasClear}
          disabled={args.disabled}
          disabledReason={args.disabledReason || undefined}
        />
      );
    }
    return (
      <Page maxWidth="none">
        <PageHeader title="TimeInput · Props" standfirst={DEFINITION} />
        <Box p="5" style={{ maxWidth: 380 }}>
          <Demo />
          <Box mt="3"><Caption>Type a time (“3pm”, “15:00”, “3:00 PM”), or use ↑ / ↓ to step (an empty field seeds from now). Unrecognized text reverts on blur; a value out of a set <Mono>min</Mono>/<Mono>max</Mono> would surface the standing error channel.</Caption></Box>
        </Box>
        <PropsLead />
        <Rule />
        <Section title="Props reference" lead={<>Every prop <Code>TimeInput</Code> accepts — the ISO wire contract, the increment bounds, and the shared <Code>Field</Code> shell.</>}>
          <PropTable rows={PROPS} />
        </Section>
      </Page>
    );
  },
};

/** History — the rulings this component encodes and a changelog of how it changes over time. */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="TimeInput · History" standfirst={DEFINITION} />

      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[catalog-as-specification]] · shared primitives">
            <strong>Built on shared primitives.</strong> Parsing is <Code>parseTimeInput</Code> and the
            increment is <Code>adjustTime</Code> (O(1) midnight wrap, non-finite-guarded), both from{" "}
            <Code>src/dates/timeParser.ts</Code>. The shared <Code>Field</Code> shell, <Code>IconButton</Code>, and
            the singleton live-region announcer are reused. No time math is re-implemented here.
          </Decision>
          <Decision id="[[time-input]] · API">
            <strong>Normalized wire contract.</strong> <Code>value?: ISOTimeString</Code>, a <em>required</em>{" "}
            <Code>onValueChange(v | undefined)</Code>, <Code>null</Code>-free
            (<Code>undefined</Code> = empty). ISO <Code>HH:MM[:SS]</Code> (24-hour) on the wire; the human-readable
            12h/24h form is display only.
          </Decision>
          <Decision id="[[time-input]] · increment model">
            <strong>↑ / ↓ increment in place.</strong> <Code>ArrowUp</Code> / <Code>ArrowDown</Code> steps the time
            by <Code>increment</Code> minutes via <Code>adjustTime</Code> (wrapping across midnight); when the field
            is <strong>empty</strong> the base <strong>seeds from the current wall-clock time</strong> (a{" "}
            <Code>new Date()</Code> read in the component, never inside <Code>adjustTime</Code>). A step fires only
            if it stays within <Code>min</Code>/<Code>max</Code> (clamped at the bound).
          </Decision>
          <Decision id="[[time-input]] · announce every step">
            <strong>Each step is announced politely.</strong> An arrow key silently mutating a plain text input is
            invisible to a screen reader, so every successful step announces the new formatted time through the
            singleton <Code>useAnnounce</Code> at <Code>"polite"</Code> — distinct from the <em>assertive</em>{" "}
            parse-failure channel.
          </Decision>
          <Decision id="[[time-input]] · text field, not spinbutton">
            <strong>It stays a plain text input.</strong> Deliberately <em>not</em> <Code>role="spinbutton"</Code>:
            TimeInput is free-text-first (“3pm”, “15:00”), and a spinbutton implies a constrained numeric /
            segmented widget we didn’t adopt. Stated so nobody “upgrades” it to a role that mis-describes the field.
          </Decision>
          <Decision id="[[time-input]] · no stepper buttons (reuse gate)">
            <strong>No visible +/- stepper buttons.</strong> The same call <Code>NumberInput</Code>{" "}
            made — a <em>TimeInput-only</em> stepper would fragment the system. A shared, touch-friendly stepper
            primitive is deferred until the system earns one, not built bespoke here.
          </Decision>
          <Decision id="[[time-input]] · parity announce">
            <strong>Invalid feedback matches DateInput.</strong> When typed text doesn’t resolve, the field
            announces the revert <strong>assertively</strong> and flags <Code>aria-invalid</Code> while the pending
            text is unresolved — the same invalid feedback <Code>DateInput</Code> gives, so a screen-reader user
            isn’t left guessing. (Greying the invalid text alone would be silent to assistive tech.)
          </Decision>
          <Decision id="[[date-input]] · two channels (shared)">
            <strong>Two feedback channels that never cross.</strong> An <em>ephemeral</em> parse failure is
            announced <strong>assertively</strong> (“Didn’t recognize that time — kept 2:30 PM.”), flags{" "}
            <Code>aria-invalid</Code> only while pending, then <strong>silently reverts</strong>. It never enters{" "}
            <Code>Field.validation</Code> — a red border on a reverted-to-valid field would lie. The real validation
            channel is reserved for <strong>standing</strong> problems (a committed value out of min/max, or a
            caller-supplied <Code>validation</Code>). Shared with DateInput.
          </Decision>
          <Decision id="[[disabled-reason]] · Soft-disable with a reason">
            <strong>Soft-disable-with-reason.</strong> <Code>disabled</Code> + a non-empty <Code>disabledReason</Code>{" "}
            soft-disables (<Code>aria-disabled</Code> + <Code>readOnly</Code> + a reason tooltip + a quiet Info glyph)
            instead of natively disabling — so the reason stays perceivable on hover AND keyboard focus. The edit /
            keydown / step handlers early-return while soft. Inherited identically from the <Code>Field</Code> family.
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            Initial <Code>System/TimeInput</Code> — the free-text time field: live parse-on-type (eager fire),
            commit-on-blur-or-Enter with silent revert, <Code>ArrowUp</Code>/<Code>ArrowDown</Code> in-place
            increment (<Code>adjustTime</Code> midnight wrap, empty-seeds-from-now, polite announce), 12h/24h
            display, optional seconds, the two-channel feedback model, <Code>hasClear</Code>, and full Field-shell
            validation + <Code>disabledReason</Code>. Stories: History · Anatomy · Usage · Keyboard · Props.
          </Decision>
          <Decision id="Deferred → shared stepper">
            <strong>Touch-friendly +/- stepper buttons / a shared stepper primitive</strong> — the same deferral as{" "}
            <Code>NumberInput</Code>’s custom stepper; built once and shared when the system earns it, never as a
            TimeInput-only control.
          </Decision>
          <Decision id="Deferred → server actions">
            <strong>The <Code>changeAction</Code> async-optimistic layer</strong> (<Code>isLoading</Code> / an inset
            Spinner while a server action settles) — a react-server-action optimistic-UI affordance; revisit if the
            app layer needs it.
          </Decision>
          <Decision id="Deferred → InputGroup">
            <strong>InputGroup composition</strong> (attaching the field to an adjacent addon) — parked until{" "}
            <Code>InputGroup</Code> ships.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
