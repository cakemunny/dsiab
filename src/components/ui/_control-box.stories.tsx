import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState, type ReactNode } from "react";
import { TextAlignLeft, TextAlignCenter, TextB, BookmarkSimple } from "@phosphor-icons/react";
import { Provider, type ProviderProps } from "../../theme/Provider";
import { Button } from "./Button";
import { IconButton } from "./IconButton";
import { ToggleButton } from "./ToggleButton";
import { ToggleButtonGroup } from "./ToggleButtonGroup";
import { TextField } from "./TextField";
import { Select } from "./Select";
import { MultiSelect } from "./MultiSelect";
import { Typeahead, createStaticSource, type TypeaheadOption } from "./Typeahead";
import { DateInput } from "./DateInput";
import { DateRangeInput } from "./DateRangeInput";
import { DateTimeInput } from "./DateTimeInput";
import { TimeInput } from "./TimeInput";
import { NumberInput } from "./NumberInput";
import { SegmentedControl } from "./SegmentedControl";
import { Tokenizer } from "./Tokenizer";
import { PowerSearch } from "./PowerSearch";
import { FileInput } from "./FileInput";
import { Pagination } from "./Pagination";
import { CommandPalette } from "./CommandPalette";
import { createPowerSearchConfig } from "../../powersearch/usePowerSearchConfig";
import type { PowerSearchFilter } from "../../powersearch/types";

/* _internal — the [[box-law-scope]] CONTROL-BOX guard.
 *
 * [[control-box-per-step]] put the button family on the vendor's box; [[box-law-scope]] makes that law system-wide and points at THIS file
 * as its enforcement. A size step names ONE box — 24 / 32 / 40px at steps 1 / 2 / 3 — and every component
 * that presents a single-row control has to land on it. Each entry below is mounted UNSIZED (no `size`
 * prop, so it resolves the ambient tier) under all three `Provider` tiers, and the play measures the
 * PAINTING element's `getBoundingClientRect().height` against the step exactly.
 *
 * Underscore-prefixed → the `_internal` group, exempt from the story-order / story-category / registry
 * node-guards, same as every other fixture here. Rest state only: nothing is opened, no portal is
 * mounted, no play drives a menu.
 *
 * WHY the numbers are typed out locally rather than read from SizeContext / the theme: a probe that
 * reads the same table the component reads agrees with it by construction and can never catch a table
 * that moved. Same reasoning (and the same `--scaling: 1` caveat) as `AVATAR_TIER_PX` in
 * `_size.stories.tsx`, which is this file's precedent.
 *
 * TWO STORIES, TWO AXES. The vendor's ladders are `calc(24px * var(--scaling))` / 32 / 40
 * (`--space-5/6/7`), so the exact-px expectations below hold at the default `--scaling: 1` and
 * `ControlBoxTracks` asserts them there. `ControlBoxUnderScaling` runs the SAME manifest with the
 * scaling knob turned and asserts the law under customization — see its own header. */

type Tier = "small" | "medium" | "large";
const TIERS: Tier[] = ["small", "medium", "large"];

/** The law. 24 / 32 / 40 — the vendor's own `--space-5` / `--space-6` / `--space-7`, written out here
 *  on purpose so this file can disagree with the system rather than echo it. */
const TIER_BOX_PX: Record<Tier, number> = { small: 24, medium: 32, large: 40 };

interface ControlBoxSpec {
  /** Display name — the fixture's `data-cb` hook and the label in a failure line. */
  name: string;
  /** The REGISTRY name of the component this entry guards — the join key for
   *  `control-box-registry.node-check.ts`, which asserts that every `controlBox: "row"` entry in
   *  registry.json is measured here and that nothing measured here is registered as anything else.
   *  Two entries may share one component (a group's root and its member; DateTimeInput's two
   *  sub-inputs); the value must match `registry.json`'s `name` EXACTLY. */
  component: string;
  /** The control, rendered UNSIZED so it resolves the ambient tier from the Provider around it. */
  render: () => ReactNode;
  /** The element whose height IS the control box — the row that paints, never an outer wrapper. */
  selector: string;
  /** Slot width. A single-row control needs room to stay a single row (chips wrap otherwise). */
  width?: number;
  /** Per-entry ladder override — ONLY for a part that deliberately does not ride the row box
   *  (the group member, which steps down one size per [[toggle-group-box]]). Everything else rides TIER_BOX_PX. */
  box?: Record<Tier, number>;
  /** The entry claims SQUARENESS — an icon-only control is the same box on BOTH axes ([[control-box-per-step]]: the
   *  `min-width: var(--base-button-height)` half of the rule, and its `data-icon-only` amendment).
   *  Height alone cannot catch the oblong case the amendment was minted for: 28×24 measured square
   *  on the axis the guard was reading. Set it and the width is asserted against the same ladder. */
  square?: boolean;
}

/* ---- specimens that need local state / a source ---------------------------- */

const FRUITS: TypeaheadOption[] = [
  { id: "apple", label: "Apple" },
  { id: "banana", label: "Banana" },
  { id: "cherry", label: "Cherry" },
];
const fruitSource = createStaticSource(FRUITS);

const COMMANDS: TypeaheadOption[] = [
  { id: "open", label: "Open file" },
  { id: "save", label: "Save file" },
];
const commandSource = createStaticSource(COMMANDS);

const noop = () => {};

/** Tokenizer POPULATED — the state that regressed (an empty tokenizer was always on the ladder; the
 *  `:has([data-tk-chip])` padding only fired once a chip existed, which is every real use). */
function PopulatedTokenizer() {
  const [value, setValue] = useState<TypeaheadOption[]>([FRUITS[0], FRUITS[1]]);
  return <Tokenizer label="Fruit" source={fruitSource} value={value} onValueChange={(items) => setValue(items)} />;
}

const PS = createPowerSearchConfig([
  { key: "title", type: "string", label: "Title" },
  {
    key: "status",
    type: "enum",
    label: "Status",
    enumValues: [
      { value: "open", label: "Open" },
      { value: "closed", label: "Closed" },
    ],
  },
]);
const PS_FILTER: PowerSearchFilter = {
  field: "title",
  operator: "contains",
  value: { type: "string", value: "payment" },
};

/** PowerSearch composes the Tokenizer surface, so it carried the same chip regression without owning a
 *  rule of its own — guarded here POPULATED for the same reason. */
function PopulatedPowerSearch() {
  return <PowerSearch config={PS.config} filters={[PS_FILTER]} onChange={noop} aria-label="Search issues" />;
}

/** FileInput's compact mode (`mode="input"`) — the row is a real Button beside a placeholder line, and
 *  the row is what has to measure as one box. The dropzone mode is deliberately NOT here: it is a large
 *  drag target, not a single-row control, and the law says nothing about it. */
function CompactFileInput() {
  const [value, setValue] = useState<File | File[] | undefined>(undefined);
  return <FileInput label="Attachment" mode="input" value={value} onValueChange={setValue} />;
}

function PaginationSpecimen() {
  const [page, setPage] = useState(2);
  return <Pagination page={page} totalPages={8} onChange={setPage} />;
}

/** One alignment group, measured TWICE below — once at its container (the control box a group claims for
 *  itself, [[toggle-group-box]]) and once at a member inside it (whose target the container's inset must not eat). */
function AlignGroup() {
  return (
    <ToggleButtonGroup.Root type="single" defaultValue="left" label="Text alignment">
      <ToggleButtonGroup.Item value="left" aria-label="Align left">
        <TextAlignLeft weight="regular" />
      </ToggleButtonGroup.Item>
      <ToggleButtonGroup.Item value="center" aria-label="Align center">
        <TextAlignCenter weight="regular" />
      </ToggleButtonGroup.Item>
    </ToggleButtonGroup.Root>
  );
}

/* ---------------------------------------------------------------------------
 * THE MANIFEST — the registration point for the [[box-law-scope]] law.
 *
 * *** ADD EVERY NEW SINGLE-ROW CONTROL HERE. ***
 *
 * A control absent from this list is UNGUARDED, whether or not it happens to be correct today. "Single
 * row" is the test: a thing a user types into or presses that presents ONE row. Composites are governed
 * at their INNER row level, not their own — the chat composer's dock is two stacked rows, so its rows
 * belong here and the dock does not.
 *
 * REGISTRATION IS NO LONGER VOLUNTARY. `registry.json` carries a `controlBox` field on every ported
 * entry — `row` | `composite` | `exempt` — and `src/foundations/control-box-registry.node-check.ts`
 * joins the two files on the `component` key below: every `row` entry MUST appear here, and every
 * entry here MUST be registered `row`. Adding a control and forgetting this file is now a red node
 * test rather than a review discovery; so is deleting an entry, and so is shipping a component that
 * declares no `controlBox` at all. Classify honestly in the registry FIRST, then land the entry here.
 *
 * Deliberate exclusions, so they read as decisions rather than oversights:
 *   • TextArea, FileInput's dropzone mode, Card / Callout / Item and every other multi-line surface —
 *     not row controls; the law does not reach them.
 *   • Checkbox / Radio / Switch — their box is the vendor's own control glyph ladder, not the row box.
 *   • Slider — a track, not a row control.
 *   • Anything that only exists inside an opened portal (a Select's menu row, a Typeahead option, the
 *     PowerSearch edit popover). This fixture mounts REST state only; open-state geometry is guarded on
 *     each component's own behavior suite, by `assertMenuOptionBox` (`src/foundations/_assert.ts`) —
 *     which reads `expectedBox` / `ROW_LADDER_PX` from `boxLaw.ts`, so the open rows and the rest-state
 *     grid are judged against ONE ladder. The three sites today: `_typeahead.stories.tsx` (Keyboard),
 *     `_commandpalette.stories.tsx` (Structure), `MultiSelect.stories.tsx` (MenuStates). This sentence
 *     was a claim with nothing behind it until 2026-08-01 — `boxLaw`'s `CONTROL_ROOT_KINDS` names
 *     control ROOTS, and a menu option row is not one, so a portal-only row was measured by NEITHER
 *     runner. Adding a portal-only row to a panel means adding it to that panel's suite too.
 * ------------------------------------------------------------------------- */
const CONTROL_BOX_MANIFEST: ControlBoxSpec[] = [
  { name: "Button", component: "Button", selector: "button.rt-Button", render: () => <Button>Save</Button> },
  {
    name: "IconButton",
    component: "IconButton",
    square: true,
    selector: "button.rt-IconButton",
    render: () => (
      <IconButton aria-label="Bookmark">
        <BookmarkSimple weight="regular" />
      </IconButton>
    ),
  },
  {
    // Icon-only: `label` is the accessible name AND the shape marker the [[control-box-per-step]] amendment squares on.
    name: "ToggleButton (icon-only)",
    component: "ToggleButton",
    square: true,
    selector: "button.rt-Button[data-icon-only]",
    render: () => (
      <ToggleButton label="Bold">
        <TextB weight="regular" />
      </ToggleButton>
    ),
  },
  {
    // The GROUP ROOT, not an item — a ToggleButtonGroup is ONE control in its row ([[toggle-group-box]]), so the box the
    // law binds is the container the group paints for itself, the thing a Select beside it lines up with.
    name: "ToggleButtonGroup root",
    component: "ToggleButtonGroup",
    selector: ".rt-ds-toggle-group",
    render: () => <AlignGroup />,
  },
  {
    // …and a MEMBER inside that container, which renders ONE STEP DOWN ([[toggle-group-box]] as corrected):
    // a medium tray holds SMALL buttons. 24-in-32, 32-in-40, floored at step 1 where member and box
    // coincide. Its own ladder below — the one manifest entry that deliberately does NOT ride
    // TIER_BOX_PX, because a member is a part of a control, not a control in the row.
    name: "ToggleButtonGroup.Item (icon-only, steps down)",
    component: "ToggleButtonGroup",
    square: true,
    selector: "button.rt-Button[data-icon-only]",
    render: () => <AlignGroup />,
    box: { small: 24, medium: 24, large: 32 },
  },
  { name: "TextField", component: "TextField", selector: ".rt-TextFieldRoot", render: () => <TextField aria-label="Name" /> },
  {
    name: "Select trigger",
    component: "Select",
    selector: "button.rt-SelectTrigger",
    render: () => (
      <Select>
        <Select.Trigger placeholder="Pick one" aria-label="Pick one" />
        <Select.Content>
          <Select.Item value="a">A</Select.Item>
        </Select.Content>
      </Select>
    ),
  },
  {
    name: "MultiSelect trigger",
    component: "MultiSelect",
    selector: "button.rt-SelectTrigger",
    render: () => (
      <MultiSelect label="Countries" defaultValue={["us"]}>
        <MultiSelect.Option value="us">United States</MultiSelect.Option>
        <MultiSelect.Option value="ca">Canada</MultiSelect.Option>
      </MultiSelect>
    ),
  },
  {
    name: "Typeahead anchor row",
    component: "Typeahead",
    selector: ".rt-ds-typeahead-anchor .rt-TextFieldRoot",
    render: () => <Typeahead label="Fruit" source={fruitSource} placeholder="Search fruit…" debounceMs={0} />,
  },
  {
    name: "DateInput",
    component: "DateInput",
    selector: ".rt-ds-dateinput-anchor .rt-TextFieldRoot",
    render: () => <DateInput label="Due date" onValueChange={noop} />,
  },
  {
    name: "DateRangeInput trigger",
    component: "DateRangeInput",
    selector: "button.rt-SelectTrigger",
    render: () => <DateRangeInput label="Report window" onValueChange={noop} />,
  },
  {
    // DateTimeInput is one group over TWO sub-inputs; each is a row control and each is measured.
    name: "DateTimeInput (date sub-input)",
    component: "DateTimeInput",
    selector: ".rt-ds-datetimeinput-date .rt-TextFieldRoot",
    render: () => <DateTimeInput label="Appointment" onValueChange={noop} />,
    width: 420,
  },
  {
    name: "DateTimeInput (time sub-input)",
    component: "DateTimeInput",
    selector: ".rt-ds-datetimeinput-time .rt-TextFieldRoot",
    render: () => <DateTimeInput label="Appointment" onValueChange={noop} />,
    width: 420,
  },
  { name: "TimeInput", component: "TimeInput", selector: ".rt-TextFieldRoot", render: () => <TimeInput label="Start time" onValueChange={noop} /> },
  { name: "NumberInput", component: "NumberInput", selector: ".rt-TextFieldRoot", render: () => <NumberInput label="Quantity" onValueChange={noop} /> },
  {
    name: "SegmentedControl root",
    component: "SegmentedControl",
    selector: ".rt-SegmentedControlRoot",
    render: () => (
      <SegmentedControl.Root defaultValue="list">
        <SegmentedControl.Item value="list">List</SegmentedControl.Item>
        <SegmentedControl.Item value="grid">Grid</SegmentedControl.Item>
      </SegmentedControl.Root>
    ),
  },
  { name: "Tokenizer (populated)", component: "Tokenizer", selector: ".rt-ds-tokenizer", render: () => <PopulatedTokenizer />, width: 420 },
  { name: "PowerSearch bar", component: "PowerSearch", selector: ".rt-ds-powersearch", render: () => <PopulatedPowerSearch />, width: 460 },
  { name: "FileInput (compact)", component: "FileInput", selector: ".rt-ds-fileinput-compact", render: () => <CompactFileInput /> },
  { name: "Pagination page cell", component: "Pagination", selector: ".rt-ds-pagination__page", render: () => <PaginationSpecimen />, width: 460 },
  {
    // The palette's search row. Guarded here only because `isInline` renders the surface as a plain div
    // with no <dialog>, backdrop, focus-trap or autofocus — the modal path could not be mounted in a
    // fixture without opening a portal, and would be out under the exclusion above.
    name: "CommandPalette input row",
    component: "CommandPalette",
    selector: ".rt-ds-cmdk-inputrow",
    render: () => <CommandPalette open isInline source={commandSource} onOpenChange={noop} showFooter={false} />,
    width: 420,
  },
];

/* ---------------------------------------------------------------------------
 * THE RIG — one grid, two stories. `ControlBoxTracks` mounts it at the shipped defaults;
 * `ControlBoxUnderScaling` mounts the SAME manifest with the scaling knob turned. Sharing the render
 * and the read is the point: a second copy of the fixture could drift from the first and the two
 * stories would then be asserting on different DOM.
 * ------------------------------------------------------------------------- */

/** `scaling` is a sanctioned `Theme` prop; `Provider` forwards every `ThemeProps` key it does not
 *  itself consume, so the system's own entry point takes it without reaching past the wrapper. */
type Scaling = ProviderProps["scaling"];

function ManifestGrid({ scaling }: { scaling?: Scaling }) {
  return (
    <>
      {TIERS.map((tier) => (
        <Provider key={tier} uiSize={tier} scaling={scaling}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, padding: 8 }}>
            {CONTROL_BOX_MANIFEST.map((spec) => (
              <div key={spec.name} data-cb-tier={tier} data-cb={spec.name} style={{ width: spec.width ?? 280 }}>
                {spec.render()}
              </div>
            ))}
          </div>
        </Provider>
      ))}
    </>
  );
}

/** A fallback font has wider metrics than Inter; a height read taken mid-swap measures a row that is
 *  still laying out. Settle the font, then give the async sources (Typeahead / Tokenizer / PowerSearch /
 *  CommandPalette all bootstrap on mount) a frame or two to land. */
async function settle(): Promise<void> {
  await document.fonts.ready;
  await new Promise((r) => setTimeout(r, 200));
}

/** The painting element's box, or a structural failure string (missing slot / unmatched selector — a
 *  fixture fault, which must never be reported as a wrong NUMBER). */
function readBox(canvasElement: HTMLElement, tier: Tier, spec: ControlBoxSpec): { h: number; w: number } | string {
  // Quoted attribute values — the names carry spaces and parens, both legal inside the quotes.
  const slot = canvasElement.querySelector(`[data-cb-tier="${tier}"][data-cb="${spec.name}"]`);
  if (!slot) return `${tier} / ${spec.name}: fixture slot missing`;
  const el = slot.querySelector<HTMLElement>(spec.selector);
  if (!el) return `${tier} / ${spec.name}: selector "${spec.selector}" matched nothing (did the DOM move?)`;
  const r = el.getBoundingClientRect();
  return { h: Math.round(r.height), w: Math.round(r.width) };
}

const meta: Meta = {
  title: "_internal/Control box",
  // Bare specimens (a lone Select trigger, an always-open inline palette listbox) trip axe label /
  // scrollable-region rules that are not what this geometry suite is asserting.
  parameters: { a11y: { test: "off" } },
};
export default meta;
type Story = StoryObj;

export const ControlBoxTracks: Story = {
  render: () => <ManifestGrid />,
  play: async ({ canvasElement }) => {
    await settle();

    const failures: string[] = [];
    for (const tier of TIERS) {
      for (const spec of CONTROL_BOX_MANIFEST) {
        const expected = (spec.box ?? TIER_BOX_PX)[tier];
        const box = readBox(canvasElement, tier, spec);
        if (typeof box === "string") {
          failures.push(box);
          continue;
        }
        if (box.h !== expected) {
          failures.push(`${tier} / ${spec.name}: expected the ${expected}px control box, got ${box.h}px`);
        }
        // The CROSS AXIS, for entries that claim squareness. [[control-box-per-step]]'s rule is two-sided —
        // `min-height` on `.rt-BaseButton` AND `min-width` on `.rt-IconButton` / `[data-icon-only]` —
        // and its amendment was minted for a control that measured RIGHT on height and 28×24 on width.
        // A height-only guard is blind to exactly the defect the amendment fired on.
        if (spec.square && box.w !== expected) {
          failures.push(
            `${tier} / ${spec.name}: icon-only controls are square — expected ${expected}×${expected}, got ${box.w}×${box.h}`,
          );
        }
      }
    }
    if (failures.length) {
      throw new Error(
        `[[box-law-scope]] — off-ladder control boxes (${failures.length}). A size step names ONE box (24/32/40):\n` +
          failures.join("\n"),
      );
    }
  },
};

/* ---------------------------------------------------------------------------
 * THE SCALING AXIS — the law under CUSTOMIZATION.
 *
 * `ControlBoxTracks` proves the law at the shipped defaults. That is the easy half: a consumer who
 * never touches a knob was never the risk. `scaling` is the one sanctioned knob that MOVES the control
 * ladder — every step is `calc(Npx * var(--scaling))` (`--space-5/6/7`), so at 90% the whole ladder
 * shifts under every component at once. This story asserts what has to survive that:
 *
 *   expected = max( round(step × scale) , an absolute floor that lawfully binds )
 *
 * Three claims in one line. LADDERS SCALE: a box derived from the vendor's spaces moves with them, so
 * nothing goes off-ladder just because the ladder moved. FLOORS HOLD: WCAG 2.5.8's 24×24 is a minimum
 * in CSS pixels — a real-world size, not a themed one — so a floor written as a literal `24px`
 * deliberately does NOT scale. FLOOR WINS BELOW IT: where the two disagree under a sub-1 scale, the
 * accessibility floor is the answer and the scaled step is not.
 * ------------------------------------------------------------------------- */

/** The scale under test. 90% is Radix's lowest sanctioned step, so it is the one that pushes the floor
 *  step (24px) furthest under the 24×24 target minimum — the collision this story exists to pin. */
const SCALING: Scaling = "90%";
const SCALE = 0.9;

/** WCAG 2.5.8 / GUIDELINES §9. Absolute CSS px, by design — see the header above. */
const TARGET_FLOOR_PX = 24;

/** Entries a lawful absolute floor REACHES, established by measurement rather than by reading the
 *  stylesheet. Measured at 90%, small tier: the scaled step is 21.6px and both chip-row bars — the
 *  Tokenizer and the PowerSearch that reuses its surface — measure 24px. That is the floor winning
 *  below the ladder, which is the law, not a deviation, and it arrives the way every other control
 *  gets it: the bar's own declaration, `min-height: max(var(--space-5), 24px)`.
 *
 *  It used to arrive by accident instead. The PowerSearch bar was the one entry that missed the law
 *  at the MEDIUM tier (31px in a 28.8px step), because the Token chips standing in it carried the
 *  24px pointer floor as their VISUAL box — an unscaled term inside a scaled sum, propped under the
 *  bar from the inside. That floor now sits only on the boxes a pointer hits (the Token body and the
 *  remove ✕, each on a cancelling negative margin), the chips paint their 20/24/28 ladder, and the
 *  bar is held up by nothing but its own `max(step, 24px)`.
 *
 *  The floor is UNIVERSAL now, not a per-entry exception. This guard's first run found it reached
 *  almost nothing (a 21.59px solid beside a 24px ghost at 90% — the [[control-box-per-step]] same-row defect back through
 *  a sanctioned knob), and the law was completed the same day: every row-control box declaration in
 *  `components.css` wraps its step in `max(step, 24px)` (the BaseButton/IconButton base rules, the
 *  vendor-height trio TextField/SelectTrigger/SegmentedControl, and every step-1 data-size rung).
 *  So the expectation below applies the floor to EVERY entry — a control that scales under 24 is a
 *  ladder declaration that missed the floor. */

/** KNOWN DEBT — `tier / name` keys that do not satisfy the law, each with its measured cause. The
 *  assertion stays ON for them: the guard still measures and still prints the number; only the THROW
 *  is suppressed, so the list documents the debt instead of hiding it. Same posture as
 *  `token-rows.node-check.ts`'s conversion work-list — a failing list checked in is more useful than
 *  a deleted one. Keyed per TIER, not per entry, because a mixed-unit sum can agree at one step and
 *  miss at another — which is exactly what the one entry this list ever held turned out to be. A key
 *  that stops failing is itself reported as stale, so the list cannot rot into a permanent exemption.
 *
 *  EMPTY, and the guard above it is now doing the work unaided. The entry was
 *  `medium / PowerSearch bar` — 31px against a 28.8px step at 90% — twinned with
 *  `BOX_LAW_EXPECTED_FAILURES` in `src/foundations/boxLaw.ts` so the two runners could not describe
 *  the same site differently. Both are cleared in the same change: the chip inside the bar stopped
 *  painting the 24px pointer floor as its box, so the sum has no unscaled term left and the bar
 *  measures its step at every scaling (28.8 at 90%, 32 at 1). Nothing was re-keyed or excused. */
const SCALING_EXPECTED_FAILURES = new Map<string, string>([]);

function expectedUnderScale(spec: ControlBoxSpec, tier: Tier): number {
  const scaled = Math.round((spec.box ?? TIER_BOX_PX)[tier] * SCALE);
  return Math.max(scaled, TARGET_FLOOR_PX);
}

export const ControlBoxUnderScaling: Story = {
  render: () => <ManifestGrid scaling={SCALING} />,
  play: async ({ canvasElement }) => {
    await settle();

    const failures: string[] = [];
    const known: string[] = [];
    const healed: string[] = [];

    for (const tier of TIERS) {
      for (const spec of CONTROL_BOX_MANIFEST) {
        const expected = expectedUnderScale(spec, tier);
        const box = readBox(canvasElement, tier, spec);
        if (typeof box === "string") {
          failures.push(box); // a fixture fault is never expected debt
          continue;
        }
        const wrong: string[] = [];
        if (box.h !== expected) wrong.push(`height ${box.h}px (expected ${expected}px)`);
        if (spec.square && box.w !== expected) wrong.push(`width ${box.w}px (expected ${expected}px, square)`);

        const key = `${tier} / ${spec.name}`;
        const debt = SCALING_EXPECTED_FAILURES.get(key);
        if (wrong.length === 0) {
          if (debt !== undefined) healed.push(`${key}: on-law now — drop it from SCALING_EXPECTED_FAILURES`);
          continue;
        }
        const line = `${key}: ${wrong.join(", ")}`;
        if (debt !== undefined) known.push(`${line}  — KNOWN: ${debt}`);
        else failures.push(line);
      }
    }

    if (known.length) {
      // eslint-disable-next-line no-console
      console.warn(`[[box-law-scope]] under scaling=${SCALING} — ${known.length} KNOWN deviation(s), asserted and tolerated:\n${known.join("\n")}`);
    }
    if (failures.length || healed.length) {
      throw new Error(
        `[[box-law-scope]] under scaling=${SCALING} — the law did not hold (${failures.length} unexpected, ${healed.length} stale entr${healed.length === 1 ? "y" : "ies"}).\n` +
          `expected = max(round(step × ${SCALE}), the 24px target floor where it lawfully binds):\n` +
          [...failures, ...healed].join("\n"),
      );
    }
  },
};

/* =====================================================================================
   [[text-spacing-control-box]] — A WRAPPING LABEL GROWS THE BOX INSTEAD OF ESCAPING THE FILL
   -------------------------------------------------------------------------------------
   [[control-box-per-step]]'s box law claimed for four months that `min-*` let a control "that legitimately
   needs to be taller (a wrapped label, a two-line composite)" grow. It could not: the
   vendor writes `height: var(--base-button-height)` on every non-ghost variant and our
   `min-height` resolved to the same value, so it was inert and the box was frozen. A
   label forced to wrap escaped the fill rather than clipping — and on a solid variant it
   left the background its contrast was measured against. [[text-spacing-control-box]] records it; `height: auto`
   in the box law fixes it.

   WHAT THIS ASSERTS. The WCAG 1.4.12 Text Spacing overrides, applied to width-constrained
   buttons across every size and variant, leave no label outside its own box. This is the
   reverse of the rest of this file: the other two stories assert the box holds a FIXED
   step, this one asserts it GROWS when it must. Both are the same law.

   THE `!important` HERE IS NOT A SYSTEM RULE. 1.4.12 is a criterion about what happens
   when a READER imposes their own stylesheet, and a user stylesheet wins with
   `!important` by definition. This fixture simulates that. The repo's no-`!important`
   ban is on the system's own CSS, which this is not.
   ===================================================================================== */

/** The four values WCAG 1.4.12 requires a page to survive. */
const TEXT_SPACING_CSS = `
.text-spacing-scope, .text-spacing-scope * {
  line-height: 1.5 !important;
  letter-spacing: 0.12em !important;
  word-spacing: 0.16em !important;
}`;

/** Narrow enough to force a two-line wrap once the overrides widen the label. */
const WRAP_WIDTH = 150;
const WRAP_LABEL = "Save and continue";
const TEXT_SPACING_SIZES = ["1", "2", "3", "4"] as const;
/** The system's whole button vocabulary ([[destructive-tone]]): `soft`, `outline` and `classic` are
 *  deliberately not exposed, so testing Radix's variant names would test a surface no
 *  consumer can reach. `tertiary` is ghost, which the vendor already gives
 *  `height: fit-content` — it is the control specimen that was never frozen. */
const TEXT_SPACING_PRIORITIES = ["primary", "secondary", "tertiary"] as const;

export const ControlBoxUnderTextSpacing: Story = {
  render: () => (
    <Provider>
      <style>{TEXT_SPACING_CSS}</style>
      <div className="text-spacing-scope" style={{ display: "flex", flexWrap: "wrap", gap: 16, padding: 8 }}>
        {TEXT_SPACING_PRIORITIES.map((priority) =>
          TEXT_SPACING_SIZES.map((size) => (
            <div key={`${priority}-${size}`} style={{ width: WRAP_WIDTH }}>
              <Button
                data-text-spacing={`${priority}/${size}`}
                size={size}
                priority={priority}
                style={{ width: "100%" }}
              >
                {WRAP_LABEL}
              </Button>
            </div>
          )),
        )}
      </div>
    </Provider>
  ),
  play: async ({ canvasElement }) => {
    await settle();

    const specimens = [...canvasElement.querySelectorAll<HTMLElement>("[data-text-spacing]")];
    if (specimens.length !== TEXT_SPACING_SIZES.length * TEXT_SPACING_PRIORITIES.length) {
      throw new Error(
        `[[text-spacing-control-box]] fixture fault: expected ${TEXT_SPACING_SIZES.length * TEXT_SPACING_PRIORITIES.length} specimens, found ${specimens.length}.`,
      );
    }

    // The overrides have to actually be in force, or every assertion below passes
    // vacuously over unspaced text. This is the reverse arm.
    const spacing = getComputedStyle(specimens[0]).letterSpacing;
    if (!spacing.startsWith("1.") && !spacing.startsWith("2.")) {
      throw new Error(
        `[[text-spacing-control-box]] fixture fault: the 1.4.12 overrides are not applying (letter-spacing reads "${spacing}", expected ~0.12em of the font size).`,
      );
    }

    // And at least one label must genuinely wrap, or the fixture is not testing the
    // failure mode at all — it is measuring single-line buttons that were never at risk.
    const wrapped = specimens.filter((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      return range.getBoundingClientRect().height > parseFloat(getComputedStyle(el).fontSize) * 2;
    });
    if (wrapped.length === 0) {
      throw new Error(
        `[[text-spacing-control-box]] fixture fault: no label wrapped at width ${WRAP_WIDTH}px, so this story asserts nothing. Narrow WRAP_WIDTH or lengthen WRAP_LABEL.`,
      );
    }

    const escaped: string[] = [];
    for (const el of specimens) {
      const name = el.getAttribute("data-text-spacing");
      const box = el.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(el);
      const text = range.getBoundingClientRect();
      const over = Math.max(0, Math.round(text.height - box.height));
      if (over > 0) {
        escaped.push(
          `${name}: label is ${text.height.toFixed(1)}px in a ${box.height.toFixed(1)}px box — ${over}px outside the fill`,
        );
      }
    }

    if (escaped.length) {
      throw new Error(
        `[[text-spacing-control-box]] — the control box did not grow for a wrapped label under the WCAG 1.4.12 text-spacing overrides ` +
          `(${escaped.length} of ${specimens.length} specimens, ${wrapped.length} wrapped).\n` +
          `The box law needs \`height: auto\` beside its \`min-height\`; without it the vendor's ` +
          `\`height: var(--base-button-height)\` freezes the box and the label escapes.\n` +
          escaped.join("\n"),
      );
    }
  },
};
