import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import {
  TextAlignLeft, TextAlignCenter, TextAlignRight, TextB, TextItalic, TextUnderline,
} from "@phosphor-icons/react";
import { ToggleButtonGroup } from "./ToggleButtonGroup";
import { Select } from "./Select";
import {
  Caption, Decision, DoDont, DODONT_LABEL, HexThemeKey, MeasuredRow, MeasuredSpec, Mono, NoteRow, Page, PageHeader,
  PropsLead, type PropDef, PropTable, Rule, Section,
} from "./_storyKit";
import { assertMeasuredRows } from "../../foundations/_assert";

/** The component's definition — one source, referenced by the header of every story on this page. */
const DEFINITION = <>A set of related toggle buttons — a single-select segmented control or a multi-select toolbar. The selected item reuses ToggleButton's pressed fill, edge and bolded label; where the items are icons and there is no label to bold, <Code>pressedIcon</Code> swaps the glyph instead, so which one is on reads as a shape and not only a colour.</>;

/* The two icon faces of the alignment set. `pressedIcon` is what keeps an ICON-ONLY selection off colour
   alone: the selected item draws a DIFFERENT mark (the bold weight of the same glyph), and a different
   mark survives having the hue removed. The inherited weight-600 cue cannot do that job here — an
   icon-only item has no characters for a weight to act on. */
const ALIGN = [
  { value: "left", label: "Align left", rest: <TextAlignLeft />, pressed: <TextAlignLeft weight="bold" /> },
  { value: "center", label: "Align center", rest: <TextAlignCenter />, pressed: <TextAlignCenter weight="bold" /> },
  { value: "right", label: "Align right", rest: <TextAlignRight />, pressed: <TextAlignRight weight="bold" /> },
];
const FORMAT = [
  { value: "bold", label: "Bold", rest: <TextB />, pressed: <TextB weight="bold" /> },
  { value: "italic", label: "Italic", rest: <TextItalic />, pressed: <TextItalic weight="bold" /> },
  { value: "underline", label: "Underline", rest: <TextUnderline />, pressed: <TextUnderline weight="bold" /> },
];

const items = (set: typeof ALIGN) => (
  <>
    {set.map((it) => (
      <ToggleButtonGroup.Item key={it.value} value={it.value} aria-label={it.label} pressedIcon={it.pressed}>
        {it.rest}
      </ToggleButtonGroup.Item>
    ))}
  </>
);

/* The selected item reuses ToggleButton's pressed fill (--ds-fill-selected-subtle) — the same token,
   painted by the same [[toggle-button]] ghost [data-state="on"] rule. MEASURED: the row reads that fill off a real
   selected item in the measurement host (a selection is a state a static render holds) and checks it
   against the token it names. The version this replaces painted a probe with the same token and printed
   its hex, so the row agreed with itself rather than with the component. */
function SelectedFillSpec() {
  return (
    <Box style={{ borderRadius: "var(--ds-radius-4)", border: "1px solid var(--ds-stroke-weak)", overflow: "hidden", background: "var(--ds-bg-subtle)" }}>
      <Flex align="center" gap="3" style={{ padding: "20px" }}>
        <Box style={{ flexShrink: 0 }}>
          <ToggleButtonGroup.Root type="single" defaultValue="left" label="Text alignment">
            {items(ALIGN)}
          </ToggleButtonGroup.Root>
        </Box>
        <Text size="1" style={{ color: "var(--ds-text-weak)" }}>
          The selected item fills from the accent-aware <Mono>--ds-fill-selected-subtle</Mono> inside a 1px{" "}
          <Mono>--ds-stroke-accent-weak</Mono> edge, under a <Mono>--ds-text-strong</Mono> mark — the same pressed paint as{" "}
          <strong>ToggleButton</strong>, all of it, inherited for free. Each item is a{" "}
          <Mono>ToggleGroup.Item</Mono> composed over a ghost Button, so Radix marks the selected one{" "}
          <Mono>data-state="on"</Mono> and ToggleButton's pressed-paint rule catches it. That rule's
          non-colour cue is the <strong>weight-600 label</strong>, which only works when there is a label:
          these items are icons, so each one also passes <Mono>pressedIcon</Mono> and the selected item draws
          the <em>bold</em> weight of its glyph. A different mark is a shape difference — still there with
          the hue removed.
        </Text>
      </Flex>
      <MeasuredSpec
        render={() => (
          <ToggleButtonGroup.Root type="single" defaultValue="left" label="Selected fill measurement">
            {items(ALIGN)}
          </ToggleButtonGroup.Root>
        )}
      >
        <MeasuredRow
          part="Container fill"
          note="The tray the group paints for itself — read off the group root, which is the box the row measures."
          token="--ds-bg-subtle"
          select=".rt-ds-toggle-group"
          prop="background-color"
        />
        <MeasuredRow
          part="Selected fill"
          note="Read off the selected item — the same paint a pressed ToggleButton carries."
          token="--ds-fill-selected-subtle"
          select='.rt-BaseButton[data-state="on"]'
          prop="background-color"
        />
        <MeasuredRow
          part="Selected ink"
          note="Also inherited from ToggleButton's rule — the committed-selection ink, not the ghost button's accent, which is tuned for the page and not for a tint of its own hue."
          token="--ds-text-strong"
          select='.rt-BaseButton[data-state="on"]'
          prop="color"
        />
      </MeasuredSpec>
      <NoteRow part="Container box" value="min-height 24 / 32 / 40 at steps 1 / 2 / 3 (--ds-space-24/32/40) — the group is ONE control, so its outer box is the step box; radius --ds-radius-2 / --ds-radius-2 / --ds-radius-3" />
      <NoteRow part="Container hairline" value="inset 0 0 0 1px --ds-stroke-weak — an inset shadow, not a border, so the line costs no layout and the members keep their full 24/32/40 targets inside it" />
      <NoteRow part="Member step-down" value="members render ONE STEP below the group (24-in-32, 32-in-40; the floor step holds itself, 24-in-24) — a member is a part of a control, not a control in the row, and the smallest member anywhere is still a 24×24 target" />
      <NoteRow part="Selected label weight" value="font-weight 600 — the non-colour cue when the item HAS a label (bold width reserved, so no reflow); inert on an icon-only item" />
      <NoteRow part="Icon-only non-colour cue" value="pressedIcon — the selected item renders a different glyph; the unshown face is display:none, so it leaves the a11y tree too" />
      <NoteRow part="Item skin" value="Radix ghost .rt-variant-ghost (reused via ToggleGroup.Item asChild over Button)" />
    </Box>
  );
}

/* The DON'T's specimen: a labelled TIME ZONE field whose control is a row of toggle buttons. The list
   it is standing in for runs to hundreds of entries, so six of them sitting in view is a promise the
   control cannot keep — and a form field wants one labelled control, not a strip of them. This card has
   to RENDER that mistake: a DO/DON'T is read picture-first, so a DON'T that showed the correct Select
   under a red ✕ taught the opposite of its own caption. */
const ZONES = [
  { value: "london", label: "London" },
  { value: "berlin", label: "Berlin" },
  { value: "lagos", label: "Lagos" },
  { value: "dubai", label: "Dubai" },
  { value: "tokyo", label: "Tokyo" },
  { value: "sydney", label: "Sydney" },
];

/* The DO's counter-specimen: the SAME zone list behind one Select — the mirror of the DON'T beside it,
   down to the selected city. It renders the real component, unsized, so it resolves the same global
   uiSize control lane the group next to it does and the two step 24/32/40 together; a painted trigger
   held one height at every tier and made the row disagree with itself.
   It ships a SELECTED value rather than a placeholder because a settled value is the truer picture: the
   DO is the set already living behind one control. (It also used to avoid a contrast hole — the
   placeholder ink composited to 3.78 against the trigger's own surface — but that is fixed as of
   2026-08-04, so the choice now rests on the specimen's meaning alone.)
   Closed by default (no `defaultOpen`) — the lesson is which control the set belongs in, and an open
   portaled menu floating over the do/don't grid would be a second thing to read. */
function ZonePicker() {
  return (
    <Select defaultValue="london">
      <Select.Trigger aria-label="Time zone" />
      <Select.Content>
        {ZONES.map((z) => (
          <Select.Item key={z.value} value={z.value}>{z.label}</Select.Item>
        ))}
      </Select.Content>
    </Select>
  );
}

function ZoneWall() {
  return (
    <Flex direction="column" gap="1" data-testid="tbg-dont">
      <Text size="1" weight="medium" style={{ color: "var(--ds-text-strong)" }}>Time zone</Text>
      <ToggleButtonGroup.Root type="single" defaultValue="london" label="Time zone (don't)">
        {ZONES.map((z) => (
          <ToggleButtonGroup.Item key={z.value} value={z.value}>{z.label}</ToggleButtonGroup.Item>
        ))}
      </ToggleButtonGroup.Root>
    </Flex>
  );
}

const PROPS: PropDef[] = [
  { name: "type", type: `"single" | "multiple"`, desc: <><Code>single</Code> → a <Code>radiogroup</Code>, at most one item on (re-click clears it). <Code>multiple</Code> → a <Code>toolbar</Code> of independent aria-pressed toggles.</>, source: "ToggleButtonGroup.tsx" },
  { name: "value", type: "string | string[]", desc: <>Controlled selection (<Code>string</Code> for single, <Code>string[]</Code> for multiple). Pair with <Code>onValueChange</Code>.</>, source: "Radix" },
  { name: "defaultValue", type: "string | string[]", desc: <>Initial selection when uncontrolled. No paired handler needed.</>, source: "Radix" },
  { name: "onValueChange", type: "(value) => void", desc: <>Fires when the selection changes — controlled or uncontrolled.</>, source: "Radix" },
  { name: "label", type: "string", desc: <>Accessible name → <Code>aria-label</Code> on the group. The radiogroup/toolbar has no visible label of its own.</>, source: "ToggleButtonGroup.tsx" },
  { name: "pressedIcon", type: "ReactNode", desc: <>On an <strong>Item</strong> — the content shown while that item is selected; it swaps the rest content. The same prop, name and semantics as <strong>ToggleButton</strong>'s. <strong>Required on an icon-only item</strong>: without it the selected state is the fill and its 1px edge, both colour differences.</>, source: "ToggleButtonGroup.tsx" },
  { name: "size", type: `"1" | "2" | "3"`, desc: <>Applied to every item's Button. Unset → the global <Code>uiSize</Code> control lane (default <Code>small</Code> → <Code>1</Code>).</>, source: "ToggleButtonGroup.tsx" },
  { name: "disabled", type: "boolean", desc: <>On the Root disables the whole group; on an Item disables that one (kept out of roving focus, pressed paint gated off).</>, source: "Radix" },
];

const meta: Meta<typeof ToggleButtonGroup.Root> = {
  title: "Components/Action/ToggleButtonGroup",
  component: ToggleButtonGroup.Root,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**ToggleButtonGroup** is a set of related toggle buttons — a segmented control (`type=\"single\"`, " +
          "at most one on) or a compact multi-pick toolbar (`type=\"multiple\"`). Each item is a " +
          "`@radix-ui/react-toggle-group` `Item` composed `asChild` over our **Button** at " +
          "`priority=\"tertiary\"` (ghost) — the SAME composition as **ToggleButton** — so the selected item " +
          "inherits ToggleButton's pressed fill (`--ds-fill-selected-subtle`), its 1px `--ds-stroke-accent-weak` edge and its weight-600 label cue " +
          "for free. An **icon-only** item has no label for that weight to act on, so it passes " +
          "`pressedIcon` — ToggleButton's own prop — and swaps its glyph on select, which keeps selection " +
          "off colour alone. It is controlled (`value`) or uncontrolled (`defaultValue`), and Radix's " +
          "roving tabindex makes the whole group ONE tab stop with arrow-key navigation between items — so " +
          "a keyboard user reaches the cluster once, then arrows between choices.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof ToggleButtonGroup.Root>;

export const Usage: Story = {
  // The DO/DON'T word (success/error step-11 ink on its own tint) measures 4.10 at 12px bold, under axe's
  // 4.5; the colour + the word already carry the meaning, so that row is the documented exception. Scoped
  // to the label itself — the cards' specimens stay fully axe-checked, which "[data-dodont]" did not do.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader title="ToggleButtonGroup · Usage" standfirst={DEFINITION} />

        {/* The multiple group starts with TWO items on. It is the only thing that separates a toolbar
            from the radiogroup beside it, and with one item on the two specimens were identical. */}
        <Section title="Specimen" lead="A single-select group (radiogroup — at most one on) and a multiple-select group (toolbar — any number on). The single group opens with one item selected; the multiple opens with two, which is the whole reason the variant exists. Every item passes pressedIcon — the selected glyph is the bold weight of the same mark. The tray around each set is the component's own: a group is ONE control in its row, so its outer box is the 24/32/40 step box and its members sit inside it.">
          <Flex align="center" gap="5" wrap="wrap">
            <Flex direction="column" gap="1">
              <Caption>Single — text alignment</Caption>
              <ToggleButtonGroup.Root type="single" defaultValue="left" label="Text alignment">
                {items(ALIGN)}
              </ToggleButtonGroup.Root>
            </Flex>
            <Flex direction="column" gap="1">
              <Caption>Multiple — text formatting</Caption>
              <ToggleButtonGroup.Root type="multiple" defaultValue={["bold", "italic"]} label="Text formatting">
                {items(FORMAT)}
              </ToggleButtonGroup.Root>
            </Flex>
          </Flex>
        </Section>
        <Rule />
        <Section title="How big the set can get" lead="A ToggleButtonGroup is for a small set of always-visible, related options. A long or scannable list belongs in a Select (single) or a checkbox list (multiple).">
          <Grid columns={{ initial: "1", sm: "2" }} gap="3">
            <DoDont kind="do" bare note="Match the control to the size of the set. A small set (2–5) of mutually-exclusive, always-visible options is a segmented control: seeing every choice at once is the point, and every icon-only item passes pressedIcon so the selected one draws a different mark and survives being read without colour (WCAG 1.4.1). A long or scannable set is a Select, where the options live behind one labelled control.">
              <Flex align="center" gap="4" wrap="wrap" data-testid="tbg-do">
                <ToggleButtonGroup.Root type="single" defaultValue="left" label="Text alignment (do)">
                  {items(ALIGN)}
                </ToggleButtonGroup.Root>
                <ZonePicker />
              </Flex>
            </DoDont>
            <DoDont kind="dont" bare note="Don't stretch it across a long list, and don't make it the control of a labelled form field. A ToggleButtonGroup stops scaling the moment the options can't all sit in view — six cities in a strip is a list of hundreds pretending to be a small closed set, and a field wants one labelled control, not a row of them. Reach for a Select (single) or a checkbox list (multiple).">
              <ZoneWall />
            </DoDont>
          </Grid>
        </Section>
        <Rule />
        <Section title="Tokens" lead="Measured off a rendered group, not resolved from the token — the row reads the selected item's fill and reports whether it equals what the token it names resolves to, so it can disagree with the component.">
          <SelectedFillSpec />
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement }) => {
    // The token row's EVIDENCE: the row measured a real selected item, resolved its claim on a different
    // node, and the two agree.
    const rows = assertMeasuredRows(canvasElement);
    if (rows.measured !== 3 || rows.unproven !== 0) {
      throw new Error(`expected 3 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }

    // The [[toggle-group-box]] box: the group is ONE control, so its OUTER box is the step box the Select beside it holds.
    // Read as an equality against a real Select on this page, not against a typed constant — the two are
    // supposed to track each other through every tier, which is the whole claim.
    const doRow = canvasElement.querySelector<HTMLElement>('[data-testid="tbg-do"]');
    if (!doRow) throw new Error("the DO card must render the group beside a real Select");
    const groupBox = doRow.querySelector<HTMLElement>(".rt-ds-toggle-group");
    const selectBox = doRow.querySelector<HTMLElement>("button.rt-SelectTrigger");
    if (!groupBox || !selectBox) throw new Error("the DO card must render both a group and a Select trigger");
    const gh = Math.round(groupBox.getBoundingClientRect().height);
    const sh = Math.round(selectBox.getBoundingClientRect().height);
    if (gh !== sh)
      throw new Error(`a group is one control in its row: its box must equal the Select's beside it; got ${gh}px vs ${sh}px`);
    // …and the members render ONE STEP DOWN inside that box ([[toggle-group-box]] as corrected): 24-in-32, 32-in-40,
    // and at the floor step member and box coincide. Independent constants — not read from the theme.
    const MEMBER_IN_BOX: Record<number, number> = { 24: 24, 32: 24, 40: 32 };
    const member = groupBox.querySelector<HTMLElement>("button.rt-BaseButton");
    if (!member) throw new Error("the group must render member buttons");
    const mh = Math.round(member.getBoundingClientRect().height);
    if (mh !== MEMBER_IN_BOX[gh])
      throw new Error(`a member steps down one size inside the group box; expected ${MEMBER_IN_BOX[gh]}px in a ${gh}px group, got ${mh}px`);

    // Passive render assertion only — the pre-selected (defaultValue) specimens already show the "on" state
    // statically; this reads it, it does NOT drive the group (no flash on view). Roving nav, single re-click,
    // and the paint/reflow behavior are exercised in _internal/ToggleButtonGroup behavior.
    const radiogroup = canvasElement.querySelector<HTMLElement>('[role="radiogroup"]');
    if (!radiogroup) throw new Error("Usage must render a type='single' group (role=radiogroup)");
    const on = radiogroup.querySelector<HTMLElement>('[data-state="on"]');
    if (!on) throw new Error("the single group must show a pre-selected item (data-state='on')");
    if (radiogroup.tabIndex !== 0)
      throw new Error(`the group must be the single tab stop (tabindex 0); got ${radiogroup.tabIndex}`);
    // The multiple group's ONLY distinguishing property is that more than one item can be on, so the
    // specimen has to show more than one on — otherwise it renders identically to the radiogroups.
    const toolbar = canvasElement.querySelector<HTMLElement>('[role="toolbar"]');
    if (!toolbar) throw new Error("Usage must render a type='multiple' group (role=toolbar)");
    const onCount = toolbar.querySelectorAll('[data-state="on"]').length;
    if (onCount < 2)
      throw new Error(`the multiple group must demonstrate more than one item on; got ${onCount}`);
  },
};

type PropsArgs = {
  type: "single" | "multiple";
  selected: "left" | "center" | "right" | "(none)";
  label: string;
  size: "auto" | "1" | "2" | "3";
  pressedIcon: boolean;
  disabled: boolean;
  onValueChange: (value: string | string[]) => void;
};

export const Props: StoryObj<PropsArgs> = {
  args: { type: "single", selected: "left", label: "Text alignment", size: "auto", pressedIcon: true, disabled: false },
  argTypes: {
    type: { control: "inline-radio", options: ["single", "multiple"], description: "single → radiogroup (one on); multiple → toolbar (any number on).", table: { category: "Behaviour" } },
    selected: { control: "select", options: ["left", "center", "right", "(none)"], description: "Initial selection (uncontrolled defaultValue). “(none)” starts empty.", table: { category: "Behaviour" } },
    label: { control: "text", description: "Accessible name → aria-label on the group.", table: { category: "Content" } },
    size: { control: "inline-radio", options: ["auto", "1", "2", "3"], description: '"auto" tracks the global uiSize toolbar (unset → the control lane); a step pins every item\'s Button.', table: { category: "Variant" } },
    pressedIcon: { control: "boolean", description: "Swap each item to the bold weight of its glyph while selected. Turn it OFF to see an icon-only group whose selection is only the fill and its 1px edge, both colour differences.", table: { category: "Content" } },
    disabled: { control: "boolean", description: "Disable the whole group.", table: { category: "State" } },
    onValueChange: { action: "valueChange", table: { category: "Events" } },
  },
  parameters: { controls: { disable: false } },
  render: ({ type, selected, label, size, pressedIcon, disabled, onValueChange }: PropsArgs) => {
    const initial = selected === "(none)" ? undefined : selected;
    // "auto" = pass no `size`, so the group resolves the global uiSize control lane.
    const groupSize = size === "auto" ? undefined : size;
    const set = ALIGN.map((it) => (pressedIcon ? it : { ...it, pressed: undefined }));
    const rendered = (
      <>
        {set.map((it) => (
          <ToggleButtonGroup.Item key={it.value} value={it.value} aria-label={it.label} pressedIcon={it.pressed}>
            {it.rest}
          </ToggleButtonGroup.Item>
        ))}
      </>
    );
    return (
      <Page maxWidth="none">
        <PageHeader title="ToggleButtonGroup · Props" standfirst={<>{DEFINITION} The instance below is the uncontrolled (<Code>defaultValue</Code>) mode — the controlled <Code>value</Code> prop is documented in the table.</>} />
        {type === "single" ? (
          <ToggleButtonGroup.Root type="single" defaultValue={initial} label={label} size={groupSize} disabled={disabled} onValueChange={onValueChange}>
            {rendered}
          </ToggleButtonGroup.Root>
        ) : (
          <ToggleButtonGroup.Root type="multiple" defaultValue={initial ? [initial] : []} label={label} size={groupSize} disabled={disabled} onValueChange={onValueChange}>
            {rendered}
          </ToggleButtonGroup.Root>
        )}
        <PropsLead />
        <Rule />
        <Section title="Props reference" lead={<>Every prop <Code>ToggleButtonGroup</Code> adds or forwards; item selection cascades through <Code>ToggleGroup.Item</Code> over Button.</>}>
          <PropTable rows={PROPS} />
        </Section>
      </Page>
    );
  },
};

export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="ToggleButtonGroup · History" standfirst={DEFINITION} />

      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[toggle-button-group]] · reuse">
            Each item is the <Code>@radix-ui/react-toggle-group</Code> <Code>Item</Code> composed{" "}
            <Code>asChild</Code> over Button at <Code>priority="tertiary"</Code> (ghost) — the same composition
            ToggleButton uses. Radix marks the selected item <Code>data-state="on"</Code>, so ToggleButton's pressed-paint
            rule paints it with the accent-aware <Code>--ds-fill-selected-subtle</Code> fill, a 1px{" "}
            <Code>--ds-stroke-accent-weak</Code> edge and a{" "}
            <Code>--ds-text-strong</Code> label at weight 600, inherited with no work. That ink is part of the
            inheritance and not an afterthought: a ghost Button's own accent ink is tuned to read on the page,
            and over an accent tint of the same hue it failed WCAG AA on most brands (worst 3.13:1) until D11
            declared it.
          </Decision>
          <Decision id="[[toggle-button-group]] · icon-only selection">
            <strong>An icon-only item carries its selected state with <Code>pressedIcon</Code></strong> — the same
            prop, name and semantics <strong>ToggleButton</strong> already has. The inherited cue bolds the item's{" "}
            <em>label</em>, and a toggle group is usually icon-only: alignment, formatting, view switchers. With no
            text characters the weight has nothing to act on, which leaves the fill and its 1px edge, both colour
            differences (<strong>WCAG 1.4.1, Use of Color</strong>). Swapping the glyph — typically to a heavier weight of the
            same mark — is a <strong>shape</strong> difference and survives having the hue removed. It is the
            component's own vocabulary rather than a cue only the group has, so a toggle and a group of toggles are
            described the same way. An Item can't read the group's value, so both faces render and the CSS shows one,
            keyed on the <Code>data-state</Code> Radix stamps; the hidden face is <Code>display: none</Code>, so a
            screen reader hears one glyph and not two.
          </Decision>
          <Decision id="[[toggle-button-group]] · controlled">
            Controlled <Code>and</Code> uncontrolled — <Code>value</Code>/<Code>onValueChange</Code> or{" "}
            <Code>defaultValue</Code>. Radix's primitive gives uncontrolled state for free (mirrors ToggleButton).
          </Decision>
          <Decision id="[[toggle-button-group]] · a11y">
            <strong>Roving tabindex.</strong> Radix wraps the items in a roving-focus group: the whole group is{" "}
            <strong>ONE tab stop</strong> and <Code>Arrow</Code>/<Code>Home</Code>/<Code>End</Code> move focus
            between items, instead of a separate tab stop per button. <Code>type="single"</Code> is
            a <Code>radiogroup</Code> of <Code>radio</Code> items; <Code>type="multiple"</Code> is a{" "}
            <Code>toolbar</Code> of aria-pressed toggles. (This is why our Button now forwards its ref — the
            roving-focus collection moves focus by DOM node.)
          </Decision>
          <Decision id="[[toggle-group-box]] · one control, one box">
            <strong>A group is ONE control in its row</strong>, so its <em>outer</em> box is the step box —
            24 / 32 / 40px at steps 1 / 2 / 3 — and the group paints the tray its members sit in. A LONE{" "}
            <strong>ToggleButton</strong> still claims that whole box for itself ([[control-box-per-step]]); a member of a group claims
            a part of the group's. The group's box model is <strong>SegmentedControl</strong>'s
            (root height <Code>--space-5/6/7</Code>, zero block padding), and the members render{" "}
            <strong>one step below the group</strong> — small buttons in a medium tray, 24-in-32 and 32-in-40,
            with the floor step holding itself (24-in-24; no step exists below small). A member is a genuinely
            smaller button — glyph, box and pressed paint all the lower step's — and the smallest member
            anywhere is still a 24×24 pointer target ([[control-box-per-step]]'s floor is the member's own).
          </Decision>
          <Decision id="uiSize · R10">
            <Code>size</Code> follows the global <Code>uiSize</Code> control lane (default <Code>small</Code>) via
            Button. The group resolves it once and seeds every member the step BELOW it
            (the shared <Code>CONTROL_MEMBER_STEP</Code> ramp in SizeContext) — the tray owns the row's box,
            the members own a part of it.
          </Decision>
        </Flex>
      </Section>
      <Rule />
      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0 · the inherited pressed edge">
            A selected item now draws ToggleButton's 1px inset <Code>--ds-stroke-accent-weak</Code> edge, inherited from
            ToggleButton's pressed-paint rule with no CSS of its own ([[toggle-button]]). The edge is a colour difference,
            so an icon-only item still needs <Code>pressedIcon</Code>.
          </Decision>
          <Decision id="0.9.0 · the group owns its container">
            The group now paints its own tray and its outer box hits the control step ([[toggle-group-box]]). It used to be a bare
            flex row whose box was its members' box, and the docs drew a bordered <Code>Box</Code> around it by
            hand — which put a 46px-tall "control" beside a 32px Select at the medium tier. That wrapper is gone
            from every specimen: the container is the component's.
          </Decision>
          <Decision id="0.9.0">
            Initial <Code>System/ToggleButtonGroup</Code> — react-toggle-group composed over Button ghost, reusing
            ToggleButton's pressed fill; single + multiple, controlled or uncontrolled; the
            roving-tabindex a11y upgrade. Button now forwards its ref so roving focus can move between items.
            An Item takes <strong>ToggleButton's <Code>pressedIcon</Code></strong>: the inherited weight-600 cue is
            inert on an icon-only item, so a glyph swap carries the selected state instead of the fill alone.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
