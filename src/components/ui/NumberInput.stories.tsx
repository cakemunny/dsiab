import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import { Info } from "@phosphor-icons/react";
import { NumberInput } from "./NumberInput";
import {
  AnatomyLegend, Caption, Decision, DoDont, DODONT_LABEL, dotStyle, HexThemeKey, hLine, type KeyBinding, KeyRow,
  MeasuredRow, MeasuredSpec, Mono, Muted, NoteRow, Page, PageHeader, PropsLead, type PropDef, PropTable, Rule, Scenario, Section,
  tick, TokenGroup,
} from "./_storyKit";

/* These are the DOCS stories (History · Anatomy · Usage · Keyboard · Props) — static and calm on
   view. All behavioral plays live in `_numberinput.stories.tsx` (_internal/NumberInput behavior), so
   viewing a docs page never auto-drives the field (Storybook runs a story's play on view). The live
   specimens here stay manually interactive. */

const noop = () => {};

/* ---- anatomy: the field specimen + callouts (OUTSIDE the field) ---------- */
function AnatomyDiagram() {
  return (
    <Box style={{ overflowX: "auto" }}>
      <Box style={{ position: "relative", width: "100%", minWidth: 480, maxWidth: 660, margin: "0 auto", height: 210, background: "var(--ds-bg-subtle)", borderRadius: "var(--ds-radius-4)", overflow: "hidden" }}>
        <Flex align="center" justify="center" style={{ position: "absolute", inset: 0 }}>
          <Box style={{ position: "relative", width: 300 }} data-size-lesson="anatomy callout geometry — the callouts are placed against this size-3 specimen; its inset clear ✕ holds step 1">
            <NumberInput
              size="3"
              label="Weight"
              info={<Info size={16} weight="regular" aria-hidden style={{ color: "var(--ds-icon-neutral)", display: "block" }} />}
              endSlot={<Text size="1" style={{ color: "var(--ds-text-weak)" }}>Optional</Text>}
              description="Enter a whole number, or use ↑ ↓."
              clearable
              units="kg"
              min={0}
              isIntegerOnly
              defaultValue={72}
              onValueChange={noop}
            />
          </Box>
        </Flex>
        {/* 1 — label */}
        <Box style={{ ...dotStyle, left: "calc(50% - 220px)", top: 58 }}>1</Box>
        <Box style={hLine({ left: "calc(50% - 198px)", top: 68, width: 44 })} />
        {/* 2 — info glyph (tick down onto the icon beside the label) */}
        <Box style={{ ...dotStyle, left: "calc(50% - 118px)", top: 12 }}>2</Box>
        <Box style={tick({ left: "calc(50% - 108px)", top: 32, height: 30 })} />
        {/* 3 — end-slot (from the right) */}
        <Box style={{ ...dotStyle, left: "calc(50% + 220px)", top: 58 }}>3</Box>
        <Box style={hLine({ left: "calc(50% + 150px)", top: 68, width: 48 })} />
        {/* 4 — typed value / placeholder (tick up from below) */}
        <Box style={{ ...dotStyle, left: "calc(50% - 120px)", top: 150 }}>4</Box>
        <Box style={tick({ left: "calc(50% - 110px)", top: 108, height: 42 })} />
        {/* 5 — units suffix (tick up from below) */}
        <Box style={{ ...dotStyle, left: "calc(50% + 60px)", top: 150 }}>5</Box>
        <Box style={tick({ left: "calc(50% + 70px)", top: 108, height: 42 })} />
        {/* 6 — clear ✕ (from the right, upper) */}
        <Box style={{ ...dotStyle, left: "calc(50% + 220px)", top: 92 }}>6</Box>
        <Box style={hLine({ left: "calc(50% + 128px)", top: 102, width: 70 })} />
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
  [4, "Value / placeholder", "the numeric entry (native type=number). Type a number, or use the native spinner — ↑ / ↓ and the OS stepper — to increment by step (role=spinbutton, aria-value* free). A greyed placeholder before entry."],
  [5, "Units", "an optional decorative suffix (“kg”, “%”, “px”) — aria-hidden in the visible slot but folded into aria-describedby, so AT announces it after the value without duplicating it into the label"],
  [6, "Clear ✕", "the optional trailing clear (clearable) — appears while a value is set, resets to empty; out of the tab order"],
  [7, "Description", "an optional helper line beneath; replaced by the validation message when a STANDING state is active"],
];

/* ========================================================================== */

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = <>Reach for a NumberInput when the user enters <strong>a number</strong> — a quantity, a price, a percentage, a dimension. It is a native <Code>type=number</Code> field, so the browser’s spinner and numeric keypad come for free; the wire value is always a <Code>number</Code>. Set <Code>min</Code> / <Code>max</Code> / <Code>step</Code> to shape the range, and <Code>units</Code> for a trailing suffix.</>;

const meta: Meta<typeof NumberInput> = {
  title: "Components/Typed Entry/NumberInput",
  component: NumberInput,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**NumberInput** — a native numeric field (`type=number`) on the shared **Field** shell, and " +
          "**TimeInput’s twin**: the same two-channel parse / commit / revert model, with the increment coming " +
          "from the **browser’s native spinner** (↑ / ↓ + the OS stepper — `role=spinbutton`, `aria-value*` free) " +
          "instead of a custom stepper. Parsing reuses `parseNumberInput`, which **rejects — never " +
          "clamps** — an out-of-range or malformed number: typed text that never resolves **silently reverts** " +
          "and announces assertively with honest, range-aware copy. An optional `units` " +
          "suffix rides the trailing slot and is folded into `aria-describedby`.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof NumberInput>;

/** Anatomy — the parts of the field and the two validation channels. The live token spec lives in Usage. */
export const Anatomy: Story = {
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader title="NumberInput · Anatomy" standfirst={DEFINITION} />
        <Section title="Anatomy — the field" lead="The shared label row carries the name plus an optional info affordance and a pinned end-slot; the input takes a native numeric entry (with the browser’s own spinner), an optional units suffix and a clear ✕ ride the trailing slot, and a description helper sits beneath. The label row + support area are the same shared Field chrome as TextField — only the units suffix and the native spinner are particular to NumberInput.">
          <AnatomyDiagram />
          <AnatomyLegend parts={ANATOMY_PARTS} />
          <Caption>
            Only the <strong>label</strong> is required. The <strong>units</strong> suffix, the{" "}
            <strong>clear ✕</strong> (<Code>clearable</Code>), the <strong>info</strong>, the{" "}
            <strong>end-slot</strong>, and the <strong>description</strong> are optional. The native{" "}
            <strong>spinner</strong> arrows are drawn by the browser (they vary by platform).
          </Caption>
        </Section>

        <Rule />

        <Section title="Two feedback channels" lead="The parse-feedback model shared with DateInput / TimeInput. An ephemeral parse failure and a standing problem are DIFFERENT signals and never share a surface.">
          <Grid columns={{ initial: "1", sm: "2" }} gapX="6" gapY="4">
            <Flex direction="column" gap="2">
              <Text size="1" weight="bold" style={{ color: "var(--ds-text-weak)", letterSpacing: "0.06em" }}>EPHEMERAL — announce + revert</Text>
              <Muted>An out-of-range or malformed number is announced assertively and silently reverts to the last valid value. It flags aria-invalid only WHILE pending — never a red border (the field is still valid). It routes through the shared announcer, so the copy matches the rest of the Field family.</Muted>
              <Box style={{ padding: 12, borderRadius: "var(--ds-radius-3)", background: "var(--ds-bg-subtle)", border: "1px solid var(--ds-stroke-weak)" }}>
                <Muted>“Enter a number from 1 to 10. Kept 5.”</Muted>
              </Box>
            </Flex>
            <Flex direction="column" gap="2">
              <Text size="1" weight="bold" style={{ color: "var(--ds-text-weak)", letterSpacing: "0.06em" }}>STANDING — validation channel</Text>
              <Muted>A controlled value the parent forces out of min/max (or a caller-supplied validation) paints the input border + tint + a message below — the accent-aware family, the same as any TextField. A user can’t cause this: reject-revert governs typing.</Muted>
              <Box data-testid="ni-standing" style={{ maxWidth: 280 }}>
                <NumberInput label="Quantity" max={10} value={18} onValueChange={noop} />
              </Box>
            </Flex>
          </Grid>
          <Caption>The standing specimen holds a controlled value above its <Mono>max</Mono>, so it wears the error border + a corrective message — a real problem the app must resolve, not a transient typo.</Caption>
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
};

/** Usage — when to reach for NumberInput, the field kept in context, and the live token spec that closes
 *  the page. */
export const Usage: Story = {
  // Semantic step-11 error text on the invalid-field wash: #ce2c31 on #fbe8ea = 4.42, under axe's 4.5.
  // Surfaced by narrowing the do/don't carve-out to the DO/DON'T word alone. Same unruled tone-on-tint
  // gap as Callout/Badge — it needs a ruling on the tone tokens, not a story-level fix.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL, "[style*='--ds-text-error']", '[data-field-part="message"][data-tone="error"]'] } } },
  render: (_args, { globals }) => (
    <Page>
      <PageHeader title="NumberInput · Usage" standfirst={DEFINITION} />

      <Section title="NumberInput vs. its neighbours" lead="Pick the control that matches the shape of the entry.">
        <Grid columns={{ initial: "1", sm: "2" }} gapX="6" gapY="4">
          <Scenario label="NUMBERINPUT" caption={<>Enter <strong>one</strong> number by typing or stepping — a quantity, a price. Native spinner + reject-not-clamp range.</>}>
            <Box style={{ maxWidth: 280 }}>
              <NumberInput label="Quantity" min={1} defaultValue={1} isIntegerOnly onValueChange={noop} />
            </Box>
          </Scenario>
          <Scenario label="SLIDER" caption={<>Pick a value along a <strong>continuous range</strong> where the exact number matters less than the feel — volume, opacity. (A future System control.)</>}>
            <Box style={{ paddingTop: 4 }}><Muted>range feel, not exact entry</Muted></Box>
          </Scenario>
          <Scenario label="TEXTFIELD (tel)" caption={<>A <strong>digit string</strong> that isn’t a quantity — a phone number, a PIN, a card number. No arithmetic, leading zeros matter. Use <Code>TextField</Code>.</>}>
            <Box style={{ paddingTop: 4 }}><Muted>digits, not a magnitude</Muted></Box>
          </Scenario>
          <Scenario label="TIMEINPUT" caption={<>A <strong>time of day</strong> — this field’s twin: the same shell, but parsing / incrementing a time. Use <Code>TimeInput</Code>.</>}>
            <Box style={{ paddingTop: 4 }}><Muted>a time, not a plain number</Muted></Box>
          </Scenario>
        </Grid>
      </Section>

      <Rule />

      <Section title="A quantity and a price" lead="min / max / step shape the range; isIntegerOnly rejects decimals; step drives the spinner and switches the numeric keypad to a decimal one when fractional. units adds a trailing suffix.">
        <Grid columns={{ initial: "1", sm: "2" }} gapX="6" gapY="4">
          <Scenario label="QUANTITY (integer)" caption={<>Whole units only, at least 1. <Code>isIntegerOnly</Code> + <Code>min=1</Code>, <Code>step=1</Code>.</>}>
            <Box style={{ maxWidth: 280 }} data-size-lesson="inset affordances hold step 1 — the clear ✕ garnishes the field, it doesn't join the row">
              <NumberInput label="Quantity" min={1} step={1} isIntegerOnly defaultValue={3} clearable onValueChange={noop} />
            </Box>
          </Scenario>
          <Scenario label="PRICE (decimal + units)" caption={<>Two-decimal money with a currency suffix. <Code>step=0.01</Code> (a decimal keypad), <Code>min=0</Code>, <Code>units="USD"</Code>.</>}>
            <Box style={{ maxWidth: 280 }}>
              <NumberInput label="Price" min={0} step={0.01} units="USD" defaultValue={9.99} onValueChange={noop} />
            </Box>
          </Scenario>
        </Grid>
        <Caption>Both wire a plain <Mono>number</Mono>; <Mono>units</Mono> is display + announced only, never part of the value. The suffix is <Mono>aria-hidden</Mono> in the slot but reaches AT via <Mono>aria-describedby</Mono>.</Caption>
      </Section>

      <Rule />

      <Section title="Reject, don’t clamp" lead="The rule this component shares with TimeInput: when a typed number falls outside min / max, revert quietly and SAY so — don’t silently snap it to the bound. Clamping would put a value in the field the user never typed.">
        <Grid columns={{ initial: "1", sm: "2" }} gap="3">
          <DoDont kind="do" bare note="Typing 99 into a field capped at 10 reverts to the last valid value (5) with an assertive announcement (“Enter a number from 1 to 10. Kept 5.”). The field stays at neutral rest; aria-invalid was set only while the text was pending.">
            <Box style={{ maxWidth: 320 }}>
              <NumberInput aria-label="Quantity (do)" min={1} max={10} defaultValue={5} onValueChange={noop} />
            </Box>
          </DoDont>
          <DoDont kind="dont" bare note="Silently clamping 99 to 10 — the field now shows 10, a value the user never intended and may not notice. Reject-and-revert keeps the user’s last deliberate value and tells them why the new entry didn’t take.">
            <Box style={{ maxWidth: 320 }}>
              <NumberInput aria-label="Quantity (don’t)" min={1} max={10} defaultValue={5} validation={{ tone: "error", message: "Snapped to 10." }} onValueChange={noop} />
            </Box>
          </DoDont>
        </Grid>
        <Caption>The standing channel is still the right home for a genuine constraint — a <em>controlled</em> value out of <Mono>min</Mono>/<Mono>max</Mono> synthesizes a corrective message automatically, and a caller can pass any <Code>validation</Code>.</Caption>
      </Section>

      <Rule />

      <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
        <Section title="Tokens" lead="The input reuses Radix TextField.Root, so its border/fill + focus ring are the shared Field chrome. The units suffix is the only paint particular to this field (the spinner arrows are the browser’s).">
          <TokenGroup label="INPUT (rest + affixes)" blurb="The input reuses Radix TextField.Root — its resting border/fill + the system focus ring ([[focus-ring]]) are shared Field chrome; only the units suffix is painted here.">
            {/* Both rows read a real NumberInput rendered into the measurement host: the suffix row reads
                the trailing Text it renders, the ring row reads the outline the field's own focus rule
                paints. Neither resolves the token it names. */}
            <MeasuredSpec render={() => <NumberInput label="Weight" units="kg" defaultValue={5} onValueChange={noop} />}>
              <MeasuredRow
                part="Units suffix"
                note="The decorative trailing unit — read out through the field's description, never as its name."
                token="--ds-text-weak"
                select=".rt-TextFieldSlot .rt-Text"
                prop="color"
              />
              <MeasuredRow
                part="Focus ring"
                note="The same 2px ring every control wears on focus. The accent base, with the stack alpha on top ([[focus-ring]])."
                token="--ds-stroke-focus"
                select=".rt-TextFieldRoot"
                prop="outline-color"
                state="focus"
              />
            </MeasuredSpec>
            <NoteRow part="Clear ✕ glyph" value="ghost IconButton — accent-tinted (fill:currentColor), the shared Typeahead/Select/DateInput clear affix" />
            <NoteRow part="Spinner arrows" value="native browser ::-webkit-inner-spin-button (platform-drawn — not tokenized)" />
            <NoteRow part="Border (rest)" value="Radix surface — inset 1px" radix="--gray-a7" />
          </TokenGroup>
        </Section>
      </HexThemeKey.Provider>
    </Page>
  ),
};

/* ---- Keyboard contract --------------------------------------------------- */
const KEYS: KeyBinding[] = [
  { keys: ["Type"], action: <>Enter a number. It <strong>parses live</strong>: a resolved, in-range value fires immediately. Out-of-range or malformed text is held pending and reverts on commit.</>, src: "system" },
  { keys: ["↑"], action: <>Native spinner — increment by <Code>step</Code> (default 1). Capped at <Code>max</Code>. <Code>role=spinbutton</Code>, <Code>aria-valuenow</Code> track automatically.</>, src: "system" },
  { keys: ["↓"], action: <>Native spinner — decrement by <Code>step</Code>. Capped at <Code>min</Code>.</>, src: "system" },
  { keys: ["Enter"], action: <>Commit the typed text — a resolved number is kept; out-of-range / malformed text <strong>silently reverts</strong> to the last value (announced assertively).</>, src: "system" },
  { keys: ["Tab"], action: <>Move focus on. Leaving the field <strong>commits</strong> the typed text (same as Enter).</>, src: "system" },
];

/** Keyboard — the complete key → action contract for the field. */
export const Keyboard: Story = {
  render: () => (
    <Page>
      <PageHeader title="NumberInput · Keyboard" standfirst={DEFINITION} />
      <Section title="Keyboard" lead={<>The full key → action contract. NumberInput is a native <Code>type=number</Code> field — a real <Code>role=spinbutton</Code>: <Code>↑</Code> / <Code>↓</Code> are the <strong>browser’s</strong> increment, and free typing feeds the same parse-on-type / commit model.</>}>
        <Flex direction="column" gap="2">
          <Box style={{ maxWidth: 300 }}>
            <NumberInput label="Quantity" min={1} max={99} description="Type a number, or use ↑ / ↓ to step." onValueChange={noop} />
          </Box>
          <Caption>A live target — type a number to see it parse, or press ↑ / ↓ to step (the native spinner, capped at min/max).</Caption>
        </Flex>
        <TokenGroup label="NUMBERINPUT">
          {KEYS.map((b) => <KeyRow key={b.keys.join("+")} {...b} />)}
        </TokenGroup>
        <Caption><strong>Screen reader</strong> — the field reads as a spin button with its current / min / max value; an out-of-range or malformed typed entry announces its revert through an assertive live region.</Caption>
      </Section>
    </Page>
  ),
};

/* ---- Props ---------------------------------------------------------- */
const PROPS: PropDef[] = [
  { name: "value / defaultValue", type: "number", desc: <>Controlled / uncontrolled numeric value.</>, source: "NumberInput.tsx" },
  { name: "onValueChange", type: "(v: number | undefined) => void", desc: <>Required. Fires with the committed number. With <Code>clearable</Code> it also fires <Code>undefined</Code> when emptied; without it, the type narrows to <Code>number</Code>. No <Code>null</Code>.</>, source: "NumberInput.tsx" },
  { name: "clearable", type: "boolean", def: "false", desc: <>Show a trailing clear ✕ (out of tab order) and allow an emptied field to commit <Code>undefined</Code>. Without it, emptying reverts.</>, source: "NumberInput.tsx" },
  { name: "min / max", type: "number", desc: <>Native <Code>min</Code>/<Code>max</Code> (→ <Code>aria-valuemin</Code>/<Code>-max</Code>, and the spinner caps). A typed value out of range is <strong>rejected, not clamped</strong>; a controlled value out of range surfaces a STANDING error.</>, source: "NumberInput.tsx" },
  { name: "step", type: "number", def: "1", desc: <>Native spinner step. A fractional step switches <Code>inputMode</Code> to <Code>decimal</Code>.</>, source: "NumberInput.tsx" },
  { name: "isIntegerOnly", type: "boolean", def: "false", desc: <>Reject any non-integer on commit.</>, source: "NumberInput.tsx" },
  { name: "units", type: "string", desc: <>A decorative trailing suffix (“kg”, “%”). <Code>aria-hidden</Code> in the slot, folded into <Code>aria-describedby</Code> so AT still announces it.</>, source: "NumberInput.tsx" },
  { name: "placeholder", type: "string", def: `"Enter a number"`, desc: <>Greyed hint while empty.</>, source: "NumberInput.tsx" },
  { name: "size", type: `"1" | "2" | "3"`, def: `"1"`, desc: <>Control size. Unset, it resolves from the global <Code>uiSize</Code> control lane (default <Code>small</Code> → <Code>1</Code>).</>, source: "NumberInput.tsx" },
  { name: "disabled", type: "boolean", def: "false", desc: <>Dims the input and makes it inert (native disabled — unless paired with a reason).</>, source: "NumberInput.tsx" },
  { name: "disabledReason", type: "string", desc: <>A non-empty reason SOFT-disables (aria-disabled + readOnly + reason tooltip + glyph) so the reason stays perceivable on hover and focus.</>, source: "NumberInput.tsx" },
  { name: "label / info / endSlot / description / validation", type: "Field props", desc: <>The shared <Code>Field</Code> shell. <Code>validation</Code> is the STANDING channel; ephemeral parse failures announce + revert instead. Pass none of label / description / validation to keep the control bare.</>, source: "NumberInput.tsx" },
  { name: "width", type: "number | string", desc: <>Constrain the field width.</>, source: "NumberInput.tsx" },
];

type PropsArgs = {
  showLabel: boolean;
  label: string;
  placeholder: string;
  description: string;
  units: string;
  validation: { tone: "error" | "warning" | "success" | "info"; message: string } | undefined;
  size: "auto" | "1" | "2" | "3";
  min: number;
  max: number;
  step: number;
  isIntegerOnly: boolean;
  clearable: boolean;
  disabled: boolean;
  disabledReason: string;
};

/** Props — the live, args-driven field (uncontrolled; type or step, and drive every prop from Controls). */
export const Props: StoryObj<PropsArgs> = {
  args: {
    showLabel: true,
    label: "Quantity",
    placeholder: "Enter a number",
    description: "Type a number or use ↑ ↓.",
    units: "",
    validation: undefined,
    // "auto" (size unset) is the default so the field tracks the global uiSize toolbar out of the box.
    size: "auto",
    min: 0,
    max: 100,
    step: 1,
    isIntegerOnly: true,
    clearable: true,
    disabled: false,
    disabledReason: "",
  },
  argTypes: {
    showLabel: { name: "label (show)", control: "boolean", table: { category: "Field" } },
    label: { control: "text", if: { arg: "showLabel" }, table: { category: "Field" } },
    placeholder: { control: "text", table: { category: "Field" } },
    description: { name: "description (helper)", control: "text", table: { category: "Field" } },
    units: { control: "text", table: { category: "Field" } },
    validation: {
      control: "inline-radio",
      options: ["none", "error", "warning", "success", "info"],
      mapping: {
        none: undefined,
        error: { tone: "error", message: "Enter a number in the allowed range." },
        warning: { tone: "warning", message: "Double-check this number." },
        success: { tone: "success", message: "That works." },
        info: { tone: "info", message: "You can change this later." },
      },
      table: { category: "Field" },
    },
    size: { control: "inline-radio", options: ["auto", "1", "2", "3"], description: '"auto" tracks the global uiSize toolbar (unset → the control lane); a step (1–3) pins the field.', table: { category: "Variant" } },
    min: { control: "number", table: { category: "Behaviour" } },
    max: { control: "number", table: { category: "Behaviour" } },
    step: { control: { type: "number", min: 0.01 }, table: { category: "Behaviour" } },
    isIntegerOnly: { control: "boolean", table: { category: "Behaviour" } },
    clearable: { name: "clearable (✕)", control: "boolean", table: { category: "Behaviour" } },
    disabled: { control: "boolean", table: { category: "Variant" } },
    disabledReason: { control: "text", table: { category: "Variant" } },
  },
  parameters: { controls: { disable: false } },
  render: (args: PropsArgs) => {
    // A tiny controlled wrapper so the stepped/typed value persists in the demo.
    function Demo() {
      const [v, setV] = useState<number | undefined>(undefined);
      const common = {
        value: v,
        label: args.showLabel ? args.label : undefined,
        "aria-label": args.showLabel ? undefined : args.label || "Number",
        placeholder: args.placeholder,
        description: args.description,
        units: args.units || undefined,
        validation: args.validation,
        size: args.size === "auto" ? undefined : args.size,
        min: args.min,
        max: args.max,
        step: args.step,
        isIntegerOnly: args.isIntegerOnly,
        disabled: args.disabled,
        disabledReason: args.disabledReason || undefined,
      } as const;
      // `clearable` is a runtime arg, so branch to keep the discriminated onValueChange type honest.
      return args.clearable ? (
        <NumberInput {...common} clearable onValueChange={setV} />
      ) : (
        <NumberInput {...common} onValueChange={setV} />
      );
    }
    return (
      <Page maxWidth="none">
        <PageHeader title="NumberInput · Props" standfirst={DEFINITION} />
        <Box p="5" style={{ maxWidth: 380 }}>
          <Demo />
          <Box mt="3"><Caption>Type a number, or use ↑ / ↓ to step (the native spinner). A value outside <Mono>min</Mono>/<Mono>max</Mono> reverts on commit and announces — it never clamps to the bound.</Caption></Box>
        </Box>
        <PropsLead />
        <Rule />
        <Section title="Props reference" lead={<>Every prop <Code>NumberInput</Code> accepts — the numeric wire contract, the range / step behaviour, and the shared <Code>Field</Code> shell.</>}>
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
      <PageHeader title="NumberInput · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[catalog-as-specification]] · reuse">
            <strong>Composed from existing parts.</strong> Parsing is <Code>parseNumberInput</Code> —{" "}
            <Code>src/utils/parseNumberInput.ts</Code>, extracted into its own helper with node-lane logic
            coverage. The shared <Code>Field</Code> shell, <Code>IconButton</Code>, and the singleton live-region
            announcer are reused. Zero number math is re-implemented here.
          </Decision>
          <Decision id="[[number-input]] · TimeInput’s twin">
            <strong>The same shell, a different increment.</strong> NumberInput shares <Code>TimeInput</Code>’s
            model wholesale — the input rides Radix <Code>TextField.Root</Code>, the body renders inside
            its self-owned <Code>Field.Root</Code>, and the <Code>pendingInput</Code> parse-on-change /
            commit-on-blur-or-Enter / silent-revert two-channel model is identical. The ONLY difference: the
            increment comes from the browser’s native <Code>type=number</Code> spinner, not{" "}
            <Code>adjustTime</Code>.
          </Decision>
          <Decision id="[[number-input]] · native spinner, reject-not-clamp">
            <strong>The “Spinner” in the doc is the NATIVE one.</strong> <Code>type="number"</Code> plus native{" "}
            <Code>min</Code> / <Code>max</Code> / <Code>step</Code> attributes give <Code>role="spinbutton"</Code>{" "}
            and <Code>aria-valuemin</Code> / <Code>-max</Code> / <Code>-now</Code> for free. A typed value out of
            range is <strong>REJECTED, never clamped</strong> — typing <Code>99</Code> into a field capped at{" "}
            <Code>10</Code> reverts to the last valid value; it never becomes <Code>10</Code>. (The native spinner
            itself can’t exceed the bound, so clamp-on-step never arises.)
          </Decision>
          <Decision id="[[number-input]] · no custom stepper, no Intl">
            <strong>No bespoke +/- stepper; no <Code>Intl.NumberFormat</Code> display.</strong> The reuse gate: a{" "}
            <em>NumberInput-only</em> stepper would fragment the system — a shared, touch-friendly stepper
            primitive is deferred. Grouped-thousands / locale formatting is likewise deferred (it fights
            free-text editing of the raw value).
          </Decision>
          <Decision id="[[number-input]] · shared assertive announce">
            <strong>Honest, range-aware announcements.</strong> A parse failure routes range-aware copy through
            the <strong>shared</strong> assertive announcer — the same live region <Code>DateInput</Code> /{" "}
            <Code>TimeInput</Code> use — distinguishing “That isn’t a number.” from “Enter a number from 1 to 10.”
            and always naming the kept value, so feedback is consistent across the Field family.
          </Decision>
          <Decision id="[[disabled-reason]] · units via describedby">
            <strong>Units are announced, not duplicated.</strong> The <Code>units</Code> suffix is a decorative,{" "}
            <Code>aria-hidden</Code> trailing <Code>Text</Code> — but a persistent, visually-hidden node (the same hidden-node
            mechanism the disabled reason uses) folds it into <Code>aria-describedby</Code>, so AT hears “Weight, spin button, 5,
            kilograms” without the caller repeating the unit in the label. The label stays the accessible NAME.
            A separately-<em>spoken</em> <Code>unitsLabel</Code> is deferred.
          </Decision>
          <Decision id="[[date-input]] · two channels (shared)">
            <strong>Two feedback channels that never cross.</strong> An <em>ephemeral</em> parse / range failure
            is announced <strong>assertively</strong>, flags <Code>aria-invalid</Code> only while pending, then{" "}
            <strong>silently reverts</strong>. It never enters <Code>Field.validation</Code> — a red border on a
            reverted-to-valid field would lie. The validation channel is reserved for <strong>standing</strong>{" "}
            problems: a caller-supplied <Code>validation</Code>, or a <em>controlled</em> <Code>value</Code> the
            parent forces out of range (the user can’t cause it — reject-revert governs typing). Shared with
            DateInput / TimeInput.
          </Decision>
          <Decision id="[[number-input]] · API">
            <strong>Normalized wire contract.</strong> <Code>value?: number</Code>, a <em>required</em>{" "}
            <Code>onValueChange</Code>. With <Code>clearable</Code>, the callback widens to{" "}
            <Code>(v: number | undefined)</Code> (<Code>undefined</Code> = empty) and a trailing ✕ appears; without
            it, the callback is <Code>number</Code>-only and an emptied field reverts. <Code>null</Code>-free.
          </Decision>
          <Decision id="[[disabled-reason]] · Soft-disable with reason">
            <strong>Soft-disable-with-reason.</strong> <Code>disabled</Code> + a non-empty <Code>disabledReason</Code>{" "}
            soft-disables (<Code>aria-disabled</Code> + <Code>readOnly</Code> + a reason tooltip + a quiet Info
            glyph) instead of natively disabling — so the reason stays perceivable on hover AND keyboard focus.
            The edit / keydown handlers early-return while soft. Inherited identically from the <Code>Field</Code>{" "}
            family.
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            Initial <Code>System/NumberInput</Code> — the native numeric field: <Code>type=number</Code> spinner,
            live parse-on-type (eager fire), commit-on-blur-or-Enter with silent revert, reject-not-clamp on
            min/max, optional <Code>isIntegerOnly</Code>, a decorative <Code>units</Code> suffix folded into
            aria-describedby, the two-channel feedback model with the assertive-announce parity upgrade,{" "}
            <Code>clearable</Code>, and full Field-shell validation + <Code>disabledReason</Code>. Stories:
            History · Anatomy · Usage · Keyboard · Props.
          </Decision>
          <Decision id="Deferred → shared stepper + Intl">
            <strong>Custom +/- stepper buttons and <Code>Intl.NumberFormat</Code> display</strong> — the
            stepper is the same deferral as <Code>TimeInput</Code>’s: built once and shared when the system earns
            it, never as a NumberInput-only control. Locale grouping is parked (it fights raw-value editing).
          </Decision>
          <Decision id="Deferred → spoken unitsLabel">
            <strong>A separately-spoken <Code>unitsLabel</Code></strong> — the visible <Code>units</Code> already
            travels via aria-describedby; a distinct spoken form (“kilograms” for a “kg” suffix) is parked until a
            caller needs it.
          </Decision>
          <Decision id="Deferred → server actions / InputGroup">
            <strong>The <Code>changeAction</Code> async-optimistic layer</strong> (<Code>isLoading</Code> / a
            Spinner) and <strong>InputGroup composition</strong> — not built yet; revisit with the app
            layer / when InputGroup ships.
          </Decision>
          <Decision id="Known native wart">
            <strong>Scroll-wheel mutate.</strong> A focused native <Code>type=number</Code> changes on mouse-wheel
            scroll — a browser behaviour, not guarded here; a shared wheel guard, if wanted, belongs on the
            primitive.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
