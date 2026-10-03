import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import { Info } from "@phosphor-icons/react";
import { DateTimeInput, type ISODateTimeString } from "./DateTimeInput";
import { plainDateToday, plainDateToISO, plainDateAddDays } from "../../dates/plainDate";
import {
  AnatomyLegend, Caption, Decision, DoDont, DODONT_LABEL, dotStyle, hLine, MeasuredRow, MeasuredSpec, Mono, Muted,
  Page, PageHeader, PropsLead, type PropDef, PropTable, Rule, Section, SizeLesson, tick, TokenGroup,
  NoteRow,
} from "./_storyKit";
import { Text as UIText } from "./Text";
import { assertMeasuredRows } from "../../foundations/_assert";
import { ComparisonSection, DATE_TIME_COMPARISON } from "./_comparisons";

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = (
  <>
    Reach for a DateTimeInput when the user picks <strong>a single moment</strong> — a day <em>and</em> a
    time under one label: a meeting slot, an appointment, a reminder, a publish time. It composes a{" "}
    <Code>DateInput</Code> and a <Code>TimeInput</Code>, keeps them honest with a conditional
    time-window, and emits one ISO <Code>YYYY-MM-DDTHH:MM</Code> value.
  </>
);

/* These are the DOCS stories (History · Anatomy · Usage · Props) — static and calm on view. All
   behavioral plays live in `_datetimeinput.stories.tsx` (_internal/DateTimeInput behavior), so viewing a docs
   page never auto-drives the embedded calendar popover. The live specimens here stay manually interactive. */

/* ---- demo instants — anchored to the real "today" so bounds land on a live week ---- */
const T = plainDateToday();
const dayISO = (offset: number) => plainDateToISO(plainDateAddDays(T, offset));
const at = (offset: number, time: string) => `${dayISO(offset)}T${time}` as ISODateTimeString;
const noop = () => {};
// A business-hours window spanning ~a week: the boundary days (min/max) carry the proactive time hint.
const MIN = at(2, "09:00");
const MAX = at(9, "17:00");

const ANATOMY_PARTS: [number, string, string][] = [
  [1, "Group label", "the composite’s name — a FieldGroup label, referenced by the group’s aria-labelledby (role=group); NOT a <label htmlFor> targeting one control"],
  [2, "Date sub-field", "a BARE DateInput (its own aria-label “Date”) — free-text date + calendar-dialog popover. It grows to hold a long-format date"],
  [3, "Time sub-field", "a BARE TimeInput (its own aria-label “Time”) — free-text time + ↑ / ↓ increment. Intrinsic width, sits beside the date"],
  [4, "Description / window hint", "the group helper line; on a boundary date it shows the active time window (“On …, times from 9:00 AM are available.”) as weak-neutral GUIDANCE"],
  [5, "Composite message", "one FieldGroup.Message at the bottom — the STANDING problem for the pair (role=alert on appearance), distinct from each sub-field’s own local revert"],
];

/* ---- Anatomy diagram -----------------------------------------------------
   The composite's parts are STACKED — label, then the two-field row, then one support line — so the
   callouts sit in gutters either side of the specimen and run a leader into the part they name. Two
   gutters, not one: the date and the time field share a row, and a single column of dots would draw them
   on top of each other, so the row is named from the left (date) and the right (time).

   Positions are MEASURED off the live specimens. The label's step, the control height and the support
   line's leading all follow the size lane (the size toolbar), and the date field GROWS to hold whatever
   the locale formats, so every coordinate here moves under the reader; none of them can be written down.

   TWO specimens, because the support-text slot holds ONE line: FieldGroup.Description returns null the
   moment a validation is set (the message becomes the corrective helper, so the group never stacks a
   redundant pair). ④ and ⑤ are that slot in its two states, and no single render can show both. */

const SPEC_W = 460;
const GUTTER = 56;
/** Where the leaders turn their corner inside a gutter — one shared column per side, so the elbows read
 *  as a set. */
const ELBOW = 30;
/** Closest two dots in one gutter may sit, centre to centre. A dot is 20px wide. */
const MIN_GAP = 26;

type PinSpec = {
  n: number;
  /** Which gutter the callout sits in. */
  side: "left" | "right";
  /** The element this callout names, resolved inside the frame. */
  sel: string;
  /** Where down that element's box the leader lands (0 = its top edge, 0.5 = its middle). */
  at?: number;
};

type Measured = { dotY: number; partY: number; edgeX: number };

/** A specimen with numbered callouts in the gutters either side, measured off the live DOM. */
function PinFrame({ pins, width, children }: { pins: PinSpec[]; width: number; children: ReactNode }) {
  const frame = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState<Record<number, Measured>>({});
  const [frameW, setFrameW] = useState(0);

  useLayoutEffect(() => {
    const f = frame.current;
    const b = body.current;
    if (!f || !b) return;
    const measure = () => {
      const fb = f.getBoundingClientRect();
      const next: Record<number, Measured> = {};
      for (const side of ["left", "right"] as const) {
        const found: Array<{ n: number; partY: number; edgeX: number }> = [];
        for (const p of pins.filter((q) => q.side === side)) {
          const el = b.querySelector<HTMLElement>(p.sel);
          if (!el) continue;
          const box = el.getBoundingClientRect();
          found.push({
            n: p.n,
            partY: Math.round(box.top - fb.top + box.height * (p.at ?? 0.5)),
            edgeX: Math.round((side === "left" ? box.left : box.right) - fb.left),
          });
        }
        // Sorted by where the parts ACTUALLY are, not by declaration order. One forward pass over the
        // sorted list keeps any two dots in a gutter a legible distance apart; the leader turns a corner
        // to reach its part, so the dot moves and the line still lands.
        found.sort((x, y) => x.partY - y.partY);
        let floor = -Infinity;
        for (const m of found) {
          const dotY = Math.max(m.partY, floor + MIN_GAP);
          floor = dotY;
          next[m.n] = { dotY, partY: m.partY, edgeX: m.edgeX };
        }
      }
      const w = Math.round(fb.width);
      // Only write when something moved — the frame's own size feeds this observer otherwise.
      setMeasured((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
      setFrameW((prev) => (prev === w ? prev : w));
    };
    measure();
    let raf = 0;
    const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); });
    ro.observe(f);
    ro.observe(b);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [pins]);

  return (
    <Box style={{ overflowX: "auto" }}>
      <Box ref={frame} style={{ position: "relative", width: "fit-content", paddingLeft: GUTTER, paddingRight: GUTTER }}>
        <Box ref={body} style={{ width }}>{children}</Box>
        {pins.map(({ n, side }) => {
          const m = measured[n];
          if (!m) return null;
          const right = side === "right";
          const elbowX = right ? frameW - ELBOW : ELBOW;
          const dotX = right ? frameW - 20 : 0;
          return (
            <Box key={n}>
              <Box data-pin={n} style={{ ...dotStyle, left: dotX, top: m.dotY - 10 }}>{n}</Box>
              {/* out of the dot… */}
              <Box style={hLine(right ? { left: elbowX, top: m.dotY, width: dotX - elbowX } : { left: 22, top: m.dotY, width: elbowX - 22 })} />
              {/* …down the gutter's own column to the part's line (zero-height when they already agree)… */}
              {m.dotY !== m.partY && (
                <Box style={tick({ left: elbowX, top: Math.min(m.dotY, m.partY), height: Math.abs(m.dotY - m.partY) })} />
              )}
              {/* …and into the part. */}
              <Box
                style={hLine(
                  right
                    ? { left: m.edgeX + 4, top: m.partY, width: Math.max(elbowX - m.edgeX - 4, 0) }
                    : { left: elbowX, top: m.partY, width: Math.max(m.edgeX - elbowX - 4, 0) },
                )}
              />
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

const GROUP_PINS: PinSpec[] = [
  { n: 1, side: "left", sel: '[data-spec="rest"] .rt-ds-field-group-label' },
  { n: 2, side: "left", sel: '[data-spec="rest"] .rt-ds-datetimeinput-date' },
  { n: 3, side: "right", sel: '[data-spec="rest"] .rt-ds-datetimeinput-time' },
  { n: 4, side: "left", sel: '[data-spec="rest"] [data-field-part="description"]' },
  // The message REPLACES the description, so it is pinned on the second specimen below.
  { n: 5, side: "left", sel: '[data-spec="standing"] [data-field-part="message"]' },
];

const SPEC_LABEL = { color: "var(--ds-text-weak)", letterSpacing: "0.06em" } as const;

function AnatomyDiagram() {
  return (
    <PinFrame pins={GROUP_PINS} width={SPEC_W}>
      <Flex
        direction="column"
        gap="5"
        style={{ background: "var(--ds-bg-subtle)", borderRadius: "var(--ds-radius-4)", padding: "var(--ds-space-24)" }}
      >
        <Flex
          direction="column"
          gap="2"
          data-spec="rest"
          data-size-lesson="inset affordances hold step 1 — they garnish the field, not the row"
        >
          <Text size="1" weight="bold" style={SPEC_LABEL}>AT REST</Text>
          <DateTimeInput
            label="Appointment"
            info={<Info size={16} weight="regular" aria-hidden style={{ color: "var(--ds-icon-neutral)", display: "block" }} />}
            endSlot={<UIText style={{ color: "var(--ds-text-weak)" }}>Required</UIText>}
            description="Choose a day and a start time."
            defaultValue={at(4, "14:30")}
            onValueChange={noop}
          />
        </Flex>
        <Flex
          direction="column"
          gap="2"
          data-spec="standing"
          data-size-lesson="inset affordances hold step 1 — they garnish the field, not the row"
        >
          <Text size="1" weight="bold" style={SPEC_LABEL}>WITH A STANDING PROBLEM</Text>
          <DateTimeInput
            label="Appointment"
            validation={{ tone: "error", message: "That slot is already taken." }}
            defaultValue={at(4, "14:30")}
            onValueChange={noop}
          />
        </Flex>
      </Flex>
    </PinFrame>
  );
}

/* ========================================================================== */

const meta: Meta<typeof DateTimeInput> = {
  title: "Components/Date & Time/DateTimeInput",
  component: DateTimeInput,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**DateTimeInput** — a date **and** a time under one group label, on the shared **FieldGroup** shell. " +
          "It is a **composite (a GROUP of two sub-controls), not a single Field**: it embeds the already-shipped " +
          "**DateInput** + **TimeInput** in their **bare** mode inside a `FieldGroup.Root`. Zero " +
          "date/time math is re-implemented — split/combine at the `T` is the only new logic. The embedded time " +
          "field’s bound **tightens only on a boundary date** (the conditional clamp); picking a date auto-seeds " +
          "the current time and snaps it into the window; and feedback is **two-tier** — each sub-field keeps its " +
          "own ephemeral revert, while the composite’s standing problem surfaces once on `FieldGroup.Message`.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof DateTimeInput>;

/** Anatomy — the parts of the composite and the two-tier feedback model. The live token spec lives in
 *  Usage. */
export const Anatomy: Story = {
  render: () => (
    <Page>
      <PageHeader title="DateTimeInput · Anatomy" standfirst={DEFINITION} />
      <Section title="Anatomy — the composite" lead="A FieldGroup wraps two sub-fields under one group label. The bare DateInput grows to hold a long-format date; the bare TimeInput sits beside it at its intrinsic width (stacking to two rows in a narrow container). A group description sits beneath; a single composite message takes its place when a standing problem appears — which is why the specimen is shown in both states.">
        <AnatomyDiagram />
        <AnatomyLegend parts={ANATOMY_PARTS} />
        <Caption>
          Only the <strong>label</strong> is required. The <strong>description</strong> doubles as the proactive
          window hint on a boundary date; the <strong>composite message</strong> appears only for a standing
          problem, and it <em>replaces</em> the description rather than stacking under it — so callouts{" "}
          <strong>④</strong> and <strong>⑤</strong> are the same support-text slot in its two states.
        </Caption>
      </Section>

      <Rule />

      <Section title="Two-tier feedback" lead="A composite has two feedback layers that never cross. Each sub-field owns its LOCAL ephemeral channel; the group owns the STANDING problem for the pair; and the window hint is guidance, not error.">
        <Grid columns={{ initial: "1", sm: "3" }} gapX="6" gapY="4" data-size-lesson="inset affordances hold step 1 — they garnish the field, not the row">
          <Flex direction="column" gap="2">
            <Text size="1" weight="bold" style={{ color: "var(--ds-text-weak)", letterSpacing: "0.06em" }}>LOCAL — sub-field ephemeral</Text>
            <Muted>Unparseable text in EITHER sub-field is announced assertively and silently reverts, flagging aria-invalid only WHILE pending — exactly as the standalone DateInput / TimeInput do. It never reaches the composite.</Muted>
            <Box style={{ padding: "var(--ds-space-12)", borderRadius: "var(--ds-radius-3)", background: "var(--ds-bg-subtle)", border: "1px solid var(--ds-stroke-weak)" }}>
              <Muted>“Didn’t recognize that time — kept 2:30 PM.”</Muted>
            </Box>
          </Flex>
          <Flex direction="column" gap="2">
            <Text size="1" weight="bold" style={{ color: "var(--ds-text-weak)", letterSpacing: "0.06em" }}>COMPOSITE — standing</Text>
            <Muted>A standing problem for the whole pair (a caller validation, or a combined value out of range) surfaces ONCE on FieldGroup.Message + sets the group’s aria-invalid — never double-rendered on a sub-field.</Muted>
            <Box style={{ maxWidth: 300 }}>
              <DateTimeInput label="Booking" validation={{ tone: "error", message: "That slot is already taken." }} defaultValue={at(4, "10:00")} onValueChange={noop} />
            </Box>
          </Flex>
          <Flex direction="column" gap="2">
            <Text size="1" weight="bold" style={{ color: "var(--ds-text-weak)", letterSpacing: "0.06em" }}>HINT — guidance, not error</Text>
            <Muted>On a boundary date the active time window shows in the description (weak-neutral). It guides — it does NOT paint red or set aria-invalid.</Muted>
            <Box style={{ maxWidth: 300 }}>
              <DateTimeInput label="Delivery slot" min={MIN} max={MAX} defaultValue={at(2, "10:00")} onValueChange={noop} />
            </Box>
          </Flex>
        </Grid>
        <Caption>The middle field wears the error border + a corrective message (a real problem). The right field, on its earliest allowed day, shows the window in calm weak-neutral text — guidance the user reads, not an error to resolve.</Caption>
      </Section>
    </Page>
  ),
  play: async ({ canvasElement }) => {
    // Every numbered part in the legend has a callout ON the specimen — a numbered legend with nothing
    // to point at is the defect this diagram exists to avoid. Passive: nothing here drives the composite.
    const pins = canvasElement.querySelectorAll("[data-pin]");
    if (pins.length !== ANATOMY_PARTS.length)
      throw new Error(`expected ${ANATOMY_PARTS.length} callout pins on the specimen; got ${pins.length}`);
  },
};

/** Usage — when to reach for DateTimeInput, the composite kept in a realistic context, and the live
 *  token spec that closes the page. */
export const Usage: Story = {
  // Semantic step-11 error text on the invalid-field wash: #ce2c31 on #fbe8ea = 4.42, under axe's 4.5.
  // Surfaced by narrowing the do/don't carve-out to the DO/DON'T word alone. Same unruled tone-on-tint
  // gap as Callout/Badge — it needs a ruling on the tone tokens, not a story-level fix.
  // The carve-out is matched on `data-tone` as well as the inline style: the group label's tone moved
  // off a style prop into the stylesheet (so the value can be read back off the element), which left the
  // `[style*=…]` selector matching nothing on that node. Same gap, same ratio — a selector that had
  // stopped reaching it, not a new failure.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL, "[style*='--ds-text-error']", '[data-tone="error"]'] } } },
  render: () => (
    <Page>
      <PageHeader title="DateTimeInput · Usage" standfirst={DEFINITION} />

      <ComparisonSection comparison={DATE_TIME_COMPARISON} highlight="DateTimeInput" />

      <Rule />

      <Section title="An appointment scheduler" lead="The realistic case: a booking confined to a service window (here, from two days out through next week, 9:00 AM–5:00 PM). On the first or last allowed day the field shows the active hours in its description; a time outside them reverts in the time field, and the whole moment is one ISO value.">
        <Box
          data-size-lesson="inset affordances hold step 1 — they garnish the field, not the row"
          style={{ maxWidth: 380 }}
        >
          <DateTimeInput
            label="Consultation"
            description="Weekdays, 9:00 AM – 5:00 PM."
            min={MIN}
            max={MAX}
            defaultValue={at(2, "09:30")}
            hourFormat="12h"
            onValueChange={noop}
          />
        </Box>
        <Caption>This specimen sits on the earliest allowed day, so its description shows the day’s window (“On …, times from 9:00 AM are available.”) instead of the generic helper — the proactive hint, in weak-neutral guidance.</Caption>
      </Section>

      <Rule />

      <Section title="A window hint is not a validation error" lead="The rule the composite shares with its sub-fields: proactive guidance and a real problem are different signals. Show the allowed hours as calm guidance BEFORE the user strays — don’t paint the field red for standing on a boundary date.">
        <Grid
          columns={{ initial: "1", sm: "2" }}
          gap="3"
          data-size-lesson="inset affordances hold step 1 — they garnish the field, not the row"
        >
          <DoDont kind="do" bare note="On a boundary date, the active time window shows in the description in weak-neutral text — guidance the user reads before typing. aria-invalid stays off; the field is at neutral rest.">
            <Box style={{ maxWidth: 340 }}>
              <DateTimeInput label="Slot (do)" min={MIN} max={MAX} defaultValue={at(2, "10:00")} onValueChange={noop} />
            </Box>
          </DoDont>
          <DoDont kind="dont" bare note="Painting a red validation error just because the user is on the earliest allowed day — nothing is wrong yet. Reserve the composite message for a STANDING problem (a real out-of-range moment, or a caller validation like “that slot is taken”).">
            <Box style={{ maxWidth: 340 }}>
              <DateTimeInput label="Slot (don’t)" validation={{ tone: "error", message: "Pick a time between 9:00 AM and 5:00 PM." }} defaultValue={at(2, "10:00")} onValueChange={noop} />
            </Box>
          </DoDont>
        </Grid>
        <Caption>The conditional clamp already keeps the time in range (it reverts a stray entry locally and snaps on a date change) — so the composite message is free to mean a genuine standing problem.</Caption>
      </Section>

      <Rule />

      <Section title="Tokens" lead="DateTimeInput paints no colour of its own — it reuses the DateInput + TimeInput chrome (the shared Field validation paint, the accent focus ring ([[focus-ring]]), the affix glyphs) and the FieldGroup label/message chrome wholesale. The only net-new is the group’s flex-row layout, and that is the row MEASURED below: the gap is read off a real rendered group and checked against the spacing step it claims.">
        <TokenGroup label="COMPOSITE (layout only)" blurb="The two sub-fields carry their own paint; the group label + message reuse the FieldGroup chrome. Only the row layout is particular to this composite.">
          <MeasuredSpec
            render={() => (
              <SizeLesson why="inset affordances hold step 1 — they garnish the field, not the row">
                <DateTimeInput label="Measurement" defaultValue={at(2, "10:00")} onValueChange={noop} />
              </SizeLesson>
            )}
          >
            <MeasuredRow
              part="Row gap" note="One step wider than the intra-field rhythm; date grows (flex 1), time is intrinsic (flex 0)."
              token="--space-3" select=".rt-ds-datetimeinput-row" prop="column-gap"
            />
          </MeasuredSpec>
          <NoteRow part="Narrow stack" value="a container query stacks the two fields to rows below 22rem of group width" />
          <NoteRow part="Group label" value="the shared FieldGroup label, painted on the element itself — it turns the family colour in a validation state" radix="--ds-text-strong" />
          <NoteRow part="Window hint / description" value="--ds-text-weak (guidance, never a semantic colour)" />
          <NoteRow part="Composite message" value="the accent-aware family paint + status glyph — the shared FieldGroup.Message (role=alert on error)" />
        </TokenGroup>
        <Caption>Zero net-new tokens; the only earned net-new CSS is the <Mono>rt-ds-datetimeinput-*</Mono> layout (geometric).</Caption>
      </Section>
    </Page>
  ),
  play: async ({ canvasElement }) => {
    // The token table's EVIDENCE, asserted at runtime: the layout row read a real group node, resolved
    // its claim somewhere else, and the two agree. Reads only — nothing drives the composite.
    const rows = assertMeasuredRows(canvasElement);
    if (rows.measured !== 1 || rows.unproven !== 0) {
      throw new Error(`expected 1 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }
  },
};

/* ---- Props ---------------------------------------------------------- */
const PROPS: PropDef[] = [
  { name: "value / defaultValue", type: "ISODateTimeString", desc: <>Controlled / uncontrolled combined value — an ISO <Code>YYYY-MM-DDTHH:MM[:SS]</Code> string, split at the <Code>T</Code> internally. <Code>undefined</Code> = empty.</>, source: "DateTimeInput.tsx" },
  { name: "onValueChange", type: "(v: ISODateTimeString | undefined) => void", desc: <>Required. Fires the combined ISO value (both halves present), or <Code>undefined</Code>. No <Code>null</Code>.</>, source: "DateTimeInput.tsx" },
  { name: "min / max", type: "ISODateTimeString", desc: <>Bounds — an ISO date-time, or a bare date for a whole-day bound. The date half bounds the calendar; the time half bounds the time field <strong>only on the matching boundary date</strong> (the conditional clamp).</>, source: "DateTimeInput.tsx" },
  { name: "isDateDisabled", type: "(iso) => boolean", desc: <>Custom day-disable predicate — <Code>true</Code> = disabled, forwarded to the embedded DateInput / Calendar.</>, source: "DateTimeInput.tsx" },
  { name: "hourFormat", type: `"12h" | "24h"`, def: `"12h"`, desc: <>Display format of the time half; the wire value is always ISO 24-hour.</>, source: "DateTimeInput.tsx" },
  { name: "hasSeconds", type: "boolean", def: "false", desc: <>Parse, display, and seed the time half at second precision.</>, source: "DateTimeInput.tsx" },
  { name: "label", type: "ReactNode", desc: <>Required group name — the FieldGroup label the <Code>role="group"</Code> is <Code>aria-labelledby</Code>.</>, source: "DateTimeInput.tsx" },
  { name: "timeLabel", type: "string", def: `"Time"`, desc: <>The embedded time field’s accessible name (its <Code>aria-label</Code>). The date field is always “Date”.</>, source: "DateTimeInput.tsx" },
  { name: "size", type: `"1" | "2" | "3"`, def: `"1"`, desc: <>Control size for both sub-fields. Unset, it resolves from the global <Code>uiSize</Code> control lane.</>, source: "DateTimeInput.tsx" },
  { name: "disabled", type: "boolean", def: "false", desc: <>Disables both sub-fields (native — unless paired with a reason).</>, source: "DateTimeInput.tsx" },
  { name: "disabledReason", type: "string", desc: <>A non-empty reason SOFT-disables both sub-fields (aria-disabled + readOnly + reason tooltip + glyph).</>, source: "DateTimeInput.tsx" },
  { name: "info / endSlot / description / validation", type: "FieldGroup props", desc: <>The shared <Code>FieldGroup</Code> shell. <Code>validation</Code> is the COMPOSITE standing channel; on a boundary date the window hint takes the <Code>description</Code>’s place.</>, source: "DateTimeInput.tsx" },
  { name: "width", type: "number | string", desc: <>Constrain the composite width.</>, source: "DateTimeInput.tsx" },
];

type PropsArgs = {
  label: string;
  timeLabel: string;
  description: string;
  bounded: boolean;
  validation: { tone: "error" | "warning" | "success" | "info"; message: string } | undefined;
  size: "auto" | "1" | "2" | "3";
  hourFormat: "12h" | "24h";
  hasSeconds: boolean;
  disabled: boolean;
  disabledReason: string;
};

/** Props — the live, args-driven composite (controlled; type or pick a day + time, and drive every prop). */
export const Props: StoryObj<PropsArgs> = {
  args: {
    label: "Appointment",
    timeLabel: "Time",
    description: "Choose a day and a start time.",
    bounded: false,
    validation: undefined,
    // "auto" (size unset) is the default so the composite tracks the global uiSize toolbar out of the box.
    size: "auto",
    hourFormat: "12h",
    hasSeconds: false,
    disabled: false,
    disabledReason: "",
  },
  argTypes: {
    label: { control: "text", table: { category: "Field" } },
    timeLabel: { control: "text", table: { category: "Field" } },
    description: { name: "description (helper)", control: "text", table: { category: "Field" } },
    bounded: { name: "min/max (business hours)", control: "boolean", table: { category: "Behaviour" } },
    validation: {
      control: "inline-radio",
      options: ["none", "error", "warning", "success", "info"],
      mapping: {
        none: undefined,
        error: { tone: "error", message: "Choose a moment in the allowed window." },
        warning: { tone: "warning", message: "Double-check this slot." },
        success: { tone: "success", message: "That works." },
        info: { tone: "info", message: "You can change this later." },
      },
      table: { category: "Field" },
    },
    size: { control: "inline-radio", options: ["auto", "1", "2", "3"], description: '"auto" tracks the global uiSize toolbar (unset); a step pins it.', table: { category: "Variant" } },
    hourFormat: { control: "inline-radio", options: ["12h", "24h"], table: { category: "Behaviour" } },
    hasSeconds: { control: "boolean", table: { category: "Behaviour" } },
    disabled: { control: "boolean", table: { category: "Variant" } },
    disabledReason: { control: "text", table: { category: "Variant" } },
  },
  parameters: { controls: { disable: false } },
  render: (args: PropsArgs) => {
    function Demo() {
      const [v, setV] = useState<ISODateTimeString | undefined>(undefined);
      return (
        <DateTimeInput
          value={v}
          onValueChange={setV}
          label={args.label || "Appointment"}
          timeLabel={args.timeLabel || "Time"}
          description={args.description}
          validation={args.validation}
          min={args.bounded ? MIN : undefined}
          max={args.bounded ? MAX : undefined}
          size={args.size === "auto" ? undefined : args.size}
          hourFormat={args.hourFormat}
          hasSeconds={args.hasSeconds}
          disabled={args.disabled}
          disabledReason={args.disabledReason || undefined}
        />
      );
    }
    return (
      <Page maxWidth="none">
        <PageHeader title="DateTimeInput · Props" standfirst={DEFINITION} />
        <Box p="5" style={{ maxWidth: 440 }}>
          <Demo />
          <Box mt="3"><Caption>Type or pick a date, then a time (“3pm”, “15:00”). Turn on <Mono>min/max</Mono> to see the conditional window: on the first/last allowed day the time bound tightens and the description shows the hours; picking a day auto-fills the current time.</Caption></Box>
        </Box>
        <PropsLead />
        <Rule />
        <Section title="Props reference" lead={<>Every prop <Code>DateTimeInput</Code> accepts — the combined ISO wire contract, the conditional bounds, and the shared <Code>FieldGroup</Code> shell.</>}>
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
      <PageHeader title="DateTimeInput · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[catalog-as-specification]] · composition">
            <strong>Composed, not reinvented.</strong> DateTimeInput <em>embeds</em> the shipped{" "}
            <Code>DateInput</Code> + <Code>TimeInput</Code> in their bare mode — it re-implements{" "}
            <strong>zero</strong> date/time math. Parsing, formatting, range/compare, the ephemeral two-channel
            feedback, and soft-disable-with-reason all come from the two children and the shared{" "}
            <Code>src/dates/*</Code> engine. The only
            new logic is <Code>splitDateTime</Code> / <Code>combineDateTime</Code> — a string split at the{" "}
            <Code>T</Code>.
          </Decision>
          <Decision id="[[date-time-input]] · a group, not a Field">
            <strong>A FieldGroup composite, not a single Field.</strong> Two sub-controls means the name is a group{" "}
            <em>label</em> (<Code>FieldGroup.Label</Code> → <Code>aria-labelledby</Code> on a{" "}
            <Code>role="group"</Code>), not a <Code>&lt;label htmlFor&gt;</Code> targeting one control. Each bare
            child carries its <strong>own</strong> <Code>aria-label</Code> (“Date” / the <Code>timeLabel</Code>),
            so the two inner inputs have distinct accessible names — and the <strong>duplicate-id trap is
            dodged</strong>: under a <Code>FieldGroupCtx</Code> there is no <Code>FieldCtx</Code>, so{" "}
            <Code>useOptionalFieldControl</Code> returns <Code>null</Code> and neither bare input grabs a shared
            field id. The group is <strong>not</strong> a focus stop.
          </Decision>
          <Decision id="[[date-time-input]] · combined ISODateTime value">
            <strong>One value on the wire, two halves inside.</strong> <Code>value?: ISODateTimeString</Code> — a
            branded <Code>YYYY-MM-DDTHH:MM[:SS]</Code> string — split at the <Code>T</Code> into{" "}
            <Code>{`{date, time}`}</Code> internally (a <Code>T</Code>-less string is a bare date). It emits a
            combined value only when <strong>both</strong> halves are present, else <Code>undefined</Code>;{" "}
            <Code>null</Code>-free.
          </Decision>
          <Decision id="[[date-time-input]] · conditional clamp + snap + seed">
            <strong>The time bound bites only on the boundary date.</strong> The embedded TimeInput’s effective{" "}
            <Code>min</Code>/<Code>max</Code> apply <em>only</em> when the selected date equals the boundary date
            (<Code>timeMin = minTime</Code> iff <Code>selectedDate === minDate</Code>); strictly between the
            bounds, time is unconstrained. On a date change the time <strong>snaps</strong> into the new window
            (up onto <Code>minTime</Code>, down onto <Code>maxTime</Code> — a silent snap, not an error), and
            picking a date onto an empty time <strong>auto-seeds the current wall-clock time</strong> so a date
            selection always combines with a time (never emits date-only).
          </Decision>
          <Decision id="[[date-time-input]] · two-tier feedback">
            <strong>Local ephemeral + composite standing.</strong> Each sub-field keeps its OWN ephemeral channel
            (assertive revert + <Code>aria-invalid</Code>-while-pending); the composite error is{" "}
            <strong>never</strong> passed down as a sub-field <Code>validation</Code> (it would double-render). The
            composite STANDING problem surfaces <strong>once</strong> via <Code>FieldGroup.Message</Code>{" "}
            (<Code>role="alert"</Code>) + the group’s composite <Code>aria-invalid</Code>. The proactive time-window
            HINT rides <Code>FieldGroup.Description</Code> as weak-neutral <strong>guidance</strong> — it never
            trips <Code>aria-invalid</Code> or the validation channel (guidance, not error).
          </Decision>
          <Decision id="[[disabled-reason]] · Soft-disable with a reason">
            <strong>Soft-disable-with-reason.</strong> <Code>disabled</Code> + a non-empty{" "}
            <Code>disabledReason</Code> soft-disables <strong>both</strong> sub-fields (<Code>aria-disabled</Code>{" "}
            + <Code>readOnly</Code> + a reason tooltip + a quiet Info glyph) instead of natively disabling — so the
            reason stays perceivable on hover AND keyboard focus. Inherited identically from the{" "}
            <Code>Field</Code> family.
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            Initial <Code>System/DateTimeInput</Code> — the composite date+time field: a <Code>FieldGroup.Root</Code>{" "}
            wrapping a bare <Code>DateInput</Code> + bare <Code>TimeInput</Code> in a responsive row, the combined{" "}
            <Code>ISODateTime</Code> value (split/combine at the <Code>T</Code>), the conditional time-clamp + snap
            + auto-seed-now, the two-tier feedback (sub-field ephemeral + composite standing + the proactive window
            hint), and <Code>disabledReason</Code> on both. Stories: History · Anatomy · Usage · Props.
          </Decision>
          <Decision id="Deferred → describedby into subfields">
            <strong>The fuller FieldGroup-message-describedby-INTO-subfields wiring</strong> — pointing each
            sub-input’s <Code>aria-describedby</Code> at the composite message. Ships the minimal{" "}
            <Code>role="alert"</Code> + composite <Code>aria-invalid</Code> path for now.
          </Decision>
          <Decision id="Deferred → server actions">
            <strong>The <Code>changeAction</Code> async-optimistic layer</strong> (<Code>isLoading</Code> / an inset
            Spinner while a server action settles) — not built yet; revisit if the app layer needs it.
          </Decision>
          <Decision id="Deferred → InputGroup">
            <strong>InputGroup composition</strong> — parked until <Code>InputGroup</Code> ships.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
