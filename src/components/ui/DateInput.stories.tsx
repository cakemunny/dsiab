import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useState } from "react";
import { Box, Code, Flex, Grid, Text, Theme } from "@radix-ui/themes";
import { Info } from "@phosphor-icons/react";
import { DateInput } from "./DateInput";
import { Calendar } from "./Calendar";
import type { ISODateString } from "../../dates/dateTypes";
import { plainDateToday, plainDateToISO, getDaysInMonth } from "../../dates/plainDate";
import {
  AnatomyLegend, Caption, Decision, DoDont, DODONT_LABEL, dotStyle, HexThemeKey, hLine, type KeyBinding, KeyRow,
  MeasuredRow, MeasuredSpec, Mono, Muted, NoteRow, Page, PageHeader, PropsLead, type PropDef, PropTable,
  Rule, Section, SizeLesson, tick, TokenGroup,
} from "./_storyKit";
import { Text as UIText } from "./Text";
import { assertMeasuredRows } from "../../foundations/_assert";
import { ComparisonSection, DATE_TIME_COMPARISON } from "./_comparisons";
import { useResolvedSize } from "../../theme/SizeContext";

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = (
  <>
    Reach for a DateInput when the user enters <strong>one</strong> date and typing is often faster than
    picking — a due date, a ship date, a birthday. It accepts free text in many formats and offers a
    calendar as the <strong>alternative</strong>, not the only way in; the wire value is always an ISO
    string.
  </>
);

/* These are the DOCS stories (History · Anatomy · Usage · Keyboard · Props) — static and calm on
   view. All behavioral plays live in `_dateinput.stories.tsx` (_internal/DateInput behavior), so viewing
   a docs page never auto-drives the calendar popover (Storybook runs a story's play on view, which would
   flash the picker). The live specimens here stay manually interactive. */

/* ---- demo dates — anchored to the real "today" so the calendar specimens land on a live month ---- */
const T = plainDateToday();
const DIM = getDaysInMonth(T.year, T.month);
const dOf = (d: number): ISODateString => plainDateToISO({ year: T.year, month: T.month, day: Math.min(Math.max(d, 1), DIM) });
const noop = () => {};

/* ---- anatomy: the field specimen + callouts (OUTSIDE the field) ---------- */
function AnatomyDiagram() {
  return (
    <Box style={{ overflowX: "auto" }}>
      <Box style={{ position: "relative", width: "100%", minWidth: 480, maxWidth: 660, margin: "0 auto", height: 210, background: "var(--ds-bg-subtle)", borderRadius: "var(--ds-radius-4)", overflow: "hidden" }}>
        <Flex align="center" justify="center" style={{ position: "absolute", inset: 0 }}>
          <Box style={{ position: "relative", width: 300 }} data-size-lesson="inset affordances hold step 1 — callouts 5 and 6 point at the trailing lane, which garnishes the field rather than joining its row">
            <DateInput
              label="Due date"
              info={<Info size={16} weight="regular" aria-hidden style={{ color: "var(--ds-icon-neutral)", display: "block" }} />}
              endSlot={<UIText style={{ color: "var(--ds-text-weak)" }}>Optional</UIText>}
              description="Type a date or pick one."
              hasClear
              defaultValue={dOf(21)}
              onValueChange={noop}
            />
          </Box>
        </Flex>
        {/* Leader map — measured against the rendered field at the DEFAULT tier (the tier this page loads
            at), not hand-guessed: label row y 81, input row y 107, description row y 131; the field spans
            x 180–480 inside the 660-wide frame, so 50% = 330. The two trailing affixes sit at x 424–448
            (clear ✕) and 452–476 (calendar), so their leaders drop from above / rise from below rather
            than crossing each other horizontally. */}
        {/* 1 — label */}
        <Box style={{ ...dotStyle, left: "calc(50% - 230px)", top: 71 }}>1</Box>
        <Box style={hLine({ left: "calc(50% - 208px)", top: 81, width: 58 })} />
        {/* 2 — info glyph (tick down onto the icon beside the label) */}
        <Box style={{ ...dotStyle, left: "calc(50% - 88px)", top: 12 }}>2</Box>
        <Box style={tick({ left: "calc(50% - 78px)", top: 32, height: 41 })} />
        {/* 3 — end-slot (from the right) */}
        <Box style={{ ...dotStyle, left: "calc(50% + 230px)", top: 71 }}>3</Box>
        <Box style={hLine({ left: "calc(50% + 150px)", top: 81, width: 80 })} />
        {/* 4 — typed value / placeholder (tick up from below) */}
        <Box style={{ ...dotStyle, left: "calc(50% - 108px)", top: 150 }}>4</Box>
        <Box style={tick({ left: "calc(50% - 98px)", top: 107, height: 43 })} />
        {/* 5 — clear ✕ (tick down from above onto the first trailing affix) */}
        <Box style={{ ...dotStyle, left: "calc(50% + 96px)", top: 12 }}>5</Box>
        <Box style={tick({ left: "calc(50% + 106px)", top: 32, height: 63 })} />
        {/* 6 — calendar button (tick up onto the second trailing affix) */}
        <Box style={{ ...dotStyle, left: "calc(50% + 124px)", top: 150 }}>6</Box>
        <Box style={tick({ left: "calc(50% + 134px)", top: 119, height: 31 })} />
        {/* 7 — description */}
        <Box style={{ ...dotStyle, left: "calc(50% - 230px)", top: 121 }}>7</Box>
        <Box style={hLine({ left: "calc(50% - 208px)", top: 131, width: 58 })} />
      </Box>
    </Box>
  );
}

const ANATOMY_PARTS: [number, string, string][] = [
  [1, "Label", "the field’s name — sets the accessible name via htmlFor → id (shared Field.Label)"],
  [2, "Info", "an optional inline affordance beside the label — a tip icon or helper toggle (shared Field.Label)"],
  [3, "End-slot", "an optional pinned note at the far end of the label row — “Optional”, a count, an action"],
  [4, "Value / placeholder", "the free-text entry: type a date in many formats (ISO, “May 21, 2026”, “5/21”); a committed value shows FORMATTED (“May 21, 2026”). A greyed placeholder before entry."],
  [5, "Clear ✕", "the optional trailing clear (hasClear) — appears while a value is set, resets to empty; out of the tab order"],
  [6, "Calendar button", "opens the calendar-dialog popover. Unlike the clear ✕, it is a REAL tab stop (it opens a whole picking surface); aria-haspopup=\"dialog\""],
  [7, "Description", "an optional helper line beneath; replaced by the validation message when a STANDING state is active"],
];

/* ---- anatomy: the open popover (a static, house-faithful specimen) --------
   The specimen carries NO hardcoded size: the panel reads the global control step the same way the real
   popover does, and the Calendar inside resolves it itself. So the page shows what the system actually
   ships at the reader's current tier, and the field diagram above matches it. */
function PopoverSpecimen({ children }: { children: ReactNode }) {
  const panelSize = useResolvedSize<string>("control", undefined);
  return (
    <Box style={{ width: "fit-content" }}>
      <Theme className={`rt-ds-dateinput-panel rt-r-size-${panelSize}`} hasBackground={false} style={{ position: "static", display: "inline-block" }}>
        {children}
      </Theme>
    </Box>
  );
}

/* ========================================================================== */

const meta: Meta<typeof DateInput> = {
  title: "Components/Date & Time/DateInput",
  component: DateInput,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**DateInput** — a free-text date field with a calendar-dialog popover, on the shared **Field** " +
          "shell. A Typeahead sibling: the input rides Radix `TextField.Root` (so the accent-aware " +
          "validation paint + system focus ring ([[focus-ring]]) + affixes come for free), and the popover is a " +
          "`@radix-ui/react-popover` **dialog** holding our `Calendar`. Typed text **parses live** " +
          "as you go and **silently reverts** if it never resolves, feeding a two-channel feedback model (ephemeral " +
          "announce vs standing validation) so a reverted-to-valid field never wears a red border.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof DateInput>;

/** Anatomy — the parts of the field, its open popover, and the two validation channels. The live token
 *  spec lives in Usage. */
export const Anatomy: Story = {
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader title="DateInput · Anatomy" standfirst={DEFINITION} />
        <Section title="Anatomy — the field" lead="The shared label row carries the name plus an optional info affordance and a pinned end-slot; the input takes free-text (a committed value shows FORMATTED), with an optional clear ✕ and the calendar button in the trailing slot; a description helper sits beneath. The label row + support area are the same shared Field chrome as TextField — only the trailing affixes and the dialog it opens are new.">
          <AnatomyDiagram />
          <AnatomyLegend parts={ANATOMY_PARTS} />
          <Caption>
            Only the <strong>label</strong> is required. The <strong>calendar button</strong> is always present; the{" "}
            <strong>clear ✕</strong> (<Code>hasClear</Code>), the <strong>info</strong>, the{" "}
            <strong>end-slot</strong>, and the <strong>description</strong> are optional.
          </Caption>
        </Section>

        <Rule />

        <Section title="Anatomy — the open popover" lead="The calendar-dialog the button (or ArrowDown) opens into — solid and opaque (never translucent), the SAME overlay surface as the Typeahead / Select menus so the floating family reads as one. It holds a Calendar (single mode); selecting a day commits + closes + refocuses the input. The specimen below is house-faithful (real tokens, follows the toolbar accent).">
          <PopoverSpecimen>
            <Calendar mode="single" value={dOf(21)} onValueChange={noop} />
          </PopoverSpecimen>
          <Caption>The popover keeps Radix’s <Code>role="dialog"</Code>, named “Choose date” — the opposite of Typeahead’s listbox override. Focus stays on the input on open (skipAutoFocus); Escape and a day-select return it there.</Caption>
        </Section>

        <Rule />

        <Section title="Two feedback channels" lead="The parse-feedback model that keeps the field honest. An ephemeral parse failure and a standing problem are DIFFERENT signals and never share a surface.">
          <Grid columns={{ initial: "1", sm: "2" }} gapX="6" gapY="4">
            <Flex direction="column" gap="2">
              <Text size="1" weight="bold" style={{ color: "var(--ds-text-weak)", letterSpacing: "0.06em" }}>EPHEMERAL — announce + revert</Text>
              <Muted>Unparseable text is announced assertively and silently reverts to the last valid value. It flags aria-invalid only WHILE pending — never a red border (the field is still valid).</Muted>
              <Box style={{ padding: "var(--ds-space-12)", borderRadius: "var(--ds-radius-3)", background: "var(--ds-bg-subtle)", border: "1px solid var(--ds-stroke-weak)" }}>
                <Muted>“Didn’t recognize that date — kept May 21, 2026.”</Muted>
              </Box>
            </Flex>
            <Flex direction="column" gap="2">
              <Text size="1" weight="bold" style={{ color: "var(--ds-text-weak)", letterSpacing: "0.06em" }}>STANDING — validation channel</Text>
              <Muted>A committed value out of min/max (or a caller-supplied validation) paints the input border + tint + a message below — the accent-aware family, the same as any TextField.</Muted>
              <Box data-testid="di-standing" style={{ maxWidth: 280 }} data-size-lesson="inset affordances hold step 1">
                <DateInput label="Ship date" max={dOf(10)} defaultValue={dOf(21)} onValueChange={noop} />
              </Box>
            </Flex>
          </Grid>
          <Caption>The standing specimen holds a value later than its <Mono>max</Mono>, so it wears the error border + a corrective message — a real problem the user must resolve, not a transient typo.</Caption>
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
};

/** Usage — when to reach for DateInput, the field kept in context, and the live token spec that closes
 *  the page. */
export const Usage: Story = {
  // Semantic step-11 error text on the invalid-field wash: #ce2c31 on #fbe8ea = 4.42, under axe's 4.5.
  // Surfaced by narrowing the do/don't carve-out to the DO/DON'T word alone. Same unruled tone-on-tint
  // gap as Callout/Badge — it needs a ruling on the tone tokens, not a story-level fix.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL, "[style*='--ds-text-error']", '[data-field-part="message"][data-tone="error"]'] } } },
  render: (_args, { globals }) => (
    <Page>
      <PageHeader title="DateInput · Usage" standfirst={DEFINITION} />

      <ComparisonSection comparison={DATE_TIME_COMPARISON} highlight="DateInput" />

      <Rule />

      <Section title="A typo is not a validation error" lead="The single most important rule this component enforces: when typed text doesn’t resolve, revert quietly and SAY so out loud — don’t paint the field red. A reverted field is showing its last VALID value, so a standing error state would be a lie that sends the user hunting for a problem that isn’t there.">
        <Grid columns={{ initial: "1", sm: "2" }} gap="3" data-size-lesson="inset affordances hold step 1">
          <DoDont kind="do" bare note="Unparseable text reverts to the last valid value with an assertive announcement (“Didn’t recognize that date — kept May 21, 2026.”). The field stays at neutral rest; aria-invalid was set only while the text was pending.">
            <Box style={{ maxWidth: 320 }}>
              <DateInput aria-label="Due date (do)" defaultValue={dOf(21)} onValueChange={noop} />
            </Box>
          </DoDont>
          <DoDont kind="dont" bare note="Painting a red validation border on a field that has silently reverted to a perfectly valid date — the user reads “error”, but the value shown is fine. Reserve the red channel for STANDING problems (out of min/max, or a real caller validation).">
            <Box style={{ maxWidth: 320 }}>
              <DateInput aria-label="Due date (don’t)" defaultValue={dOf(21)} validation={{ tone: "error", message: "Enter a valid date." }} onValueChange={noop} />
            </Box>
          </DoDont>
        </Grid>
        <Caption>The standing channel is still the right home for a genuine constraint — a value out of <Mono>min</Mono>/<Mono>max</Mono> synthesizes a corrective message automatically, and a caller can pass any <Code>validation</Code>.</Caption>
      </Section>

      <Rule />

      <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
        <Section title="Tokens" lead="The input’s own rows are MEASURED off a real field rendered for the purpose — the property is read from the element that paints it and checked against the token the row names, so a row can disagree with the component. The input reuses Radix TextField.Root, so its border/fill + focus ring are the shared Field chrome; the calendar’s own paint is ratified by the calendar’s own token spec.">
          <Flex direction="column" gap="4">
            <TokenGroup label="INPUT (rest + affixes)" blurb="The input reuses Radix TextField.Root — its resting border/fill + the system focus ring ([[focus-ring]]) are shared Field chrome; only the affix glyph is painted here.">
              <MeasuredSpec render={() => <SizeLesson why="inset affordances hold step 1"><DateInput label="Measurement" defaultValue={dOf(21)} onValueChange={noop} /></SizeLesson>}>
                <MeasuredRow
                  part="Calendar glyph" note="The trailing affix that opens the picker."
                  token="--ds-icon-neutral" select='.rt-ds-dateinput-anchor button[aria-haspopup="dialog"] svg' prop="fill"
                />
                <MeasuredRow
                  part="Focus ring" note="The accent base, read from the rule the field’s own stylesheet paints while the input holds focus. A Radix alpha, --ds-stroke-focus-stack, sits on top of it, 2px wide ([[focus-ring]])."
                  token="--ds-stroke-focus" select=".rt-TextFieldRoot" prop="outline-color" state="focus"
                />
              </MeasuredSpec>
              <NoteRow part="Clear ✕ glyph" value="ghost IconButton — accent-tinted (fill:currentColor), the shared Typeahead/Select clear affix, not --ds-icon-neutral" />
              <NoteRow part="Border (rest)" value="a 1px inset ring carried inside box-shadow, so no colour property carries it" radix="--gray-a7" />
            </TokenGroup>
            <TokenGroup label="DIALOG POPOVER" blurb="The portaled calendar surface — opaque overlay, the same treatment as the Typeahead / Select menus.">
              <NoteRow part="Panel surface" value="the panel is portaled and mounts only while the picker is open, so a resting read cannot reach it" radix="--ds-bg-overlay" />
              <NoteRow part="Elevation" value="--ds-shadow-overlay (a hairline ring + drop shadow)" />
              <NoteRow part="Panel radius" value="--ds-radius-3 · padding --space-3" />
              <NoteRow part="Calendar paint" value="a selected day takes the subtle selected tint (--ds-fill-selected-subtle) under strong neutral text, never a solid accent fill; today keeps its accent bar" />
            </TokenGroup>
          </Flex>
        </Section>
      </HexThemeKey.Provider>
    </Page>
  ),
  play: async ({ canvasElement }) => {
    // The token table's EVIDENCE, asserted at runtime: both measured rows read a real field node,
    // resolved their claim somewhere else, and the two agree. Reads only — nothing opens the picker.
    const rows = assertMeasuredRows(canvasElement);
    if (rows.measured !== 2 || rows.unproven !== 0) {
      throw new Error(`expected 2 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }
  },
};

/* ---- Keyboard contract --------------------------------------------------- */
const CLOSED_KEYS: KeyBinding[] = [
  { keys: ["Type"], action: <>Enter a date in many formats — ISO (<Code>2026-05-21</Code>), month-name (<Code>May 21, 2026</Code>), or numeric (<Code>5/21</Code>). It <strong>parses live</strong>: a resolved date fires immediately and drives the calendar’s month.</>, src: "system" },
  { keys: ["↓", "Alt+↓"], action: <>Open the calendar-dialog popover <strong>without</strong> moving focus out of the input (skipAutoFocus).</>, src: "system" },
  { keys: ["Enter"], action: <>Commit the typed text — a resolved date is kept; unrecognized text <strong>silently reverts</strong> to the last value (announced).</>, src: "system" },
  { keys: ["Tab"], action: <>Move focus to the calendar button (a real tab stop), then on. Leaving the field <strong>commits</strong> the typed text.</>, src: "system" },
];
const OPEN_KEYS: KeyBinding[] = [
  { keys: ["← → ↑ ↓"], action: <>Move the roving day in the grid; <Code>PageUp/Down</Code> flips the month, <Code>Shift+PageUp/Down</Code> the year (from <Code>useGridFocus</Code>).</>, src: "system" },
  { keys: ["Enter", "Space"], action: <>Select the focused day — commits it, closes the popover, and refocuses the input.</>, src: "system" },
  { keys: ["Esc"], action: "Close the popover and return focus to the input; the value is kept.", src: "system" },
];

/** Keyboard — the complete key → action contract for the input and the open calendar. */
export const Keyboard: Story = {
  render: () => (
    <Page>
      <PageHeader title="DateInput · Keyboard" standfirst={DEFINITION} />
      <Section title="Keyboard" lead={<>The full key → action contract. This is an APG <strong>combobox-with-dialog</strong>: the input is the combobox, the calendar is the dialog it opens. Focus stays on the input on open; the grid’s own navigation comes from <Code>useGridFocus</Code>.</>}>
        <Flex direction="column" gap="2">
          <Box style={{ maxWidth: 300 }} data-size-lesson="inset affordances hold step 1">
            <DateInput label="Due date" description="Type a date, or press ↓ to open the calendar." onValueChange={noop} />
          </Box>
          <Caption>A live target — type a date to see it parse, or press ↓ / the calendar button to open.</Caption>
        </Flex>
        <Flex direction="column" gap="4">
          <TokenGroup label="INPUT · POPOVER CLOSED">
            {CLOSED_KEYS.map((b) => <KeyRow key={b.keys.join("+")} {...b} />)}
          </TokenGroup>
          <TokenGroup label="CALENDAR · POPOVER OPEN">
            {OPEN_KEYS.map((b) => <KeyRow key={b.keys.join("+")} {...b} />)}
          </TokenGroup>
        </Flex>
        <Caption><strong>Pointer</strong> — the calendar button toggles the popover; clicking a day selects and closes. An unrecognized typed entry announces its revert through an assertive live region.</Caption>
      </Section>
    </Page>
  ),
};

/* ---- Props ---------------------------------------------------------- */
const PROPS: PropDef[] = [
  { name: "value / defaultValue", type: "ISODateString", desc: <>Controlled / uncontrolled date, an ISO <Code>YYYY-MM-DD</Code> string. <Code>PlainDate</Code> stays internal.</>, source: "DateInput.tsx" },
  { name: "onValueChange", type: "(v: ISODateString | undefined) => void", desc: <>Required. Fires with the committed ISO date, or <Code>undefined</Code> when cleared. No <Code>null</Code>.</>, source: "DateInput.tsx" },
  { name: "min / max", type: "ISODateString", desc: <>Selectable bounds — earlier/later dates are disabled in the calendar and rejected on commit. A committed value out of bounds surfaces a STANDING validation error.</>, source: "DateInput.tsx" },
  { name: "isDateDisabled", type: "(iso) => boolean", desc: <>Custom disable predicate — <Code>true</Code> = disabled (forwarded to Calendar, which bridges the polarity).</>, source: "DateInput.tsx" },
  { name: "numberOfMonths", type: "1 | 2", def: "1", desc: <>Months shown side by side in the popover.</>, source: "DateInput.tsx" },
  { name: "placeholder", type: "string", def: `"Select a date"`, desc: <>Greyed hint while empty.</>, source: "DateInput.tsx" },
  { name: "hasClear", type: "boolean", def: "false", desc: <>A trailing clear ✕ (out of tab order) while a value is set.</>, source: "DateInput.tsx" },
  { name: "size", type: `"1" | "2" | "3"`, def: `"1"`, desc: <>Control size. Unset, it resolves from the global <Code>uiSize</Code> control lane (default <Code>small</Code> → <Code>1</Code>).</>, source: "DateInput.tsx" },
  { name: "disabled", type: "boolean", def: "false", desc: <>Dims the input and makes it inert (native disabled — unless paired with a reason).</>, source: "DateInput.tsx" },
  { name: "disabledReason", type: "string", desc: <>A non-empty reason SOFT-disables (aria-disabled + readOnly + reason tooltip + glyph) so the reason stays perceivable on hover and focus.</>, source: "DateInput.tsx" },
  { name: "label / info / endSlot / description / validation", type: "Field props", desc: <>The shared <Code>Field</Code> shell. <Code>validation</Code> is the STANDING channel; ephemeral parse failures announce + revert instead. Pass none of label / description / validation to keep the control bare.</>, source: "DateInput.tsx" },
  { name: "aria-label / aria-labelledby", type: "string", desc: <>Names a <strong>bare</strong> field (no visible <Code>label</Code>): pass the name as text, or the <Code>id</Code> of the element that already reads as its name. One of <Code>label</Code> / <Code>aria-label</Code> / <Code>aria-labelledby</Code> is required — an unnamed combobox fails WCAG 4.1.2, and a <Code>placeholder</Code> is not a name.</>, source: "DateInput.tsx" },
  { name: "width", type: "number | string", desc: <>Constrain the field width.</>, source: "DateInput.tsx" },
];

type PropsArgs = {
  showLabel: boolean;
  label: string;
  placeholder: string;
  description: string;
  validation: { tone: "error" | "warning" | "success" | "info"; message: string } | undefined;
  size: "auto" | "1" | "2" | "3";
  hasClear: boolean;
  numberOfMonths: 1 | 2;
  disabled: boolean;
  disabledReason: string;
};

/** Props — the live, args-driven field (uncontrolled; type or pick, and drive every prop from Controls). */
export const Props: StoryObj<PropsArgs> = {
  args: {
    showLabel: true,
    label: "Due date",
    placeholder: "Select a date",
    description: "Type a date or pick one.",
    validation: undefined,
    // "auto" (size unset) is the default so the field tracks the global uiSize toolbar out of the box.
    size: "auto",
    hasClear: true,
    numberOfMonths: 1,
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
        error: { tone: "error", message: "Choose a date in the allowed range." },
        warning: { tone: "warning", message: "Double-check this date." },
        success: { tone: "success", message: "That works." },
        info: { tone: "info", message: "You can change this later." },
      },
      table: { category: "Field" },
    },
    size: { control: "inline-radio", options: ["auto", "1", "2", "3"], description: '"auto" tracks the global uiSize toolbar (unset); a step pins it.', table: { category: "Variant" } },
    hasClear: { name: "hasClear (✕)", control: "boolean", table: { category: "Behaviour" } },
    numberOfMonths: { control: "inline-radio", options: [1, 2], table: { category: "Behaviour" } },
    disabled: { control: "boolean", table: { category: "Variant" } },
    disabledReason: { control: "text", table: { category: "Variant" } },
  },
  parameters: { controls: { disable: false } },
  render: (args: PropsArgs) => {
    // A tiny controlled wrapper so the picked value persists in the demo.
    function Demo() {
      const [v, setV] = useState<ISODateString | undefined>(undefined);
      return (
        <DateInput
          value={v}
          onValueChange={setV}
          label={args.showLabel ? args.label : undefined}
          aria-label={args.showLabel ? undefined : args.label || "Date"}
          placeholder={args.placeholder}
          description={args.description}
          validation={args.validation}
          size={args.size === "auto" ? undefined : args.size}
          hasClear={args.hasClear}
          numberOfMonths={args.numberOfMonths}
          disabled={args.disabled}
          disabledReason={args.disabledReason || undefined}
        />
      );
    }
    return (
      <Page maxWidth="none">
        <PageHeader title="DateInput · Props" standfirst={DEFINITION} />
        <Box p="5" style={{ maxWidth: 380 }}>
          <Demo />
          <Box mt="3"><Caption>Type a date (ISO, “May 21, 2026”, or “5/21”), or open the calendar. Unrecognized text reverts on blur; a value out of a set <Mono>min</Mono>/<Mono>max</Mono> would surface the standing error channel.</Caption></Box>
        </Box>
        <PropsLead />
        <Rule />
        <Section title="Props reference" lead={<>Every prop <Code>DateInput</Code> accepts — the ISO wire contract, the calendar bounds, and the shared <Code>Field</Code> shell.</>}>
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
      <PageHeader title="DateInput · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[catalog-as-specification]] · reuse">
            <strong>Composed from existing parts.</strong> Parsing is <Code>parseDateInput</Code>{" "}
            (<Code>src/dates/*</Code>), the body reuses <Code>Calendar</Code>, the shared <Code>Field</Code> shell,{" "}
            <Code>IconButton</Code>, and the singleton live-region announcer. Zero date math is re-implemented here.
          </Decision>
          <Decision id="[[date-input]] · API">
            <strong>Normalized wire contract.</strong> <Code>value?: ISODateString</Code>, a{" "}
            <em>required</em> single-arg <Code>onValueChange(v | undefined)</Code>,{" "}
            <Code>null</Code>-free (<Code>undefined</Code> = empty). ISO strings on the wire; <Code>PlainDate</Code>{" "}
            stays internal.
          </Decision>
          <Decision id="[[date-input]] · dialog popover">
            <strong>The popover KEEPS Radix’s <Code>role="dialog"</Code></strong> (named “Choose date”) — the
            deliberate <em>opposite</em> call from Typeahead’s <Code>role="listbox"</Code> override: a calendar is
            genuinely a picking <em>dialog</em>, not a list of the input’s completions. <Code>ArrowDown</Code> /{" "}
            <Code>Alt+ArrowDown</Code> opens it from the input without moving focus out (their APG
            combobox-with-dialog wiring). Stated so nobody “fixes” it back to a listbox.
          </Decision>
          <Decision id="Tab-stop divergence">
            <strong>The calendar button is a REAL tab stop.</strong> Unlike the Select / Typeahead clear ✕ (which
            sit at <Code>tabIndex=-1</Code>), the trailing calendar <Code>IconButton</Code> is tabbable — it opens
            a whole picking surface, so it earns a place in the tab order. Documented so it isn’t normalized back
            to <Code>-1</Code>.
          </Decision>
          <Decision id="[[date-input]] · two channels">
            <strong>Two feedback channels that never cross.</strong> An <em>ephemeral</em> parse
            failure — text that never resolves — is announced <strong>assertively</strong> (“Didn’t recognize that
            date — kept May 21, 2026.”) and flags <Code>aria-invalid</Code> <em>only while the pending text is
            unresolved</em>, then <strong>silently reverts</strong> to the last formatted value. It never enters{" "}
            <Code>Field.validation</Code> — a red border on a reverted-to-valid field would lie. The real
            validation channel is reserved for <strong>standing</strong> problems (a committed value out of
            min/max, or a caller-supplied <Code>validation</Code>).
          </Decision>
          <Decision id="[[disabled-reason]] · Soft-disable with a reason">
            <strong>Soft-disable-with-reason.</strong> <Code>disabled</Code> + a non-empty{" "}
            <Code>disabledReason</Code> soft-disables (<Code>aria-disabled</Code> + <Code>readOnly</Code> + a
            reason tooltip + a quiet Info glyph) instead of natively disabling — so the reason stays perceivable on
            hover AND keyboard focus. Inherited identically from the <Code>Field</Code> family.
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            Initial <Code>System/DateInput</Code> — the free-text date field: live parse-on-type (eager fire +
            calendar navigation), commit-on-blur-or-Enter with silent revert, the calendar-<strong>dialog</strong>{" "}
            popover on <Code>@radix-ui/react-popover</Code>, the two-channel feedback model, <Code>hasClear</Code>,
            and full Field-shell validation + <Code>disabledReason</Code>. Stories: History · Anatomy · Usage ·
            Keyboard · Props.
          </Decision>
          <Decision id="Deferred → server actions">
            <strong>The <Code>changeAction</Code> async-optimistic layer</strong> (<Code>isLoading</Code> / an
            inset Spinner while a server action settles) — a react-server-action optimistic-UI affordance not
            built yet; revisit if the app layer needs it.
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
