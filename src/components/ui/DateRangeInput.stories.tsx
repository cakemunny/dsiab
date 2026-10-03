import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useState } from "react";
import { Box, Code, Flex, Theme } from "@radix-ui/themes";
import { Info } from "@phosphor-icons/react";
import { DateRangeInput, type DateRangePreset } from "./DateRangeInput";
import { Button } from "./Button";
import { Calendar } from "./Calendar";
import type { DateRange, ISODateString } from "../../dates/dateTypes";
import { plainDateToday, plainDateToISO, plainDateAddDays, plainDateSetFirstOfMonth } from "../../dates/plainDate";
import {
  AnatomyLegend, Caption, Decision, DODONT_LABEL, dotStyle, HexThemeKey, hLine, type KeyBinding, KeyRow,
  MeasuredRow, MeasuredSpec, Mono, NoteRow, Page, PageHeader, PropsLead, type PropDef, PropTable, Rule,
  Section, tick, TokenGroup,
} from "./_storyKit";
import { Text as UIText } from "./Text";
import { assertMeasuredRows } from "../../foundations/_assert";
import { ComparisonSection, DATE_TIME_COMPARISON } from "./_comparisons";
import { useResolvedSize } from "../../theme/SizeContext";

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = (
  <>
    Reach for a DateRangeInput when the user enters a <strong>start → end</strong> span — a report
    window, a booking, a filter. Common relative spans are offered as <strong>presets</strong>; the
    two-month calendar is for exact picking. The wire value is always <Code>{`{ start, end }`}</Code> ISO
    strings.
  </>
);

/* These are the DOCS stories (History · Anatomy · Usage · Keyboard · Props) — static and calm on
   view. All behavioral plays live in `_daterangeinput.stories.tsx` (_internal/DateRangeInput behavior), so
   viewing a docs page never auto-drives the dialog (Storybook runs a story's play on view, which would
   flash the picker). The live specimens here stay manually interactive. */

/* ---- demo dates + presets — anchored to the real "today" so the calendar lands on a live month ---- */
const T = plainDateToday();
const iso = (n: number): ISODateString => plainDateToISO(plainDateAddDays(T, n));
const TODAY = plainDateToISO(T);
const MONTH_START = plainDateToISO(plainDateSetFirstOfMonth(T));
const YEAR_START = plainDateToISO({ year: T.year, month: 1, day: 1 });
const noop = () => {};

const DEMO_PRESETS: DateRangePreset[] = [
  { label: "Last 7 days", getRange: () => ({ start: iso(-6), end: TODAY }) },
  { label: "Last 30 days", getRange: () => ({ start: iso(-29), end: TODAY }) },
  { label: "This month", getRange: () => ({ start: MONTH_START, end: TODAY }) },
  { label: "Year to date", getRange: () => ({ start: YEAR_START, end: TODAY }) },
];
const SAMPLE_RANGE: DateRange = { start: iso(-6), end: TODAY };

/* ---- anatomy: the closed trigger + callouts (OUTSIDE the field) ---------- */
function AnatomyDiagram() {
  return (
    <Box style={{ overflowX: "auto" }}>
      <Box style={{ position: "relative", width: "100%", minWidth: 480, maxWidth: 660, margin: "0 auto", height: 210, background: "var(--ds-bg-subtle)", borderRadius: "var(--ds-radius-4)", overflow: "hidden" }}>
        <Flex align="center" justify="center" style={{ position: "absolute", inset: 0 }}>
          <Box style={{ position: "relative", width: 320 }} data-size-lesson="inset affordances hold step 1 — the clear ✕ garnishes the field, it doesn't join its row">
            <DateRangeInput
              label="Report range"
              info={<Info size={16} weight="regular" aria-hidden style={{ color: "var(--ds-icon-neutral)", display: "block" }} />}
              endSlot={<UIText style={{ color: "var(--ds-text-weak)" }}>Optional</UIText>}
              description="Pick a start and end date."
              hasClear
              defaultValue={SAMPLE_RANGE}
              presets={DEMO_PRESETS}
              onValueChange={noop}
            />
          </Box>
        </Flex>
        {/* Leader map — measured against the rendered field at the DEFAULT tier (the tier this page
            loads at), not hand-guessed: label row y 81, trigger row y 107, description row y 131; the
            field spans x 170–490 inside the 660-wide frame, so 50% = 330. */}
        {/* 1 — label */}
        <Box style={{ ...dotStyle, left: "calc(50% - 230px)", top: 71 }}>1</Box>
        <Box style={hLine({ left: "calc(50% - 208px)", top: 81, width: 48 })} />
        {/* 2 — info glyph */}
        <Box style={{ ...dotStyle, left: "calc(50% - 72px)", top: 12 }}>2</Box>
        <Box style={tick({ left: "calc(50% - 62px)", top: 32, height: 41 })} />
        {/* 3 — end-slot */}
        <Box style={{ ...dotStyle, left: "calc(50% + 230px)", top: 71 }}>3</Box>
        <Box style={hLine({ left: "calc(50% + 160px)", top: 81, width: 68 })} />
        {/* 4 — leading calendar glyph */}
        <Box style={{ ...dotStyle, left: "calc(50% - 155px)", top: 150 }}>4</Box>
        <Box style={tick({ left: "calc(50% - 145px)", top: 107, height: 43 })} />
        {/* 5 — formatted range / placeholder */}
        <Box style={{ ...dotStyle, left: "calc(50% - 108px)", top: 150 }}>5</Box>
        <Box style={tick({ left: "calc(50% - 98px)", top: 107, height: 43 })} />
        {/* 6 — clear ✕ */}
        <Box style={{ ...dotStyle, left: "calc(50% + 230px)", top: 97 }}>6</Box>
        <Box style={hLine({ left: "calc(50% + 148px)", top: 107, width: 80 })} />
        {/* 7 — description */}
        <Box style={{ ...dotStyle, left: "calc(50% - 230px)", top: 121 }}>7</Box>
        <Box style={hLine({ left: "calc(50% - 208px)", top: 131, width: 48 })} />
      </Box>
    </Box>
  );
}

const ANATOMY_PARTS: [number, string, string][] = [
  [1, "Label", "the field’s name — sets the accessible name via htmlFor → id (shared Field.Label)"],
  [2, "Info", "an optional inline affordance beside the label — a tip icon or helper toggle (shared Field.Label)"],
  [3, "End-slot", "an optional pinned note at the far end of the label row — “Optional”, a count, an action"],
  [4, "Calendar glyph", "a leading identification glyph (--ds-icon-neutral). There is deliberately NO caret — a caret signals a dropdown; this opens a picking DIALOG"],
  [5, "Range / placeholder", "the smart-formatted range when set (“Jul 3 – 10, 2026” — same-year drops the year, cross-year keeps it, an en dash between); a greyed placeholder before entry"],
  [6, "Clear ✕", "the optional trailing clear (hasClear, default on) — appears while a range is set, resets to empty; out of the tab order, Backspace/Delete parity"],
  [7, "Description", "an optional helper line beneath; replaced by the validation message when a STANDING state is active"],
];

/* ---- anatomy: the open dialog (a static, house-faithful specimen) --------
   The specimen carries NO hardcoded size: the panel reads the global control step the same way the real
   popover does, and the Calendar / Buttons inside resolve it themselves. So the page shows what the
   system actually ships at the reader's current tier, and the trigger diagram above matches it. */
function DialogSpecimen({ children }: { children: ReactNode }) {
  const panelSize = useResolvedSize<string>("control", undefined);
  return (
    <Box style={{ width: "fit-content", overflowX: "auto", maxWidth: "100%" }}>
      <Theme className={`rt-ds-daterange-panel rt-r-size-${panelSize}`} hasBackground={false} style={{ position: "static", display: "inline-block" }}>
        {children}
      </Theme>
    </Box>
  );
}

/* A static replica of the dialog body — the preset sidebar (one preset active) beside a two-month range
   calendar + the Done footer. Not the real Popover (so viewing never flashes a portal). */
function DialogBodySpecimen() {
  return (
    <div className="rt-ds-daterange-layout">
      <div className="rt-ds-daterange-body">
        <div role="group" aria-label="Date range presets" className="rt-ds-daterange-presets">
          {DEMO_PRESETS.map((p, i) => (
            <Button key={p.label} type="button" priority="tertiary" className="rt-ds-daterange-preset" aria-current={i === 0 ? "true" : undefined}>
              {p.label}
            </Button>
          ))}
        </div>
        <Calendar mode="range" value={SAMPLE_RANGE} onValueChange={noop} numberOfMonths={2} />
      </div>
      <div className="rt-ds-daterange-footer">
        <Button type="button" priority="secondary">Done</Button>
      </div>
    </div>
  );
}

/* ========================================================================== */

const meta: Meta<typeof DateRangeInput> = {
  title: "Components/Date & Time/DateRangeInput",
  component: DateRangeInput,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**DateRangeInput** — a range date picker: one button trigger opening a **dialog** that hosts a " +
          "preset sidebar beside a two-month range **Calendar**. The range sibling of **DateInput**, but a " +
          "different shape at both ends: the trigger reuses the **MultiSelect/Select surface-trigger chrome** " +
          "(fill + border + the system focus ring ([[focus-ring]]) for free) with a leading calendar glyph and **no caret** (it " +
          "opens a dialog, not a dropdown); the popover reuses DateInput’s mechanism (a `role=\"dialog\"` that " +
          "moves focus into the grid so the calendar is keyboard-operable). Presets are plain Tab-order buttons — " +
          "the active one carries `aria-current` and paints the committed-band tint, tying it to the range it " +
          "produces. A range is entered by picking; the dialog **stays open** so you can confirm or refine.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof DateRangeInput>;

/** Anatomy — the parts of the trigger and its open dialog. The live token spec lives in Usage. */
export const Anatomy: Story = {
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader title="DateRangeInput · Anatomy" standfirst={DEFINITION} />
        <Section title="Anatomy — the trigger" lead="A single surface-trigger button (one tab stop) — the same chrome as Select / MultiSelect, so the family reads as one. A leading calendar glyph identifies it; a committed range shows smart-formatted; an optional clear ✕ trails it. There is deliberately NO caret — this opens a dialog, not a dropdown. The label row + support area are the shared Field chrome.">
          <AnatomyDiagram />
          <AnatomyLegend parts={ANATOMY_PARTS} />
          <Caption>
            Only the <strong>label</strong> is required. The <strong>calendar glyph</strong> is always present;
            the <strong>clear ✕</strong> (<Code>hasClear</Code>, on by default), the <strong>info</strong>, the{" "}
            <strong>end-slot</strong>, and the <strong>description</strong> are optional.
          </Caption>
        </Section>

        <Rule />

        <Section title="Anatomy — the open dialog" lead="The dialog the trigger opens into — solid and opaque (never translucent), the SAME overlay surface as the DateInput / Select menus so the floating family reads as one. Inside: the preset sidebar (logical-start) beside a two-month range Calendar, with a Done footer. Selecting a preset or a range KEEPS it open (confirm/refine). The specimen below is house-faithful (real tokens, follows the toolbar accent).">
          <DialogSpecimen>
            <DialogBodySpecimen />
          </DialogSpecimen>
          <Caption>The dialog keeps Radix’s <Code>role="dialog"</Code>, named “Choose date range”. Opening moves focus into the grid’s roving day so the calendar is keyboard-operable (WCAG 2.1.1); Escape / Done return focus to the trigger. The active preset (“Last 7 days” here) carries <Code>aria-current="true"</Code> and the committed-band tint — the same tint the grid’s own range wears, so the preset and the band it produced read as one.</Caption>
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
};

/** Usage — when to reach for DateRangeInput, the field kept in context, and the live token spec that
 *  closes the page. */
export const Usage: Story = {
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <Page>
      <PageHeader title="DateRangeInput · Usage" standfirst={DEFINITION} />

      <ComparisonSection comparison={DATE_TIME_COMPARISON} highlight="DateRangeInput" />

      <Rule />

      <Section title="A booking / report range with presets" lead="The realistic shape: a labelled range field pre-loaded with the spans most people want, and a calendar for everything else.">
        <Flex direction="column" gap="2" style={{ maxWidth: 340 }}>
          <DateRangeInput
            label="Report window"
            description="Choose a preset or pick exact dates."
            presets={DEMO_PRESETS}
            hasClear
            onValueChange={noop}
          />
          <Caption>Open it: the presets sit beside the two-month grid. Clicking a preset fills the range and keeps the dialog open so you can nudge an endpoint before Done.</Caption>
        </Flex>
      </Section>

      <Rule />

      <Section title="Presets tie to the range they produce" lead="A preset is a shortcut, not a mode. The active preset (its span equals the current value) wears the committed-BAND tint — the same tint the calendar uses for the days between the endpoints — so the eye reads “this preset made that band”. It is deliberately not the solid selected fill, which would shout over a grid whose own endpoints are a tint.">
        <DialogSpecimen>
          <DialogBodySpecimen />
        </DialogSpecimen>
        <Caption>Presets stay in normal Tab order (a <Mono>role="group"</Mono>, not a listbox) — reachable by keyboard alongside the grid, announced by <Mono>aria-current</Mono>, and never trapping focus.</Caption>
      </Section>

      <Rule />

      <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
        <Section title="Tokens" lead="Every colour row below is MEASURED — the property is read from the element that paints it and checked against the token the row names, so a row can disagree with the component. The trigger rows read a real field; the dialog rows read the same static panel specimen the section above shows, because the live dialog is portaled and exists only while it is open.">
          <Flex direction="column" gap="4">
            <TokenGroup label="TRIGGER (rest + affixes)" blurb="The trigger reuses the .rt-SelectTrigger surface chrome — its resting border/fill + the system focus ring ([[focus-ring]]) are shared Field chrome; only the leading glyph is painted here.">
              <MeasuredSpec render={() => <DateRangeInput label="Measurement" value={SAMPLE_RANGE} onValueChange={noop} />}>
                <MeasuredRow
                  part="Calendar glyph" note="The leading identification glyph — there is deliberately no caret."
                  token="--ds-icon-neutral" select=".rt-ds-select-lead svg" prop="fill"
                />
                <MeasuredRow
                  part="Focus ring" note="The accent base, read from the rule the trigger’s own stylesheet paints on keyboard focus. A Radix alpha, --ds-stroke-focus-stack, sits on top of it, 2px wide ([[focus-ring]])."
                  token="--ds-stroke-focus" select=".rt-SelectTrigger" prop="outline-color" state="focus-visible"
                />
              </MeasuredSpec>
              <NoteRow part="Clear ✕ glyph" value="ghost IconButton — accent-tinted (fill:currentColor), the shared Select/MultiSelect clear affix" />
              <NoteRow part="Border (rest)" value="a 1px inset ring carried inside box-shadow, so no colour property carries it" radix="--gray-a7" />
            </TokenGroup>
            <TokenGroup label="DIALOG + PRESETS" blurb="The dialog surface — opaque overlay, the same treatment as the DateInput / Select menus. The active preset uses the calendar’s committed-band tier.">
              <MeasuredSpec render={() => <DialogSpecimen><DialogBodySpecimen /></DialogSpecimen>}>
                <MeasuredRow
                  part="Panel surface" note="The opaque card the presets and calendar sit on."
                  token="--ds-bg-overlay" select=".rt-ds-daterange-panel" prop="background-color"
                />
                <MeasuredRow
                  part="Active preset fill" note="The preset whose range is currently set."
                  token="--ds-fill-selected-subtle" select='.rt-ds-daterange-preset[aria-current="true"]' prop="background-color"
                />
                <MeasuredRow
                  part="Active preset text" note="Strong ink, so the active preset reads above the band tint under it."
                  token="--ds-text-strong" select='.rt-ds-daterange-preset[aria-current="true"]' prop="color"
                />
                <MeasuredRow
                  part="Preset hover" note="The tertiary Button's own hover tint, reused rather than re-declared."
                  token="--ds-fill-accent-weak" select=".rt-ds-daterange-preset" prop="background-color" state="hover"
                />
              </MeasuredSpec>
              <NoteRow part="Elevation" value="--ds-shadow-overlay (a hairline ring + drop shadow)" />
              <NoteRow part="Panel radius" value="--ds-radius-3 · padding --space-3" />
              <NoteRow part="Calendar paint" value="range endpoints and a selected day take the subtle selected tint (--ds-fill-selected-subtle) under strong neutral text, never a solid accent fill; the preview run is one step lighter (--ds-fill-accent-weak)" />
            </TokenGroup>
          </Flex>
        </Section>
      </HexThemeKey.Provider>
    </Page>
  ),
  play: async ({ canvasElement }) => {
    // The token table's EVIDENCE, asserted at runtime: every measured row read a real rendered node,
    // resolved its claim somewhere else, and the two agree. Reads only — nothing opens the dialog.
    const rows = assertMeasuredRows(canvasElement);
    if (rows.measured !== 6 || rows.unproven !== 0) {
      throw new Error(`expected 6 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }
  },
};

/* ---- Keyboard contract --------------------------------------------------- */
const CLOSED_KEYS: KeyBinding[] = [
  { keys: ["Enter", "Space"], action: <>Open the dialog. Focus moves <strong>into</strong> the range grid’s roving day so it’s immediately arrow-operable.</>, src: "system" },
  { keys: ["Backspace", "Delete"], action: <>Clear the range (the keyboard parity for the out-of-tab-order clear ✕), while <Code>hasClear</Code> and a value is set.</>, src: "system" },
  { keys: ["Tab"], action: <>Move focus past the trigger. It is a <strong>single</strong> tab stop.</>, src: "system" },
];
const OPEN_KEYS: KeyBinding[] = [
  { keys: ["← → ↑ ↓"], action: <>Move the roving day in the grid; <Code>PageUp/Down</Code> flips the month, <Code>Shift+PageUp/Down</Code> the year (the shared <Code>useGridFocus</Code>).</>, src: "system" },
  { keys: ["Enter", "Space"], action: <>Select the focused day — the first sets the start, the second commits the range. The dialog <strong>stays open</strong> to confirm or refine.</>, src: "system" },
  { keys: ["Tab", "Shift+Tab"], action: <>Move between the grid, the preset buttons (normal Tab order), and Done. Activating a preset fills the range and keeps the dialog open.</>, src: "system" },
  { keys: ["Esc"], action: "Close the dialog and return focus to the trigger; the value is kept.", src: "system" },
];

/** Keyboard — the complete key → action contract for the trigger and the open dialog. */
export const Keyboard: Story = {
  render: () => (
    <Page>
      <PageHeader title="DateRangeInput · Keyboard" standfirst={DEFINITION} />
      <Section title="Keyboard" lead={<>The full key → action contract. This is an APG <strong>combobox-with-dialog</strong> shape: the trigger opens a dialog, and opening moves focus into the grid so the range calendar is keyboard-operable. The grid’s own navigation comes from the shared <Code>useGridFocus</Code>.</>}>
        <Flex direction="column" gap="2">
          <Box style={{ maxWidth: 320 }}>
            <DateRangeInput label="Report window" description="Press Enter to open, then arrow-navigate." presets={DEMO_PRESETS} onValueChange={noop} />
          </Box>
          <Caption>A live target — open it and drive it entirely by keyboard.</Caption>
        </Flex>
        <Flex direction="column" gap="4">
          <TokenGroup label="TRIGGER · DIALOG CLOSED">
            {CLOSED_KEYS.map((b) => <KeyRow key={b.keys.join("+")} {...b} />)}
          </TokenGroup>
          <TokenGroup label="DIALOG · OPEN">
            {OPEN_KEYS.map((b) => <KeyRow key={b.keys.join("+")} {...b} />)}
          </TokenGroup>
        </Flex>
        <Caption><strong>Pointer</strong> — the trigger toggles the dialog; clicking two days commits a range; clicking a preset fills it. Done / Escape / an outside click close.</Caption>
      </Section>
    </Page>
  ),
};

/* ---- Props ---------------------------------------------------------- */
const PROPS: PropDef[] = [
  { name: "value / defaultValue", type: "DateRange", desc: <>Controlled / uncontrolled range — <Code>{`{ start, end }`}</Code> ISO <Code>YYYY-MM-DD</Code> strings.</>, source: "DateRangeInput.tsx" },
  { name: "onValueChange", type: "(v: DateRange | undefined) => void", desc: <>Required. Fires with the committed range, or <Code>undefined</Code> when cleared. No <Code>null</Code>.</>, source: "DateRangeInput.tsx" },
  { name: "presets", type: "ReadonlyArray<{ label; getRange }>", desc: <>Shortcut ranges rendered as the sidebar. The active one (its <Code>getRange()</Code> equals the value) carries <Code>aria-current</Code> + the committed-band tint.</>, source: "DateRangeInput.tsx" },
  { name: "min / max", type: "ISODateString", desc: <>Selectable bounds — earlier/later dates are disabled in the calendar. A committed range out of bounds surfaces a STANDING validation error.</>, source: "DateRangeInput.tsx" },
  { name: "isDateDisabled", type: "(iso) => boolean", desc: <>Custom disable predicate — <Code>true</Code> = disabled (forwarded to Calendar, which bridges the polarity).</>, source: "DateRangeInput.tsx" },
  { name: "numberOfMonths", type: "1 | 2", def: "2", desc: <>Months shown side by side in the dialog.</>, source: "DateRangeInput.tsx" },
  { name: "placeholder", type: "string", def: `"Select dates"`, desc: <>Greyed hint while empty.</>, source: "DateRangeInput.tsx" },
  { name: "hasClear", type: "boolean", def: "true", desc: <>A trailing clear ✕ (out of tab order, Backspace/Delete parity) while a range is set.</>, source: "DateRangeInput.tsx" },
  { name: "size", type: `"1" | "2" | "3"`, def: `"1"`, desc: <>Control size. Unset, it resolves from the global <Code>uiSize</Code> control lane.</>, source: "DateRangeInput.tsx" },
  { name: "disabled", type: "boolean", def: "false", desc: <>Dims the trigger and makes it inert (native disabled — unless paired with a reason).</>, source: "DateRangeInput.tsx" },
  { name: "disabledReason", type: "string", desc: <>A non-empty reason SOFT-disables (aria-disabled + reason tooltip + glyph) so the reason stays perceivable on hover and focus.</>, source: "DateRangeInput.tsx" },
  { name: "label / info / endSlot / description / validation", type: "Field props", desc: <>The shared <Code>Field</Code> shell. <Code>validation</Code> is the STANDING channel (a committed range out of min/max synthesizes a message). Pass none of label / description / validation to keep the control bare.</>, source: "DateRangeInput.tsx" },
  { name: "width", type: "number | string", desc: <>Constrain the field width.</>, source: "DateRangeInput.tsx" },
];

type PropsArgs = {
  showLabel: boolean;
  label: string;
  placeholder: string;
  description: string;
  showPresets: boolean;
  validation: { tone: "error" | "warning" | "success" | "info"; message: string } | undefined;
  size: "auto" | "1" | "2" | "3";
  hasClear: boolean;
  numberOfMonths: 1 | 2;
  disabled: boolean;
  disabledReason: string;
};

/** Props — the live, args-driven field (uncontrolled; pick a range, and drive every prop from Controls). */
export const Props: StoryObj<PropsArgs> = {
  args: {
    showLabel: true,
    label: "Report window",
    placeholder: "Select dates",
    description: "Choose a preset or pick exact dates.",
    showPresets: true,
    validation: undefined,
    // "auto" (size unset) is the default so the field tracks the global uiSize toolbar out of the box.
    size: "auto",
    hasClear: true,
    numberOfMonths: 2,
    disabled: false,
    disabledReason: "",
  },
  argTypes: {
    showLabel: { name: "label (show)", control: "boolean", table: { category: "Field" } },
    label: { control: "text", if: { arg: "showLabel" }, table: { category: "Field" } },
    placeholder: { control: "text", table: { category: "Field" } },
    description: { name: "description (helper)", control: "text", table: { category: "Field" } },
    showPresets: { name: "presets (show)", control: "boolean", table: { category: "Behaviour" } },
    validation: {
      control: "inline-radio",
      options: ["none", "error", "warning", "success", "info"],
      mapping: {
        none: undefined,
        error: { tone: "error", message: "Choose dates in the allowed range." },
        warning: { tone: "warning", message: "Double-check this range." },
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
    // A tiny controlled wrapper so the picked range persists in the demo.
    function Demo() {
      const [v, setV] = useState<DateRange | undefined>(undefined);
      return (
        <DateRangeInput
          value={v}
          onValueChange={setV}
          label={args.showLabel ? args.label : undefined}
          aria-label={args.showLabel ? undefined : args.label || "Date range"}
          placeholder={args.placeholder}
          description={args.description}
          presets={args.showPresets ? DEMO_PRESETS : undefined}
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
        <PageHeader title="DateRangeInput · Props" standfirst={DEFINITION} />
        <Box p="5" style={{ maxWidth: 400 }}>
          <Demo />
          <Box mt="3"><Caption>Open the dialog, click two days (or a preset) to set a range, then Done. Clear with the ✕ or Backspace. A committed range out of a set <Mono>min</Mono>/<Mono>max</Mono> surfaces the standing error channel.</Caption></Box>
        </Box>
        <PropsLead />
        <Rule />
        <Section title="Props reference" lead={<>Every prop <Code>DateRangeInput</Code> accepts — the <Code>{`{ start, end }`}</Code> wire contract, the presets, the calendar bounds, and the shared <Code>Field</Code> shell.</>}>
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
      <PageHeader title="DateRangeInput · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[catalog-as-specification]] · reuse">
            <strong>Composed, not reinvented.</strong> The body reuses <Code>Calendar</Code> in range mode,
            the shared <Code>Field</Code> shell, <Code>Button</Code> / <Code>IconButton</Code>, and the
            DateInput popover mechanism. The only earned net-new is the panel + preset-column CSS, an{" "}
            <Code>isRangeEqual</Code> helper, and the <Code>Intl.formatRange</Code> display — zero date math is
            re-implemented, zero net-new tokens.
          </Decision>
          <Decision id="MultiSelect-trigger · no caret">
            <strong>The trigger reuses the surface-trigger chrome — with no caret.</strong> A range is entered
            by <em>picking</em>, so the trigger is one <Code>.rt-SelectTrigger</Code> button (surface fill,
            border, and the system focus ring come free), a leading <Code>CalendarBlank</Code> glyph, and{" "}
            <Code>aria-haspopup="dialog"</Code>. There is deliberately <strong>no caret</strong> — a caret
            signals a dropdown, but this opens a picking <em>dialog</em>. Stated so nobody adds one back.
          </Decision>
          <Decision id="[[date-input]] · dialog + focus-into-grid">
            <strong>The popover KEEPS Radix’s <Code>role="dialog"</Code></strong> (named “Choose date range”),
            and opening <strong>moves focus INTO the grid’s roving day</strong>. The Calendar uses real
            roving-tabindex focus, so keeping focus on the trigger would leave the grid keyboard-{" "}
            <strong>inoperable</strong> (WCAG 2.1.1 — the exact bug the DateInput review caught). Escape and the
            Done button return focus to the trigger.
          </Decision>
          <Decision id="Presets · aria-current · the committed-band tint">
            <strong>Presets are Tab-order buttons in a <Code>role="group"</Code> — not a listbox.</strong> They
            are <em>shortcuts</em>, not the selection surface (so no <Code>aria-selected</Code>/roving). The
            active preset (its <Code>getRange()</Code> equals the value) carries <Code>aria-current="true"</Code>{" "}
            and paints from <Code>--ds-fill-selected-subtle</Code> (the committed-<em>band</em> tier) +{" "}
            <Code>--ds-text-strong</Code> — deliberately <strong>not</strong> <Code>--ds-fill-selected</Code>,
            the solid step, which would shout over a calendar whose own endpoints are a tint. The band tier
            ties the preset to the range it produces.
          </Decision>
          <Decision id="Keep-open divergence">
            <strong>A preset (or a completed calendar range) KEEPS THE DIALOG OPEN</strong> — a deliberate
            divergence from DateInput’s day-select-closes. A range benefits from confirm/refine, so a trailing{" "}
            <strong>Done</strong> button, Escape, or an outside click close it.
          </Decision>
          <Decision id="Smart format + SR full form">
            <strong>The trigger shows a smart, locale-correct range.</strong>{" "}
            <Code>Intl.DateTimeFormat.formatRange</Code> drops repeated parts — <strong>same-year drops the
            year, cross-year keeps it</strong>, <Code>start==end</Code> collapses to a single date, and the
            separator is a spaced <strong>en dash (–)</strong>. A <Code>VisuallyHidden</Code> full form (“July 3
            to July 10, 2026”) backs it so a screen reader never mis-announces the dash. No half-range is
            flickered into the trigger — the Calendar commits <Code>{`{start, end}`}</Code> atomically (the
            in-progress range lives in the grid preview).
          </Decision>
          <Decision id="[[disabled-reason]] · Soft-disable with a reason">
            <strong>Soft-disable-with-reason.</strong> <Code>disabled</Code> + a non-empty{" "}
            <Code>disabledReason</Code> soft-disables the trigger (<Code>aria-disabled</Code> keeps it focusable +
            a reason tooltip + a quiet Info glyph) instead of natively disabling — so the reason stays
            perceivable on hover AND keyboard focus. Radix’s own disabled skin is re-applied via the shared
            reason-wrapper hook.
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            Initial <Code>System/DateRangeInput</Code> — the range picker: the surface-trigger chrome (no caret)
            + the calendar-<strong>dialog</strong> popover on <Code>@radix-ui/react-popover</Code> hosting{" "}
            <Code>Calendar</Code> in range mode + a preset sidebar (<Code>aria-current</Code>, a5 band tint,
            keep-open), the smart <Code>formatRange</Code> display with an SR full form, <Code>hasClear</Code>{" "}
            (default on, Backspace/Delete parity), and full Field-shell validation +{" "}
            <Code>disabledReason</Code>. Stories: History · Anatomy · Usage · Keyboard · Props.
          </Decision>
          <Decision id="Deferred → keyboard-first exact entry">
            <strong>Keyboard-first exact-date range entry</strong> — reach for <strong>two{" "}
            <Code>DateInput</Code>s in a <Code>FieldGroup</Code></strong> (each a free-text field with its own
            calendar). DateRangeInput deliberately ships <em>no</em> bespoke range text-parser; picking is its
            primary path.
          </Decision>
          <Decision id="Deferred → server actions / partial / InputGroup">
            <strong>The <Code>changeAction</Code> async-optimistic layer</strong> (<Code>isLoading</Code> /
            Spinner), a <strong>live-partial-range</strong> echoed into the trigger while picking (would need
            exposing Calendar’s internal anchor — a net-new Calendar affordance), and <strong>InputGroup</strong>{" "}
            composition — out of scope here.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
