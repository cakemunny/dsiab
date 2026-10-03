import type { Meta, StoryObj } from "@storybook/react-vite";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Box, Code, Flex, Text, Theme } from "@radix-ui/themes";
import { Sparkle } from "@phosphor-icons/react";
import { PowerSearch } from "./PowerSearch";
import { Token } from "./Token";
import { StatusDot } from "./StatusDot";
import { createPowerSearchConfig } from "../../powersearch/usePowerSearchConfig";
import { createInternalConfig } from "../../powersearch/useInternalConfig";
import { formatFilterValue } from "../../powersearch/formatFilterValue";
import type {
  PowerSearchConfig,
  PowerSearchFilter,
  PowerSearchTokenProps,
} from "../../powersearch/types";
import type { TypeaheadSource } from "./Typeahead";
import {
  AnatomyLegend, Caption, Decision, dotStyle, HexThemeKey, hLine, type KeyBinding, KeyRow,
  MeasuredRow, MeasuredSpec, Muted, NoteRow, Page, PageHeader, PropsLead, type PropDef, PropTable, Rule, Scenario, Section,
  SizeLesson, tick, TokenGroup,
} from "./_storyKit";
import { ComparisonSection, SEARCH_SURFACES_COMPARISON } from "./_comparisons";

/* These are the DOCS stories (History · Anatomy · Usage · Keyboard · Props) — static and
   calm on view. All behavioral plays (the editor matrix, add/edit/remove, the 2-level Escape, the
   state-reset cases) live in `_powersearch.stories.tsx` (_internal/PowerSearch behavior), so viewing a
   docs page never auto-drives the edit popover. The specimens here render POPULATED (chips visible) and
   stay manually interactive. */

/* ---- a shared demo config (string / enum / date / number / boolean fields) ---- */
const SEARCH = createPowerSearchConfig([
  { key: "title", type: "string", label: "Title" },
  {
    key: "status",
    type: "enum",
    label: "Status",
    enumValues: [
      { value: "open", label: "Open" },
      { value: "in_progress", label: "In progress" },
      { value: "closed", label: "Closed" },
    ],
  },
  {
    key: "priority",
    type: "enum",
    label: "Priority",
    enumValues: [
      { value: "low", label: "Low" },
      { value: "medium", label: "Medium" },
      { value: "high", label: "High" },
    ],
  },
  { key: "created", type: "date", label: "Created" },
  { key: "points", type: "number", label: "Story points" },
  { key: "archived", type: "boolean", label: "Archived" },
] as const);

const CONFIG: PowerSearchConfig = SEARCH.config;

/** unix seconds at LOCAL midnight of a calendar date (matches the editor's date_absolute marshalling,
 *  which round-trips through formatFilterValue's local-timezone rendering). */
const unix = (y: number, m: number, d: number) => Math.floor(new Date(y, m - 1, d).getTime() / 1000);

/* A few realistic starting filters. */
const F_TITLE: PowerSearchFilter = { field: "title", operator: "contains", value: { type: "string", value: "payment" } };
const F_STATUS: PowerSearchFilter = { field: "status", operator: "is", value: { type: "enum", value: "open" } };
const F_PRIORITY: PowerSearchFilter = { field: "priority", operator: "is", value: { type: "enum", value: "high" } };
const F_RANGE: PowerSearchFilter = {
  field: "created",
  operator: "between",
  value: { type: "date_range", value: { start: { type: "ABSOLUTE", unixSeconds: unix(2026, 1, 25) }, end: { type: "ABSOLUTE", unixSeconds: unix(2026, 2, 10) } } },
};

/* ---- an entity_list config for the avatar-chip scenario (a hand-authored operator, since
   createPowerSearchConfig only builds the scalar field types). ---- */
const ADA_PHOTO =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="#7c6cf0"/><text x="20" y="27" font-family="sans-serif" font-size="18" fill="#fff" text-anchor="middle">AL</text></svg>',
  );
const TEAM_SOURCE: TypeaheadSource<{ photo?: string }> = {
  search: () => [
    { id: "ada", label: "Ada Lovelace", auxiliaryData: { photo: ADA_PHOTO } },
    { id: "alan", label: "Alan Turing", auxiliaryData: {} },
  ],
  bootstrap: () => [
    { id: "ada", label: "Ada Lovelace", auxiliaryData: { photo: ADA_PHOTO } },
    { id: "alan", label: "Alan Turing", auxiliaryData: {} },
  ],
};
const TEAM_CONFIG: PowerSearchConfig = {
  name: "team",
  fields: [
    { key: "title", label: "Title", defaultOperator: "contains", operators: [{ key: "contains", label: "contains", value: { type: "string" } }] },
    { key: "assignee", label: "Assignee", defaultOperator: "is", operators: [{ key: "is", label: "is", value: { type: "entity_list", searchSource: TEAM_SOURCE as TypeaheadSource } }] },
  ],
};
const F_ASSIGNEE: PowerSearchFilter = {
  field: "assignee",
  operator: "is",
  value: { type: "entity_list", value: [{ id: "ada", label: "Ada Lovelace", photo: ADA_PHOTO }] },
};

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = <>The structured filter bar. A field pick opens a non-dialog editor; each filter lands as a clickable, removable Token chip.</>;

const meta: Meta<typeof PowerSearch> = {
  title: "Components/Typed Entry/PowerSearch",
  component: PowerSearch,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**PowerSearch** — a structured filter bar where each committed filter is a **Token** chip " +
          "(field · operator · **bold value**). Users pick a field from a type-to-search dropdown, then " +
          "build the value in a **non-dialog edit popover**; chips can be clicked to re-edit or removed. " +
          "A flat-AND-only filter " +
          "model, the 14-type operator union routed to OUR inputs, ONE `formatFilterValue` renderer, and " +
          "the two-level Escape resting on Radix's DismissableLayer stack (no hand-rolled escapeStack). " +
          "The chip row REUSES the `.rt-ds-tokenizer` surface; the field combobox is our embedded " +
          "**Typeahead**; the value editors are our **TextField / NumberInput / DateInput / TimeInput / " +
          "DateRangeInput / Select / MultiSelect / Tokenizer**.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof PowerSearch>;

/* A no-op onChange used by the STATIC docs specimens (they demonstrate rest state; interaction lives in
   the Props + the _internal plays). */
const noop = () => {};

// =============================================================================
// Anatomy
// =============================================================================

const ANATOMY_PARTS: [number, string, string][] = [
  [1, "Surface", "the .rt-ds-tokenizer chip-row surface — fill + hairline + focus-ring hoist, reused verbatim"],
  [2, "Token chip", "field · operator · bold value; a clickable body (edit) + a sibling remove ✕"],
  [3, "Field combobox", "the embedded Typeahead — type to search fields, operators, and quick-add values"],
  [4, "Result count", "the match count ('128 results'); announced politely on change via a live region"],
  [5, "Edit popover", "an opaque, non-dialog overlay: field · operator · value + Cancel / Apply"],
];

/* ---- Anatomy diagram ------------------------------------------------------
   The chip row's parts sit ACROSS one row, so the callouts live in bands above and below the specimen
   and drop a leader into the part they name. Two bands rather than one, because the surface and
   everything it holds share a single vertical midpoint — one gutter of element centres would stack
   three dots on one pixel.

   Everything is MEASURED off the live specimen: chip widths follow their own text AND the control lane
   (the size toolbar), and at the large step the row WRAPS — the result count drops to a second line —
   so each leader ends at its own part's edge rather than at a shared one.

   Callout 5 (the edit popover) has no target: it is portaled to <body>, exists only while a chip is
   being edited, and the component exposes no way to render it at rest. The play below asserts the other
   four by number, and asserts that this carve-out is still true. */

const SIDE_PAD = 24;
const TOP_BAND = 68;
const BOT_BAND = 58;
/** Where the leaders in each band turn their corner — one shared line, so the elbows read as a set. */
const TOP_ELBOW = 34;
const BOT_ELBOW = 26;
/** Closest two dots in one band may sit, centre to centre. A dot is 20px wide. */
const MIN_GAP = 30;

type PinSpec = {
  n: number;
  band: "top" | "bottom";
  /** The element this callout names, resolved LIVE off the rendered specimen. */
  find: (root: HTMLElement) => HTMLElement | null;
  /** Where across that element's box the leader lands, in px from its left edge. */
  at: (box: DOMRect) => number;
};

const PINS: PinSpec[] = [
  // The surface, named at its own left corner — it is the rectangle everything else sits inside.
  { n: 1, band: "top", find: (r) => r.querySelector(".rt-ds-powersearch"), at: () => 0 },
  { n: 2, band: "top", find: (r) => r.querySelector(".rt-ds-powersearch > .rt-ds-token"), at: (b) => b.width / 2 },
  { n: 3, band: "bottom", find: (r) => r.querySelector(".rt-ds-typeahead-anchor"), at: (b) => b.width / 2 },
  { n: 4, band: "bottom", find: (r) => r.querySelector(".rt-ds-powersearch-end"), at: (b) => b.width / 2 },
];

/** The legend numbers that carry a callout — every part except the portaled edit popover. */
const PINNED_PARTS = PINS.map(({ n }) => n).sort((a, b) => a - b);

type Placed = { dotX: number; partX: number; top: number; bottom: number };

function AnatomyDiagram() {
  const frame = useRef<HTMLDivElement>(null);
  const specimen = useRef<HTMLDivElement>(null);
  const [pins, setPins] = useState<Record<number, Placed>>({});
  /** The specimen's bottom edge — where the lower band starts. */
  const [floor, setFloor] = useState(0);

  useLayoutEffect(() => {
    const f = frame.current;
    const s = specimen.current;
    if (!f || !s) return;

    const measure = () => {
      const frameBox = f.getBoundingClientRect();
      const next: Record<number, Placed> = {};
      for (const band of ["top", "bottom"] as const) {
        const measured: (Placed & { n: number })[] = [];
        for (const pin of PINS.filter((p) => p.band === band)) {
          const el = pin.find(s);
          if (!el) continue;
          const box = el.getBoundingClientRect();
          const partX = Math.round(box.left - frameBox.left + pin.at(box));
          measured.push({
            n: pin.n, partX, dotX: partX,
            top: Math.round(box.top - frameBox.top),
            bottom: Math.round(box.bottom - frameBox.top),
          });
        }
        // Sorted by where the parts ACTUALLY are, not by declaration order — a longer chip pushes the
        // combobox along, and the wrap at the large step moves the result count to the row's left end.
        // One forward pass keeps any two dots a legible distance apart; the leader turns a corner, so
        // the dot moves and the line still lands.
        measured.sort((a, b) => a.partX - b.partX);
        let floorX = -Infinity;
        for (const m of measured) {
          const dotX = Math.max(m.partX, floorX + MIN_GAP);
          floorX = dotX;
          next[m.n] = { ...m, dotX };
        }
      }
      const nextFloor = Math.round(s.getBoundingClientRect().bottom - frameBox.top);
      // Only write when something moved — the frame's own size feeds this observer otherwise.
      setPins((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
      setFloor((prev) => (prev === nextFloor ? prev : nextFloor));
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
          position: "relative", width: "fit-content",
          paddingTop: TOP_BAND, paddingBottom: BOT_BAND, paddingLeft: SIDE_PAD, paddingRight: SIDE_PAD,
        }}
      >
        <Box
          ref={specimen}
          data-testid="anatomy"
          data-size-lesson="the chip's remove ✕ holds step 1 — it garnishes the chip, it doesn't join the ambient row"
          style={{ width: 560 }}
        >
          <PowerSearch config={CONFIG} filters={[F_TITLE, F_STATUS]} onChange={noop} aria-label="Search issues" resultCount={128} />
        </Box>

        {PINS.map(({ n, band }) => {
          const pin = pins[n];
          if (!pin) return null;
          const top = band === "top";
          // The two bands are mirror images: the dot sits at the outer end, the leader turns at the
          // band's shared elbow line, and the last segment runs into the part's own near edge.
          const dotTop = top ? 2 : floor + BOT_BAND - 22;
          const elbow = top ? TOP_ELBOW : floor + BOT_ELBOW;
          const stem = top
            ? { top: dotTop + 20, height: elbow - dotTop - 20 }
            : { top: elbow, height: dotTop - elbow };
          const reach = top
            ? { top: elbow, height: pin.top - 6 - elbow }
            : { top: pin.bottom + 6, height: elbow - pin.bottom - 6 };
          return (
            <Box key={n}>
              <Box data-pin={n} style={{ ...dotStyle, left: pin.dotX - 10, top: dotTop }}>{n}</Box>
              {/* out of the dot… */}
              <Box style={tick({ left: pin.dotX, ...stem })} />
              {/* …across to the part's own column (zero-width when they already agree)… */}
              {pin.dotX !== pin.partX && (
                <Box style={hLine({ left: Math.min(pin.dotX, pin.partX), top: elbow, width: Math.abs(pin.dotX - pin.partX) })} />
              )}
              {/* …and into the part. */}
              <Box style={tick({ left: pin.partX, ...reach })} />
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

export const Anatomy: Story = {
  render: () => (
    <Page>
      <PageHeader
        title="PowerSearch · Anatomy"
        standfirst={<>{DEFINITION} The parts are named on the control that renders them; the tokens they paint from are the closing section of Usage.</>}
      />
      <Section title="Parts">
        <AnatomyDiagram />
        <AnatomyLegend parts={ANATOMY_PARTS} />
        <Caption>
          Callout 5 has no marker on the specimen: the edit popover is portaled to <Code>&lt;body&gt;</Code> and
          only exists while a chip is being edited — click a chip to see it. Everything else is named where it
          renders.
        </Caption>
      </Section>
    </Page>
  ),
  play: async ({ canvasElement }) => {
    // Every part that CAN be named on the specimen carries a callout — a numbered legend with nothing to
    // point at is the defect this diagram exists to avoid. Compared by NUMBER, not by count, so a
    // callout that lands under the wrong number is caught too.
    const pinned = [...canvasElement.querySelectorAll("[data-pin]")]
      .map((el) => Number(el.getAttribute("data-pin")))
      .sort((a, b) => a - b);
    if (pinned.join() !== PINNED_PARTS.join()) {
      throw new Error(`callouts [${pinned}] on the specimen do not match the pinned parts [${PINNED_PARTS}]`);
    }
    // …and the popover's carve-out has to stay TRUE: if the editor ever renders at rest, part 5 is owed
    // a callout like every other part, and this fails rather than quietly staying at four.
    if (document.querySelector(".rt-ds-powersearch-popover")) {
      throw new Error("the edit popover renders at rest now — callout 5 is owed a pin on it");
    }
  },
};

// =============================================================================
// Usage
// =============================================================================

export const Usage: Story = {
  render: (_args, { globals }) => (
    <Page>
      <PageHeader
        title="PowerSearch · Usage"
        standfirst={<>{DEFINITION} Reach for it when users combine several filter dimensions; a plain text field is better for single-field lookup.</>}
      />

      <ComparisonSection comparison={SEARCH_SURFACES_COMPARISON} highlight="PowerSearch" />

      <Rule />

      <Section title="A basic filter set">
        <Scenario label="Multi-dimensional" caption="Each token is field · operator · bold value. Click a chip to edit; ✕ to remove.">
          <SizeLesson why="the chip's remove ✕ holds step 1 — it garnishes the chip, it doesn't join the ambient row">
            <PowerSearch config={CONFIG} filters={[F_TITLE, F_STATUS, F_PRIORITY]} onChange={noop} aria-label="Search issues" width={520} />
          </SizeLesson>
        </Scenario>
      </Section>

      <Section title="Date ranges read as dates" lead="The one fixed formatter renders a range, not a literal 'date range' stub.">
        <Scenario label="date_range" caption="Created between two absolute dates → 'Jan 25, 2026 – Feb 10, 2026'.">
          {/* Wide enough for the range chip AND the field input on one row — a date range is the longest
              value the formatter produces, so this specimen sets the width the chip actually needs. */}
          <SizeLesson why="the chip's remove ✕ holds step 1 — it garnishes the chip, it doesn't join the ambient row">
            <PowerSearch config={CONFIG} filters={[F_RANGE]} onChange={noop} aria-label="Search by date" width={460} />
          </SizeLesson>
        </Scenario>
      </Section>

      <Section title="Result count" lead="Pass resultCount to feed users how their filters affect the data — formatted and announced.">
        <Scenario label="resultCount" caption="A number → 'N results' (announced politely on change); a string is shown as-is.">
          <SizeLesson why="the chip's remove ✕ holds step 1 — it garnishes the chip, it doesn't join the ambient row">
            <PowerSearch config={CONFIG} filters={[F_STATUS]} onChange={noop} aria-label="Search issues" resultCount={1284} width={460} />
          </SizeLesson>
        </Scenario>
      </Section>

      <Section title="Entity filters carry a photo" lead="A single-entity chip shows the entity's Avatar as the leading icon.">
        <Scenario label="entity_list" caption="Assignee is Ada Lovelace — the Avatar leads the chip.">
          <SizeLesson why="the chip's remove ✕ holds step 1 — it garnishes the chip, it doesn't join the ambient row">
            <PowerSearch config={TEAM_CONFIG} filters={[F_ASSIGNEE]} onChange={noop} aria-label="Search by assignee" width={420} />
          </SizeLesson>
        </Scenario>
      </Section>

      <Section title="The components override seam" lead="Swap any type's Token (or Editor) via the per-type components map — the load-bearing customization point.">
        <Scenario label="components.enum.Token" caption="A custom Status token with a StatusDot, still built on our Token.">
          <SizeLesson why="the chip's remove ✕ holds step 1 — it garnishes the chip, it doesn't join the ambient row">
            <PowerSearch
              config={CONFIG}
              filters={[F_STATUS, F_PRIORITY]}
              onChange={noop}
              aria-label="Search issues"
              width={480}
              components={{ enum: { Token: CustomStatusToken } }}
            />
          </SizeLesson>
        </Scenario>
        <Caption>
          The map keys are operator value types (<Code>string</Code>, <Code>enum</Code>,{" "}
          <Code>date_absolute</Code>, …). A <Code>Token</Code> override replaces the whole chip; an{" "}
          <Code>Editor</Code> override replaces the whole popover body.
        </Caption>
      </Section>

      <Section title="Soft-disable with a reason" lead="disabledMessage → our disabledReason: the reason stays perceivable on hover AND keyboard focus.">
        <Scenario label="disabledReason" caption="aria-disabled + readOnly + a reason tooltip/glyph — never a bare disabled control.">
          <PowerSearch config={CONFIG} filters={[F_STATUS]} onChange={noop} aria-label="Search issues" disabled disabledReason="Pick a project first." width={460} />
        </Scenario>
      </Section>

      <Rule />

      {/* The closing reference section. The provider is what makes the table live: every measured row
          re-reads its value when this key changes, so an accent/appearance flip re-resolves the spec. */}
      <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
        <Section title="Tokens" lead="The roles PowerSearch paints from — each read off the part that paints it, then checked against the role it claims.">
          <TokenGroup label="Surface & overlay" blurb="The chip row reuses the Tokenizer surface; the edit popover uses the shared overlay treatment.">
            {/* The chip-row rows read a real PowerSearch. The edit popover is portaled to <body> and the
                component exposes no way to redirect that portal, so the host carries the popover's OWN
                panel element (the same Theme-plus-class node the component renders) — the stylesheet
                paints it identically, and the story never names the roles, so the rows can disagree. */}
            <MeasuredSpec
              render={() => (
                <SizeLesson why="the chip's remove ✕ holds step 1 — it garnishes the chip, it doesn't join the ambient row">
                  <PowerSearch config={CONFIG} filters={[F_TITLE]} onChange={noop} aria-label="Surface measurement" />
                  <Theme className="rt-ds-powersearch-popover rt-r-size-1" hasBackground={false} style={{ position: "static", display: "block" }} />
                </SizeLesson>
              )}
            >
              <MeasuredRow
                part="Popover surface"
                note="The opaque panel the filter editor sits on."
                token="--ds-bg-overlay"
                select=".rt-ds-powersearch-popover"
                prop="background-color"
              />
              <MeasuredRow
                part="Popover elevation"
                note="The shared overlay shadow — a hairline ring plus a drop shadow."
                token="--ds-shadow-overlay"
                select=".rt-ds-powersearch-popover"
                prop="box-shadow"
              />
              <MeasuredRow
                part="Focus ring"
                note="Hoisted to the whole chip row while the field input holds focus. The accent base, with the stack alpha on top, 2px ([[focus-ring]])."
                token="--ds-stroke-focus"
                select=".rt-ds-powersearch"
                prop="outline-color"
                state="focus-visible"
              />
              <MeasuredRow
                part="Lead glyph"
                note="The magnifier that opens the row."
                token="--ds-icon-neutral"
                select=".rt-ds-powersearch-lead svg"
                prop="color"
              />
            </MeasuredSpec>
            <NoteRow part="Chip surface" value="reuses .rt-ds-tokenizer (--color-surface fill + --gray-a7 hairline)" />
            <NoteRow part="Popover radius" value="--ds-radius-3" />
          </TokenGroup>
        </Section>
      </HexThemeKey.Provider>
    </Page>
  ),
};

/** A custom `components.enum.Token` — reuses our Token, adds a StatusDot and the live-formatted value. */
function CustomStatusToken({ config, filter, field, operator, maxLength, onClick, onRemove, isDisabled }: PowerSearchTokenProps) {
  const internal = useMemo(() => createInternalConfig(config), [config]);
  const valueStr = formatFilterValue(internal, operator.value, filter.value, maxLength);
  return (
    <Token
      data-tk-chip=""
      disabled={isDisabled}
      leadingIcon={<StatusDot variant="success" label={field.label} />}
      removeLabel={`Remove ${field.label}`}
      onClick={onClick}
      onRemove={onRemove}
    >
      {field.label}
      {valueStr ? (
        <>
          {" "}
          <span style={{ fontWeight: "var(--font-weight-bold)" }}>{valueStr}</span>
        </>
      ) : null}
    </Token>
  );
}

// =============================================================================
// Keyboard
// =============================================================================

const KEYS: KeyBinding[] = [
  { keys: ["Type"], action: <>Search fields, operators, and quick-add values (<Code>title contains bug</Code>) in the combobox.</>, src: "system" },
  { keys: ["↑", "↓"], action: <>Move the highlighted row in the field dropdown (focus never leaves the input — aria-activedescendant).</>, src: "system" },
  { keys: ["Enter"], action: <>Pick the highlighted field — commit immediately (boolean / quick-add) or open the editor to build a value.</>, src: "system" },
  { keys: ["Enter"], action: <>Inside the editor: <strong>save</strong> the filter (an explicit handler — Radix doesn't own Enter).</>, src: "popover" },
  { keys: ["Esc"], action: <>Close a nested dropdown inside the editor first; a second <Code>Esc</Code> cancels the editor (the DismissableLayer stack).</>, src: "radix" },
  { keys: ["Backspace"], action: <>On the EMPTY input: remove the last filter (single step, refocus the input).</>, src: "system" },
  { keys: ["Tab"], action: <>Move between chips and the input; each chip is one stop (the ✕ is out of the tab order).</>, src: "system" },
  { keys: ["Enter", "Space"], action: <>On a focused chip: open its editor (the clickable Token body).</>, src: "system" },
  { keys: ["Backspace", "Delete"], action: <>On a focused chip: remove it (Token's body key handler).</>, src: "system" },
];

export const Keyboard: Story = {
  render: () => (
    <Page>
      <PageHeader
        title="PowerSearch · Keyboard"
        standfirst={<>{DEFINITION} The combobox model (focus stays on the input) plus chip navigation and the two-level Escape.</>}
      />
      <Section title="Keyboard">
        <Flex direction="column" gap="0">
          {KEYS.map((k, i) => (
            <KeyRow key={i} keys={k.keys} action={k.action} src={k.src} />
          ))}
        </Flex>
      </Section>
    </Page>
  ),
};

// =============================================================================
// Properties
// =============================================================================

const PROPS: PropDef[] = [
  { name: "config", type: "PowerSearchConfig", desc: <>Fields + operators + value types. Build it with <Code>createPowerSearchConfig(defs)</Code>.</>, source: "PowerSearch" },
  { name: "filters", type: "ReadonlyArray<PowerSearchFilter>", desc: "The active filters (controlled).", source: "PowerSearch" },
  { name: "onChange", type: "(filters, changeType, index) => void", desc: <>Fires on add / edit / remove with the next filters, the change kind, and the affected index.</>, source: "PowerSearch" },
  { name: "label", type: "ReactNode", desc: "Field label; names the chip-row group. Omit and pass aria-label for a bare field.", source: "Field" },
  { name: "aria-label", type: "string", desc: <>Accessible name for a bare field. Defaults the group name to <Code>"Search"</Code>.</>, source: "Field" },
  { name: "placeholder", type: "string", def: '"Search…"', desc: "Greyed hint while there are no filters.", source: "PowerSearch" },
  { name: "readOnly", type: "boolean", def: "false", desc: "Chips stay visible but inert — no add / edit / remove.", source: "PowerSearch" },
  { name: "disabled", type: "boolean", def: "false", desc: "Disables the whole control.", source: "PowerSearch" },
  { name: "disabledReason", type: "string", desc: <>Soft-disable: aria-disabled + readOnly + a reason tooltip/glyph. Use instead of wrapping a disabled control in a Tooltip.</>, source: "PowerSearch" },
  { name: "startIcon", type: "ReactNode", desc: <>Leading glyph at the START of the row. <Code>undefined</Code> → a search glyph; <Code>null</Code> removes it.</>, source: "PowerSearch" },
  { name: "onFocus", type: "(e) => void", desc: <>Fires when focus enters the field from outside.</>, source: "PowerSearch" },
  { name: "onBlur", type: "(e) => void", desc: <>Fires when focus leaves the field entirely.</>, source: "PowerSearch" },
  { name: "validation", type: "{ tone, message }", desc: <>A standing validation state painted on the surface.</>, source: "Field" },
  { name: "info", type: "ReactNode", desc: "Inline affordance beside the label.", source: "Field" },
  { name: "endSlot", type: "ReactNode", desc: "Pinned note at the end of the label row.", source: "Field" },
  { name: "description", type: "ReactNode", desc: "Persistent helper line under the surface.", source: "Field" },
  { name: "maxTokenLength", type: "number", def: "40", desc: "Max characters for a token's formatted value (then it collapses to 'N items').", source: "PowerSearch" },
  { name: "popoverSaveButtonLabel", type: "string", def: '"Apply"', desc: "The save-button label in the edit popover.", source: "PowerSearch" },
  { name: "timezoneID", type: "string", desc: <>Timezone for date formatting (e.g. <Code>"America/New_York"</Code>).</>, source: "PowerSearch" },
  { name: "tokenOverflowBehavior", type: '"none" | "unfocusedInline"', def: '"none"', desc: <><Code>unfocusedInline</Code> collapses trailing chips into "+N" while blurred (OverflowList); <Code>none</Code> always wraps.</>, source: "PowerSearch" },
  { name: "endContent", type: "ReactNode", desc: "Content pinned at the end of the row (action buttons, etc.).", source: "PowerSearch" },
  { name: "resultCount", type: "number | string", desc: <>A number → <Code>"N results"</Code> (announced politely on change); a string is shown as-is.</>, source: "PowerSearch" },
  { name: "size", type: '"1" | "2" | "3"', def: "small", desc: "The control + token size; unset tracks the global uiSize control lane.", source: "PowerSearch" },
  { name: "components", type: "PowerSearchComponents", desc: <><strong>Load-bearing.</strong> A per-operator-value-type <Code>{"{ Token?, Editor? }"}</Code> map — swap the whole chip or the whole editor body for a type.</>, source: "PowerSearch" },
  { name: "handleRef", type: "Ref<PowerSearchHandle>", desc: <>Imperative handle: <Code>focusTypeahead()</Code> / <Code>blurTypeahead()</Code>.</>, source: "PowerSearch" },
  { name: "width", type: "number | string", desc: "Constrain the field width.", source: "PowerSearch" },
];

// =============================================================================
// Props
// =============================================================================

interface PropsArgs {
  size: "auto" | "1" | "2" | "3";
  placeholder: string;
  readOnly: boolean;
  disabled: boolean;
  disabledReason: string;
  tokenOverflowBehavior: "none" | "unfocusedInline";
  showResultCount: boolean;
  validation: "none" | "error" | "warning" | "success" | "info";
}

/* A small dataset so the live Props can compute a real result count from applyFilters. */
interface Row {
  title: string;
  status: "open" | "in_progress" | "closed";
  priority: "low" | "medium" | "high";
  created: number;
  points: number;
  archived: boolean;
}
const DATA: Row[] = [
  { title: "Payment retry loop", status: "open", priority: "high", created: unix(2026, 1, 28), points: 5, archived: false },
  { title: "Auth token refresh", status: "in_progress", priority: "high", created: unix(2026, 2, 3), points: 3, archived: false },
  { title: "Payment webhook flake", status: "open", priority: "medium", created: unix(2026, 2, 8), points: 2, archived: false },
  { title: "Dashboard empty state", status: "closed", priority: "low", created: unix(2025, 12, 20), points: 1, archived: true },
  { title: "Export CSV timeout", status: "open", priority: "low", created: unix(2026, 1, 12), points: 8, archived: false },
];

export const Props: StoryObj<PropsArgs> = {
  args: {
    // "auto" (size unset) is the default so the field tracks the global uiSize toolbar out of the box.
    size: "auto",
    placeholder: "Search issues…",
    readOnly: false,
    disabled: false,
    disabledReason: "",
    tokenOverflowBehavior: "none",
    showResultCount: true,
    validation: "none",
  },
  argTypes: {
    size: { control: "inline-radio", options: ["auto", "1", "2", "3"], description: '"auto" tracks the global uiSize toolbar (unset → the control lane); a step (1–3) pins the field.', table: { category: "Variant" } },
    placeholder: { control: "text", table: { category: "Field" } },
    readOnly: { control: "boolean", table: { category: "State" } },
    disabled: { control: "boolean", table: { category: "State" } },
    disabledReason: { control: "text", table: { category: "State" } },
    tokenOverflowBehavior: { control: "inline-radio", options: ["none", "unfocusedInline"], table: { category: "Layout" } },
    showResultCount: { control: "boolean", name: "resultCount (live)", table: { category: "Feedback" } },
    validation: { control: "inline-radio", options: ["none", "error", "warning", "success", "info"], table: { category: "Field" } },
  },
  parameters: { controls: { disable: false } },
  render: (args: PropsArgs) => <PropsDemo {...args} />,
};

function PropsDemo(args: PropsArgs) {
  const [filters, setFilters] = useState<PowerSearchFilter[]>([F_STATUS, F_PRIORITY]);
  const matches = useMemo(() => SEARCH.applyFilters(filters, DATA), [filters]);
  const validation =
    args.validation === "none" ? undefined : { tone: args.validation, message: `This is a ${args.validation} message.` };

  return (
    <Page>
      <PageHeader
        title="PowerSearch · Props"
        standfirst={<>{DEFINITION} A live PowerSearch over a sample dataset — the result count is computed from applyFilters.</>}
      />
      <Section title="Try it">
        <PowerSearch
          config={CONFIG}
          filters={filters}
          onChange={(next) => setFilters([...next])}
          aria-label="Search issues"
          size={args.size === "auto" ? undefined : args.size}
          placeholder={args.placeholder}
          readOnly={args.readOnly}
          disabled={args.disabled}
          disabledReason={args.disabledReason || undefined}
          tokenOverflowBehavior={args.tokenOverflowBehavior}
          resultCount={args.showResultCount ? matches.length : undefined}
          validation={validation}
          startIcon={<Sparkle weight="fill" />}
          width={560}
        />
        <Caption>Add a filter (type a field name), edit a chip, or remove one — the matching rows update live.</Caption>
        <Theme>
          <Box style={{ marginTop: 12, border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)", overflow: "hidden", maxWidth: 560 }}>
            {matches.length === 0 ? (
              <Box p="3"><Muted>No rows match the current filters.</Muted></Box>
            ) : (
              matches.map((r, i) => (
                <Flex key={i} justify="between" align="center" px="3" py="2" style={{ borderTop: i ? "1px solid var(--ds-stroke-weak)" : undefined }}>
                  <Text size="2" style={{ color: "var(--ds-text-strong)" }}>{r.title}</Text>
                  <Text size="1" style={{ color: "var(--ds-text-weak)" }}>{r.status} · {r.priority}</Text>
                </Flex>
              ))
            )}
          </Box>
        </Theme>
      </Section>
      <PropsLead />
      <Rule />
      <Section title="Props reference" lead="Every prop PowerSearch accepts.">
        <PropTable rows={PROPS} />
      </Section>
    </Page>
  );
}

// =============================================================================
// History
// =============================================================================

/** History — the rulings this component encodes and how it changes over time. */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="PowerSearch · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[power-search]] · flat AND-only">
            <strong>Flat AND-only.</strong> The model layer (
            <Code>src/powersearch/*</Code>) is
            pure and tested (107 logic tests); this render layer branches its 14-member operator union onto
            OUR Field-shell inputs. The <Code>nested</Code> type (the only TreeList consumer) is deferred —
            the evaluator treats it as passthrough — so v1 has no blocking dependency on it.
          </Decision>
          <Decision id="One renderer">
            <strong>A single `formatFilterValue`.</strong> ONE fixed formatter in the model layer renders every
            value type — so a <Code>date_range</Code> chip reads{" "}
            <Code>Jan 25, 2026 – Feb 10, 2026</Code> and a <Code>date_relative</Code> chip reads{" "}
            <Code>7 days ago</Code> (not a raw <Code>7d_ago</Code> code), with no risk of two renderers drifting apart.
          </Decision>
          <Decision id="Non-dialog popover">
            <strong>The edit popover is not a modal dialog.</strong> The same pattern as our Typeahead:{" "}
            <Code>Popover.Content role="none"</Code> + auto-focus prevented + the anchor surface exempt from
            outside-dismiss. Focus is ours to place (the editor's first field), the field combobox stays
            live behind it, and a chip re-click swaps the editor instead of closing it.
          </Decision>
          <Decision id="Two-level Escape">
            <strong>No hand-rolled escapeStack.</strong> The two-level Escape rests on Radix's DismissableLayer
            stack — a nested Select/dropdown is the inner layer (Escape #1 closes it), the edit popover the
            outer (Escape #2 cancels). Enter-to-save stays an explicit handler (Radix doesn't own Enter).
          </Decision>
          <Decision id="Assembly">
            <strong>Composed from shipped parts.</strong> The chip row IS the <Code>.rt-ds-tokenizer</Code>{" "}
            surface holding <Code>Token</Code> chips + an embedded <Code>Typeahead</Code> — reusing the
            fill, hairline, focus-ring hoist ([[focus-ring]]), validation paint, and disabled skin. The value
            editors are our existing inputs; nothing was re-skinned. ZERO net-new tokens.
          </Decision>
          <Decision id="Every prop documented">
            <strong>Every live prop is documented</strong> — the
            load-bearing <Code>components</Code> override map, <Code>startIcon</Code>, <Code>onFocus</Code>,{" "}
            <Code>onBlur</Code>, and <Code>tokenOverflowBehavior</Code> included. <Code>disabledMessage</Code> maps
            to our <Code>disabledReason</Code>, and <Code>status</Code> to{" "}
            <Code>validation</Code>.
          </Decision>
        </Flex>
      </Section>
      <Rule />
      <Section title="Changelog" lead="Newest first.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            Initial ship — the model layer (config / <Code>applyFilters</Code> / <Code>InferData</Code> /
            the fixed formatter) plus this render layer: the 14-type value editor, the non-dialog edit
            popover, and the chip assembly. <Code>nested</Code> filters are deferred.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
