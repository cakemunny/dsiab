import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text, Theme } from "@radix-ui/themes";
import type { CSSProperties } from "react";
import { Info } from "@phosphor-icons/react";
import { MultiSelect } from "./MultiSelect";
import { CheckboxVisual } from "./CheckboxVisual";
import { useResolvedSize } from "../../theme/SizeContext";
import { assertMenuOptionBox, assertPairing, parseColor, resolveColor, themeRoot } from "../../foundations/_assert";
import {
  AnatomyLegend, Caption, Decision, DoDont, DODONT_LABEL, dotStyle, HexThemeKey, hLine, KeyBinding, KeyRow,
  MeasuredRow, MeasuredSpec, NoteRow, Page, PageHeader, PropsLead, PropDef, PropTable, Rule, Scenario, Section, tick, TokenGroup,
} from "./_storyKit";
import { ComparisonSection, PICK_FROM_SET_COMPARISON } from "./_comparisons";

/* ---- anatomy diagram (the trigger) --------------------------------------- */

function AnatomyDiagram() {
  // A real size-3 specimen with every trigger part exposed: the shared label row (name + info + a
  // pinned end-slot) and a trigger composed of the adaptive count, a clear ✕, and the caret, plus a
  // description. The listbox is portaled, so it gets its own "open menu" section rather than a callout.
  return (
    <Box style={{ overflowX: "auto" }}>
      <Box style={{ position: "relative", width: "100%", minWidth: 460, maxWidth: 640, margin: "0 auto", height: 220, background: "var(--ds-bg-subtle)", borderRadius: "var(--ds-radius-4)", overflow: "hidden" }}>
        <Flex align="center" justify="center" style={{ position: "absolute", inset: 0 }}>
          <Box style={{ position: "relative", width: 260 }} data-size-lesson="anatomy callout geometry — the callout tops are measured against this size-3 specimen; its inset clear ✕ holds step 1">
            <MultiSelect
              size="3"
              label="Countries"
              info={<Info size={16} weight="regular" aria-hidden style={{ color: "var(--ds-icon-neutral)", display: "block" }} />}
              endSlot={<Text size="1" style={{ color: "var(--ds-text-weak)" }}>Optional</Text>}
              defaultValue={["us", "ca", "de"]}
              description="Used for tax and shipping estimates."
              clearable
            >
              <MultiSelect.Option value="us">United States</MultiSelect.Option>
              <MultiSelect.Option value="ca">Canada</MultiSelect.Option>
              <MultiSelect.Option value="de">Germany</MultiSelect.Option>
            </MultiSelect>
          </Box>
        </Flex>
        {/* Callout tops measured against the rendered size-3 specimen (label row ~76, trigger ~110,
            description ~144); field column left ≈ calc(50% - 130px), right ≈ calc(50% + 130px). */}
        {/* 1 — label (from the left) */}
        <Box style={{ ...dotStyle, left: "calc(50% - 200px)", top: 66 }}>1</Box>
        <Box style={hLine({ left: "calc(50% - 178px)", top: 76, width: 48 })} />
        {/* 2 — info (tick down onto the icon beside the label) */}
        <Box style={{ ...dotStyle, left: "calc(50% - 90px)", top: 16 }}>2</Box>
        <Box style={tick({ left: "calc(50% - 80px)", top: 36, height: 38 })} />
        {/* 3 — end-slot (from the right) */}
        <Box style={{ ...dotStyle, left: "calc(50% + 200px)", top: 66 }}>3</Box>
        <Box style={hLine({ left: "calc(50% + 130px)", top: 76, width: 48 })} />
        {/* 4 — count / placeholder (tick up from below) */}
        <Box style={{ ...dotStyle, left: "calc(50% - 90px)", top: 158 }}>4</Box>
        <Box style={tick({ left: "calc(50% - 80px)", top: 118, height: 40 })} />
        {/* 5 — clear (tick up from below onto the ✕, left of the caret) */}
        <Box style={{ ...dotStyle, left: "calc(50% + 86px)", top: 158 }}>5</Box>
        <Box style={tick({ left: "calc(50% + 96px)", top: 118, height: 40 })} />
        {/* 6 — caret (from the right) */}
        <Box style={{ ...dotStyle, left: "calc(50% + 200px)", top: 100 }}>6</Box>
        <Box style={hLine({ left: "calc(50% + 118px)", top: 110, width: 60 })} />
        {/* 7 — description (from the left) */}
        <Box style={{ ...dotStyle, left: "calc(50% - 200px)", top: 134 }}>7</Box>
        <Box style={hLine({ left: "calc(50% - 178px)", top: 144, width: 48 })} />
      </Box>
    </Box>
  );
}

const ANATOMY_PARTS: [number, string, string][] = [
  [1, "Label", "the field’s name — sets the accessible name via htmlFor → id (shared Field.Label)"],
  [2, "Info", "an optional inline affordance beside the label — a tip icon or helper toggle (shared Field.Label)"],
  [3, "End-slot", "an optional pinned note at the far end of the label row — “Optional”, a count, an action (shared Field.Label)"],
  [4, "Count / placeholder", "the adaptive selection summary: 0 → greyed placeholder · 1 → the chosen item’s label · 2+ → “N selected”"],
  [5, "Clear", "an optional clear ✕ (set clearable) — shows while ≥1 value is selected and clears all"],
  [6, "Caret", "the disclosure indicator — signals the trigger opens a listbox"],
  [7, "Description", "an optional helper line beneath; replaced by the validation message when a state is active"],
];

/* A faithful STATIC panel — the real Theme-on-panel compound class, the real row classes and state
   attributes the live panel sets, and the REAL CheckboxVisual the rows carry, so the panel's own rules
   paint it exactly as they paint the open one. It exists to be READ: the token rows in the Usage table
   measure it. Presentational only (no listbox/option roles) — the live roles and behaviour are the Menu
   states story and the _internal suite. */
function PanelSpecimen() {
  // The specimen must land on the SAME step the live panel resolves, or the "paints it exactly as it
  // paints the open one" claim above stops being true the moment the uiSize toolbar moves — pinned to
  // step 1 it was correct only at the default tier. MultiSelect resolves its panel from the control lane
  // (`useResolvedSize("control", size) ?? "1"`, MultiSelect.tsx) and hands that same step to each row's
  // CheckboxVisual, so the specimen reuses both halves of that mechanism verbatim.
  const resolved = useResolvedSize<"1" | "2" | "3">("control", undefined) ?? "1";
  return (
    <Theme className={`rt-ds-multiselect-panel rt-r-size-${resolved}`} hasBackground={false} style={{ position: "static", display: "block" }}>
      <div className="rt-ds-multiselect-grouplabel">Countries</div>
      <div className="rt-ds-multiselect-option">
        <CheckboxVisual checked size={resolved} />
        <span className="rt-ds-multiselect-label">United States</span>
      </div>
      <div className="rt-ds-multiselect-separator" />
      <div className="rt-ds-multiselect-option" data-active="">
        <CheckboxVisual checked={false} size={resolved} />
        <span className="rt-ds-multiselect-label">Canada</span>
      </div>
    </Theme>
  );
}

/* ---- anatomy diagram (the open menu) ------------------------------------- */

const MENU_PARTS: [number, string, string][] = [
  [1, "Panel surface", "the floating listbox — solid and opaque (never translucent), painted --ds-bg-overlay, raised by --ds-shadow-overlay. Portaled to the body, so validation never reaches it."],
  [2, "Group label", "a non-focusable heading clustering related options (--ds-text-weak), ruled apart by a separator."],
  [3, "Checkbox", "the per-row multiplicity signal — a presentational checkbox (the Checkbox look, aria-hidden). aria-selected is the source of truth; the real interactive widget is never mounted in a row."],
  [4, "Selected option", "checked checkbox (--accent-indicator + --accent-contrast check) + a semibold (600) label. No row fill — the checkbox carries selection, so many checked rows stay quiet."],
  [5, "Option (rest)", "an unselected choice — empty checkbox, weight 400, no fill."],
  [6, "Active / hovered option", "the pointer or keyboard active-descendant — a neutral --ds-fill-hover layer, reused verbatim from the single Select so the two read as siblings."],
  [7, "Disabled option", "an unavailable choice — dimmed (--ds-text-disabled), skipped in arrow-nav and type-ahead; never togglable."],
  [8, "Selected + active option", "a selected row that is also focused/hovered — the checkbox stays checked and the label stays bold, with the neutral --ds-fill-hover added on top. The checkbox is the durable selection signal; the fill is the transient attention signal."],
];

// A faithful static specimen of the open panel (real --ds-* tokens + the real CheckboxVisual, so it
// follows the toolbar accent), with a numbered badge trailing each labelled part.
function MenuAnatomyDiagram() {
  const badge = (n: number) => (
    <Box style={{ ...dotStyle, position: "relative", width: 18, height: 18, flexShrink: 0 }}>{n}</Box>
  );
  const row = (n: number, label: string, checked: boolean, opts?: { rowStyle?: CSSProperties; labelStyle?: CSSProperties; disabled?: boolean }) => (
    /* --space-6 (32) is what a size-2 option row measures — this diagram is pinned at step 2
       (CheckboxVisual size="2" + Text size="2"), so its rows must take step 2's box. It carried
       --space-7 while the real row was 40, and stayed at 40 when the row joined the system's
       24 / 32 / 40 ladder; a diagram of a row is only worth drawing at the row's own height. */
    <Flex align="center" gap="2" style={{ minHeight: "var(--space-6)", padding: "0 8px", borderRadius: "var(--ds-radius-2)", ...opts?.rowStyle }}>
      <CheckboxVisual checked={checked} disabled={opts?.disabled} size="2" />
      <Text size="2" style={{ flex: 1, minWidth: 0, color: "var(--ds-text-strong)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", ...opts?.labelStyle }}>{label}</Text>
      {badge(n)}
    </Flex>
  );
  return (
    <Box style={{ display: "flex", justifyContent: "center", padding: "26px 0 8px" }}>
      <Box style={{ position: "relative", width: 288 }}>
        <Box style={{ ...dotStyle, position: "absolute", left: -9, top: -9, width: 18, height: 18 }}>1</Box>
        <Box style={{ width: 288, background: "var(--ds-bg-overlay)", borderRadius: "var(--ds-radius-3)", boxShadow: "var(--ds-shadow-overlay)", padding: 6 }}>
          <Flex align="center" gap="2" style={{ padding: "4px 8px", height: 26 }}>
            <Text size="1" style={{ flex: 1, minWidth: 0, color: "var(--ds-text-weak)", fontSize: 13 }}>North America</Text>
            {badge(2)}
          </Flex>
          {/* the checkbox column itself */}
          <Box style={{ position: "relative" }}>
            {row(4, "United States", true, { labelStyle: { fontWeight: 600 } })}
            <Box style={{ ...dotStyle, position: "absolute", left: -9, top: 6, width: 18, height: 18 }}>3</Box>
          </Box>
          {row(5, "Canada", false)}
          {row(6, "Mexico", false, { rowStyle: { background: "var(--ds-fill-hover)" } })}
          {row(8, "Germany", true, { rowStyle: { background: "var(--ds-fill-hover)" }, labelStyle: { fontWeight: 600 } })}
          <Flex align="center" gap="2" style={{ padding: "0 8px", height: 13 }}>
            <Box style={{ flex: 1, height: 1, background: "var(--ds-stroke-weak)" }} />
          </Flex>
          {row(7, "Greenland (unavailable)", false, { disabled: true, labelStyle: { color: "var(--ds-text-disabled)" } })}
        </Box>
      </Box>
    </Box>
  );
}

function ValidationSpecimen() {
  return (
    <Box style={{ maxWidth: 260 }} data-testid="anatomy-validation">
      <MultiSelect label="Regions" validation={{ tone: "error", message: "Select at least one region." }}>
        <MultiSelect.Option value="na">North America</MultiSelect.Option>
        <MultiSelect.Option value="eu">Europe</MultiSelect.Option>
      </MultiSelect>
    </Box>
  );
}

/* ========================================================================== */

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = <>A multi-selectable dropdown on the shared <Code>Field</Code> chrome — the sibling of <Code>Select</Code>. The trigger shows an adaptive count: the placeholder at zero, the item's label at one, “N selected” from two. Each row in the panel carries a checkbox. A toggle commits immediately and the panel stays open.</>;

const meta: Meta = {
  title: "Components/Choice/MultiSelect",
  parameters: {
    controls: { disable: true },
    // The trigger placeholder is Radix gray-9 (~3.78:1) — exempt from the 4.5 text threshold (like
    // disabled text), identified by the surface border. axe treats it as normal text, so scope it off.
    a11y: { context: { exclude: [DODONT_LABEL] } },
    docs: {
      description: {
        component:
          "A multi-selectable dropdown on the shared **`Field`** chrome — the sibling of `Select`. " +
          "Radix Select is single-value only, so the multi engine is a from-scratch custom **listbox** " +
          "(on `@radix-ui/react-popover` + roving focus); the trigger reuses the same surface chrome, " +
          "caret, and system focus ring ([[focus-ring]]). The two diverge only on the multiplicity signals: the " +
          "**trigger** shows an adaptive **count** (0 → placeholder · 1 → the item label · 2+ → “N " +
          "selected”), and each menu **row carries a checkbox**. Selection lives in `aria-selected`; the " +
          "checkbox is a presentational, `aria-hidden` indicator. Live-apply: a toggle commits immediately " +
          "and the panel stays open.",
      },
    },
  },
};
export default meta;
type Story = StoryObj;

/** The parts of a multi-select (a labeled trigger diagram + the menu contents), a validation specimen,
 *  and states. The token spec lives on Usage. */
export const Anatomy: Story = {
  // color-contrast is ON for this story again — the whole-story switch is replaced by three separated
  // exclusions, exactly as on Select/Anatomy (see there for the button-name proof that excluding the
  // inner span does not blind the trigger):
  //
  //   (The placeholder used to be the third exclusion here — Radix's [data-placeholder] skin measured
  //   #80838d on #ffffff = 3.78 and #7e7883 on #fbe8ea = 3.63, a REAL failure on the visible label of an
  //   enabled control. FIXED 2026-08-04: components.css paints every .rt-SelectTrigger[data-placeholder]
  //   --ds-text-weak, now 5.92 / 5.05 on those two surfaces. The exclusion is gone and axe guards it.)
  //
  //   [style*='--ds-text-disabled'] disabled option text, #b9bbc6 on #ffffff = 1.91. Exempt under WCAG
  //                                SC 1.4.3 (inactive controls); the token is low-contrast by design.
  //   [data-field-part="message"]  the Field's own validation message, which paints the same tone roles
  //     [data-tone="error"]        from the STYLESHEET. #ce2c31 on the #fbe8ea invalid-field wash = 4.42
  //                                — the same unruled tone-on-tint gap as Callout/Badge. It needs a
  //                                ruling on the tone tokens, not a story-level fix. OPEN.
  //
  // Only those three: this page paints no tone ink inline and carries no do/don't card, and the only
  // validation tone it renders is error — the warning/success/do-don't selectors it used to list matched
  // nothing here (the warning/success carve-out travels with the token spec, on Usage).
  parameters: {
    a11y: {
      context: {
        exclude: ["[style*='--ds-text-disabled']",
                  '[data-field-part="message"][data-tone="error"]'],
      },
    },
  },
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader title="MultiSelect · Anatomy" standfirst={DEFINITION} />
        <Section title="Anatomy — the trigger" lead="The shared label row carries the name plus an optional info affordance and a pinned end-slot; the trigger composes the adaptive count (or a greyed placeholder), an optional clear ✕, and the disclosure caret; a description helper sits beneath. The label row and support area are the same shared chrome as Select — only the value slot differs: a count, not a single value.">
          <AnatomyDiagram />
          <AnatomyLegend parts={ANATOMY_PARTS} />
          <Caption>
            Only the <strong>label</strong> is required. The <strong>clear ✕</strong> (set{" "}
            <Code>clearable</Code>), the <strong>info</strong>, the <strong>end-slot</strong>, and the{" "}
            <strong>description</strong> are all optional. The value slot is the <strong>adaptive count</strong>:
            a greyed <strong>placeholder</strong> before anything is chosen, the single item’s label at one,
            and “N selected” at two or more.
          </Caption>
        </Section>

        <Rule />

        <Section title="Anatomy — the open menu" lead="The floating listbox the trigger opens into — solid and opaque (never translucent). The multiplicity signal lives here: every row carries a checkbox, and selected rows take a semibold label with no row fill (the checkbox carries selection). The active/hover layer is the same neutral gray as the single Select. The specimen below is house-faithful (real tokens + the real checkbox, follows the toolbar accent).">
          <MenuAnatomyDiagram />
          <AnatomyLegend parts={MENU_PARTS} />
          <Box mt="5" style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            <Text size="1" weight="bold" style={{ color: "var(--ds-text-weak)", fontFamily: "var(--code-font-family)" }}>LIVE — open it</Text>
            <Box data-testid="menu-demo" style={{ maxWidth: 260 }}>
              <MultiSelect label="Countries" defaultValue={["us", "de"]}>
                <MultiSelect.Group>
                  <MultiSelect.Label>North America</MultiSelect.Label>
                  <MultiSelect.Option value="us">United States</MultiSelect.Option>
                  <MultiSelect.Option value="ca">Canada</MultiSelect.Option>
                </MultiSelect.Group>
                <MultiSelect.Separator />
                <MultiSelect.Group>
                  <MultiSelect.Label>Europe</MultiSelect.Label>
                  <MultiSelect.Option value="gb">United Kingdom</MultiSelect.Option>
                  <MultiSelect.Option value="de">Germany</MultiSelect.Option>
                </MultiSelect.Group>
              </MultiSelect>
            </Box>
          </Box>
          <Caption>
            An <strong>Option</strong> is one choice; a <strong>Group</strong> + <strong>Label</strong>{" "}
            cluster related options under a heading; a <strong>Separator</strong> rules between groups.
            Assemble them as <strong>direct children</strong> of <Code>{"<MultiSelect>"}</Code> — one{" "}
            <Code>MultiSelect.Option</Code> per choice, no <Code>options={"{[…]}"}</Code> array prop, and
            no trigger or content element to write: the root renders the trigger and the floating listbox
            itself. The full row-state matrix (rest · hover · selected · selected+active · disabled) is the{" "}
            <strong>Menu states</strong> story.
          </Caption>
        </Section>

        <Rule />

        <Section title="Validation specimen" lead="A validation state paints the trigger’s border, a faint tint, a status glyph, and a one-line message below — the same accent-aware family as a TextField, wrapped in the single-control Field. The portaled menu stays neutral.">
          <ValidationSpecimen />
          <Caption>The trigger carries the border + tint; the message sits below it, top-aligned and wrapping.</Caption>
        </Section>

        <Rule />

        <Section title="States" lead="One trigger across its states — same chrome, different signal. Hover and focus appear as you point and tab; the rest are shown here.">
          <Grid columns={{ initial: "1", sm: "2" }} gapX="6" gapY="5" data-size-lesson="inset affordances hold step 1 — the clear ✕ garnishes the field, it doesn't join the row">
            <Scenario label="EMPTY · PLACEHOLDER" caption={<>No selection yet — the greyed <strong>placeholder</strong> hints at the choice. It is <strong>not</strong> a label.</>}>
              <MultiSelect label="Countries" placeholder="Select countries…"><MultiSelect.Option value="us">United States</MultiSelect.Option></MultiSelect>
            </Scenario>
            <Scenario label="ONE SELECTED" caption={<>A single choice shows its <Code>label</Code>, not a count.</>}>
              <MultiSelect defaultValue={["us"]} label="Countries"><MultiSelect.Option value="us">United States</MultiSelect.Option></MultiSelect>
            </Scenario>
            <Scenario label="MANY SELECTED" caption={<>Two or more collapse to <Code>“N selected”</Code>, so the fixed-height field never overflows.</>}>
              <MultiSelect defaultValue={["us", "ca", "de"]} clearable label="Countries"><MultiSelect.Option value="us">United States</MultiSelect.Option><MultiSelect.Option value="ca">Canada</MultiSelect.Option><MultiSelect.Option value="de">Germany</MultiSelect.Option></MultiSelect>
            </Scenario>
            <Scenario label="DISABLED" caption="Dimmed and inert — not focusable, not submitted.">
              <MultiSelect defaultValue={["us", "ca"]} disabled label="Countries"><MultiSelect.Option value="us">United States</MultiSelect.Option><MultiSelect.Option value="ca">Canada</MultiSelect.Option></MultiSelect>
            </Scenario>
          </Grid>
          <Caption>
            <strong>Interaction &amp; motion:</strong> the trigger is direct manipulation, so its hover tint is{" "}
            <strong>instant</strong> — no transition to sit through. The panel is an ambient surface and moves the
            other way, arriving faster than it leaves: it opens on <Code>--ds-duration-overlay</Code> (150ms) with{" "}
            <Code>--ds-ease-entry</Code> and closes on the slower <Code>--ds-duration-emphasis</Code> (260ms) with{" "}
            <Code>--ds-ease-standard</Code>, so a panel you have finished with eases off rather than being yanked
            away. <strong>Focus:</strong> the trigger carries the system ring on <Code>:focus-visible</Code>.
            It is the accent fill (<Code>--ds-stroke-focus</Code>) with a Radix alpha stacked on top, 2px wide,
            at 3:1 or more for every accent and mode ([[focus-ring]]). A validation state recolors the border stroke to the family (no halo). Each menu row's non-colour cue is its
            checkbox, not colour alone (WCAG 1.4.1).
          </Caption>
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
};

/* ---- Properties — full prop reference (PropTable / PropDef live in _storyKit) - */

const ROOT_PROPS: PropDef[] = [
  { name: "value / defaultValue", type: "string[]", desc: <>Controlled / uncontrolled selected values. The order is the selection order.</>, source: "MultiSelect.tsx" },
  { name: "onValueChange", type: "(v: string[]) => void", desc: <>Fires on every toggle / clear with the new array (live-apply).</>, source: "MultiSelect.tsx" },
  { name: "placeholder", type: "ReactNode", desc: <>Greyed hint shown while nothing is selected. A hint, <strong>not</strong> a label.</>, source: "MultiSelect.tsx" },
  { name: "countLabel", type: "(n: number) => ReactNode", def: `"N selected"`, desc: <>Override the 2+ count display — e.g. <Code>{`n => \`\${n} countries\``}</Code>.</>, source: "MultiSelect.tsx" },
  { name: "clearable", type: "boolean", def: "false", desc: <>Shows a clear ✕ while ≥1 value is selected and clears all; Backspace/Delete also clears (keyboard parity).</>, source: "MultiSelect.tsx" },
  { name: "selectAll", type: "boolean", def: "false", desc: <>Opt-in header above the list (outside the listbox) with <strong>Select all ⇄ Deselect all</strong>, a live <Code>“N of M selected”</Code> status, and a lighter <strong>Clear</strong>. Reach for it on long lists where bulk-selecting is a real task; <Code>Ctrl/Cmd+A</Code> works regardless.</>, source: "MultiSelect.tsx" },
  { name: "defaultOpen", type: "boolean", def: "false", desc: <>Open the panel on mount (uncontrolled) — used by docs to show the open listbox.</>, source: "MultiSelect.tsx" },
  { name: "label", type: "ReactNode", desc: <>The field’s name — renders the shared <Code>Field.Label</Code> and names the trigger. Pass none of label/description/validation to keep it bare.</>, source: "MultiSelect.tsx" },
  { name: "aria-label", type: "string", desc: <>Names the trigger when there is no visible <Code>label</Code> — a bare MultiSelect nested inside another control’s popover, say. Opt-in: omitted, the trigger stays named by its own content.</>, source: "MultiSelect.tsx" },
  { name: "info", type: "ReactNode", desc: <>Optional inline affordance beside the label — a tip icon or helper toggle.</>, source: "MultiSelect.tsx" },
  { name: "endSlot", type: "ReactNode", desc: <>Optional pinned note at the far end of the label row — “Optional”, a count, an action.</>, source: "MultiSelect.tsx" },
  { name: "description", type: "ReactNode", desc: <>Persistent helper line under the trigger; replaced by the validation message while a tone is active.</>, source: "MultiSelect.tsx" },
  { name: "validation", type: `{ tone; message }`, desc: <>Accent-aware validation painted on the <strong>trigger only</strong> — border + faint tint + status glyph + message below. The portaled panel stays neutral.</>, source: "MultiSelect.tsx" },
  { name: "size", type: `"1" | "2" | "3"`, def: `"1"`, desc: <>Control size. Unset, it resolves from the global <Code>uiSize</Code> (default <Code>small</Code> → <Code>1</Code>).</>, source: "MultiSelect.tsx" },
  { name: "disabled", type: "boolean", def: "false", desc: <>Dims the trigger and makes it inert — not focusable, won’t open.</>, source: "MultiSelect.tsx" },
];

const PART_PROPS: PropDef[] = [
  { name: "MultiSelect.Option", type: "{ value; disabled?; children }", desc: <>One choice. <Code>value</Code> is required and unique; <Code>children</Code> is the visible label; <Code>disabled</Code> dims it and carves it out of toggling and keyboard nav.</>, source: "MultiSelect.tsx" },
  { name: "MultiSelect.Group", type: "{ children }", desc: <>Wraps related options as a <Code>role=group</Code>, labelled by its <Code>MultiSelect.Label</Code>.</>, source: "MultiSelect.tsx" },
  { name: "MultiSelect.Label", type: "{ children }", desc: <>A non-selectable group heading, painted <Code>--ds-text-weak</Code>.</>, source: "MultiSelect.tsx" },
  { name: "MultiSelect.Separator", type: "—", desc: <>A decorative rule between groups, painted <Code>--ds-stroke-weak</Code>.</>, source: "MultiSelect.tsx" },
  { name: "MultiSelect.Empty", type: "+ slot", desc: <>A muted, non-focusable “no options” line — render it as the only child when the list is empty.</>, source: "MultiSelect.tsx" },
];

/** Menu states — the row-state matrix of the open panel, rendered live; the play asserts the [[multi-select-component]] contract. */
export const MenuStates: Story = {
  // SIDEBAR LEAF, in the house's sentence case. Left to Storybook the export name is
  // title-cased into "Menu States", which then disagrees with this page's own h1 —
  // the header suffix is the role humanized ("Menu states"), and the sidebar is the
  // same page. An explicit `name` does not change the story id.
  name: "Menu states",
  parameters: {
    // Renders the menu open (defaultOpen). Radix aria-hides the background while the trigger stays
    // focusable — axe flags aria-hidden-focus, but in a real app focus is managed into the listbox on
    // open. Scope that rule off for the open specimen (color-contrast stays off from the meta).
    a11y: { context: { exclude: [DODONT_LABEL] }, config: { rules: [{ id: "aria-hidden-focus", enabled: false }] } },
  },
  render: () => (
    <Page>
      <PageHeader title="MultiSelect · Menu states" standfirst={DEFINITION} />
      <Section
        title="Open menu — checkbox rows & states"
        lead="Each row carries a checkbox; selected rows take a semibold label with no row fill (the checkbox carries selection, so a wall of checked rows stays quiet). The active row (pointer or arrow-key) is a neutral gray layer, reused from the single Select. Open by default; hover or arrow to move the highlight."
      >
        <Box data-testid="open-panel" style={{ minHeight: 320, maxWidth: 280 }} data-size-lesson="inset affordances hold step 1 — the clear ✕ garnishes the field, it doesn't join the row">
          <MultiSelect label="Countries" defaultValue={["us", "ca", "de"]} clearable defaultOpen>
            <MultiSelect.Group>
              <MultiSelect.Label>Countries</MultiSelect.Label>
              <MultiSelect.Option value="us">United States</MultiSelect.Option>
              <MultiSelect.Option value="ca">Canada</MultiSelect.Option>
              <MultiSelect.Option value="mx">Mexico</MultiSelect.Option>
              <MultiSelect.Option value="de">Germany</MultiSelect.Option>
              <MultiSelect.Option value="gl" disabled>Greenland (unavailable)</MultiSelect.Option>
            </MultiSelect.Group>
          </MultiSelect>
        </Box>
        <Caption>
          <strong>Rest</strong> rows are an empty checkbox + weight 400; a <strong>selected</strong> row is a
          checked checkbox (<Code>--accent-indicator</Code> + <Code>--accent-contrast</Code> check) + weight 600, with
          no row fill; a non-selected <strong>active</strong> row adds a neutral <Code>--ds-fill-hover</Code>.
          The checkbox is the multiplicity signal; the weight is the parity cue with the single Select.
        </Caption>
      </Section>
    </Page>
  ),
  play: async ({ globals }) => {
    // The panel is portaled to document.body — assert on the live, open listbox (defaultOpen).

    // --- THE OPEN-STATE ROW BOX ([[box-law-scope]]). The rest-state manifest in `_control-box.stories.tsx` cannot
    // reach a row that only exists inside an opened portal, and it names each component's own suite as
    // where the open geometry is guarded. MultiSelect's live open panel is here, so this is that guard.
    assertMenuOptionBox({
      selector: ".rt-ds-multiselect-option",
      uiSize: String(globals.uiSize ?? "small"),
      label: "MultiSelect",
      minRows: 5,
    });

    const trigger = document.querySelector<HTMLElement>(".rt-SelectTrigger");
    if (!trigger) throw new Error("open panel: no trigger");
    if (trigger.getAttribute("aria-haspopup") !== "listbox") throw new Error("trigger must be aria-haspopup=listbox");
    if (trigger.getAttribute("aria-expanded") !== "true") throw new Error("trigger must be aria-expanded while open");
    if ((trigger.textContent || "").trim() !== "3 selected") throw new Error(`trigger should read "3 selected", got "${trigger.textContent}"`);

    const listbox = document.querySelector<HTMLElement>('[role="listbox"]');
    if (!listbox) throw new Error("open panel: no role=listbox (menu should be defaultOpen)");
    if (listbox.getAttribute("aria-multiselectable") !== "true") throw new Error("listbox must be aria-multiselectable=true");

    const options = Array.from(listbox.querySelectorAll<HTMLElement>('[role="option"]'));
    if (options.length !== 5) throw new Error(`expected 5 options, got ${options.length}`);

    // CRITICAL a11y guard — a listbox option must NOT contain an interactive widget. The checkbox is a
    // presentational, aria-hidden span; aria-selected is the source of truth.
    for (const opt of options) {
      if (opt.querySelector('[role="checkbox"], button, input')) {
        throw new Error("a11y trap: an option contains an interactive widget — the checkbox must be presentational");
      }
      if (!opt.hasAttribute("aria-selected")) throw new Error("every option must carry aria-selected");
    }

    const selected = options.find((o) => o.dataset.value === "us")!;
    if (selected.getAttribute("aria-selected") !== "true") throw new Error("United States must be aria-selected");
    const selBox = selected.querySelector<HTMLElement>(".rt-ds-checkbox-visual");
    if (!selBox || selBox.getAttribute("data-state") !== "checked") throw new Error("selected row checkbox must render data-state=checked");
    const selLabel = selected.querySelector<HTMLElement>(".rt-ds-multiselect-label")!;
    if (getComputedStyle(selLabel).fontWeight !== "600") throw new Error(`selected row label must render weight 600, got ${getComputedStyle(selLabel).fontWeight}`);

    const rest = options.find((o) => o.dataset.value === "mx")!;
    const restLabel = rest.querySelector<HTMLElement>(".rt-ds-multiselect-label")!;
    if (getComputedStyle(restLabel).fontWeight !== "400") throw new Error("rest rows must stay weight 400");

    const disabled = options.find((o) => o.dataset.value === "gl")!;
    if (disabled.getAttribute("aria-disabled") !== "true") throw new Error("Greenland must be aria-disabled");
    const disLabel = disabled.querySelector<HTMLElement>(".rt-ds-multiselect-label")!;
    if (getComputedStyle(disLabel).fontWeight === "600") throw new Error("disabled item must not take the selected weight-600 cue");

    // Checkbox check legibility. The check is a glyph on the indicator, not text, so it owes WCAG 3:1 on the
    // fill (1.4.11, [[textless-part-fills]]), the floor the non-text guard holds it to on all 27 accents.
    const root = themeRoot(listbox);
    assertPairing(root, "--accent-contrast", "--accent-indicator", 3);
    assertPairing(root, "--ds-text-weak", "--ds-bg-overlay", 4.5);
  },
};

/* ---- Keyboard contract --------------------------------------------------- */

/* KeyBinding, Kbd, SrcTag, KeyRow now live in _storyKit (shared with Select). MultiSelect's
   non-system keys are labelled "Popover" (src: "popover") — the @radix-ui/react-popover primitive. */

const CLOSED_TRIGGER_KEYS: KeyBinding[] = [
  { keys: ["Space", "Enter"], action: "Open the listbox.", src: "popover" },
  { keys: ["↓", "↑"], action: "Open the listbox and focus the first selected (or first) option.", src: "system" },
  { keys: ["Backspace", "Delete"], action: <>Clear a <Code>clearable</Code> selection — the keyboard equivalent of the clear ✕ (which sits out of the tab order). Fires only while ≥1 value is selected.</>, src: "system" },
];

const OPEN_MENU_KEYS: KeyBinding[] = [
  { keys: ["↑", "↓"], action: "Move the active option up / down (roving focus). Disabled options are skipped.", src: "system" },
  { keys: ["Home", "End"], action: "Jump to the first / last option.", src: "system" },
  { keys: ["A–Z 0–9"], action: <>Type-ahead <strong>jump</strong> to the next matching option — never a filter, never a toggle; every option stays in the list.</>, src: "system" },
  { keys: ["Space", "Enter"], action: <>Toggle the active option; the panel <strong>stays open</strong> and the count updates live. <Code>Enter</Code> <strong>preventDefaults</strong> so it never submits a surrounding form.</>, src: "system" },
  { keys: ["Shift+↑", "Shift+↓"], action: "Move and extend the selection to the newly-active option (range-extend).", src: "system" },
  { keys: ["Ctrl/⌘+A"], action: "Select all options; press again to clear all.", src: "system" },
  { keys: ["Esc", "Tab"], action: "Close the panel without reverting (there is no buffer); focus returns to the trigger.", src: "system" },
];

/** Keyboard — the complete key → action contract for the custom listbox. */
export const Keyboard: Story = {
  render: () => (
    <Page>
      <PageHeader title="MultiSelect · Keyboard" standfirst={DEFINITION} />
      <Section title="Keyboard" lead={<>The full key → action contract. <Code>Tab</Code> moves focus to and from the trigger (one tab stop); inside the open listbox, arrows rove. Because the engine is a custom listbox (Radix Select can’t go multi), almost every binding is <strong>system</strong>-owned; the trigger’s open/close is the <Code>@radix-ui/react-popover</Code> primitive.</>}>
        <Flex direction="column" gap="2">
          <Box style={{ maxWidth: 280 }} data-size-lesson="inset affordances hold step 1 — the clear ✕ garnishes the field, it doesn't join the row">
            <MultiSelect label="Countries" clearable defaultValue={["us"]} description="Focus the trigger, then try the keys below.">
              <MultiSelect.Group>
                <MultiSelect.Label>North America</MultiSelect.Label>
                <MultiSelect.Option value="us">United States</MultiSelect.Option>
                <MultiSelect.Option value="ca">Canada</MultiSelect.Option>
                <MultiSelect.Option value="mx" disabled>Mexico (unavailable)</MultiSelect.Option>
              </MultiSelect.Group>
              <MultiSelect.Separator />
              <MultiSelect.Group>
                <MultiSelect.Label>Europe</MultiSelect.Label>
                <MultiSelect.Option value="gb">United Kingdom</MultiSelect.Option>
                <MultiSelect.Option value="de">Germany</MultiSelect.Option>
                <MultiSelect.Option value="fr">France</MultiSelect.Option>
              </MultiSelect.Group>
            </MultiSelect>
          </Box>
          <Caption>A live target — <Code>clearable</Code> with a value (so Backspace/Delete clears it), and “Mexico” disabled (so you can watch arrow-nav and type-ahead step over it).</Caption>
        </Flex>
        <Flex direction="column" gap="4">
          <TokenGroup label="CLOSED TRIGGER · MENU CLOSED, TRIGGER FOCUSED">
            {CLOSED_TRIGGER_KEYS.map((b) => <KeyRow key={b.keys.join("+")} {...b} />)}
          </TokenGroup>
          <TokenGroup label="OPEN MENU · LISTBOX FOCUSED">
            {OPEN_MENU_KEYS.map((b) => <KeyRow key={b.keys.join("+")} {...b} />)}
          </TokenGroup>
        </Flex>
        <Caption><strong>Pointer &amp; display</strong> — clicking a row toggles it and keeps the panel open; clicking outside closes it (same as <Code>Esc</Code>). The full row is the toggle target, not just the box. Disabled options are inert.</Caption>
      </Section>
    </Page>
  ),
};

/** Usage: when to reach for MultiSelect, grouping, the count, the empty state, validation, bulk select,
 *  and the live token spec that closes the page. */
export const Usage: Story = {
  parameters: {
    // The bulk-select demo below renders a menu open (defaultOpen), so aria-hidden-focus stays scoped off
    // by rule id (in a real app focus is managed into the listbox on open). color-contrast, by contrast,
    // is ON again: the warning message (#ab6400 on #fcfcfd = 4.49 — the accepted step-11 seam) is
    // excluded as an element instead. The placeholder was excluded here too until 2026-08-04; the
    // family rule in components.css now clears it (--ds-text-weak, 5.92 light / 9.34 dark).
    a11y: {
      context: {
        exclude: [DODONT_LABEL, "[style*='--ds-text-disabled']",
                  "[style*='--ds-text-warning']", '[data-field-part="message"][data-tone="warning"]', "[style*='--ds-text-success']", '[data-field-part="message"][data-tone="success"]', "[style*='--ds-text-error']", '[data-field-part="message"][data-tone="error"]'],
      },
      config: { rules: [{ id: "aria-hidden-focus", enabled: false }] },
    },
  },
  render: (_args, { globals }) => (
    <Page>
      <PageHeader title="MultiSelect · Usage" standfirst={DEFINITION} />
      <ComparisonSection comparison={PICK_FROM_SET_COMPARISON} highlight="Select / MultiSelect" />

      <Rule />

      <Section
        title="MultiSelect vs. a checkbox group — about five to seven options"
        lead="Many-of-many has two shapes. A CheckboxGroup shows every option at once, which is its strength — until the list is long enough to dominate the form. Past roughly five to seven options, collapse the set into a MultiSelect so it stays compact and the panel scrolls; below that, a CheckboxGroup keeps every choice visible and one tap away."
      >
        <Grid columns={{ initial: "1", sm: "2" }} gap="3">
          <DoDont kind="do" bare note="A long many-of-many — countries, tags, a dozen permissions — collapses into a MultiSelect, so the form stays compact and the panel scrolls. The trigger summarises with a count.">
            <Box style={{ width: 240 }}>
              <MultiSelect label="Countries" placeholder="Select countries…" clearable><MultiSelect.Option value="us">United States</MultiSelect.Option><MultiSelect.Option value="ca">Canada</MultiSelect.Option><MultiSelect.Option value="gb">United Kingdom</MultiSelect.Option><MultiSelect.Option value="de">Germany</MultiSelect.Option><MultiSelect.Option value="fr">France</MultiSelect.Option><MultiSelect.Option value="jp">Japan</MultiSelect.Option></MultiSelect>
            </Box>
          </DoDont>
          <DoDont kind="dont" bare note="Two or three short options hidden behind a MultiSelect — the user pays a click to see choices that would fit inline, and loses the at-a-glance state a row of checkboxes gives. Use a CheckboxGroup so all options and their states stay visible.">
            <Box style={{ width: 240 }}>
              <MultiSelect defaultValue={["email"]} label="Notify me by"><MultiSelect.Option value="email">Email</MultiSelect.Option><MultiSelect.Option value="sms">SMS</MultiSelect.Option></MultiSelect>
            </Box>
          </DoDont>
        </Grid>
      </Section>

      <Rule />

      <Section title="The trigger counts; the menu stays open" lead="Unlike the single Select — which commits and closes on a pick — MultiSelect is live-apply: each toggle commits immediately and the panel stays open so you can pick several in a row. The trigger summarises adaptively (placeholder → the one label → “N selected”) so it never overflows the fixed-height field. The single Select marks its chosen row with a solid accent fill; MultiSelect gives every row a checkbox — that is how you tell them apart the instant they open.">
        <Grid columns={{ initial: "1", sm: "2" }} gapX="6" gapY="5" data-size-lesson="inset affordances hold step 1 — the clear ✕ garnishes the field, it doesn't join the row">
          <Scenario label="LIVE COUNT" caption="Open it and toggle a few — the trigger updates to “N selected” while the panel stays open.">
            <MultiSelect label="Countries" defaultValue={["us", "ca"]} clearable placeholder="Select countries…">
              <MultiSelect.Option value="us">United States</MultiSelect.Option>
              <MultiSelect.Option value="ca">Canada</MultiSelect.Option>
              <MultiSelect.Option value="gb">United Kingdom</MultiSelect.Option>
              <MultiSelect.Option value="de">Germany</MultiSelect.Option>
            </MultiSelect>
          </Scenario>
          <Scenario label="CLEAR ALL" caption="With clearable, the ✕ resets the whole selection to the placeholder; Backspace/Delete on the focused trigger does the same.">
            <MultiSelect label="Countries" defaultValue={["us", "ca", "de"]} clearable>
              <MultiSelect.Option value="us">United States</MultiSelect.Option>
              <MultiSelect.Option value="ca">Canada</MultiSelect.Option>
              <MultiSelect.Option value="de">Germany</MultiSelect.Option>
            </MultiSelect>
          </Scenario>
        </Grid>
      </Section>

      <Rule />

      <Section title="Group long lists; signal an empty list" lead="When a list is long but clusters naturally — countries by continent, settings by area — wrap each cluster in a Group with a Label and rule them apart with a Separator. When there are genuinely no options to show, render MultiSelect.Empty so the panel never opens to silence.">
        <Grid columns={{ initial: "1", sm: "2" }} gapX="6" gapY="5">
          <Scenario label="GROUPED" caption={<>Open it: options sit under <strong>North America</strong> and <strong>Europe</strong> headings, separated by a rule.</>}>
            <MultiSelect label="Countries" placeholder="Select countries…">
              <MultiSelect.Group>
                <MultiSelect.Label>North America</MultiSelect.Label>
                <MultiSelect.Option value="us">United States</MultiSelect.Option>
                <MultiSelect.Option value="ca">Canada</MultiSelect.Option>
              </MultiSelect.Group>
              <MultiSelect.Separator />
              <MultiSelect.Group>
                <MultiSelect.Label>Europe</MultiSelect.Label>
                <MultiSelect.Option value="gb">United Kingdom</MultiSelect.Option>
                <MultiSelect.Option value="de">Germany</MultiSelect.Option>
              </MultiSelect.Group>
            </MultiSelect>
          </Scenario>
          <Scenario label="EMPTY" caption={<>No options to show — a muted <Code>MultiSelect.Empty</Code> line stands in, so the menu never opens blank.</>}>
            <MultiSelect label="Tags" placeholder="Select tags…">
              <MultiSelect.Empty>No tags yet</MultiSelect.Empty>
            </MultiSelect>
          </Scenario>
        </Grid>
      </Section>

      <Rule />

      <Section
        title="Validation"
        lead={<>Four tones, driven by the toolbar above. Each paints the trigger’s border + tint + a status glyph and a single-sentence message below — the same accent-aware family as a TextField, in the single-control <Code>Field</Code>.</>}
      >
        <Box data-testid="validation-grid">
          <Grid columns={{ initial: "1", sm: "2" }} gapX="6" gapY="5">
            <MultiSelect validation={{ tone: "error", message: "Select at least one country." }} label="Countries"><MultiSelect.Option value="us">United States</MultiSelect.Option></MultiSelect>
            <MultiSelect defaultValue={["legacy"]} validation={{ tone: "warning", message: "Legacy regions lose support next year." }} label="Regions"><MultiSelect.Option value="legacy">Legacy</MultiSelect.Option></MultiSelect>
            <MultiSelect defaultValue={["us", "ca"]} validation={{ tone: "success", message: "Coverage looks good." }} label="Countries"><MultiSelect.Option value="us">United States</MultiSelect.Option><MultiSelect.Option value="ca">Canada</MultiSelect.Option></MultiSelect>
          </Grid>
        </Box>
        <Caption>
          <strong>error</strong> blocks submission and takes <Code>role="alert"</Code>;{" "}
          <strong>warning</strong> cautions without blocking; <strong>success</strong> confirms. For calm
          guidance, prefer the persistent <Code>description</Code> helper over a tone.
        </Caption>
      </Section>

      <Rule />

      <Section
        title="Bulk select — the optional header"
        lead="Set selectAll on a long list where selecting all or most is a real task — permissions, regions, tags. It adds a header ABOVE the options (outside the listbox) with Select all ⇄ Deselect all, a live “N of M selected” status, and a lighter Clear. Off by default: most multi-selects don't need it, and Ctrl/Cmd+A selects all from the keyboard regardless — a visible select-all control is uncommon, so reach for it when bulk-selection is the point, not for a short list."
      >
        <Box data-testid="select-all" style={{ minHeight: 360, maxWidth: 280 }} data-size-lesson="inset affordances hold step 1 — the clear ✕ garnishes the field, it doesn't join the row">
          <MultiSelect label="Permissions" selectAll clearable defaultOpen defaultValue={["read", "write"]} placeholder="Select permissions…">
            <MultiSelect.Option value="read">Read</MultiSelect.Option>
            <MultiSelect.Option value="write">Write</MultiSelect.Option>
            <MultiSelect.Option value="deploy">Deploy</MultiSelect.Option>
            <MultiSelect.Option value="billing">Billing</MultiSelect.Option>
            <MultiSelect.Option value="admin">Admin</MultiSelect.Option>
          </MultiSelect>
        </Box>
        <Caption>
          <strong>Select all (5)</strong> flips to <strong>Deselect all (5)</strong> once everything is on; the count is a{" "}
          <Code>role=status</Code> live region; <strong>Clear</strong> hides when nothing is selected. The header sits outside{" "}
          <Code>role=listbox</Code>, so the listbox stays a clean list of options. The trigger ✕ still clears, too — the panel
          Clear is for restarting mid-session, the trigger ✕ for “done, want nothing.”
        </Caption>
      </Section>

      <Rule />

      <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
        <Section title="Tokens" lead="The resting trigger plus each validation tone, the open-menu rows, and the tokens that paint them. Semantic tones are accent-aware — they follow a brand’s collision shifts. Every --ds-* row is read live from the running theme, so this table can’t drift from the code.">
          <Flex direction="column" gap="4">
            <TokenGroup label="DEFAULT (rest)" blurb="The neutral trigger — a surface border + fill and neutral count text; on focus it gains the system ring, the accent with a stacked alpha ([[focus-ring]])." specimen={<Box style={{ width: 200 }}><MultiSelect defaultValue={["us", "ca"]} label="Countries"><MultiSelect.Option value="us">United States</MultiSelect.Option><MultiSelect.Option value="ca">Canada</MultiSelect.Option></MultiSelect></Box>}>
              <MeasuredSpec render={() => <MultiSelect defaultValue={["us", "ca"]} label="Countries"><MultiSelect.Option value="us">United States</MultiSelect.Option><MultiSelect.Option value="ca">Canada</MultiSelect.Option></MultiSelect>}>
                <MeasuredRow
                  part="Count text"
                  note="The “N selected” summary on the resting trigger."
                  token="--ds-text-strong"
                  select=".rt-SelectTrigger"
                  prop="color"
                />
                <MeasuredRow
                  part="Focus ring"
                  note="Drawn on the trigger's outline, the same 2px ring every control wears. The accent base, with the stack alpha on top ([[focus-ring]])."
                  token="--ds-stroke-focus"
                  select=".rt-SelectTrigger"
                  prop="outline-color"
                  state="focus-visible"
                />
              </MeasuredSpec>
              <NoteRow part="Border (rest)" value="Radix surface — inset 1px" radix="--gray-a7" />
              <NoteRow part="Placeholder" value="Radix gray-9 (~3.78:1) — a hint, contrast-exempt like disabled text" radix="--gray-9" />
            </TokenGroup>
            <TokenGroup label="ERROR" blurb="A blocking problem — no valid choice is selected." specimen={<Box style={{ width: 200 }}><MultiSelect validation={{ tone: "error", message: "Required." }} label="Regions"><MultiSelect.Option value="na">North America</MultiSelect.Option></MultiSelect></Box>}>
              <MeasuredSpec render={() => <MultiSelect validation={{ tone: "error", message: "Required." }} label="Regions"><MultiSelect.Option value="na">North America</MultiSelect.Option></MultiSelect>}>
                <MeasuredRow part="Tint (fill)" note="The faint wash the trigger takes while the tone is active." token="--ds-fill-error-weak" select=".rt-SelectTrigger" prop="background-color" />
                <MeasuredRow part="Message + glyph" note="Read off the status mark below the trigger; the message shares its ink." token="--ds-text-error" select="[data-validation='error'] svg:not(.rt-SelectIcon)" prop="color" />
              </MeasuredSpec>
              <NoteRow part="Border" value="inset 1px ring — the family step-8 stroke" radix="--ds-stroke-error" />
            </TokenGroup>
            <TokenGroup label="WARNING" blurb="A caution worth flagging — accepted but maybe not intended." specimen={<Box style={{ width: 200 }}><MultiSelect defaultValue={["legacy"]} validation={{ tone: "warning", message: "Legacy region." }} label="Regions"><MultiSelect.Option value="legacy">Legacy</MultiSelect.Option></MultiSelect></Box>}>
              <MeasuredSpec render={() => <MultiSelect defaultValue={["legacy"]} validation={{ tone: "warning", message: "Legacy region." }} label="Regions"><MultiSelect.Option value="legacy">Legacy</MultiSelect.Option></MultiSelect>}>
                <MeasuredRow part="Tint (fill)" note="The faint wash the trigger takes while the tone is active." token="--ds-fill-warning-weak" select=".rt-SelectTrigger" prop="background-color" />
                <MeasuredRow part="Message + glyph" note="Read off the status mark below the trigger; the message shares its ink." token="--ds-text-warning" select="[data-validation='warning'] svg:not(.rt-SelectIcon)" prop="color" />
              </MeasuredSpec>
              <NoteRow part="Border" value="inset 1px ring — the family step-8 stroke" radix="--ds-stroke-warning" />
            </TokenGroup>
            <TokenGroup label="SUCCESS" blurb="Positive confirmation — the choices checked out." specimen={<Box style={{ width: 200 }}><MultiSelect defaultValue={["pro"]} validation={{ tone: "success", message: "Good set." }} label="Regions"><MultiSelect.Option value="pro">Pro</MultiSelect.Option></MultiSelect></Box>}>
              <MeasuredSpec render={() => <MultiSelect defaultValue={["pro"]} validation={{ tone: "success", message: "Good set." }} label="Regions"><MultiSelect.Option value="pro">Pro</MultiSelect.Option></MultiSelect>}>
                <MeasuredRow part="Tint (fill)" note="The faint wash the trigger takes while the tone is active." token="--ds-fill-success-weak" select=".rt-SelectTrigger" prop="background-color" />
                <MeasuredRow part="Message + glyph" note="Read off the status mark below the trigger; the message shares its ink." token="--ds-text-success" select="[data-validation='success'] svg:not(.rt-SelectIcon)" prop="color" />
              </MeasuredSpec>
              <NoteRow part="Border" value="inset 1px ring — the family step-8 stroke" radix="--ds-stroke-success" />
            </TokenGroup>
            <TokenGroup label="FLOATING CONTENT (open menu)" blurb="The portaled listbox and its rows. Selection is carried by the per-row checkbox + a semibold label — no row fill; the active row (pointer / arrow) is a neutral layer, reused from the single Select.">
              {/* The panel is portaled to <body> while the trigger is open, and the component exposes no
                  way to redirect that portal, so the host carries the panel's OWN element and row markup —
                  the same classes and state attributes the live panel renders, and the REAL CheckboxVisual
                  the rows use. The stylesheet paints them identically and the story names no role, so every
                  row below still compares two independent readings. */}
              <MeasuredSpec render={() => <PanelSpecimen />}>
                <MeasuredRow
                  part="Panel surface"
                  note="Solid and opaque — a menu never lets the page read through it."
                  token="--ds-bg-overlay"
                  select=".rt-ds-multiselect-panel"
                  prop="background-color"
                />
                <MeasuredRow
                  part="Checkbox · checked fill"
                  note="The box itself is drawn on the indicator's backdrop layer."
                  token="--accent-indicator"
                  select=".rt-ds-checkbox-visual[data-state='checked']"
                  prop="background-color"
                  pseudo="::before"
                />
                <MeasuredRow
                  part="Checkbox · check"
                  note="The guaranteed-contrast mark that sits on that fill."
                  token="--accent-contrast"
                  select=".rt-ds-checkbox-visual[data-state='checked'] .rt-BaseCheckboxIndicator"
                  prop="color"
                />
                <MeasuredRow
                  part="Active row (hover / arrow)"
                  note="The transient neutral layer — selected rows take no fill of their own."
                  token="--ds-fill-hover"
                  select=".rt-ds-multiselect-option[data-active]"
                  prop="background-color"
                />
                <MeasuredRow
                  part="Group label"
                  note="A non-selectable heading over a run of rows."
                  token="--ds-text-weak"
                  select=".rt-ds-multiselect-grouplabel"
                  prop="color"
                />
                <MeasuredRow
                  part="Separator"
                  note="The hairline that rules one group off from the next."
                  token="--ds-stroke-weak"
                  select=".rt-ds-multiselect-separator"
                  prop="background-color"
                />
              </MeasuredSpec>
              <NoteRow part="Selected row · label" value="weight 600 — the parity cue with the single Select’s bold selected row" />
            </TokenGroup>
          </Flex>
        </Section>
      </HexThemeKey.Provider>
    </Page>
  ),
  play: async ({ canvasElement }) => {
    const near = (a: number, b: number, tol = 4) => Math.abs(a - b) <= tol;
    const colorRe = /rgba?\([^)]*\)|#[0-9a-fA-F]{3,8}|color\([^)]*\)/g;

    // Each tone's trigger border resolves to --ds-stroke-{tone} (the trigger reuses .rt-SelectTrigger).
    const tones = ["error", "warning", "success"] as const;
    for (const tone of tones) {
      const w = canvasElement.querySelector<HTMLElement>(`[data-validation="${tone}"]`);
      if (!w) throw new Error(`missing ${tone} specimen`);
      const trigger = w.querySelector<HTMLElement>(".rt-SelectTrigger");
      if (!trigger) throw new Error(`${tone} specimen has no trigger`);
      const shadow = getComputedStyle(trigger).boxShadow;
      if (shadow === "none") throw new Error(`${tone} trigger must carry a border`);
      const want = resolveColor(w, `--ds-stroke-${tone}`);
      const toks = shadow.match(colorRe) || [];
      if (!toks.some((t) => { const c = parseColor(t); return near(c.r, want.r) && near(c.g, want.g) && near(c.b, want.b); })) {
        throw new Error(`${tone} border must resolve to --ds-stroke-${tone}; got ${shadow}`);
      }
    }

    // The error trigger carries aria-invalid + the message has role=alert and is referenced.
    const errWrap = canvasElement.querySelector<HTMLElement>('[data-validation="error"]')!;
    const trigger = errWrap.querySelector<HTMLElement>(".rt-SelectTrigger")!;
    if (trigger.getAttribute("aria-invalid") !== "true") throw new Error("error trigger must set aria-invalid");
    const msg = errWrap.querySelector<HTMLElement>('[role="alert"]')!;
    if (!msg?.id || trigger.getAttribute("aria-describedby") !== msg.id) {
      throw new Error("aria-describedby must reference the message id");
    }

    // Bulk-select header (selectAll, rendered open above) — the #1 constraint: it sits OUTSIDE role=listbox.
    const header = document.querySelector<HTMLElement>(".rt-ds-multiselect-header");
    if (!header) throw new Error("selectAll: header not found");
    const saListbox = document.querySelector<HTMLElement>('[role="listbox"]')!;
    if (saListbox.contains(header)) throw new Error("the select-all header must sit OUTSIDE role=listbox");
    const saStatus = header.querySelector<HTMLElement>('[role="status"]');
    if (!saStatus || !/\d+ of \d+ selected/.test(saStatus.textContent ?? "")) {
      throw new Error(`header must carry a "N of M selected" role=status; got "${saStatus?.textContent}"`);
    }
    const saBtns = Array.from(header.querySelectorAll<HTMLButtonElement>("button"));
    if (!/select all \(5\)/i.test(saBtns[0]?.textContent ?? "")) {
      throw new Error(`lead button should read "Select all (5)"; got "${saBtns[0]?.textContent}"`);
    }
    if (!saBtns.some((b) => /clear/i.test(b.textContent ?? ""))) {
      throw new Error("a Clear button should show while ≥1 value is selected");
    }
  },
};

/* ---- Props ---------------------------------------------------------- */

type PropsArgs = {
  showLabel?: boolean;
  label?: string;
  placeholder?: string;
  description?: string;
  validation?: { tone: "error" | "warning" | "success" | "info"; message: string };
  size?: "auto" | "1" | "2" | "3";
  width?: number;
  clearable?: boolean;
  selectAll?: boolean;
  defaultValue?: string[];
  showInfo?: boolean;
  infoText?: string;
  endSlot?: string;
};

/** Props — a prototyping tool for the field. Drive every capability — the label row + its info
 *  affordance and end-slot, the placeholder, description, validation, size, clearable, and the initial
 *  selection (a live check control). */
export const Props: StoryObj<PropsArgs> = {
  args: {
    showLabel: true,
    label: "Countries",
    placeholder: "Select countries…",
    description: "Used for tax and shipping estimates.",
    // "auto" (size unset) is the default so the field tracks the global uiSize toolbar out of the box.
    size: "auto",
    width: 320,
    clearable: true,
    selectAll: false,
    defaultValue: ["us", "ca"],
    showInfo: false,
    infoText: "Pick every country you ship to — change it any time in settings.",
    endSlot: "Optional",
  },
  argTypes: {
    showLabel: { name: "label (show)", control: "boolean" },
    label: { control: "text", if: { arg: "showLabel" } },
    placeholder: { control: "text" },
    description: { name: "description (helper)", control: "text" },
    clearable: { name: "clearable (✕)", control: "boolean" },
    selectAll: { name: "selectAll (header)", control: "boolean" },
    defaultValue: { name: "initial selection", control: "check", options: ["us", "ca", "gb", "de", "fr"] },
    showInfo: { name: "info (show)", control: "boolean" },
    infoText: { name: "info text", control: "text", if: { arg: "showInfo" } },
    endSlot: { name: "end-slot", control: "text" },
    validation: {
      control: "inline-radio",
      options: ["none", "error", "warning", "success", "info"],
      mapping: {
        none: undefined,
        error: { tone: "error", message: "Select at least one country." },
        warning: { tone: "warning", message: "Double-check this set." },
        success: { tone: "success", message: "That works." },
        info: { tone: "info", message: "You can change this later in settings." },
      },
    },
    size: { control: "inline-radio", options: ["auto", "1", "2", "3"], description: '"auto" tracks the global uiSize toolbar (unset → the control lane); a step (1–3) pins the field.' },
    width: { control: { type: "range", min: 180, max: 480, step: 20 } },
  },
  parameters: { controls: { disable: false } },
  render: ({ showLabel, label, placeholder, description, validation, size, width, clearable, selectAll, defaultValue, showInfo, infoText, endSlot }: PropsArgs) => {
    const infoNode = showInfo ? (
      <span title={infoText || undefined} style={{ display: "inline-flex", cursor: "help" }}>
        <Info size={16} weight="regular" aria-hidden style={{ color: "var(--ds-icon-neutral)", display: "block" }} />
      </span>
    ) : undefined;
    const endSlotNode = endSlot ? <Text size="1" style={{ color: "var(--ds-text-weak)" }}>{endSlot}</Text> : undefined;
    return (
      <Page maxWidth="none">
        <PageHeader title="MultiSelect · Props" standfirst={DEFINITION} />
        <Box p="5" style={{ maxWidth: width }}>
          <MultiSelect
            // Remount when the initial selection arg changes (it seeds an uncontrolled defaultValue).
            key={(defaultValue ?? []).join(",")}
            label={showLabel ? label : undefined}
            info={infoNode}
            endSlot={endSlotNode}
            description={description}
            validation={validation}
            size={size === "auto" ? undefined : size}
            clearable={clearable}
            selectAll={selectAll}
            defaultValue={defaultValue}
            placeholder={placeholder}
          >
            <MultiSelect.Option value="us">United States</MultiSelect.Option>
            <MultiSelect.Option value="ca">Canada</MultiSelect.Option>
            <MultiSelect.Option value="gb">United Kingdom</MultiSelect.Option>
            <MultiSelect.Option value="de">Germany</MultiSelect.Option>
            <MultiSelect.Option value="fr">France</MultiSelect.Option>
          </MultiSelect>
        </Box>
        <PropsLead />
        <Rule />
        <Section title="Props reference" lead={<>Every prop <Code>MultiSelect</Code> accepts, grouped by part — the root layers the shared <Code>Field</Code> chrome on the custom listbox engine, and options are authored as JSX children.</>}>
          <Section title="Root — the field" lead={<>The <Code>&lt;MultiSelect&gt;</Code> element. System props (label, info, endSlot, description, validation, clearable, placeholder, countLabel, selectAll) layer the shared <Code>Field</Code> chrome on the custom listbox engine.</>}>
            <PropTable rows={ROOT_PROPS} />
          </Section>
          <Section title="Options & structure" lead={<>Options are authored as JSX children — one <Code>MultiSelect.Option</Code> per choice (no <Code>options=[]</Code> data prop), optionally clustered in <Code>Group</Code>s with a <Code>Label</Code> and ruled apart by a <Code>Separator</Code>.</>}>
            <PropTable rows={PART_PROPS} />
          </Section>
        </Section>
      </Page>
    );
  },
};

/** History — the rulings this component encodes and a changelog of how it changes over time. */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="MultiSelect · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[multi-select-component]] · two components">
            <strong>Two components, not a <Code>multiple</Code> prop.</strong> Radix Select is single-value
            (its <Code>value</Code> is a <Code>string</Code>), so the multi engine is a from-scratch custom
            listbox regardless — and a <Code>multiple</Code> flag would advertise interchangeability at the
            exact moment the goal is the opposite. <Code>Select</Code> and <Code>MultiSelect</Code> read as
            siblings; only the multiplicity signals differ.
          </Decision>
          <Decision id="[[multi-select-component]] · distinct signals">
            <strong>Distinct signals.</strong> The single Select marks the chosen row with a solid accent
            fill (no checkmark); MultiSelect gives every row a <strong>checkbox</strong> — the universal
            “many can be on” affordance — and the trigger an <strong>adaptive count</strong> (0 → placeholder
            · 1 → the item label · 2+ → “N selected”). The gutter the single Select dropped is exactly where
            multi’s checkbox column returns, so the two look different the instant they open.
          </Decision>
          <Decision id="[[multi-select-component]] · live-apply, stay-open">
            <strong>Live-apply, stay-open.</strong> Each toggle commits to <Code>value: string[]</Code>
            immediately (the count stays live) and the panel stays open; Escape / Tab / outside-click close
            without reverting — there is no transactional buffer. The clear ✕ clears all.
          </Decision>
          <Decision id="[[floating-surface-fill]] · opaque panel">
            The floating panel is <Code>solid</Code> (opaque), per the layering rule — a menu must never be
            translucent without an opaque backstop.
          </Decision>
          <Decision id="[[field-shell]] · Field shell">
            The shared <Code>Field</Code> shell owns the label + validation rows and threads aria via context.
            MultiSelect wraps in the single-control <Code>Field</Code> (<Code>aria-invalid</Code> on the
            trigger), not the group <Code>FieldGroup</Code>.
          </Decision>
          <Decision id="[[focus-ring]] · focus ring">
            The focus ring is the accent fill, <Code>--ds-stroke-focus</Code>, with a Radix alpha,{" "}
            <Code>--ds-stroke-focus-stack</Code>, stacked on top so it clears 3:1 and APCA Lc 30. It is 2px
            wide and the same on every control. It reaches the trigger through the shared{" "}
            <Code>.rt-SelectTrigger</Code> chrome (no <Code>!important</Code>). It replaces the neutral{" "}
            <Code>gray-12</Code> ring the controls wore before. A validation state recolors the border stroke to the family (no halo).
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            Added an opt-in <Code>selectAll</Code> header (off by default) — Select all ⇄ Deselect all, a
            live <Code>“N of M selected”</Code> status, and a lighter Clear, all outside the listbox.
            A visible select-all header is uncommon; the
            keyboard <Code>Ctrl/Cmd+A</Code> works regardless.
          </Decision>
          <Decision id="0.9.0">
            New component. A custom multi-selectable listbox on the shared <Code>Field</Code> shell:
            checkbox rows, an adaptive count trigger, live-apply toggling, clear-all, and the full
            listbox keyboard. Reuses the Select trigger chrome, the system focus ring, the clear ✕,
            the size scale, and the tokens. Stories: History · Anatomy · Usage · Menu states · Keyboard ·
            Props (the full prop reference is merged into the Props).
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
